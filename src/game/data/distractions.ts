import type { AudioSubtitleId } from "./audioSubtitles";
import type { DistractionKind } from "../types/gameplay";

export interface DistractionDefinition {
  kind: DistractionKind;
  label: string;
  spawnWeight: number;
  durationMs: number;
  influenceRadius: number;
  cooldownMs: number;
  spawnOffsetMin: number;
  spawnOffsetMax: number;
  baseSpeed: number;
  isGlobal: boolean;
  audioSubtitleId: AudioSubtitleId;
  color: number;
  accentColor: number;
}

export const DISTRACTION_SPAWN_RULES = {
  spawnCheckIntervalMs: 2400,
  spawnChancePerCheck: 0.76,
  maxConcurrentDistractions: 2,
  maxConcurrentLocalDistractions: 1
} as const;

export const DISTRACTION_DEFINITIONS: Record<DistractionKind, DistractionDefinition> = {
  cat: {
    kind: "cat",
    label: "Cat",
    spawnWeight: 1.05,
    durationMs: 2600,
    influenceRadius: 220,
    cooldownMs: 6600,
    spawnOffsetMin: 110,
    spawnOffsetMax: 220,
    baseSpeed: 210,
    isGlobal: false,
    audioSubtitleId: "cat_crossing",
    color: 0x707070,
    accentColor: 0xbec0c2
  },
  small_dog_owner: {
    kind: "small_dog_owner",
    label: "Small Dog",
    spawnWeight: 0.9,
    durationMs: 4200,
    influenceRadius: 250,
    cooldownMs: 8200,
    spawnOffsetMin: 130,
    spawnOffsetMax: 280,
    baseSpeed: 68,
    isGlobal: false,
    audioSubtitleId: "small_dog_owner",
    color: 0xf4a261,
    accentColor: 0x486581
  },
  large_dog_owner: {
    kind: "large_dog_owner",
    label: "Large Dog",
    spawnWeight: 0.72,
    durationMs: 4300,
    influenceRadius: 280,
    cooldownMs: 9200,
    spawnOffsetMin: 150,
    spawnOffsetMax: 320,
    baseSpeed: 58,
    isGlobal: false,
    audioSubtitleId: "large_dog_owner",
    color: 0x5c4033,
    accentColor: 0x3f88c5
  },
  rain: {
    kind: "rain",
    label: "Rain",
    spawnWeight: 0.42,
    durationMs: 5400,
    influenceRadius: 2800,
    cooldownMs: 14000,
    spawnOffsetMin: 0,
    spawnOffsetMax: 0,
    baseSpeed: 0,
    isGlobal: true,
    audioSubtitleId: "rain_starts",
    color: 0x7aa5d2,
    accentColor: 0xd7ecff
  }
} as const;
