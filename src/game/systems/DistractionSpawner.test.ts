import { describe, expect, it } from "vitest";
import { ROUND_DEFINITIONS } from "../data/rounds";
import { DistractionSpawner } from "./DistractionSpawner";
import { RoundManager } from "./RoundManager";

describe("DistractionSpawner", () => {
  it("spawns a deterministic cat crossing and advances it over time", () => {
    const randomValues = [0.1, 0.05, 0.8, 0.25];
    const spawner = new DistractionSpawner(() => randomValues.shift() ?? 0.5);
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(100);

    const spawned = spawner.update(state, 2500);

    expect(spawned).toHaveLength(1);
    expect(spawned[0]?.kind).toBe("cat");
    expect(spawned[0]?.direction).toBe(1);
    expect(spawned[0]?.x).toBeLessThan(state.dog.x);

    const originalX = spawned[0]?.x ?? 0;
    spawner.update(state, 500);

    expect(state.activeDistractions).toHaveLength(1);
    expect(state.activeDistractions[0]?.x).toBeGreaterThan(originalX);
  });

  it("can spawn a global rain event", () => {
    const randomValues = [0.1, 0.99];
    const spawner = new DistractionSpawner(() => randomValues.shift() ?? 0.5);
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(100);

    const spawned = spawner.update(state, 2500);

    expect(spawned).toHaveLength(1);
    expect(spawned[0]?.kind).toBe("rain");
    expect(spawned[0]?.isGlobal).toBe(true);
    expect(spawned[0]?.subtitleId).toBe("rain_starts");
  });
});
