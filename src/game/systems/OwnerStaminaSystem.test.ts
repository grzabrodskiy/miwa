import { describe, expect, it } from "vitest";
import { OwnerStaminaSystem } from "./OwnerStaminaSystem";

describe("OwnerStaminaSystem", () => {
  it("drains while pulling", () => {
    const system = new OwnerStaminaSystem(100, 25, 10);

    const drained = system.update(100, 2, {
      isPulling: true,
      isResting: false
    });

    expect(drained).toBe(50);
  });

  it("regenerates only while resting", () => {
    const system = new OwnerStaminaSystem(100, 25, 10);

    const idle = system.update(50, 1, {
      isPulling: false,
      isResting: false
    });
    const recovered = system.update(50, 1.5, {
      isPulling: false,
      isResting: true
    });

    expect(idle).toBe(50);
    expect(recovered).toBe(65);
  });
});
