import { RUN_TUNING } from "../config/tuning";
import type {
  ActorSimulationState,
  FacingDirection,
  InputState,
  RoundSimulationState,
  StepSimulationResult
} from "../types/gameplay";
import { DogBehaviorSystem } from "./DogBehaviorSystem";
import { LeashSystem } from "./LeashSystem";
import { OwnerStaminaSystem } from "./OwnerStaminaSystem";
import { RoundManager } from "./RoundManager";

interface RunSimulationDependencies {
  dogBehaviorSystem: DogBehaviorSystem;
  leashSystem: LeashSystem;
  ownerStaminaSystem: OwnerStaminaSystem;
  roundManager: RoundManager;
}

function approachVelocity(
  current: number,
  target: number,
  acceleration: number,
  deltaSeconds: number
): number {
  const difference = target - current;
  const maxStep = acceleration * deltaSeconds;

  if (Math.abs(difference) <= maxStep) {
    return target;
  }

  return current + Math.sign(difference) * maxStep;
}

function getFacingDirection(actor: ActorSimulationState): FacingDirection {
  if (actor.velocityX > 4) {
    return 1;
  }

  if (actor.velocityX < -4) {
    return -1;
  }

  return actor.facing;
}

function getDogFacingDirection(
  actor: ActorSimulationState,
  preferredFacing: FacingDirection
): FacingDirection {
  if (actor.velocityX > 4) {
    return 1;
  }

  if (actor.velocityX < -4) {
    return -1;
  }

  return preferredFacing;
}

export function stepRoundSimulation(
  state: RoundSimulationState,
  input: InputState,
  deltaMs: number,
  dependencies: RunSimulationDependencies
): StepSimulationResult {
  if (state.status !== "running" || state.paused) {
    return { becameComplete: false };
  }

  const deltaSeconds = deltaMs / 1000;
  const hadRunningStatus = state.status === "running";
  const isResting = input.restHeld;
  const canPull = input.pullHeld && !isResting && state.stamina > 0;
  state.stamina = dependencies.ownerStaminaSystem.update(state.stamina, deltaSeconds, {
    isPulling: canPull,
    isResting
  });

  const ownerTargetVelocity = isResting
    ? 0
    : RUN_TUNING.baseOwnerSpeed +
      (input.moveHeld ? RUN_TUNING.moveBoostSpeed : 0) +
      (canPull ? RUN_TUNING.pullBoostSpeed : 0);

  state.owner.velocityX = approachVelocity(
    state.owner.velocityX,
    ownerTargetVelocity,
    isResting ? RUN_TUNING.ownerRestDeceleration : RUN_TUNING.ownerAcceleration,
    deltaSeconds
  );

  const destinationDistance = Math.max(0, state.definition.destinationX - state.dog.x);
  const dogBehavior = dependencies.dogBehaviorSystem.update(state, {
    deltaMs,
    destinationDistance,
    isOwnerPulling: canPull,
    isOwnerResting: isResting,
    isOwnerMoving: input.moveHeld
  });

  state.dog.velocityX = approachVelocity(
    state.dog.velocityX,
    dogBehavior.desiredVelocityX,
    RUN_TUNING.dogAcceleration,
    deltaSeconds
  );

  const leashResolution = dependencies.leashSystem.simulate(
    state.owner,
    state.dog,
    deltaSeconds
  );

  state.owner.x = Math.max(state.definition.startX - 24, leashResolution.ownerX);
  state.dog.x = Math.max(state.definition.startX, leashResolution.dogX);
  state.owner.velocityX = leashResolution.ownerVelocityX;
  state.dog.velocityX = leashResolution.dogVelocityX;
  state.owner.facing = getFacingDirection(state.owner);
  state.dog.facing = getDogFacingDirection(state.dog, dogBehavior.preferredFacing);
  state.leashDistance = leashResolution.distance;
  state.leashSlack = leashResolution.slack;
  state.leashStretch = leashResolution.stretch;
  state.leashTension = leashResolution.tension;

  dependencies.roundManager.advanceTime(state, deltaMs);
  dependencies.roundManager.syncProgress(state);

  return {
    becameComplete: hadRunningStatus && state.status !== "running"
  };
}
