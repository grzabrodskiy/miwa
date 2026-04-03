import type { RoundFinishedSummary, SessionProgress } from "../types/session";

const SESSION_STORAGE_KEY = "shiba-walk:session-progress";
const SUMMARY_STORAGE_KEY = "shiba-walk:last-summary";

export class SaveProgressSystem {
  saveSession(session: SessionProgress): void {
    this.getStorage()?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  readSession(): SessionProgress | null {
    return this.readJson<SessionProgress>(SESSION_STORAGE_KEY);
  }

  clearSession(): void {
    this.getStorage()?.removeItem(SESSION_STORAGE_KEY);
  }

  saveLastSummary(summary: RoundFinishedSummary): void {
    this.getStorage()?.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summary));
  }

  readLastSummary(): RoundFinishedSummary | null {
    return this.readJson<RoundFinishedSummary>(SUMMARY_STORAGE_KEY);
  }

  private readJson<T>(key: string): T | null {
    const storage = this.getStorage();

    if (!storage) {
      return null;
    }

    const stored = storage.getItem(key);

    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as T;
    } catch {
      return null;
    }
  }

  private getStorage(): Storage | null {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage;
  }
}
