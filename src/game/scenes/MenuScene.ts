import Phaser from "phaser";
import { ROUND_DEFINITIONS } from "../data/rounds";
import { SCENE_KEYS } from "../config/sceneKeys";
import { VIEWPORT } from "../config/tuning";
import { SaveProgressSystem } from "../systems/SaveProgressSystem";
import { SessionFlowSystem } from "../systems/SessionFlowSystem";

export class MenuScene extends Phaser.Scene {
  private readonly saveProgressSystem = new SaveProgressSystem();
  private readonly sessionFlowSystem = new SessionFlowSystem(ROUND_DEFINITIONS);

  constructor() {
    super(SCENE_KEYS.menu);
  }

  create(): void {
    const savedSession = this.saveProgressSystem.readSession();
    const resumableSession =
      savedSession && !savedSession.isComplete ? savedSession : null;

    this.cameras.main.setBackgroundColor("#f7efe2");

    this.add
      .text(VIEWPORT.width * 0.5, 150, "Shiba Walk", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "58px",
        fontStyle: "bold",
        color: "#3f2d1f"
      })
      .setOrigin(0.5);

    this.add
      .text(
        VIEWPORT.width * 0.5,
        245,
        "Six-round session\nPark • Cafe • Pet shop • Restaurant patio • Dog park • Home",
        {
          align: "center",
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "28px",
          color: "#5b4636",
          lineSpacing: 14
        }
      )
      .setOrigin(0.5);

    if (resumableSession) {
      const roundName =
        ROUND_DEFINITIONS[resumableSession.currentRoundIndex]?.name ??
        ROUND_DEFINITIONS[0].name;

      this.add
        .text(
          VIEWPORT.width * 0.5,
          332,
          `Saved progress: round ${resumableSession.currentRoundIndex + 1}/${ROUND_DEFINITIONS.length} • ${roundName}\nSession score: ${resumableSession.totalScore}`,
          {
            align: "center",
            fontFamily: "Trebuchet MS, sans-serif",
            fontSize: "22px",
            color: "#6b5743",
            lineSpacing: 10
          }
        )
        .setOrigin(0.5);
    }

    const primaryLabel = resumableSession ? "RESUME WALK" : "START SESSION";
    const primaryButton = this.add
      .rectangle(VIEWPORT.width * 0.5, 440, 320, 88, 0xf4a261)
      .setStrokeStyle(3, 0x8f5428)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(primaryButton.x, primaryButton.y, primaryLabel, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "30px",
        color: "#2f2218"
      })
      .setOrigin(0.5);

    const launchRun = (): void => {
      if (!this.scene.isActive(SCENE_KEYS.ui)) {
        this.scene.launch(SCENE_KEYS.ui);
      }

      this.scene.start(SCENE_KEYS.run);
    };

    const startNewSession = (): void => {
      this.saveProgressSystem.saveSession(this.sessionFlowSystem.createNewSession());
      launchRun();
    };

    primaryButton.on(
      Phaser.Input.Events.POINTER_DOWN,
      resumableSession ? launchRun : startNewSession
    );

    if (resumableSession) {
      const secondaryButton = this.add
        .rectangle(VIEWPORT.width * 0.5, 546, 260, 72, 0xd9c2a3)
        .setStrokeStyle(2, 0x8c6a43)
        .setInteractive({ useHandCursor: true });

      this.add
        .text(secondaryButton.x, secondaryButton.y, "NEW SESSION", {
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "26px",
          color: "#4b3624"
        })
        .setOrigin(0.5);

      secondaryButton.on(Phaser.Input.Events.POINTER_DOWN, startNewSession);
    }

    this.input.keyboard?.once(
      "keydown-ENTER",
      resumableSession ? launchRun : startNewSession
    );
  }
}
