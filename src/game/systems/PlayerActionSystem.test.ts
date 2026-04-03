import { describe, expect, it } from "vitest";
import { ROUND_DEFINITIONS } from "../data/rounds";
import { PLAYER_ACTION_DATA } from "../data/playerActions";
import { RoundManager } from "./RoundManager";
import { PlayerActionSystem } from "./PlayerActionSystem";

describe("PlayerActionSystem", () => {
  it("consumes a treat and starts guidance", () => {
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(100);
    const system = new PlayerActionSystem();

    const usedTreat = system.tryUseTreat(state);

    expect(usedTreat).toBe(true);
    expect(state.availableTreats).toBe(PLAYER_ACTION_DATA.treats.startingCount - 1);
    expect(state.treatsUsed).toBe(1);
    expect(state.treatGuidanceRemainingMs).toBe(
      PLAYER_ACTION_DATA.treats.guidanceDurationMs
    );
  });

  it("collects a treat after enough progress", () => {
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(100);
    const system = new PlayerActionSystem();

    state.availableTreats = 1;
    state.owner.x = state.nextTreatPickupX + 12;

    const collected = system.tryCollectTreat(state);

    expect(collected).toBe(true);
    expect(state.availableTreats).toBe(2);
    expect(state.nextTreatPickupX).toBe(
      ROUND_DEFINITIONS[0].startX + PLAYER_ACTION_DATA.treats.pickupSpacing * 2
    );
  });

  it("can scare a nearby cat into reversing direction", () => {
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(100);
    const system = new PlayerActionSystem(() => 0);

    state.dog.x = 480;
    state.activeDistractions = [
      {
        id: "cat-1",
        kind: "cat",
        label: "Cat",
        x: 520,
        velocityX: 210,
        direction: 1,
        remainingMs: 2000,
        durationMs: 2000,
        influenceRadius: 220,
        isGlobal: false,
        subtitleId: "cat_crossing"
      }
    ];

    const result = system.tryTriggerScream(state);

    expect(result.used).toBe(true);
    expect(result.scaredCatIds).toEqual(["cat-1"]);
    expect(state.activeDistractions[0]?.direction).toBe(-1);
    expect(state.activeDistractions[0]?.velocityX).toBe(-210);
  });
});
