import type { RoundDefinition } from "../data/rounds";
import type { AudioSubtitleId } from "../data/audioSubtitles";

export type DogIntent =
  | "go_to_destination"
  | "chase_cat"
  | "approach_small_dog"
  | "avoid_large_dog"
  | "go_home_due_to_rain"
  | "refuse_to_walk"
  | "recover_after_pull"
  | "idle_sniff";

export type DogLocomotionState =
  | "idle"
  | "walk_forward"
  | "pull_backward"
  | "sit_refuse"
  | "tired_recover"
  | "bark_one_shot";

export type RoundStatus = "running" | "success" | "timeout";
export type FacingDirection = -1 | 1;
export type DistractionKind = "cat" | "small_dog_owner" | "large_dog_owner" | "rain";

export interface ActorSimulationState {
  x: number;
  y: number;
  velocityX: number;
  facing: FacingDirection;
}

export interface InputState {
  moveHeld: boolean;
  pullHeld: boolean;
  restHeld: boolean;
  treatPressed: boolean;
  screamPressed: boolean;
}

export interface ActiveDistractionState {
  id: string;
  kind: DistractionKind;
  label: string;
  x: number;
  velocityX: number;
  direction: FacingDirection;
  remainingMs: number;
  durationMs: number;
  influenceRadius: number;
  isGlobal: boolean;
  subtitleId: AudioSubtitleId;
}

export interface RoundSimulationState {
  definition: RoundDefinition;
  owner: ActorSimulationState;
  dog: ActorSimulationState;
  status: RoundStatus;
  paused: boolean;
  elapsedMs: number;
  remainingMs: number;
  stamina: number;
  progress: number;
  leashDistance: number;
  leashSlack: number;
  leashStretch: number;
  leashTension: number;
  dogIntent: DogIntent;
  dogIntentElapsedMs: number;
  dogLocomotionState: DogLocomotionState;
  dogLocomotionElapsedMs: number;
  dogPullPressure: number;
  dogRecentPullReleaseMs: number;
  ownerPullingLastFrame: boolean;
  activeDistractions: ActiveDistractionState[];
  availableTreats: number;
  treatsUsed: number;
  nextTreatPickupX: number;
  treatGuidanceRemainingMs: number;
  screamCooldownRemainingMs: number;
  screamCount: number;
}

export interface StepSimulationResult {
  becameComplete: boolean;
}
