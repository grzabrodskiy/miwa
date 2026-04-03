import Phaser from "phaser";
import type { RoundFinishedSummary } from "./types/session";
import type { AccessibilitySettings } from "./types/accessibility";

export interface HUDStatePayload {
  paused: boolean;
  remainingMs: number;
  durationMs: number;
  stamina: number;
  availableTreats: number;
  screamCooldownRemainingMs: number;
  destinationLabel: string;
  dogIntent: string;
  dogLocomotionState: string;
  leashTension: number;
}

export interface SubtitleCuePayload {
  cueId: string;
  text: string;
  durationMs: number;
}

export type SettingsChangedPayload = AccessibilitySettings;

export const gameEvents = new Phaser.Events.EventEmitter();

export const GAME_EVENT_KEYS = {
  hudUpdated: "hud:updated",
  pauseChanged: "hud:pause-changed",
  pauseRequested: "hud:pause-requested",
  roundFinished: "round:finished",
  subtitleQueued: "audio:subtitle-queued",
  settingsChanged: "settings:changed"
} as const;

export type RoundFinishedPayload = RoundFinishedSummary;
