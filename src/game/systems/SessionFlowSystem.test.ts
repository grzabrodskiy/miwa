import { describe, expect, it } from "vitest";
import { ROUND_DEFINITIONS } from "../data/rounds";
import { SessionFlowSystem } from "./SessionFlowSystem";

describe("SessionFlowSystem", () => {
  it("advances the session after a successful round", () => {
    const system = new SessionFlowSystem(ROUND_DEFINITIONS);
    const session = system.createNewSession();

    const resolution = system.resolveRound(session, {
      success: true,
      remainingMs: 8000,
      durationMs: ROUND_DEFINITIONS[0]!.durationSeconds * 1000,
      staminaUsed: 32,
      majorDistractionEvents: ["Cat", "Rain"],
      progress: 1
    });

    expect(resolution.session.currentRoundIndex).toBe(1);
    expect(resolution.session.completedRoundResults).toHaveLength(1);
    expect(resolution.summary.nextRoundLabel).toBe(ROUND_DEFINITIONS[1]!.name);
    expect(resolution.summary.totalScore).toBeGreaterThan(0);
  });

  it("keeps the same round index after a failed round", () => {
    const system = new SessionFlowSystem(ROUND_DEFINITIONS);
    const session = system.createNewSession();

    const resolution = system.resolveRound(session, {
      success: false,
      remainingMs: 0,
      durationMs: ROUND_DEFINITIONS[0]!.durationSeconds * 1000,
      staminaUsed: 58,
      majorDistractionEvents: ["Large Dog"],
      progress: 0.66
    });

    expect(resolution.session.currentRoundIndex).toBe(0);
    expect(resolution.session.completedRoundResults).toHaveLength(0);
    expect(resolution.summary.sessionComplete).toBe(false);
    expect(resolution.summary.totalScore).toBe(0);
  });

  it("marks the session complete after the final home round", () => {
    const system = new SessionFlowSystem(ROUND_DEFINITIONS);
    let session = system.createNewSession();

    for (let index = 0; index < ROUND_DEFINITIONS.length; index += 1) {
      const resolution = system.resolveRound(session, {
        success: true,
        remainingMs: 5000,
        durationMs: ROUND_DEFINITIONS[index]!.durationSeconds * 1000,
        staminaUsed: 24,
        majorDistractionEvents: ["None"],
        progress: 1
      });

      session = resolution.session;
    }

    expect(session.isComplete).toBe(true);
    expect(session.completedRoundResults).toHaveLength(ROUND_DEFINITIONS.length);
    expect(session.totalScore).toBeGreaterThan(0);
  });
});
