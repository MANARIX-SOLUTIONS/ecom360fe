import { describe, it, expect, beforeEach } from "vitest";
import { ApiError } from "@/api/client";
import type { SaleRequest, SaleResponse } from "@/api/sales";
import { canEnqueueOffline } from "./saleOutboxTypes";
import { clearSaleOutbox, listSaleOutbox } from "./saleOutboxStore";
import {
  classifySyncError,
  enqueueSale,
  STOCK_INSUFFICIENT_MSG,
  syncSaleOutbox,
} from "./saleOutbox";

const payload = (over: Partial<SaleRequest> = {}): SaleRequest => ({
  storeId: "store-1",
  clientId: "client-1",
  paymentMethod: "cash",
  lines: [{ productId: "p1", quantity: 1 }],
  clientSaleId: "id-a",
  ...over,
});

const okSale = { id: "sale-1" } as SaleResponse;

describe("sale outbox", () => {
  beforeEach(async () => {
    await clearSaleOutbox();
  });

  it("refuses Wave / Orange Money", () => {
    expect(canEnqueueOffline("wave")).toBe(false);
    expect(canEnqueueOffline("orange_money")).toBe(false);
    expect(canEnqueueOffline("cash")).toBe(true);
    expect(canEnqueueOffline("credit")).toBe(true);
  });

  it("dedupes the same clientSaleId", async () => {
    await enqueueSale({ payload: payload(), businessId: "b", userId: "u" });
    await enqueueSale({ payload: payload(), businessId: "b", userId: "u" });
    const items = await listSaleOutbox();
    expect(items).toHaveLength(1);
  });

  it("syncs FIFO without duplicates", async () => {
    const posted: string[] = [];
    await enqueueSale({
      payload: payload({ clientSaleId: "1" }),
      businessId: "b",
      userId: "u",
    });
    await enqueueSale({
      payload: payload({ clientSaleId: "2" }),
      businessId: "b",
      userId: "u",
    });
    await enqueueSale({
      payload: payload({ clientSaleId: "3" }),
      businessId: "b",
      userId: "u",
    });
    await syncSaleOutbox(async (req) => {
      posted.push(req.clientSaleId ?? "");
      return okSale;
    });
    expect(posted).toEqual(["1", "2", "3"]);
    expect(await listSaleOutbox()).toHaveLength(0);
  });

  it("marks 409 as failed with a stock message", async () => {
    await enqueueSale({ payload: payload(), businessId: "b", userId: "u" });
    await syncSaleOutbox(async () => {
      throw new ApiError("Stock insuffisant", 409);
    });
    const items = await listSaleOutbox();
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("failed");
    expect(items[0].error).toBe(STOCK_INSUFFICIENT_MSG);
  });

  it("keeps network errors pending", () => {
    expect(classifySyncError(new ApiError("down", 0))).toBe("retry");
    expect(classifySyncError(new ApiError("oops", 500))).toBe("retry");
    expect(classifySyncError(new ApiError("nope", 422))).toBe("failed");
  });

  it("rejects enqueue of Wave", async () => {
    await expect(
      enqueueSale({
        payload: payload({ paymentMethod: "wave" }),
        businessId: "b",
        userId: "u",
      })
    ).rejects.toThrow();
  });
});
