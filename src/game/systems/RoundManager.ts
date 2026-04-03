import type { RoundDefinition } from "../data/rounds";
import { PLAYER_ACTION_DATA } from "../data/playerActions";
import type { RoundSimulationState } from "../types/gameplay";
import { RUN_TUNING } from "../config/tuning";

export class RoundManager {
  constructor(private readonly definition: RoundDefinition) {}

  createInitialState(initialStamina: number): RoundSimulationState {
    return {
      definition: this.definition,
      owner: {
        x: this.definition.startX,
        y: this.definition.ownerY,
        velocityX: 0,
        facing: 1
      },
      dog: {
        x: this.definition.startX + RUN_TUNING.dogLeadDistance,
        y: this.definition.dogY,
        velocityX: 0,
        facing: 1
      },
      status: "running",
      paused: false,
      elapsedMs: 0,
      remainingMs: this.definition.durationSeconds * 1000,
      stamina: initialStamina,
      progress: 0,
      leashDistance: RUN_TUNING.dogLeadDistance,
      leashSlack: RUN_TUNING.dogLeadDistance,
      leashStretch: 0,
      leashTension: 0,
      dogIntent: "go_to_destination",
      dogIntentElapsedMs: 0,
      dogLocomotionState: "walk_forward",
      dogLocomotionElapsedMs: 0,
      dogPullPressure: 0,
      dogRecentPullReleaseMs: 0,
      ownerPullingLastFrame: false,
      activeDistractions: [],
      availableTreats: PLAYER_ACTION_DATA.treats.startingCount,
      treatsUsed: 0,
      nextTreatPickupX: Math.min(
        this.definition.destinationX - RUN_TUNING.destinationArrivalDistance * 3,
        this.definition.startX + PLAYER_ACTION_DATA.treats.pickupSpacing
      ),
      treatGuidanceRemainingMs: 0,
      screamCooldownRemainingMs: 0,
      screamCount: 0
    };
  }

  advanceTime(state: RoundSimulationState, deltaMs: number): void {
    state.elapsedMs += deltaMs;
    state.remainingMs = Math.max(
      0,
      this.definition.durationSeconds * 1000 - state.elapsedMs
    );

    if (state.remainingMs <= 0 && state.status === "running") {
      state.status = "timeout";
    }
  }

  syncProgress(state: RoundSimulationState): void {
    state.progress = Math.max(
      0,
      Math.min(
        1,
        (Math.max(state.owner.x, state.dog.x) - this.definition.startX) /
          (this.definition.destinationX - this.definition.startX)
      )
    );

    const destinationReached =
      state.dog.x >=
      this.definition.destinationX - RUN_TUNING.destinationArrivalDistance;

    if (destinationReached && state.status === "running") {
      state.status = "success";
    }
  }
}
