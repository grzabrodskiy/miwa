export interface AccessibilitySettings {
  muted: boolean;
  subtitlesEnabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  muted: false,
  subtitlesEnabled: true,
  reducedMotion: false,
  highContrast: false
};
