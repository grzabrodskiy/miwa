import { describe, expect, it } from "vitest";
import { ROUND_DEFINITIONS } from "../data/rounds";
import { DogBehaviorSystem } from "./DogBehaviorSystem";
import { LeashSystem } from "./LeashSystem";
import { OwnerStaminaSystem } from "./OwnerStaminaSystem";
import { RoundManager } from "./RoundManager";
import { stepRoundSimulation } from "./RunSimulation";

describe("stepRoundSimulation", () => {
  it("reaches the destination in a happy-path round loop", () => {
    const definition = ROUND_DEFINITIONS[0];
    const roundManager = new RoundManager(definition);
    const state = roundManager.createInitialState(100);
    const maxSteps = Math.ceil(definition.durationSeconds * 10);

    for (let index = 0; index < maxSteps && state.status === "running"; index += 1) {
      stepRoundSimulation(
        state,
        {
          moveHeld: true,
          pullHeld: false,
          restHeld: false,
          treatPressed: false,
          screamPressed: false
        },
        100,
        {
          dogBehaviorSystem: new DogBehaviorSystem(),
          leashSystem: new LeashSystem(84, 170, 11, 7.5, 1.3, 0.9),
          ownerStaminaSystem: new OwnerStaminaSystem(100, 34, 18),
          roundManager
        }
      );
    }

    expect(state.status).toBe("success");
    expect(state.dog.x).toBeGreaterThanOrEqual(definition.destinationX - 38);
  });
});
