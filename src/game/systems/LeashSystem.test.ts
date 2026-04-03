import { describe, expect, it } from "vitest";
import { LeashSystem } from "./LeashSystem";

describe("LeashSystem", () => {
  it("reports zero tension while inside slack", () => {
    const system = new LeashSystem(84, 170, 11, 7.5, 1.3, 0.9);

    const metrics = system.calculateMetrics(60);

    expect(metrics.slack).toBe(60);
    expect(metrics.stretch).toBe(0);
    expect(metrics.tension).toBe(0);
  });

  it("normalizes tension between slack and max stretch", () => {
    const system = new LeashSystem(84, 170, 11, 7.5, 1.3, 0.9);

    const metrics = system.calculateMetrics(127);

    expect(metrics.slack).toBe(84);
    expect(metrics.stretch).toBe(43);
    expect(metrics.tension).toBeCloseTo(0.5, 5);
  });

  it("caps tension at full stretch", () => {
    const system = new LeashSystem(84, 170, 11, 7.5, 1.3, 0.9);

    const metrics = system.calculateMetrics(220);

    expect(metrics.stretch).toBe(136);
    expect(metrics.tension).toBe(1);
  });
});
