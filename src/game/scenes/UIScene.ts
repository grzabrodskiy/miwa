import Phaser from "phaser";
import {
  GAME_EVENT_KEYS,
  type HUDStatePayload,
  type SettingsChangedPayload,
  type SubtitleCuePayload,
  gameEvents
} from "../events";
import { SCENE_KEYS } from "../config/sceneKeys";
import { UI_TUNING, VIEWPORT } from "../config/tuning";
import { formatTime } from "../utils/formatTime";
import { accessibilitySettingsSystem } from "../systems/AccessibilitySettingsSystem";
import type { AccessibilitySettings } from "../types/accessibility";

export class UIScene extends Phaser.Scene {
  private timerPanel!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private staminaLabel!: Phaser.GameObjects.Text;
  private staminaFrame!: Phaser.GameObjects.Rectangle;
  private staminaBar!: Phaser.GameObjects.Rectangle;
  private hintText!: Phaser.GameObjects.Text;
  private subtitlePanel!: Phaser.GameObjects.Rectangle;
  private subtitleText!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private pauseDimmer!: Phaser.GameObjects.Rectangle;
  private pauseCard!: Phaser.GameObjects.Rectangle;
  private pauseTitle!: Phaser.GameObjects.Text;
  private pauseBody!: Phaser.GameObjects.Text;
  private pauseResumeButton!: Phaser.GameObjects.Rectangle;
  private pauseResumeLabel!: Phaser.GameObjects.Text;
  private subtitleHideCall?: Phaser.Time.TimerEvent;
  private settings: AccessibilitySettings = accessibilitySettingsSystem.getSettings();
  private staminaBarWidth = 280;
  private lastHudPayload?: HUDStatePayload;

  constructor() {
    super(SCENE_KEYS.ui);
  }

  create(): void {
    this.timerPanel = this.add
      .rectangle(0, 0, 360, 68, 0x102027, 0.24)
      .setStrokeStyle(2, 0xfff4d6, 0.28)
      .setScrollFactor(0)
      .setDepth(110)
      .setInteractive({ useHandCursor: true });

    this.timerText = this.add
      .text(0, 0, "0:00 • Destination", {
        align: "center",
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "28px",
        color: "#fffaf4",
        fontStyle: "bold",
        lineSpacing: 4
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(111)
      .setInteractive({ useHandCursor: true });

    this.staminaLabel = this.add
      .text(0, 0, "Stamina", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#fffaf4",
        fontStyle: "bold"
      })
      .setScrollFactor(0)
      .setDepth(110);

    this.staminaFrame = this.add
      .rectangle(0, 0, this.staminaBarWidth, 16, 0x102027, 0.18)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xfff4d6, 0.24)
      .setScrollFactor(0)
      .setDepth(110);

    this.staminaBar = this.add
      .rectangle(0, 0, this.staminaBarWidth, 16, 0xf4a261, 0.9)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(111);

    this.hintText = this.add
      .text(0, 0, "", {
        align: "right",
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#fff4dc"
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(110);

    this.subtitlePanel = this.add
      .rectangle(0, 0, 700, UI_TUNING.subtitlePanelMinHeight, 0x102027, 0.42)
      .setOrigin(0.5)
      .setStrokeStyle(1, 0xfff4d6, 0.22)
      .setScrollFactor(0)
      .setDepth(209)
      .setVisible(false);

    this.subtitleText = this.add
      .text(0, 0, "", {
        align: "center",
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "22px",
        color: "#fffaf4"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(210)
      .setVisible(false);

    this.pauseDimmer = this.add
      .rectangle(0, 0, VIEWPORT.width, VIEWPORT.height, 0x0c1318, 0.32)
      .setInteractive({ useHandCursor: true });
    this.pauseCard = this.add
      .rectangle(0, 0, 360, 116, 0x102027, 0.56)
      .setStrokeStyle(2, 0xfff4d6, 0.24)
      .setInteractive({ useHandCursor: true });
    this.pauseTitle = this.add
      .text(0, -58, "Paused", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "34px",
        color: "#fffaf4",
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    this.pauseBody = this.add
      .text(0, -2, "Tap anywhere to resume.", {
        align: "center",
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "20px",
        color: "#fffaf4",
        wordWrap: { width: 320 }
      })
      .setOrigin(0.5);
    this.pauseResumeButton = this.add
      .rectangle(0, 34, 172, 42, 0xf4a261, 0.28)
      .setStrokeStyle(2, 0xfff4d6, 0.38)
      .setInteractive({ useHandCursor: true });
    this.pauseResumeLabel = this.add
      .text(0, 34, "RESUME", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "20px",
        color: "#fffaf4",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.timerPanel.on(Phaser.Input.Events.POINTER_DOWN, () => {
      gameEvents.emit(GAME_EVENT_KEYS.pauseRequested);
    });
    this.timerText.on(Phaser.Input.Events.POINTER_DOWN, () => {
      gameEvents.emit(GAME_EVENT_KEYS.pauseRequested);
    });
    this.pauseDimmer.on(Phaser.Input.Events.POINTER_DOWN, () => {
      gameEvents.emit(GAME_EVENT_KEYS.pauseRequested);
    });
    this.pauseCard.on(Phaser.Input.Events.POINTER_DOWN, () => {
      gameEvents.emit(GAME_EVENT_KEYS.pauseRequested);
    });
    this.pauseResumeButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      gameEvents.emit(GAME_EVENT_KEYS.pauseRequested);
    });

    this.pauseOverlay = this.add.container(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, [
      this.pauseDimmer,
      this.pauseCard,
      this.pauseTitle,
      this.pauseBody,
      this.pauseResumeButton,
      this.pauseResumeLabel
    ]);
    this.pauseOverlay.setVisible(false).setScrollFactor(0).setDepth(200);

    this.layoutUi();
    this.applyAccessibilityStyles();

    gameEvents.on(GAME_EVENT_KEYS.hudUpdated, this.handleHudUpdated, this);
    gameEvents.on(GAME_EVENT_KEYS.pauseChanged, this.handlePauseChanged, this);
    gameEvents.on(GAME_EVENT_KEYS.subtitleQueued, this.handleSubtitleQueued, this);
    gameEvents.on(GAME_EVENT_KEYS.settingsChanged, this.handleSettingsChanged, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layoutUi, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private layoutUi(): void {
    const width = this.scale.width || VIEWPORT.width;
    const height = this.scale.height || VIEWPORT.height;
    const isCompact =
      width <= UI_TUNING.compactBreakpointWidth ||
      height <= UI_TUNING.compactBreakpointHeight;
    const padding = isCompact ? UI_TUNING.hudCompactPadding : UI_TUNING.hudPadding;
    const timerWidth = isCompact ? 300 : 360;
    const timerHeight = isCompact ? 56 : 64;

    this.staminaBarWidth = isCompact ? 144 : 184;
    this.timerPanel.setSize(timerWidth, timerHeight).setDisplaySize(timerWidth, timerHeight);
    this.timerPanel.setPosition(width * 0.5, padding + timerHeight * 0.5);
    this.timerText
      .setPosition(width * 0.5, padding + timerHeight * 0.5)
      .setStyle({ fontSize: isCompact ? "22px" : "26px" });

    this.staminaLabel
      .setPosition(padding, padding + timerHeight + 6)
      .setStyle({ fontSize: isCompact ? "15px" : "17px" });
    this.staminaFrame.setPosition(padding + 72, padding + timerHeight + 16);
    this.staminaFrame.setSize(this.staminaBarWidth, 16).setDisplaySize(this.staminaBarWidth, 16);
    this.staminaBar.setPosition(this.staminaFrame.x, this.staminaFrame.y);

    this.hintText
      .setPosition(width - padding, padding + timerHeight + 2)
      .setStyle({ fontSize: isCompact ? "15px" : "17px" });

    this.layoutSubtitle(width, height, isCompact, padding);

    this.pauseOverlay.setPosition(width * 0.5, height * 0.5);
    this.pauseDimmer.setSize(width, height).setDisplaySize(width, height);
    this.pauseCard
      .setSize(Math.min(width - padding * 2, isCompact ? 320 : 360), isCompact ? 108 : 116)
      .setDisplaySize(Math.min(width - padding * 2, isCompact ? 320 : 360), isCompact ? 108 : 116);
    this.pauseTitle.setPosition(0, isCompact ? -24 : -26).setStyle({ fontSize: isCompact ? "30px" : "34px" });
    this.pauseBody
      .setPosition(0, 0)
      .setStyle({
        fontSize: isCompact ? "18px" : "20px",
        wordWrap: { width: Math.min(width - padding * 2, 320) }
      })
      .setText(isCompact ? "Tap to resume." : "Tap to resume or press Esc.");
    this.pauseResumeButton
      .setPosition(0, isCompact ? 30 : 34)
      .setSize(isCompact ? 152 : 172, 42)
      .setDisplaySize(isCompact ? 152 : 172, 42);
    this.pauseResumeLabel
      .setPosition(0, isCompact ? 30 : 34)
      .setStyle({ fontSize: isCompact ? "18px" : "20px" });

    if (this.lastHudPayload) {
      this.updateHudVisuals(this.lastHudPayload);
    }
  }

  private layoutSubtitle(
    width: number,
    height: number,
    isCompact: boolean,
    padding: number
  ): void {
    const subtitleWidth = Math.min(
      width - padding * 2,
      isCompact ? UI_TUNING.subtitleCompactMaxWidth : UI_TUNING.subtitleMaxWidth
    );
    const subtitleY =
      height -
      (isCompact ? UI_TUNING.subtitleCompactBottomInset : UI_TUNING.subtitleBottomInset);

    this.subtitleText.setStyle({
      fontSize: isCompact ? "18px" : "20px",
      wordWrap: { width: subtitleWidth - 24 }
    });

    const minHeight = isCompact
      ? UI_TUNING.subtitleCompactPanelMinHeight
      : UI_TUNING.subtitlePanelMinHeight;
    const panelHeight = Math.max(minHeight, this.subtitleText.height + 14);

    this.subtitlePanel
      .setPosition(width * 0.5, subtitleY)
      .setSize(subtitleWidth, panelHeight)
      .setDisplaySize(subtitleWidth, panelHeight);
    this.subtitleText.setPosition(width * 0.5, subtitleY);
  }

  private applyAccessibilityStyles(): void {
    const highContrast = this.settings.highContrast;
    const hudPanelColor = highContrast ? 0xffffff : 0x102027;
    const hudStroke = highContrast ? 0x111111 : 0xfff4d6;
    const hudTextColor = highContrast ? "#111111" : "#fffaf4";
    const mutedTextColor = highContrast ? "#1b1b1b" : "#fff0dd";
    const subtitleFill = highContrast ? 0x000000 : 0x1f2429;
    const subtitleStroke = highContrast ? 0xffffff : 0xffffff;
    const pauseFill = highContrast ? 0xffffff : 0x102027;
    const pauseTextColor = highContrast ? "#111111" : "#fffaf4";
    const pauseButtonFill = highContrast ? 0xffd200 : 0xf4a261;
    const pauseButtonStroke = highContrast ? 0x111111 : 0xfff4d6;

    this.timerPanel.setFillStyle(hudPanelColor, highContrast ? 0.88 : 0.26).setStrokeStyle(2, hudStroke, highContrast ? 1 : 0.28);
    this.timerText.setColor(hudTextColor);
    this.staminaLabel.setColor(hudTextColor);
    this.staminaFrame.setStrokeStyle(2, hudStroke, highContrast ? 1 : 0.24).setFillStyle(highContrast ? 0xffffff : 0x102027, highContrast ? 1 : 0.18);
    this.hintText.setColor(mutedTextColor);
    this.subtitlePanel
      .setFillStyle(subtitleFill, highContrast ? 0.88 : 0.42)
      .setStrokeStyle(1, subtitleStroke, highContrast ? 0.9 : 0.22);
    this.subtitleText.setColor(highContrast ? "#fffef2" : "#fffaf4");
    this.pauseCard.setFillStyle(pauseFill, highContrast ? 0.88 : 0.56).setStrokeStyle(2, subtitleStroke, highContrast ? 0.8 : 0.24);
    this.pauseDimmer.setFillStyle(highContrast ? 0xffffff : 0x0c1318, highContrast ? 0.54 : 0.32);
    this.pauseTitle.setColor(pauseTextColor);
    this.pauseBody.setColor(pauseTextColor);
    this.pauseResumeButton.setFillStyle(pauseButtonFill, highContrast ? 0.92 : 0.28).setStrokeStyle(2, pauseButtonStroke, highContrast ? 1 : 0.38);
    this.pauseResumeLabel.setColor(pauseTextColor);

    if (!this.settings.subtitlesEnabled) {
      this.subtitlePanel.setVisible(false);
      this.subtitleText.setVisible(false);
    }
  }

  private updateHudVisuals(payload: HUDStatePayload): void {
    const screamText = payload.screamCooldownRemainingMs <= 0 ? "YIP ready" : "YIP cooling";
    const isCompact =
      (this.scale.width || VIEWPORT.width) <= UI_TUNING.compactBreakpointWidth ||
      (this.scale.height || VIEWPORT.height) <= UI_TUNING.compactBreakpointHeight;

    this.timerText.setText(`${formatTime(payload.remainingMs)} • ${payload.destinationLabel}`);
    this.staminaBar.width = this.staminaBarWidth * (payload.stamina / 100);
    this.hintText.setText(
      isCompact
        ? `x${payload.availableTreats} treats • ${screamText}`
        : `Treats x${payload.availableTreats} • ${screamText} • tap time to pause`
    );
    this.pauseOverlay.setVisible(payload.paused);
  }

  private handleHudUpdated(payload: HUDStatePayload): void {
    this.lastHudPayload = payload;
    this.updateHudVisuals(payload);
  }

  private handlePauseChanged(isPaused: boolean): void {
    this.pauseOverlay.setVisible(isPaused);
  }

  private handleSubtitleQueued(payload: SubtitleCuePayload): void {
    if (!this.settings.subtitlesEnabled) {
      return;
    }

    this.subtitleHideCall?.remove(false);
    this.subtitleText.setText(payload.text).setVisible(true);
    this.subtitlePanel.setVisible(true);
    this.layoutUi();

    this.subtitleHideCall = this.time.delayedCall(payload.durationMs, () => {
      this.subtitlePanel.setVisible(false);
      this.subtitleText.setVisible(false);
    });
  }

  private handleSettingsChanged(payload: SettingsChangedPayload): void {
    this.settings = payload;
    this.applyAccessibilityStyles();

    if (!payload.subtitlesEnabled) {
      this.subtitleHideCall?.remove(false);
      this.subtitlePanel.setVisible(false);
      this.subtitleText.setVisible(false);
    }
  }

  private handleShutdown(): void {
    gameEvents.off(GAME_EVENT_KEYS.hudUpdated, this.handleHudUpdated, this);
    gameEvents.off(GAME_EVENT_KEYS.pauseChanged, this.handlePauseChanged, this);
    gameEvents.off(GAME_EVENT_KEYS.subtitleQueued, this.handleSubtitleQueued, this);
    gameEvents.off(GAME_EVENT_KEYS.settingsChanged, this.handleSettingsChanged, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layoutUi, this);
    this.subtitleHideCall?.remove(false);
  }
}
