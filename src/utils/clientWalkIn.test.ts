import { describe, expect, it } from "vitest";
import { isWalkInClientName, WALK_IN_CLIENT_NAME } from "./clientWalkIn";

describe("isWalkInClientName", () => {
  it("recognizes the POS default client", () => {
    expect(isWalkInClientName(WALK_IN_CLIENT_NAME)).toBe(true);
    expect(isWalkInClientName("client anonyme")).toBe(true);
    expect(isWalkInClientName("Walk-in")).toBe(true);
  });

  it("rejects named customers", () => {
    expect(isWalkInClientName("Fatou Diallo")).toBe(false);
    expect(isWalkInClientName("Client comptoir VIP")).toBe(false);
  });
});
