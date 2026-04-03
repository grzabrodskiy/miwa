import { DOG_BEHAVIOR_DATA } from "../data/dogBehavior";
import { RUN_TUNING } from "../config/tuning";
import type {
  ActiveDistractionState,
  DogIntent,
  DogLocomotionState,
  FacingDirection,
  RoundSimulationState
} from "../types/gameplay";

export interface DogBehaviorContext {
  deltaMs: number;
  destinationDistance: number;
  isOwnerPulling: boolean;
  isOwnerResting: boolean;
  isOwnerMoving: boolean;
}

export interface DogBehaviorOutput {
  desiredVelocityX: number;
  preferredFacing: FacingDirection;
}

interface DistractionSignal {
  distraction: ActiveDistractionState | null;
  influence: number;
}

type SupportedIntent = Extract<
  DogIntent,
  | "go_to_destination"
  | "chase_cat"
  | "approach_small_dog"
  | "avoid_large_dog"
  | "go_home_due_to_rain"
  | "refuse_to_walk"
  | "recover_after_pull"
  | "idle_sniff"
>;

export class DogBehaviorSystem {
  update(
    state: RoundSimulationState,
    context: DogBehaviorContext
  ): DogBehaviorOutput {
    this.updateBehaviorMeters(state, context);

    const nextIntent = this.chooseIntent(state, context);
    if (nextIntent !== state.dogIntent) {
      state.dogIntent = nextIntent;
      state.dogIntentElapsedMs = 0;
    } else {
      state.dogIntentElapsedMs += context.deltaMs;
    }

    const nextLocomotionState = this.chooseLocomotionState(state, context);
    if (nextLocomotionState !== state.dogLocomotionState) {
      state.dogLocomotionState = nextLocomotionState;
      state.dogLocomotionElapsedMs = 0;
    } else {
      state.dogLocomotionElapsedMs += context.deltaMs;
    }

    return this.getMotionDirective(state, context);
  }

  private updateBehaviorMeters(
    state: RoundSimulationState,
    context: DogBehaviorContext
  ): void {
    const deltaSeconds = context.deltaMs / 1000;

    if (context.isOwnerPulling) {
      state.dogPullPressure = Math.min(
        1,
        state.dogPullPressure +
          DOG_BEHAVIOR_DATA.meters.pullPressureBuildPerSecond *
            deltaSeconds *
            (0.45 + state.leashTension * 0.55)
      );

      state.dogRecentPullReleaseMs = Math.max(
        0,
        state.dogRecentPullReleaseMs - context.deltaMs
      );
    } else {
      if (state.ownerPullingLastFrame) {
        state.dogRecentPullReleaseMs = DOG_BEHAVIOR_DATA.timing.recoverAfterPullMemoryMs;
      } else {
        state.dogRecentPullReleaseMs = Math.max(
          0,
          state.dogRecentPullReleaseMs - context.deltaMs
        );
      }

      const decayRate =
        state.dogRecentPullReleaseMs > 0
          ? DOG_BEHAVIOR_DATA.meters.pullPressureReleaseDecayPerSecond
          : DOG_BEHAVIOR_DATA.meters.pullPressureCalmDecayPerSecond;

      state.dogPullPressure = Math.max(
        0,
        state.dogPullPressure - decayRate * deltaSeconds
      );
    }

    state.ownerPullingLastFrame = context.isOwnerPulling;
  }

  private chooseIntent(
    state: RoundSimulationState,
    context: DogBehaviorContext
  ): SupportedIntent {
    const scores = this.scoreIntents(state, context);
    const currentIntent = this.normalizeCurrentIntent(state.dogIntent);
    let nextIntent = currentIntent;
    let nextScore = scores[currentIntent];

    for (const [intent, score] of Object.entries(scores) as Array<[SupportedIntent, number]>) {
      if (score > nextScore) {
        nextIntent = intent;
        nextScore = score;
      }
    }

    const currentIntentConfig = DOG_BEHAVIOR_DATA.utility[currentIntent];
    if (
      nextIntent !== currentIntent &&
      state.dogIntentElapsedMs < currentIntentConfig.minHoldMs &&
      nextScore < scores[currentIntent] + DOG_BEHAVIOR_DATA.timing.intentSwitchMargin
    ) {
      return currentIntent;
    }

    return nextIntent;
  }

  private normalizeCurrentIntent(intent: DogIntent): SupportedIntent {
    switch (intent) {
      case "go_to_destination":
      case "chase_cat":
      case "approach_small_dog":
      case "avoid_large_dog":
      case "go_home_due_to_rain":
      case "refuse_to_walk":
      case "recover_after_pull":
      case "idle_sniff":
        return intent;
      default:
        return "go_to_destination";
    }
  }

  private scoreIntents(
    state: RoundSimulationState,
    context: DogBehaviorContext
  ): Record<SupportedIntent, number> {
    const lowStaminaFactor = clamp01(
      (DOG_BEHAVIOR_DATA.thresholds.lowStamina - state.stamina) /
        DOG_BEHAVIOR_DATA.thresholds.lowStamina
    );
    const treatGuidanceFactor = clamp01(
      state.treatGuidanceRemainingMs /
        DOG_BEHAVIOR_DATA.treatGuidance.durationMs
    );
    const slowOwnerFactor =
      1 -
      clamp01(
        Math.abs(state.owner.velocityX) / DOG_BEHAVIOR_DATA.thresholds.slowOwnerSpeed
      );
    const calmLeashFactor = 1 - state.leashTension;
    const recentPullFactor = clamp01(
      state.dogRecentPullReleaseMs /
        DOG_BEHAVIOR_DATA.timing.recoverAfterPullMemoryMs
    );
    const distanceRemainingFactor = clamp01(
      context.destinationDistance /
        (state.definition.destinationX - state.definition.startX)
    );
    const curiosityInWindow =
      state.elapsedMs % DOG_BEHAVIOR_DATA.timing.sniffCycleMs <
      DOG_BEHAVIOR_DATA.timing.sniffWindowMs;
    const catSignal = this.getDistractionSignal(state, "cat");
    const smallDogSignal = this.getDistractionSignal(state, "small_dog_owner");
    const largeDogSignal = this.getDistractionSignal(state, "large_dog_owner");
    const rainSignal = this.getDistractionSignal(state, "rain");
    const strongestDistractionInfluence = Math.max(
      catSignal.influence,
      smallDogSignal.influence,
      largeDogSignal.influence,
      rainSignal.influence
    );

    const goToDestination =
      DOG_BEHAVIOR_DATA.utility.go_to_destination.baseScore +
      distanceRemainingFactor *
        DOG_BEHAVIOR_DATA.utility.go_to_destination.distanceRemainingWeight +
      (context.isOwnerMoving
        ? DOG_BEHAVIOR_DATA.utility.go_to_destination.ownerMotionWeight
        : 0) +
      (context.isOwnerPulling
        ? DOG_BEHAVIOR_DATA.utility.go_to_destination.pullAssistWeight
        : 0) -
      state.leashTension *
        DOG_BEHAVIOR_DATA.utility.go_to_destination.leashTensionPenalty -
      recentPullFactor *
        DOG_BEHAVIOR_DATA.utility.go_to_destination.recentPullPenalty -
      strongestDistractionInfluence *
        DOG_BEHAVIOR_DATA.utility.go_to_destination.distractionPenalty +
      treatGuidanceFactor * DOG_BEHAVIOR_DATA.treatGuidance.destinationBonus;

    const chaseCat =
      catSignal.influence >= DOG_BEHAVIOR_DATA.thresholds.distractionResponseThreshold
        ? DOG_BEHAVIOR_DATA.utility.chase_cat.baseScore +
          catSignal.influence *
            DOG_BEHAVIOR_DATA.utility.chase_cat.influenceWeight +
          ((catSignal.distraction?.direction ?? 1) === state.dog.facing
            ? DOG_BEHAVIOR_DATA.utility.chase_cat.directionCommitBonus
            : 0) -
          treatGuidanceFactor *
            DOG_BEHAVIOR_DATA.treatGuidance.chaseCatPenalty -
          (context.isOwnerPulling
            ? DOG_BEHAVIOR_DATA.utility.chase_cat.pullPenalty
            : 0) -
          rainSignal.influence * DOG_BEHAVIOR_DATA.utility.chase_cat.rainPenalty
        : -1;

    const approachSmallDog =
      smallDogSignal.influence >= DOG_BEHAVIOR_DATA.thresholds.distractionResponseThreshold
        ? DOG_BEHAVIOR_DATA.utility.approach_small_dog.baseScore +
          smallDogSignal.influence *
            DOG_BEHAVIOR_DATA.utility.approach_small_dog.influenceWeight +
          calmLeashFactor *
            DOG_BEHAVIOR_DATA.utility.approach_small_dog.calmLeashWeight -
          treatGuidanceFactor *
            DOG_BEHAVIOR_DATA.treatGuidance.approachSmallDogPenalty -
          (context.isOwnerPulling
            ? DOG_BEHAVIOR_DATA.utility.approach_small_dog.pullPenalty
            : 0) -
          rainSignal.influence *
            DOG_BEHAVIOR_DATA.utility.approach_small_dog.rainPenalty
        : -1;

    const avoidLargeDog =
      largeDogSignal.influence >= DOG_BEHAVIOR_DATA.thresholds.distractionResponseThreshold
        ? DOG_BEHAVIOR_DATA.utility.avoid_large_dog.baseScore +
          largeDogSignal.influence *
            DOG_BEHAVIOR_DATA.utility.avoid_large_dog.influenceWeight +
          state.leashTension *
            DOG_BEHAVIOR_DATA.utility.avoid_large_dog.leashTensionWeight +
          lowStaminaFactor *
            DOG_BEHAVIOR_DATA.utility.avoid_large_dog.lowStaminaWeight
        : -1;

    const goHomeDueToRain =
      rainSignal.influence >= DOG_BEHAVIOR_DATA.thresholds.distractionResponseThreshold
        ? DOG_BEHAVIOR_DATA.utility.go_home_due_to_rain.baseScore +
          rainSignal.influence *
            DOG_BEHAVIOR_DATA.utility.go_home_due_to_rain.rainWeight +
          lowStaminaFactor *
            DOG_BEHAVIOR_DATA.utility.go_home_due_to_rain.lowStaminaWeight +
          state.progress *
            DOG_BEHAVIOR_DATA.utility.go_home_due_to_rain.progressWeight
        : -1;

    const refuseToWalk =
      DOG_BEHAVIOR_DATA.utility.refuse_to_walk.baseScore +
      Math.max(
        0,
        state.dogPullPressure - DOG_BEHAVIOR_DATA.thresholds.refusePressureThreshold
      ) *
        DOG_BEHAVIOR_DATA.utility.refuse_to_walk.pullPressureWeight +
      state.leashTension *
        DOG_BEHAVIOR_DATA.utility.refuse_to_walk.leashTensionWeight +
      lowStaminaFactor *
        DOG_BEHAVIOR_DATA.utility.refuse_to_walk.lowStaminaWeight +
      -treatGuidanceFactor * DOG_BEHAVIOR_DATA.treatGuidance.refusePenalty +
      (context.isOwnerPulling
        ? DOG_BEHAVIOR_DATA.utility.refuse_to_walk.activePullBonus
        : 0);

    const recoverAfterPull =
      DOG_BEHAVIOR_DATA.utility.recover_after_pull.baseScore +
      Math.max(
        0,
        recentPullFactor - DOG_BEHAVIOR_DATA.thresholds.recoverReleaseThreshold
      ) *
        DOG_BEHAVIOR_DATA.utility.recover_after_pull.recentPullReleaseWeight +
      lowStaminaFactor *
        DOG_BEHAVIOR_DATA.utility.recover_after_pull.lowStaminaWeight +
      -treatGuidanceFactor * DOG_BEHAVIOR_DATA.treatGuidance.recoverPenalty +
      calmLeashFactor *
        DOG_BEHAVIOR_DATA.utility.recover_after_pull.calmLeashWeight;

    const idleSniff =
      (state.progress <= DOG_BEHAVIOR_DATA.thresholds.idleSniffMaxProgress
        ? DOG_BEHAVIOR_DATA.utility.idle_sniff.baseScore
        : 0) +
      calmLeashFactor * DOG_BEHAVIOR_DATA.utility.idle_sniff.calmLeashWeight +
      slowOwnerFactor * DOG_BEHAVIOR_DATA.utility.idle_sniff.slowOwnerWeight +
      (curiosityInWindow
        ? DOG_BEHAVIOR_DATA.utility.idle_sniff.curiosityWindowBonus
        : 0) -
      treatGuidanceFactor * DOG_BEHAVIOR_DATA.treatGuidance.idlePenalty -
      state.progress * DOG_BEHAVIOR_DATA.utility.idle_sniff.progressPenalty -
      state.dogPullPressure *
        DOG_BEHAVIOR_DATA.utility.idle_sniff.pullPressurePenalty -
      strongestDistractionInfluence * 0.2;

    return {
      go_to_destination: goToDestination,
      chase_cat: chaseCat,
      approach_small_dog: approachSmallDog,
      avoid_large_dog: avoidLargeDog,
      go_home_due_to_rain: goHomeDueToRain,
      refuse_to_walk: refuseToWalk,
      recover_after_pull: recoverAfterPull,
      idle_sniff: idleSniff
    };
  }

  private getDistractionSignal(
    state: RoundSimulationState,
    kind: ActiveDistractionState["kind"]
  ): DistractionSignal {
    let strongestDistraction: ActiveDistractionState | null = null;
    let strongestInfluence = 0;

    for (const distraction of state.activeDistractions) {
      if (distraction.kind !== kind) {
        continue;
      }

      const influence = distraction.isGlobal
        ? 1
        : clamp01(
            1 - Math.abs(distraction.x - state.dog.x) / distraction.influenceRadius
          );

      if (influence > strongestInfluence) {
        strongestDistraction = distraction;
        strongestInfluence = influence;
      }
    }

    return {
      distraction: strongestDistraction,
      influence: strongestInfluence
    };
  }

  private chooseLocomotionState(
    state: RoundSimulationState,
    context: DogBehaviorContext
  ): DogLocomotionState {
    const catSignal = this.getDistractionSignal(state, "cat");
    const smallDogSignal = this.getDistractionSignal(state, "small_dog_owner");
    const largeDogSignal = this.getDistractionSignal(state, "large_dog_owner");

    if (state.dogIntent === "refuse_to_walk") {
      if (state.dogLocomotionState === "bark_one_shot") {
        if (state.dogLocomotionElapsedMs < DOG_BEHAVIOR_DATA.timing.barkOneShotMs) {
          return "bark_one_shot";
        }
      } else if (state.dogIntentElapsedMs === 0) {
        return "bark_one_shot";
      }

      if (
        context.isOwnerPulling &&
        state.leashTension >= DOG_BEHAVIOR_DATA.thresholds.backpedalTensionThreshold
      ) {
        return "pull_backward";
      }

      return "sit_refuse";
    }

    if (state.dogIntent === "recover_after_pull") {
      return "tired_recover";
    }

    if (state.dogIntent === "idle_sniff") {
      return "idle";
    }

    if (
      state.dogIntent === "go_home_due_to_rain" ||
      (state.dogIntent === "avoid_large_dog" &&
        largeDogSignal.distraction !== null &&
        largeDogSignal.distraction.x >= state.dog.x) ||
      (state.dogIntent === "chase_cat" &&
        (catSignal.distraction?.direction ?? 1) < 0) ||
      (state.dogIntent === "approach_small_dog" &&
        smallDogSignal.distraction !== null &&
        smallDogSignal.distraction.x < state.dog.x) ||
      state.dog.velocityX <= DOG_BEHAVIOR_DATA.thresholds.backwardMotionSpeed
    ) {
      return "pull_backward";
    }

    return Math.abs(state.dog.velocityX) >= DOG_BEHAVIOR_DATA.thresholds.walkForwardSpeed
      ? "walk_forward"
      : "idle";
  }

  private getMotionDirective(
    state: RoundSimulationState,
    context: DogBehaviorContext
  ): DogBehaviorOutput {
    const catSignal = this.getDistractionSignal(state, "cat");
    const smallDogSignal = this.getDistractionSignal(state, "small_dog_owner");
    const largeDogSignal = this.getDistractionSignal(state, "large_dog_owner");

    if (state.dogIntent === "refuse_to_walk") {
      if (state.dogLocomotionState === "pull_backward") {
        return {
          desiredVelocityX: -RUN_TUNING.dogRefuseBackwardSpeed,
          preferredFacing: -1
        };
      }

      return {
        desiredVelocityX: 0,
        preferredFacing: -1
      };
    }

    if (state.dogIntent === "recover_after_pull") {
      return {
        desiredVelocityX: 0,
        preferredFacing: 1
      };
    }

    if (state.dogIntent === "idle_sniff") {
      return {
        desiredVelocityX: 0,
        preferredFacing: 1
      };
    }

    if (state.dogIntent === "chase_cat" && catSignal.distraction) {
      return {
        desiredVelocityX:
          DOG_BEHAVIOR_DATA.speeds.chaseCat * catSignal.distraction.direction,
        preferredFacing: catSignal.distraction.direction
      };
    }

    if (state.dogIntent === "approach_small_dog" && smallDogSignal.distraction) {
      const direction = smallDogSignal.distraction.x >= state.dog.x ? 1 : -1;
      return {
        desiredVelocityX: DOG_BEHAVIOR_DATA.speeds.approachSmallDog * direction,
        preferredFacing: direction
      };
    }

    if (state.dogIntent === "avoid_large_dog" && largeDogSignal.distraction) {
      const direction = largeDogSignal.distraction.x >= state.dog.x ? -1 : 1;
      return {
        desiredVelocityX: DOG_BEHAVIOR_DATA.speeds.avoidLargeDog * direction,
        preferredFacing: direction
      };
    }

    if (state.dogIntent === "go_home_due_to_rain") {
      const direction = state.dog.x > state.definition.startX + 8 ? -1 : 0;
      return {
        desiredVelocityX: DOG_BEHAVIOR_DATA.speeds.goHomeRain * direction,
        preferredFacing: -1
      };
    }

    const arrivalBlend = Math.max(
      0,
      Math.min(1, context.destinationDistance / RUN_TUNING.destinationSlowRadius)
    );

    return {
      desiredVelocityX:
        (RUN_TUNING.dogCruiseSpeed +
          (context.isOwnerMoving ? RUN_TUNING.moveBoostSpeed * 0.45 : 0) +
          (context.isOwnerPulling
            ? RUN_TUNING.dogCatchUpSpeed - RUN_TUNING.dogCruiseSpeed
            : 0)) * arrivalBlend,
      preferredFacing: 1
    };
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
