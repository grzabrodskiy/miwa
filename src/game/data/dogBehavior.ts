import type { DogIntent } from "../types/gameplay";

interface UtilityIntentConfig {
  baseScore: number;
  minHoldMs: number;
}

export const DOG_BEHAVIOR_DATA = {
  utility: {
    go_to_destination: {
      baseScore: 0.74,
      distanceRemainingWeight: 0.34,
      ownerMotionWeight: 0.16,
      pullAssistWeight: 0.12,
      leashTensionPenalty: 0.24,
      recentPullPenalty: 0.18,
      distractionPenalty: 0.34,
      minHoldMs: 500
    },
    chase_cat: {
      baseScore: 0.08,
      influenceWeight: 1.08,
      directionCommitBonus: 0.14,
      pullPenalty: 0.18,
      rainPenalty: 0.26,
      minHoldMs: 1150
    },
    approach_small_dog: {
      baseScore: 0.12,
      influenceWeight: 1.18,
      calmLeashWeight: 0.22,
      pullPenalty: 0.08,
      rainPenalty: 0.18,
      minHoldMs: 1150
    },
    avoid_large_dog: {
      baseScore: 0.08,
      influenceWeight: 1.44,
      leashTensionWeight: 0.3,
      lowStaminaWeight: 0.16,
      minHoldMs: 1200
    },
    go_home_due_to_rain: {
      baseScore: 0.12,
      rainWeight: 1.4,
      lowStaminaWeight: 0.22,
      progressWeight: 0.18,
      minHoldMs: 1500
    },
    refuse_to_walk: {
      baseScore: 0.06,
      pullPressureWeight: 0.78,
      leashTensionWeight: 0.64,
      lowStaminaWeight: 0.28,
      activePullBonus: 0.26,
      minHoldMs: 1250
    },
    recover_after_pull: {
      baseScore: 0.04,
      recentPullReleaseWeight: 0.92,
      lowStaminaWeight: 0.36,
      calmLeashWeight: 0.2,
      minHoldMs: 950
    },
    idle_sniff: {
      baseScore: 0.12,
      calmLeashWeight: 0.4,
      slowOwnerWeight: 0.26,
      curiosityWindowBonus: 0.32,
      progressPenalty: 0.14,
      pullPressurePenalty: 0.36,
      minHoldMs: 1000
    }
  } satisfies Record<
    Extract<
      DogIntent,
      | "go_to_destination"
      | "chase_cat"
      | "approach_small_dog"
      | "avoid_large_dog"
      | "go_home_due_to_rain"
      | "refuse_to_walk"
      | "recover_after_pull"
      | "idle_sniff"
    >,
    UtilityIntentConfig & Record<string, number>
  >,
  thresholds: {
    lowStamina: 38,
    slowOwnerSpeed: 124,
    walkForwardSpeed: 32,
    backwardMotionSpeed: -18,
    refusePressureThreshold: 0.44,
    recoverReleaseThreshold: 0.2,
    backpedalTensionThreshold: 0.58,
    idleSniffMaxProgress: 0.82,
    distractionResponseThreshold: 0.24
  },
  timing: {
    barkOneShotMs: 320,
    recoverAfterPullMemoryMs: 1350,
    sniffCycleMs: 3600,
    sniffWindowMs: 900,
    intentSwitchMargin: 0.12
  },
  meters: {
    pullPressureBuildPerSecond: 0.82,
    pullPressureReleaseDecayPerSecond: 1.12,
    pullPressureCalmDecayPerSecond: 0.48
  },
  speeds: {
    chaseCat: 158,
    approachSmallDog: 132,
    avoidLargeDog: 144,
    goHomeRain: 168
  },
  treatGuidance: {
    durationMs: 2600,
    destinationBonus: 0.94,
    chaseCatPenalty: 0.52,
    approachSmallDogPenalty: 0.44,
    refusePenalty: 0.34,
    recoverPenalty: 0.22,
    idlePenalty: 0.28
  }
} as const;
