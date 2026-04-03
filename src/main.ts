import "./styles.css";
import { createGame } from "./game/game";
import { GAME_EVENT_KEYS, gameEvents } from "./game/events";
import { accessibilitySettingsSystem } from "./game/systems/AccessibilitySettingsSystem";
import type { AccessibilitySettings } from "./game/types/accessibility";

type SettingKey = keyof AccessibilitySettings;

const SETTING_COPY: Record<
  SettingKey,
  {
    label: string;
    enabled: string;
    disabled: string;
  }
> = {
  muted: {
    label: "Sound",
    enabled: "Muted",
    disabled: "On"
  },
  subtitlesEnabled: {
    label: "Subtitles",
    enabled: "On",
    disabled: "Off"
  },
  reducedMotion: {
    label: "Motion",
    enabled: "Reduced",
    disabled: "Full"
  },
  highContrast: {
    label: "Contrast",
    enabled: "High",
    disabled: "Standard"
  }
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App container was not found.");
}

const settings = accessibilitySettingsSystem.initialize();

app.innerHTML = `
  <div class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Web-first Phaser prototype</p>
        <h1>Shiba Walk</h1>
      </div>
      <div class="header-meta">
        <p class="app-copy">
          Phone-first controls, subtitles, reduced motion, mute, and high-contrast
          options are all available without leaving the canvas.
        </p>
        <div class="settings-bar" aria-label="Accessibility settings">
          <button class="settings-toggle" type="button" data-setting="muted"></button>
          <button
            class="settings-toggle"
            type="button"
            data-setting="subtitlesEnabled"
          ></button>
          <button
            class="settings-toggle"
            type="button"
            data-setting="reducedMotion"
          ></button>
          <button class="settings-toggle" type="button" data-setting="highContrast"></button>
        </div>
      </div>
    </header>
    <main class="game-shell">
      <div id="game-container" class="game-container" aria-label="Shiba Walk game canvas"></div>
    </main>
  </div>
`;

const settingButtons = Array.from(
  app.querySelectorAll<HTMLButtonElement>("[data-setting]")
);

function syncSettingButtons(nextSettings: AccessibilitySettings): void {
  for (const button of settingButtons) {
    const key = button.dataset.setting as SettingKey;
    const copy = SETTING_COPY[key];
    const isEnabled = Boolean(nextSettings[key]);

    button.classList.toggle("is-active", isEnabled);
    button.setAttribute("aria-pressed", String(isEnabled));
    button.innerHTML = `
      <span class="setting-label">${copy.label}</span>
      <span class="setting-value">${isEnabled ? copy.enabled : copy.disabled}</span>
    `;
  }
}

for (const button of settingButtons) {
  button.addEventListener("click", () => {
    const key = button.dataset.setting as SettingKey;
    accessibilitySettingsSystem.update({
      [key]: !accessibilitySettingsSystem.getSettings()[key]
    });
  });
}

syncSettingButtons(settings);
gameEvents.on(GAME_EVENT_KEYS.settingsChanged, syncSettingButtons);

createGame("game-container");
