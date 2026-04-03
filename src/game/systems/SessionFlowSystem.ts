import type { RoundDefinition } from "../data/rounds";
import type {
  PersistedRoundResult,
  RoundAttemptMetrics,
  RoundFinishedSummary,
  SessionProgress
} from "../types/session";

export class SessionFlowSystem {
  constructor(private readonly rounds: RoundDefinition[]) {}

  createNewSession(): SessionProgress {
    return {
      currentRoundIndex: 0,
      totalRounds: this.rounds.length,
      totalScore: 0,
      isComplete: false,
      completedRoundResults: [],
      updatedAt: new Date().toISOString()
    };
  }

  getCurrentRound(session: SessionProgress): RoundDefinition {
    const safeIndex = Math.max(
      0,
      Math.min(session.currentRoundIndex, this.rounds.length - 1)
    );

    return this.rounds[safeIndex]!;
  }

  resolveRound(
    session: SessionProgress,
    metrics: RoundAttemptMetrics
  ): { session: SessionProgress; summary: RoundFinishedSummary } {
    const round = this.getCurrentRound(session);
    const score = this.computeRoundScore(metrics);
    const summaryTitle = metrics.success
      ? round.summary.winTitle
      : round.summary.failTitle;
    const summaryBody = metrics.success
      ? round.summary.winBody
      : round.summary.failBody;

    const baseResult: PersistedRoundResult = {
      roundId: round.id,
      destinationLabel: round.name,
      success: metrics.success,
      remainingMs: metrics.remainingMs,
      durationMs: metrics.durationMs,
      staminaUsed: Math.round(metrics.staminaUsed * 10) / 10,
      majorDistractionEvents: metrics.majorDistractionEvents,
      score,
      summaryTitle,
      summaryBody,
      backgroundThemeName: round.backgroundTheme.name
    };

    if (!metrics.success) {
      return {
        session: {
          ...session,
          updatedAt: new Date().toISOString()
        },
        summary: {
          ...baseResult,
          roundIndex: session.currentRoundIndex + 1,
          totalRounds: this.rounds.length,
          totalScore: session.totalScore,
          sessionComplete: false,
          nextRoundLabel: round.name
        }
      };
    }

    const isFinalRound = session.currentRoundIndex >= this.rounds.length - 1;
    const nextRoundIndex = Math.min(
      session.currentRoundIndex + 1,
      this.rounds.length - 1
    );
    const updatedSession: SessionProgress = {
      currentRoundIndex: nextRoundIndex,
      totalRounds: this.rounds.length,
      totalScore: session.totalScore + score,
      isComplete: isFinalRound,
      completedRoundResults: [...session.completedRoundResults, baseResult],
      updatedAt: new Date().toISOString()
    };

    return {
      session: updatedSession,
      summary: {
        ...baseResult,
        roundIndex: session.currentRoundIndex + 1,
        totalRounds: this.rounds.length,
        totalScore: updatedSession.totalScore,
        sessionComplete: updatedSession.isComplete,
        nextRoundLabel: updatedSession.isComplete
          ? undefined
          : this.rounds[nextRoundIndex]?.name
      }
    };
  }

  private computeRoundScore(metrics: RoundAttemptMetrics): number {
    const progressScore = metrics.progress * 220;
    const completionBonus = metrics.success ? 420 : 0;
    const timeBonus = metrics.success
      ? (metrics.remainingMs / metrics.durationMs) * 240
      : 0;
    const staminaBonus = Math.max(0, 140 - metrics.staminaUsed) * 0.85;
    const distractionBonus = Math.max(
      0,
      60 - metrics.majorDistractionEvents.length * 8
    );

    return Math.round(
      progressScore + completionBonus + timeBonus + staminaBonus + distractionBonus
    );
  }
}
