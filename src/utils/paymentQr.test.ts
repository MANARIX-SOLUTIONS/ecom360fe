import { describe, expect, it } from "vitest";
import {
  QR_MAX_PAYLOAD_LENGTH,
  resolveGeneratedQr,
  resolvePaymentQr,
  resolveQrImage,
} from "./paymentQr";

const PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("resolveQrImage", () => {
  it("keeps data URIs as images", () => {
    const src = `data:image/png;base64,${PNG_BASE64}`;
    expect(resolveQrImage(src)).toEqual({ kind: "image", src });
  });

  it("wraps raw base64 PNG in a data URI", () => {
    expect(resolveQrImage(PNG_BASE64)).toEqual({
      kind: "image",
      src: `data:image/png;base64,${PNG_BASE64}`,
    });
  });

  it("treats image URLs as images", () => {
    const src = "https://cdn.bictorys.com/qr/abc.png";
    expect(resolveQrImage(src)).toEqual({ kind: "image", src });
  });

  it("treats other URLs as the payload to encode", () => {
    const value = "https://pay.wave.com/c/cos-123";
    expect(resolveQrImage(value)).toEqual({ kind: "payload", value, isWebPage: false });
  });

  it("returns null for empty values", () => {
    expect(resolveQrImage(undefined)).toBeNull();
    expect(resolveQrImage("  ")).toBeNull();
  });
});

describe("resolveGeneratedQr", () => {
  it("prefers the operator deep link", () => {
    expect(
      resolveGeneratedQr({
        paymentLink: "https://om.example/pay/1",
        checkoutUrl: "https://pay.bictorys.com/checkout/1",
      })
    ).toEqual({ kind: "payload", value: "https://om.example/pay/1", isWebPage: false });
  });

  it("falls back to the Bictorys web checkout page", () => {
    expect(resolveGeneratedQr({ checkoutUrl: "https://pay.bictorys.com/checkout/1" })).toEqual({
      kind: "payload",
      value: "https://pay.bictorys.com/checkout/1",
      isWebPage: true,
    });
  });

  it("rejects payloads too long to encode", () => {
    const tooLong = `https://x.io/${"a".repeat(QR_MAX_PAYLOAD_LENGTH)}`;
    expect(resolveGeneratedQr({ paymentLink: tooLong })).toBeNull();
  });
});

describe("resolvePaymentQr", () => {
  it("uses the Bictorys image first, then the generated QR", () => {
    expect(resolvePaymentQr({ qrCode: PNG_BASE64, paymentLink: "https://l" })?.kind).toBe(
      "image"
    );
    expect(resolvePaymentQr({ paymentLink: "https://l" })).toEqual({
      kind: "payload",
      value: "https://l",
      isWebPage: false,
    });
    expect(resolvePaymentQr({})).toBeNull();
  });
});
