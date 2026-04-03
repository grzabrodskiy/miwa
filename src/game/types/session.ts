export interface PersistedRoundResult {
  roundId: string;
  destinationLabel: string;
  success: boolean;
  remainingMs: number;
  durationMs: number;
  staminaUsed: number;
  majorDistractionEvents: string[];
  score: number;
  summaryTitle: string;
  summaryBody: string;
  backgroundThemeName: string;
}

export interface SessionProgress {
  currentRoundIndex: number;
  totalRounds: number;
  totalScore: number;
  isComplete: boolean;
  completedRoundResults: PersistedRoundResult[];
  updatedAt: string;
}

export interface RoundAttemptMetrics {
  success: boolean;
  remainingMs: number;
  durationMs: number;
  staminaUsed: number;
  majorDistractionEvents: string[];
  progress: number;
}

export interface RoundFinishedSummary extends PersistedRoundResult {
  roundIndex: number;
  totalRounds: number;
  totalScore: number;
  sessionComplete: boolean;
  nextRoundLabel?: string;
}
