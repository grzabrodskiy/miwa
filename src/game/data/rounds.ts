import type { DistractionKind } from "../types/gameplay";

export interface BackgroundTheme {
  name: string;
  skyColor: number;
  farColor: number;
  midColor: number;
  nearColor: number;
  groundColor: number;
  groundAccentColor: number;
  destinationColor: number;
  destinationAccentColor: number;
}

export interface RoundSummaryCopy {
  winTitle: string;
  winBody: string;
  failTitle: string;
  failBody: string;
}

export interface RoundDistractionProfile {
  spawnChanceMultiplier: number;
  weightMultipliers: Record<DistractionKind, number>;
}

export interface RoundDefinition {
  id: string;
  name: string;
  durationSeconds: number;
  targetDistance: number;
  startX: number;
  destinationX: number;
  ownerY: number;
  dogY: number;
  worldWidth: number;
  groundY: number;
  distractionProfile: RoundDistractionProfile;
  backgroundTheme: BackgroundTheme;
  summary: RoundSummaryCopy;
}

interface RoundConfig {
  id: string;
  name: string;
  durationSeconds: number;
  targetDistance: number;
  distractionProfile: RoundDistractionProfile;
  backgroundTheme: BackgroundTheme;
  summary: RoundSummaryCopy;
}

const SHARED_LAYOUT = {
  startX: 180,
  ownerY: 460,
  dogY: 505,
  groundY: 560,
  worldPadding: 360
} as const;

function createRoundDefinition(config: RoundConfig): RoundDefinition {
  const destinationX = SHARED_LAYOUT.startX + config.targetDistance;

  return {
    ...config,
    startX: SHARED_LAYOUT.startX,
    destinationX,
    ownerY: SHARED_LAYOUT.ownerY,
    dogY: SHARED_LAYOUT.dogY,
    groundY: SHARED_LAYOUT.groundY,
    worldWidth: destinationX + SHARED_LAYOUT.worldPadding
  };
}

export const ROUND_DEFINITIONS: RoundDefinition[] = [
  createRoundDefinition({
    id: "park",
    name: "Park",
    durationSeconds: 125,
    targetDistance: 12400,
    distractionProfile: {
      spawnChanceMultiplier: 0.92,
      weightMultipliers: {
        cat: 1.2,
        small_dog_owner: 0.8,
        large_dog_owner: 0.55,
        rain: 0.3
      }
    },
    backgroundTheme: {
      name: "Morning Meadow",
      skyColor: 0xdaf2ff,
      farColor: 0xd8e8d0,
      midColor: 0xa5c88f,
      nearColor: 0x7eab69,
      groundColor: 0x8ebd6f,
      groundAccentColor: 0x6f9754,
      destinationColor: 0xf4a261,
      destinationAccentColor: 0xe76f51
    },
    summary: {
      winTitle: "Park Reached",
      winBody: "The walk opened strong and the Shiba made it to the park with room to spare.",
      failTitle: "Park Missed",
      failBody: "The park stayed out of reach this time. A steadier pace should get you there."
    }
  }),
  createRoundDefinition({
    id: "cafe",
    name: "Cafe",
    durationSeconds: 136,
    targetDistance: 13750,
    distractionProfile: {
      spawnChanceMultiplier: 1.02,
      weightMultipliers: {
        cat: 0.72,
        small_dog_owner: 0.94,
        large_dog_owner: 0.62,
        rain: 0.36
      }
    },
    backgroundTheme: {
      name: "Sidewalk Latte",
      skyColor: 0xf5e7d3,
      farColor: 0xe7d2b1,
      midColor: 0xc9b07e,
      nearColor: 0xa78058,
      groundColor: 0xb98c61,
      groundAccentColor: 0x8b6038,
      destinationColor: 0xf2c57c,
      destinationAccentColor: 0xd1903f
    },
    summary: {
      winTitle: "Cafe Stop Made",
      winBody: "You threaded the sidewalk chaos and reached the cafe before the clock ran dry.",
      failTitle: "Cafe Stop Missed",
      failBody: "The cafe crowd slowed the route down. Try conserving stamina for the last stretch."
    }
  }),
  createRoundDefinition({
    id: "pet-shop",
    name: "Pet Shop",
    durationSeconds: 148,
    targetDistance: 15200,
    distractionProfile: {
      spawnChanceMultiplier: 1.08,
      weightMultipliers: {
        cat: 0.44,
        small_dog_owner: 1.18,
        large_dog_owner: 0.82,
        rain: 0.24
      }
    },
    backgroundTheme: {
      name: "Retail Row",
      skyColor: 0xeaf1ff,
      farColor: 0xd3dff1,
      midColor: 0xa2b6d6,
      nearColor: 0x7693bb,
      groundColor: 0x97b37f,
      groundAccentColor: 0x6b8f58,
      destinationColor: 0xa8dadc,
      destinationAccentColor: 0x4d96a8
    },
    summary: {
      winTitle: "Pet Shop Arrived",
      winBody: "The leash stayed mostly civilized and you made it to the pet shop in time.",
      failTitle: "Pet Shop Delayed",
      failBody: "Too many tempting smells and greetings ate into the timer before you arrived."
    }
  }),
  createRoundDefinition({
    id: "restaurant-patio",
    name: "Restaurant Patio",
    durationSeconds: 160,
    targetDistance: 16600,
    distractionProfile: {
      spawnChanceMultiplier: 0.98,
      weightMultipliers: {
        cat: 0.78,
        small_dog_owner: 0.88,
        large_dog_owner: 0.96,
        rain: 0.42
      }
    },
    backgroundTheme: {
      name: "Golden Patio",
      skyColor: 0xfff1d6,
      farColor: 0xf5d7a1,
      midColor: 0xe5b86a,
      nearColor: 0xcd9447,
      groundColor: 0x9ab06f,
      groundAccentColor: 0x72854f,
      destinationColor: 0xf4a261,
      destinationAccentColor: 0xe76f51
    },
    summary: {
      winTitle: "Patio Table Secured",
      winBody: "You kept the route together and made it to the restaurant patio before the timer expired.",
      failTitle: "Patio Route Failed",
      failBody: "The patio was close, but the walk lost momentum before the final approach."
    }
  }),
  createRoundDefinition({
    id: "dog-park",
    name: "Dog Park",
    durationSeconds: 172,
    targetDistance: 18250,
    distractionProfile: {
      spawnChanceMultiplier: 1.14,
      weightMultipliers: {
        cat: 0.64,
        small_dog_owner: 1.14,
        large_dog_owner: 1.08,
        rain: 0.28
      }
    },
    backgroundTheme: {
      name: "Open Field",
      skyColor: 0xd7f5ff,
      farColor: 0xbfdcb1,
      midColor: 0x89bf73,
      nearColor: 0x5e964b,
      groundColor: 0x88bc63,
      groundAccentColor: 0x5f8c43,
      destinationColor: 0x8ecae6,
      destinationAccentColor: 0x3f88c5
    },
    summary: {
      winTitle: "Dog Park Reached",
      winBody: "You held the line through the busiest stretch and reached the dog park on time.",
      failTitle: "Dog Park Lost",
      failBody: "The dog park round got messy. One more composed run should push it over the line."
    }
  }),
  createRoundDefinition({
    id: "home",
    name: "Home",
    durationSeconds: 180,
    targetDistance: 19600,
    distractionProfile: {
      spawnChanceMultiplier: 1.06,
      weightMultipliers: {
        cat: 0.36,
        small_dog_owner: 0.42,
        large_dog_owner: 0.74,
        rain: 1.28
      }
    },
    backgroundTheme: {
      name: "Twilight Return",
      skyColor: 0xcfd5f2,
      farColor: 0xa5adc9,
      midColor: 0x7380aa,
      nearColor: 0x4f5d85,
      groundColor: 0x7da06d,
      groundAccentColor: 0x5d7c52,
      destinationColor: 0xf7d488,
      destinationAccentColor: 0xd7a13b
    },
    summary: {
      winTitle: "Home At Last",
      winBody: "The full route is complete. You made it through every stop and brought the Shiba home.",
      failTitle: "Home Still Ahead",
      failBody: "The return home slipped away. One more attempt should finish the full session."
    }
  })
];

export function getRoundDefinitionByIndex(index: number): RoundDefinition {
  return ROUND_DEFINITIONS[Math.max(0, Math.min(index, ROUND_DEFINITIONS.length - 1))]!;
}
