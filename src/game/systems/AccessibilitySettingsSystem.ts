import {
  DEFAULT_ACCESSIBILITY_SETTINGS,
  type AccessibilitySettings
} from "../types/accessibility";
import { GAME_EVENT_KEYS, gameEvents } from "../events";

const STORAGE_KEY = "shiba-walk:accessibility-settings";

export class AccessibilitySettingsSystem {
  private settings: AccessibilitySettings = { ...DEFAULT_ACCESSIBILITY_SETTINGS };
  private initialized = false;

  initialize(): AccessibilitySettings {
    if (this.initialized) {
      return { ...this.settings };
    }

    this.initialized = true;
    const storage = this.getStorage();

    if (storage) {
      const stored = storage.getItem(STORAGE_KEY);

      if (stored) {
        try {
          this.settings = {
            ...DEFAULT_ACCESSIBILITY_SETTINGS,
            ...(JSON.parse(stored) as Partial<AccessibilitySettings>)
          };
        } catch {
          this.settings = { ...DEFAULT_ACCESSIBILITY_SETTINGS };
        }
      }
    }

    this.applyDocumentState(this.settings);

    return { ...this.settings };
  }

  getSettings(): AccessibilitySettings {
    return this.initialize();
  }

  update(partial: Partial<AccessibilitySettings>): AccessibilitySettings {
    const nextSettings = {
      ...this.initialize(),
      ...partial
    };

    this.settings = nextSettings;
    this.getStorage()?.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
    this.applyDocumentState(nextSettings);
    gameEvents.emit(GAME_EVENT_KEYS.settingsChanged, { ...nextSettings });

    return { ...nextSettings };
  }

  private applyDocumentState(settings: AccessibilitySettings): void {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.classList.toggle("reduced-motion", settings.reducedMotion);
    root.classList.toggle("high-contrast", settings.highContrast);
    root.classList.toggle("subtitles-disabled", !settings.subtitlesEnabled);
    root.classList.toggle("muted", settings.muted);
  }

  private getStorage(): Storage | null {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage;
  }
}

export const accessibilitySettingsSystem = new AccessibilitySettingsSystem();
