import { describe, expect, it } from "vitest";
import { ROUND_DEFINITIONS } from "../data/rounds";
import type { ActiveDistractionState } from "../types/gameplay";
import { DogBehaviorSystem } from "./DogBehaviorSystem";
import { RoundManager } from "./RoundManager";

function createDistraction(
  overrides: Partial<ActiveDistractionState> & Pick<ActiveDistractionState, "kind">
): ActiveDistractionState {
  const base: ActiveDistractionState = {
    id: `${overrides.kind}-1`,
    kind: overrides.kind,
    label: overrides.kind,
    x: 420,
    velocityX: 0,
    direction: 1,
    remainingMs: 3000,
    durationMs: 3000,
    influenceRadius: 260,
    isGlobal: false,
    subtitleId: "cat_crossing"
  };

  return {
    ...base,
    ...overrides
  };
}

describe("DogBehaviorSystem", () => {
  it("defaults to go_to_destination under normal walking pressure", () => {
    const system = new DogBehaviorSystem();
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(100);

    state.dog.velocityX = 64;
    state.owner.velocityX = 108;

    const output = system.update(state, {
      deltaMs: 100,
      destinationDistance: state.definition.destinationX - state.dog.x,
      isOwnerPulling: false,
      isOwnerResting: false,
      isOwnerMoving: true
    });

    expect(state.dogIntent).toBe("go_to_destination");
    expect(state.dogLocomotionState).toBe("walk_forward");
    expect(output.desiredVelocityX).toBeGreaterThan(0);
  });

  it("switches into refuse_to_walk and barks when pull pressure spikes", () => {
    const system = new DogBehaviorSystem();
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(28);

    state.dogPullPressure = 0.88;
    state.leashTension = 0.82;
    state.dogIntentElapsedMs = 1600;

    system.update(state, {
      deltaMs: 100,
      destinationDistance: state.definition.destinationX - state.dog.x,
      isOwnerPulling: true,
      isOwnerResting: false,
      isOwnerMoving: true
    });

    expect(state.dogIntent).toBe("refuse_to_walk");
    expect(state.dogLocomotionState).toBe("bark_one_shot");
  });

  it("enters recover_after_pull after a strong pulling release", () => {
    const system = new DogBehaviorSystem();
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(24);

    state.dogPullPressure = 0.62;
    state.leashTension = 0.12;
    state.ownerPullingLastFrame = true;
    state.dogIntentElapsedMs = 1600;

    system.update(state, {
      deltaMs: 100,
      destinationDistance: state.definition.destinationX - state.dog.x,
      isOwnerPulling: false,
      isOwnerResting: true,
      isOwnerMoving: false
    });

    expect(state.dogIntent).toBe("recover_after_pull");
    expect(state.dogLocomotionState).toBe("tired_recover");
    expect(state.dogRecentPullReleaseMs).toBeGreaterThan(0);
  });

  it("can choose idle_sniff during calm curiosity windows", () => {
    const system = new DogBehaviorSystem();
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(100);

    state.elapsedMs = 250;
    state.progress = 0.08;
    state.owner.velocityX = 0;
    state.dog.velocityX = 0;
    state.leashTension = 0;
    state.dogIntentElapsedMs = 1600;

    system.update(state, {
      deltaMs: 100,
      destinationDistance: state.definition.destinationX - state.dog.x,
      isOwnerPulling: false,
      isOwnerResting: true,
      isOwnerMoving: false
    });

    expect(state.dogIntent).toBe("idle_sniff");
    expect(state.dogLocomotionState).toBe("idle");
  });

  it("chases a cat in the cat's travel direction", () => {
    const system = new DogBehaviorSystem();
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(100);

    state.dog.x = 520;
    state.activeDistractions = [
      createDistraction({
        kind: "cat",
        x: 560,
        direction: -1,
        velocityX: -210,
        subtitleId: "cat_crossing"
      })
    ];
    state.dogIntentElapsedMs = 1600;

    const output = system.update(state, {
      deltaMs: 100,
      destinationDistance: state.definition.destinationX - state.dog.x,
      isOwnerPulling: false,
      isOwnerResting: false,
      isOwnerMoving: true
    });

    expect(state.dogIntent).toBe("chase_cat");
    expect(output.desiredVelocityX).toBeLessThan(0);
    expect(output.preferredFacing).toBe(-1);
  });

  it("approaches a nearby small dog and owner", () => {
    const system = new DogBehaviorSystem();
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(100);

    state.dog.x = 420;
    state.activeDistractions = [
      createDistraction({
        kind: "small_dog_owner",
        x: 510,
        subtitleId: "small_dog_owner"
      })
    ];
    state.dogIntentElapsedMs = 1600;

    const output = system.update(state, {
      deltaMs: 100,
      destinationDistance: state.definition.destinationX - state.dog.x,
      isOwnerPulling: false,
      isOwnerResting: false,
      isOwnerMoving: false
    });

    expect(state.dogIntent).toBe("approach_small_dog");
    expect(output.desiredVelocityX).toBeGreaterThan(0);
  });

  it("avoids a nearby large dog and owner", () => {
    const system = new DogBehaviorSystem();
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(100);

    state.dog.x = 520;
    state.activeDistractions = [
      createDistraction({
        kind: "large_dog_owner",
        x: 590,
        subtitleId: "large_dog_owner"
      })
    ];
    state.dogIntentElapsedMs = 1600;

    const output = system.update(state, {
      deltaMs: 100,
      destinationDistance: state.definition.destinationX - state.dog.x,
      isOwnerPulling: false,
      isOwnerResting: false,
      isOwnerMoving: true
    });

    expect(state.dogIntent).toBe("avoid_large_dog");
    expect(output.desiredVelocityX).toBeLessThan(0);
  });

  it("biases strongly toward home when rain starts", () => {
    const system = new DogBehaviorSystem();
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(62);

    state.dog.x = 760;
    state.progress = 0.42;
    state.activeDistractions = [
      createDistraction({
        kind: "rain",
        x: state.dog.x,
        isGlobal: true,
        influenceRadius: 2800,
        subtitleId: "rain_starts"
      })
    ];
    state.dogIntentElapsedMs = 1800;

    const output = system.update(state, {
      deltaMs: 100,
      destinationDistance: state.definition.destinationX - state.dog.x,
      isOwnerPulling: false,
      isOwnerResting: false,
      isOwnerMoving: true
    });

    expect(state.dogIntent).toBe("go_home_due_to_rain");
    expect(output.desiredVelocityX).toBeLessThan(0);
    expect(output.preferredFacing).toBe(-1);
  });

  it("uses treat guidance to stay on-mission instead of chasing a cat", () => {
    const system = new DogBehaviorSystem();
    const state = new RoundManager(ROUND_DEFINITIONS[0]).createInitialState(100);

    state.dog.x = 520;
    state.treatGuidanceRemainingMs = 2400;
    state.activeDistractions = [
      createDistraction({
        kind: "cat",
        x: 552,
        direction: 1,
        velocityX: 210,
        subtitleId: "cat_crossing"
      })
    ];
    state.dogIntentElapsedMs = 1600;

    const output = system.update(state, {
      deltaMs: 100,
      destinationDistance: state.definition.destinationX - state.dog.x,
      isOwnerPulling: false,
      isOwnerResting: false,
      isOwnerMoving: true
    });

    expect(state.dogIntent).toBe("go_to_destination");
    expect(output.desiredVelocityX).toBeGreaterThan(0);
  });
});
