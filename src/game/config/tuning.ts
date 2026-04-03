export const VIEWPORT = {
  width: 1280,
  height: 720
} as const;

export const WORLD = {
  groundY: 560,
  floorHeight: 160,
  worldWidth: 2200
} as const;

export const RUN_TUNING = {
  baseOwnerSpeed: 108,
  moveBoostSpeed: 52,
  pullBoostSpeed: 58,
  ownerAcceleration: 260,
  ownerRestDeceleration: 540,
  dogCruiseSpeed: 120,
  dogCatchUpSpeed: 146,
  dogRefuseBackwardSpeed: 54,
  dogAcceleration: 240,
  destinationSlowRadius: 150,
  dogLeadDistance: 80,
  destinationArrivalDistance: 38
} as const;

export const LEASH_TUNING = {
  slackDistance: 84,
  maxStretchDistance: 170,
  springStrength: 11,
  dampingStrength: 7.5,
  ownerMass: 1.3,
  dogMass: 0.9
} as const;

export const STAMINA_TUNING = {
  max: 100,
  pullDrainPerSecond: 34,
  recoverPerSecond: 18
} as const;

export const UI_TUNING = {
  instructionY: 70,
  compactBreakpointWidth: 920,
  compactBreakpointHeight: 620,
  hudPadding: 28,
  hudCompactPadding: 22,
  subtitleBottomInset: 36,
  subtitleCompactBottomInset: 44,
  subtitleMaxWidth: 760,
  subtitleCompactMaxWidth: 380,
  subtitlePanelMinHeight: 46,
  subtitleCompactPanelMinHeight: 54,
  roundAdvanceMessageMs: 2600,
  introControlsMessageMs: 1800,
  pauseButtonSize: {
    width: 156,
    height: 64
  },
  touchArrowButtonSize: {
    width: 116,
    height: 92,
    compactWidth: 132,
    compactHeight: 98
  },
  touchActionButtonSize: {
    width: 124,
    height: 72,
    compactWidth: 138,
    compactHeight: 78
  },
  touchButtonGap: 12,
  touchActionGap: 10,
  touchBottomInset: 18,
  touchCompactBottomInset: 14,
  touchSideInset: 20,
  touchPullHoldMs: 240,
  leashSampleCount: 12,
  reducedMotionFactor: 0.25
} as const;
