import Phaser from "phaser";
import type { RoundFinishedPayload } from "../events";
import { SCENE_KEYS } from "../config/sceneKeys";
import { VIEWPORT } from "../config/tuning";
import { formatTime } from "../utils/formatTime";
import { ROUND_DEFINITIONS } from "../data/rounds";
import { SaveProgressSystem } from "../systems/SaveProgressSystem";
import { SessionFlowSystem } from "../systems/SessionFlowSystem";

export class SummaryScene extends Phaser.Scene {
  private readonly saveProgressSystem = new SaveProgressSystem();
  private readonly sessionFlowSystem = new SessionFlowSystem(ROUND_DEFINITIONS);

  constructor() {
    super(SCENE_KEYS.summary);
  }

  create(data?: RoundFinishedPayload): void {
    const summary = data ?? this.saveProgressSystem.readLastSummary();

    if (!summary) {
      this.scene.start(SCENE_KEYS.menu);
      return;
    }

    const primaryLabel = summary.success
      ? summary.sessionComplete
        ? "NEW SESSION"
        : `NEXT: ${summary.nextRoundLabel?.toUpperCase() ?? "CONTINUE"}`
      : "RETRY ROUND";

    this.cameras.main.setBackgroundColor(summary.success ? "#dff5db" : "#f8e5dc");

    this.add
      .text(VIEWPORT.width * 0.5, 106, summary.summaryTitle, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "52px",
        color: "#342416"
      })
      .setOrigin(0.5);

    this.add
      .text(
        VIEWPORT.width * 0.5,
        166,
        `Round ${summary.roundIndex}/${summary.totalRounds} • ${summary.destinationLabel} • ${summary.backgroundThemeName}`,
        {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "22px",
          color: "#5b4636"
        }
      )
      .setOrigin(0.5);

    this.add
      .text(VIEWPORT.width * 0.5, 246, summary.summaryBody, {
        align: "center",
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "26px",
        color: "#4f3b2b",
        wordWrap: { width: 860 }
      })
      .setOrigin(0.5);

    const statsBox = this.add
      .rectangle(VIEWPORT.width * 0.5, 396, 760, 208, 0xfffbf5, 0.9)
      .setStrokeStyle(3, 0xd2b48c);

    this.add
      .text(statsBox.x - 340, statsBox.y - 78, "Round Summary", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "24px",
        color: "#3f2d1f"
      })
      .setOrigin(0, 0.5);

    const details = [
      `Time remaining: ${formatTime(summary.remainingMs)}`,
      `Stamina usage: ${summary.staminaUsed.toFixed(1)}`,
      `Round score: ${summary.score}`,
      `Session score: ${summary.totalScore}`,
      `Major distractions: ${summary.majorDistractionEvents.length > 0 ? summary.majorDistractionEvents.join(", ") : "None"}`
    ];

    this.add
      .text(statsBox.x - 340, statsBox.y - 34, details.join("\n"), {
        fontFamily: "Courier New, monospace",
        fontSize: "20px",
        color: "#3c3c3c",
        lineSpacing: 10,
        wordWrap: { width: 680 }
      })
      .setOrigin(0, 0);

    const primaryButton = this.add
      .rectangle(VIEWPORT.width * 0.5, 564, 360, 84, 0xf4a261)
      .setStrokeStyle(3, 0x8f5428)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(primaryButton.x, primaryButton.y, primaryLabel, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "28px",
        color: "#2f2218"
      })
      .setOrigin(0.5);

    const secondaryButton = this.add
      .rectangle(VIEWPORT.width * 0.5, 650, 220, 62, 0xe6d7c3)
      .setStrokeStyle(2, 0x8f6d4a)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(secondaryButton.x, secondaryButton.y, "MENU", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "24px",
        color: "#4b3624"
      })
      .setOrigin(0.5);

    const startRun = (): void => {
      if (summary.sessionComplete && summary.success) {
        this.saveProgressSystem.saveSession(this.sessionFlowSystem.createNewSession());
      }

      if (!this.scene.isActive(SCENE_KEYS.ui)) {
        this.scene.launch(SCENE_KEYS.ui);
      }

      this.scene.start(SCENE_KEYS.run);
    };

    primaryButton.on(Phaser.Input.Events.POINTER_DOWN, startRun);
    secondaryButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.scene.start(SCENE_KEYS.menu);
    });
    this.input.keyboard?.once("keydown-ENTER", startRun);
  }
}
