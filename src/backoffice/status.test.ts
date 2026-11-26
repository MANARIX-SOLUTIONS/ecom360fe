import { describe, expect, it } from "vitest";
import { backofficeEnvironment, platformStatusFromOverall } from "./status";

describe("platform status", () => {
  it("uses the same overall value everywhere", () => {
    expect(platformStatusFromOverall("down")).toEqual({ tone: "danger", key: "down" });
    expect(platformStatusFromOverall("healthy")).toEqual({ tone: "ok", key: "operational" });
    expect(platformStatusFromOverall("degraded").key).toBe("degraded");
    expect(platformStatusFromOverall(undefined).key).toBe("unknown");
  });

  it("does not label a local dev server as production", () => {
    expect(backofficeEnvironment(undefined, false)).toBe("development");
    expect(backofficeEnvironment("staging", true)).toBe("staging");
    expect(backofficeEnvironment(undefined, true)).toBe("production");
  });
});
