export const PLAYER_ACTION_DATA = {
  treats: {
    startingCount: 3,
    maxCount: 6,
    pickupSpacing: 520,
    guidanceDurationMs: 2600
  },
  scream: {
    cooldownMs: 1800,
    catScareRadius: 260,
    catReverseChance: 0.58
  }
} as const;
