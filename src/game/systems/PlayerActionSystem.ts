import { PLAYER_ACTION_DATA } from "../data/playerActions";
import type { RoundSimulationState } from "../types/gameplay";

export interface ScreamResult {
  scaredCatIds: string[];
  used: boolean;
}

export class PlayerActionSystem {
  constructor(private readonly random: () => number = Math.random) {}

  updateTimers(state: RoundSimulationState, deltaMs: number): void {
    state.treatGuidanceRemainingMs = Math.max(
      0,
      state.treatGuidanceRemainingMs - deltaMs
    );
    state.screamCooldownRemainingMs = Math.max(
      0,
      state.screamCooldownRemainingMs - deltaMs
    );
  }

  tryUseTreat(state: RoundSimulationState): boolean {
    if (state.availableTreats <= 0) {
      return false;
    }

    state.availableTreats -= 1;
    state.treatsUsed += 1;
    state.treatGuidanceRemainingMs = Math.max(
      state.treatGuidanceRemainingMs,
      PLAYER_ACTION_DATA.treats.guidanceDurationMs
    );

    return true;
  }

  tryCollectTreat(state: RoundSimulationState): boolean {
    const progressX = Math.max(state.owner.x, state.dog.x);
    if (progressX < state.nextTreatPickupX) {
      return false;
    }

    state.nextTreatPickupX += PLAYER_ACTION_DATA.treats.pickupSpacing;
    if (state.availableTreats >= PLAYER_ACTION_DATA.treats.maxCount) {
      return false;
    }

    state.availableTreats += 1;
    return true;
  }

  tryTriggerScream(state: RoundSimulationState): ScreamResult {
    if (state.screamCooldownRemainingMs > 0) {
      return {
        scaredCatIds: [],
        used: false
      };
    }

    state.screamCooldownRemainingMs = PLAYER_ACTION_DATA.scream.cooldownMs;
    state.screamCount += 1;

    const scaredCatIds: string[] = [];

    for (const distraction of state.activeDistractions) {
      if (distraction.kind !== "cat") {
        continue;
      }

      if (
        Math.abs(distraction.x - state.dog.x) >
        PLAYER_ACTION_DATA.scream.catScareRadius
      ) {
        continue;
      }

      if (this.random() > PLAYER_ACTION_DATA.scream.catReverseChance) {
        continue;
      }

      distraction.direction = distraction.direction === 1 ? -1 : 1;
      distraction.velocityX = Math.abs(distraction.velocityX) * distraction.direction;
      scaredCatIds.push(distraction.id);
    }

    return {
      scaredCatIds,
      used: true
    };
  }
}
