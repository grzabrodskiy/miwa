import Phaser from "phaser";
import {
  ROUND_DEFINITIONS,
  type RoundDefinition
} from "../data/rounds";
import { DISTRACTION_DEFINITIONS } from "../data/distractions";
import { GAME_EVENT_KEYS, gameEvents } from "../events";
import { SCENE_KEYS } from "../config/sceneKeys";
import {
  LEASH_TUNING,
  STAMINA_TUNING,
  UI_TUNING,
  VIEWPORT,
  WORLD
} from "../config/tuning";
import {
  CHARACTER_TEXTURE_KEYS,
  ensureCharacterTextures
} from "../actors/createCharacterTextures";
import type {
  ActiveDistractionState,
  DogLocomotionState,
  RoundSimulationState
} from "../types/gameplay";
import type { SessionProgress } from "../types/session";
import { AudioSubtitleSystem } from "../systems/AudioSubtitleSystem";
import { DistractionSpawner } from "../systems/DistractionSpawner";
import { DogBehaviorSystem } from "../systems/DogBehaviorSystem";
import { InputRouter } from "../systems/InputRouter";
import { LeashSystem } from "../systems/LeashSystem";
import { OwnerStaminaSystem } from "../systems/OwnerStaminaSystem";
import { PlayerActionSystem } from "../systems/PlayerActionSystem";
import { RoundManager } from "../systems/RoundManager";
import { SaveProgressSystem } from "../systems/SaveProgressSystem";
import { SessionFlowSystem } from "../systems/SessionFlowSystem";
import { stepRoundSimulation } from "../systems/RunSimulation";

interface RunSceneData {
  transitionMessage?: string;
}

type SpeechBubbleAnchor =
  | { kind: "owner" }
  | { kind: "shiba" }
  | { kind: "distraction"; distractionId: string; role: "animal" | "owner" };

interface SpeechBubbleState {
  anchor: SpeechBubbleAnchor;
  container: Phaser.GameObjects.Container;
  expiresAt: number;
  height: number;
  offsetX: number;
  offsetY: number;
  width: number;
}

const OWNER_RENDER = {
  width: 150,
  height: 218,
  originX: 0.5,
  originY: 0.93,
  groundOffset: 24,
  shadowOffsetY: 18
} as const;

const DOG_RENDER = {
  width: 202,
  height: 134,
  originX: 0.44,
  originY: 0.84,
  groundOffset: 22,
  shadowOffsetY: 18
} as const;

const DOG_LEG_RENDER = {
  width: 22,
  height: 58,
  originX: 0.5,
  originY: 0.12
} as const;

const BUBBLE_TUNING = {
  durationMs: 2000,
  margin: 16
} as const;

export class RunScene extends Phaser.Scene {
  private readonly ownerStaminaSystem = new OwnerStaminaSystem(
    STAMINA_TUNING.max,
    STAMINA_TUNING.pullDrainPerSecond,
    STAMINA_TUNING.recoverPerSecond
  );
  private readonly leashSystem = new LeashSystem(
    LEASH_TUNING.slackDistance,
    LEASH_TUNING.maxStretchDistance,
    LEASH_TUNING.springStrength,
    LEASH_TUNING.dampingStrength,
    LEASH_TUNING.ownerMass,
    LEASH_TUNING.dogMass
  );
  private readonly dogBehaviorSystem = new DogBehaviorSystem();
  private readonly distractionSpawner = new DistractionSpawner();
  private readonly audioSubtitleSystem = new AudioSubtitleSystem();
  private readonly playerActionSystem = new PlayerActionSystem();
  private readonly saveProgressSystem = new SaveProgressSystem();
  private readonly sessionFlowSystem = new SessionFlowSystem(ROUND_DEFINITIONS);
  private readonly distractionVisuals = new Map<string, Phaser.GameObjects.Container>();
  private readonly roundDistractionCounts = new Map<string, number>();

  private sessionProgress!: SessionProgress;
  private roundDefinition!: RoundDefinition;
  private roundManager!: RoundManager;
  private state!: RoundSimulationState;
  private inputRouter!: InputRouter;
  private ownerShadow!: Phaser.GameObjects.Ellipse;
  private ownerSprite!: Phaser.GameObjects.Image;
  private dogShadow!: Phaser.GameObjects.Ellipse;
  private dogBackLegs!: Phaser.GameObjects.Image[];
  private dogFrontLegs!: Phaser.GameObjects.Image[];
  private dogSprite!: Phaser.GameObjects.Image;
  private dogBarkText!: Phaser.GameObjects.Text;
  private destinationMarker!: Phaser.GameObjects.Rectangle;
  private leashGraphics!: Phaser.GameObjects.Graphics;
  private cameraTarget!: Phaser.GameObjects.Zone;
  private introText!: Phaser.GameObjects.Text;
  private roundStaminaUsed = 0;
  private readonly activeSpeechBubbles = new Map<string, SpeechBubbleState>();
  private readonly reactedDistractionIds = new Set<string>();
  private ownerLeashAnchorOffsetX = 42;
  private ownerLeashAnchorOffsetY = -82;
  private dogLeashAnchorOffsetX = -42;
  private dogLeashAnchorOffsetY = -42;

  constructor() {
    super(SCENE_KEYS.run);
  }

  create(data: RunSceneData = {}): void {
    const storedSession = this.saveProgressSystem.readSession();
    this.sessionProgress =
      storedSession && !storedSession.isComplete
        ? storedSession
        : this.sessionFlowSystem.createNewSession();
    this.saveProgressSystem.saveSession(this.sessionProgress);

    this.roundDefinition = this.sessionFlowSystem.getCurrentRound(this.sessionProgress);
    this.roundManager = new RoundManager(this.roundDefinition);
    this.state = this.roundManager.createInitialState(STAMINA_TUNING.max);
    this.inputRouter = new InputRouter(this);
    ensureCharacterTextures(this);
    this.distractionSpawner.reset();
    this.destroyDistractionVisuals();
    this.destroySpeechBubbles();
    this.roundDistractionCounts.clear();
    this.reactedDistractionIds.clear();
    this.roundStaminaUsed = 0;

    const theme = this.roundDefinition.backgroundTheme;
    this.cameras.main.setBackgroundColor(colorToHex(theme.skyColor));
    this.cameras.main.setBounds(0, 0, this.roundDefinition.worldWidth, VIEWPORT.height);

    this.createWorld();
    this.createActors();
    this.createInstructionCopy(data.transitionMessage);
    this.syncActionButtons();
    this.emitHudState();

    gameEvents.on(GAME_EVENT_KEYS.pauseRequested, this.handlePauseRequested, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroyDistractionVisuals();
      this.destroySpeechBubbles();
      this.reactedDistractionIds.clear();
      this.roundDistractionCounts.clear();
      gameEvents.off(GAME_EVENT_KEYS.pauseRequested, this.handlePauseRequested, this);
    });
  }

  update(_time: number, delta: number): void {
    const inputState = this.inputRouter.getState();

    if (this.inputRouter.consumePauseToggle()) {
      this.handlePauseRequested();
    }

    if (this.state.paused) {
      return;
    }

    const spawnedDistractions = this.distractionSpawner.update(this.state, delta);
    this.recordDistractionEvents(spawnedDistractions);
    for (const distraction of spawnedDistractions) {
      this.audioSubtitleSystem.queueSubtitle(distraction.subtitleId);
    }

    this.playerActionSystem.updateTimers(this.state, delta);
    this.handlePlayerActions(inputState);

    const staminaBefore = this.state.stamina;
    const result = stepRoundSimulation(this.state, inputState, delta, {
      dogBehaviorSystem: this.dogBehaviorSystem,
      leashSystem: this.leashSystem,
      ownerStaminaSystem: this.ownerStaminaSystem,
      roundManager: this.roundManager
    });
    this.roundStaminaUsed += Math.max(0, staminaBefore - this.state.stamina);
    this.collectTreatsFromProgress();

    this.renderSimulation();
    this.updateDistractionDialogue();
    this.updateSpeechBubbles();
    this.syncActionButtons();
    this.emitHudState();

    if (result.becameComplete) {
      const resolution = this.sessionFlowSystem.resolveRound(this.sessionProgress, {
        success: this.state.status === "success",
        remainingMs: this.state.remainingMs,
        durationMs: this.roundDefinition.durationSeconds * 1000,
        staminaUsed: this.roundStaminaUsed,
        majorDistractionEvents: this.getMajorDistractionEvents(),
        progress: this.state.progress
      });

      this.saveProgressSystem.saveSession(resolution.session);
      this.saveProgressSystem.saveLastSummary(resolution.summary);
      gameEvents.emit(GAME_EVENT_KEYS.roundFinished, resolution.summary);

      if (this.state.status === "success" && !resolution.summary.sessionComplete) {
        this.scene.restart({
          transitionMessage: `${this.roundDefinition.name} reached. Next stop: ${resolution.summary.nextRoundLabel}.`
        });
        return;
      }

      this.scene.stop(SCENE_KEYS.ui);
      this.scene.start(SCENE_KEYS.summary, resolution.summary);
    }
  }

  private handlePauseRequested(): void {
    this.state.paused = !this.state.paused;
    gameEvents.emit(GAME_EVENT_KEYS.pauseChanged, this.state.paused);
    this.emitHudState();
  }

  private handlePlayerActions(inputState: { treatPressed: boolean; screamPressed: boolean }): void {
    if (inputState.treatPressed) {
      if (this.playerActionSystem.tryUseTreat(this.state)) {
        this.showSpeechBubble("owner-voice", "treat?", { kind: "owner" }, -10, -142);
        this.showSpeechBubble("shiba-voice", "snff!", { kind: "shiba" }, 92, -110);
      } else {
        this.showSpeechBubble("owner-voice", "out!", { kind: "owner" }, -4, -142);
      }
    }

    if (!inputState.screamPressed) {
      return;
    }

    const screamResult = this.playerActionSystem.tryTriggerScream(this.state);
    if (!screamResult.used) {
      return;
    }

    this.showSpeechBubble("shiba-voice", "yip!", { kind: "shiba" }, 98, -114);

    for (const catId of screamResult.scaredCatIds) {
      this.showSpeechBubble(
        `cat-scare-${catId}`,
        "meow!",
        { kind: "distraction", distractionId: catId, role: "animal" },
        36,
        -112
      );
    }
  }

  private collectTreatsFromProgress(): void {
    let collectedCount = 0;

    while (this.playerActionSystem.tryCollectTreat(this.state)) {
      collectedCount += 1;
    }

    if (collectedCount === 0) {
      return;
    }

    this.showSpeechBubble(
      "owner-voice",
      collectedCount > 1 ? `treats +${collectedCount}` : "treat +1",
      { kind: "owner" },
      -14,
      -142
    );
  }

  private syncActionButtons(): void {
    this.inputRouter.setTreatCount(this.state.availableTreats);
    this.inputRouter.setScreamReady(this.state.screamCooldownRemainingMs <= 0);
  }

  private createWorld(): void {
    const theme = this.roundDefinition.backgroundTheme;
    const pathY = this.roundDefinition.groundY + 34;
    const pathHeight = 58;

    this.add
      .rectangle(
        this.roundDefinition.worldWidth * 0.5,
        120,
        this.roundDefinition.worldWidth,
        240,
        theme.skyColor
      )
      .setScrollFactor(0);

    this.createParallaxLayer(0.12, this.roundDefinition.groundY - 250, theme.farColor, 540, 180, 160);
    this.createParallaxLayer(0.28, this.roundDefinition.groundY - 160, theme.midColor, 390, 220, 80);
    this.createParallaxLayer(0.42, this.roundDefinition.groundY - 112, theme.nearColor, 340, 170, 240);

    this.add.rectangle(
      this.roundDefinition.worldWidth * 0.5,
      this.roundDefinition.groundY + WORLD.floorHeight * 0.5,
      this.roundDefinition.worldWidth,
      WORLD.floorHeight,
      theme.groundColor
    );

    this.add.rectangle(
      this.roundDefinition.worldWidth * 0.5,
      this.roundDefinition.groundY + 16,
      this.roundDefinition.worldWidth,
      14,
      theme.groundAccentColor
    );

    this.add.rectangle(
      this.roundDefinition.worldWidth * 0.5,
      pathY,
      this.roundDefinition.worldWidth,
      pathHeight,
      lightenColor(theme.groundColor, 0.08)
    );
    this.add.rectangle(
      this.roundDefinition.worldWidth * 0.5,
      pathY - pathHeight * 0.5 + 5,
      this.roundDefinition.worldWidth,
      8,
      lightenColor(theme.groundAccentColor, 0.12),
      0.9
    );
    this.add.rectangle(
      this.roundDefinition.worldWidth * 0.5,
      pathY + pathHeight * 0.5 - 5,
      this.roundDefinition.worldWidth,
      8,
      0x000000,
      0.08
    );

    for (let x = this.roundDefinition.startX - 40; x <= this.roundDefinition.worldWidth; x += 320) {
      this.add
        .rectangle(x, pathY + 4, 110, 6, lightenColor(theme.groundAccentColor, 0.22), 0.62)
        .setAngle(-3 + ((x / 40) % 6));
    }

    this.add.rectangle(
      this.roundDefinition.destinationX,
      this.roundDefinition.groundY - 90,
      52,
      180,
      theme.destinationAccentColor
    );

    this.destinationMarker = this.add
      .rectangle(
        this.roundDefinition.destinationX,
        this.roundDefinition.groundY - 140,
        132,
        64,
        theme.destinationColor
      )
      .setStrokeStyle(3, theme.destinationAccentColor);

    this.add
      .text(this.roundDefinition.destinationX, this.roundDefinition.groundY - 140, this.roundDefinition.name, {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "26px",
        color: "#342416"
      })
      .setOrigin(0.5);
  }

  private createParallaxLayer(
    scrollFactor: number,
    y: number,
    color: number,
    spacing: number,
    radius: number,
    startOffset: number
  ): void {
    for (
      let x = startOffset;
      x <= this.roundDefinition.worldWidth + radius;
      x += spacing
    ) {
      this.add.circle(x, y, radius, color).setScrollFactor(scrollFactor);
    }
  }

  private createActors(): void {
    const ownerBaseY = this.getOwnerBaseY();
    const dogBaseY = this.getDogBaseY();

    this.ownerShadow = this.add
      .ellipse(
        this.state.owner.x,
        this.roundDefinition.groundY + OWNER_RENDER.shadowOffsetY,
        74,
        20,
        0x2e241d,
        0.18
      )
      .setDepth(4);
    this.ownerSprite = this.add
      .image(this.state.owner.x, ownerBaseY, CHARACTER_TEXTURE_KEYS.ownerWalk)
      .setOrigin(OWNER_RENDER.originX, OWNER_RENDER.originY)
      .setDisplaySize(OWNER_RENDER.width, OWNER_RENDER.height)
      .setDepth(12);

    this.dogShadow = this.add
      .ellipse(
        this.state.dog.x,
        this.roundDefinition.groundY + DOG_RENDER.shadowOffsetY,
        108,
        20,
        0x2e241d,
        0.2
      )
      .setDepth(5);
    this.dogBackLegs = [0, 1].map(() =>
      this.add
        .image(this.state.dog.x, dogBaseY, CHARACTER_TEXTURE_KEYS.shibaLegBack)
        .setOrigin(DOG_LEG_RENDER.originX, DOG_LEG_RENDER.originY)
        .setDisplaySize(DOG_LEG_RENDER.width, DOG_LEG_RENDER.height)
        .setDepth(11.8)
    );
    this.dogSprite = this.add
      .image(this.state.dog.x, dogBaseY, CHARACTER_TEXTURE_KEYS.shibaWalk)
      .setOrigin(DOG_RENDER.originX, DOG_RENDER.originY)
      .setDisplaySize(DOG_RENDER.width, DOG_RENDER.height)
      .setDepth(13);
    this.dogFrontLegs = [0, 1].map(() =>
      this.add
        .image(this.state.dog.x, dogBaseY, CHARACTER_TEXTURE_KEYS.shibaLegFront)
        .setOrigin(DOG_LEG_RENDER.originX, DOG_LEG_RENDER.originY)
        .setDisplaySize(DOG_LEG_RENDER.width, DOG_LEG_RENDER.height)
        .setDepth(13.2)
    );
    this.dogBackLegs[0]?.setDepth(11.75);
    this.dogBackLegs[1]?.setDepth(13.15);
    this.dogFrontLegs[0]?.setDepth(11.95);
    this.dogFrontLegs[1]?.setDepth(13.3);

    this.dogBarkText = this.add
      .text(16, -68, "ARF", {
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: "18px",
        color: "#5a2f14",
        backgroundColor: "#fff4d6"
      })
      .setPadding(4, 2, 4, 2)
      .setOrigin(0.5)
      .setDepth(30)
      .setVisible(false);

    this.leashGraphics = this.add.graphics();
    this.cameraTarget = this.add.zone(VIEWPORT.width * 0.5, VIEWPORT.height * 0.5, 10, 10);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.09, 0.09);
    this.renderSimulation();
  }

  private createInstructionCopy(transitionMessage?: string): void {
    const roundHeader = `${this.roundDefinition.name} ${this.sessionProgress.currentRoundIndex + 1}/${this.sessionProgress.totalRounds}`;
    const controlHeader = "→ walk / hold pull • ← rest • Q yip • E treat";

    this.introText = this.add
      .text(
        (this.scale.width || VIEWPORT.width) * 0.5,
        24,
        transitionMessage ?? roundHeader,
        {
          align: "center",
          fontFamily: "Trebuchet MS, sans-serif",
          fontSize: "18px",
          color: "#fffaf0",
          backgroundColor: "#102027"
        }
      )
      .setOrigin(0.5, 0)
      .setPadding(10, 6, 10, 6)
      .setScrollFactor(0)
      .setDepth(20)
      .setAlpha(0.72);

    if (transitionMessage) {
      this.time.delayedCall(UI_TUNING.roundAdvanceMessageMs, () => {
        this.introText.setText(roundHeader);
        this.time.delayedCall(UI_TUNING.introControlsMessageMs, () => {
          this.introText.setText(controlHeader);
          this.time.delayedCall(UI_TUNING.introControlsMessageMs, () => {
            this.introText.setVisible(false);
          });
        });
      });
      return;
    }

    this.time.delayedCall(UI_TUNING.introControlsMessageMs, () => {
      this.introText.setText(controlHeader);
      this.time.delayedCall(UI_TUNING.introControlsMessageMs, () => {
        this.introText.setVisible(false);
      });
    });
  }

  private renderSimulation(): void {
    this.applyOwnerPose();
    this.syncDistractionVisuals();
    this.applyDogPose(this.state.dogLocomotionState);
    this.destinationMarker.setFillStyle(
      this.state.status === "success"
        ? 0x7bd389
        : this.roundDefinition.backgroundTheme.destinationColor,
      1
    );

    const cameraProgressX = Phaser.Math.Linear(
      VIEWPORT.width * 0.5,
      this.roundDefinition.worldWidth - VIEWPORT.width * 0.5,
      this.state.progress
    );

    this.cameraTarget.setPosition(cameraProgressX, VIEWPORT.height * 0.5);

    const ownerAnchorX =
      this.state.owner.x + this.ownerLeashAnchorOffsetX * this.state.owner.facing;
    const ownerAnchorY = this.ownerSprite.y + this.ownerLeashAnchorOffsetY;
    const dogAnchorX = this.state.dog.x + this.dogLeashAnchorOffsetX * this.state.dog.facing;
    const dogAnchorY = this.dogSprite.y + this.dogLeashAnchorOffsetY;
    const sag = 16 + (1 - this.state.leashTension) * 18;
    const controlX = (ownerAnchorX + dogAnchorX) * 0.5;
    const controlY = Math.max(ownerAnchorY, dogAnchorY) + sag;

    this.drawLeash(ownerAnchorX, ownerAnchorY, controlX, controlY, dogAnchorX, dogAnchorY);
  }

  private applyOwnerPose(): void {
    const animationPhase = this.state.elapsedMs / 1000;
    const stride =
      Math.sin(animationPhase * 7) * Math.min(1, Math.abs(this.state.owner.velocityX) / 150);
    const bracing = this.state.leashTension > 0.58 || this.state.owner.velocityX < 48;
    const textureKey = bracing
      ? CHARACTER_TEXTURE_KEYS.ownerBrace
      : CHARACTER_TEXTURE_KEYS.ownerWalk;
    const yOffset = bracing ? 2 : stride * 2.5;
    const ownerBaseY = this.getOwnerBaseY();

    this.ownerShadow
      .setPosition(
        this.state.owner.x + 2,
        this.roundDefinition.groundY + OWNER_RENDER.shadowOffsetY
      )
      .setScale(bracing ? 1.06 : 1 + Math.abs(stride) * 0.04, 1);
    this.ownerSprite
      .setTexture(textureKey)
      .setPosition(this.state.owner.x, ownerBaseY + yOffset)
      .setScale(this.state.owner.facing, 1)
      .setRotation((bracing ? -0.03 : stride * 0.02) * this.state.owner.facing);

    this.ownerLeashAnchorOffsetX = bracing ? 46 : 40;
    this.ownerLeashAnchorOffsetY = bracing ? -72 : -78;
  }

  private applyDogPose(locomotionState: DogLocomotionState): void {
    const animationPhase = this.state.dogLocomotionElapsedMs / 1000;
    const idleBob = Math.sin(animationPhase * 5) * 1.1;
    let dogYOffset = 0;
    let textureKey: string = CHARACTER_TEXTURE_KEYS.shibaIdle;
    let rotation = 0;
    const dogBaseY = this.getDogBaseY();

    this.dogSprite.setAlpha(1);
    this.dogBarkText.setVisible(false);
    this.dogShadow
      .setPosition(
        this.state.dog.x + 2,
        this.roundDefinition.groundY + DOG_RENDER.shadowOffsetY
      )
      .setScale(1, 1);
    this.dogLeashAnchorOffsetX = -42;
    this.dogLeashAnchorOffsetY = -38;

    switch (locomotionState) {
      case "walk_forward": {
        const walkBob = Math.sin(animationPhase * 10) * 2.2;
        textureKey = CHARACTER_TEXTURE_KEYS.shibaWalk;
        dogYOffset = walkBob * 0.45;
        rotation = walkBob * 0.008;
        break;
      }
      case "pull_backward": {
        textureKey = CHARACTER_TEXTURE_KEYS.shibaPullBackward;
        dogYOffset = 3;
        rotation = -0.03 * this.state.dog.facing;
        this.dogShadow.setScale(1.08, 1);
        this.dogLeashAnchorOffsetX = -50;
        this.dogLeashAnchorOffsetY = -32;
        break;
      }
      case "sit_refuse": {
        textureKey = CHARACTER_TEXTURE_KEYS.shibaSitRefuse;
        dogYOffset = 10;
        this.dogShadow.setScale(1.02, 1.04);
        this.dogLeashAnchorOffsetX = -34;
        this.dogLeashAnchorOffsetY = -22;
        break;
      }
      case "tired_recover": {
        textureKey = CHARACTER_TEXTURE_KEYS.shibaTiredRecover;
        dogYOffset = 12;
        this.dogSprite.setAlpha(0.82);
        rotation = 0.03 * this.state.dog.facing;
        this.dogLeashAnchorOffsetX = -28;
        this.dogLeashAnchorOffsetY = -18;
        break;
      }
      case "bark_one_shot": {
        textureKey = CHARACTER_TEXTURE_KEYS.shibaBarkOneShot;
        dogYOffset = -1;
        this.dogBarkText
          .setVisible(true)
          .setPosition(
            this.state.dog.x + 26,
            dogBaseY - 98 - Math.sin(animationPhase * 18) * 3
          );
        break;
      }
      case "idle":
      default:
        textureKey = CHARACTER_TEXTURE_KEYS.shibaIdle;
        dogYOffset = idleBob * 0.4;
        break;
    }

    this.dogSprite
      .setTexture(textureKey)
      .setPosition(this.state.dog.x, dogBaseY + dogYOffset)
      .setScale(this.state.dog.facing, 1)
      .setRotation(rotation);

    this.applyDogLegPose(locomotionState, animationPhase, dogBaseY + dogYOffset);
  }

  private applyDogLegPose(
    locomotionState: DogLocomotionState,
    animationPhase: number,
    bodyY: number
  ): void {
    const direction = this.state.dog.facing;
    const baseHipY = bodyY - 52;
    const relaxedRearX = [-44, -26];
    const relaxedFrontX = [10, 30];
    const walkSwing = Math.sin(animationPhase * 10);
    const walkLift = Math.max(0, Math.cos(animationPhase * 10)) * 4;

    const rearRotations =
      locomotionState === "walk_forward" || locomotionState === "bark_one_shot"
        ? [-0.24 + walkSwing * 0.24, 0.18 - walkSwing * 0.22]
        : locomotionState === "pull_backward"
          ? [-0.08, 0.08]
          : locomotionState === "sit_refuse"
            ? [0.38, 0.24]
            : locomotionState === "tired_recover"
              ? [0.16, 0.1]
              : [-0.04 + walkSwing * 0.06, 0.04 - walkSwing * 0.06];

    const frontRotations =
      locomotionState === "walk_forward" || locomotionState === "bark_one_shot"
        ? [0.2 - walkSwing * 0.22, -0.22 + walkSwing * 0.24]
        : locomotionState === "pull_backward"
          ? [0.18, 0.1]
          : locomotionState === "sit_refuse"
            ? [0.42, 0.3]
            : locomotionState === "tired_recover"
              ? [0.14, 0.06]
              : [0.04 - walkSwing * 0.06, -0.04 + walkSwing * 0.06];

    const rearLift =
      locomotionState === "walk_forward" || locomotionState === "bark_one_shot"
        ? [walkLift * 0.3, (4 - walkLift) * 0.24]
        : locomotionState === "sit_refuse"
          ? [8, 7]
          : locomotionState === "tired_recover"
            ? [5, 4]
            : [0, 0];

    const frontLift =
      locomotionState === "walk_forward" || locomotionState === "bark_one_shot"
        ? [(4 - walkLift) * 0.24, walkLift * 0.3]
        : locomotionState === "sit_refuse"
          ? [8, 7]
          : locomotionState === "tired_recover"
            ? [6, 5]
            : [0, 0];

    const rearScaleY =
      locomotionState === "sit_refuse" ? 0.58 : locomotionState === "tired_recover" ? 0.72 : 1;
    const frontScaleY =
      locomotionState === "sit_refuse" ? 0.56 : locomotionState === "tired_recover" ? 0.7 : 1;
    const bodyDepthOffset =
      locomotionState === "sit_refuse" ? 4 : locomotionState === "tired_recover" ? 2 : 0;

    for (let index = 0; index < this.dogBackLegs.length; index += 1) {
      const leg = this.dogBackLegs[index]!;
      leg.setPosition(
        this.state.dog.x + relaxedRearX[index]! * direction,
        baseHipY + rearLift[index]! + bodyDepthOffset
      );
      leg.setScale(direction, rearScaleY);
      leg.setRotation(rearRotations[index]! * direction);
    }

    for (let index = 0; index < this.dogFrontLegs.length; index += 1) {
      const leg = this.dogFrontLegs[index]!;
      leg.setPosition(
        this.state.dog.x + relaxedFrontX[index]! * direction,
        baseHipY + frontLift[index]! + bodyDepthOffset
      );
      leg.setScale(direction, frontScaleY);
      leg.setRotation(frontRotations[index]! * direction);
    }
  }

  private getOwnerBaseY(): number {
    return (
      this.roundDefinition.groundY +
      OWNER_RENDER.groundOffset -
      OWNER_RENDER.height * (1 - OWNER_RENDER.originY)
    );
  }

  private getDogBaseY(): number {
    return (
      this.roundDefinition.groundY +
      DOG_RENDER.groundOffset -
      DOG_RENDER.height * (1 - DOG_RENDER.originY)
    );
  }

  private drawLeash(
    ownerX: number,
    ownerY: number,
    controlX: number,
    controlY: number,
    dogX: number,
    dogY: number
  ): void {
    const sampleCount = UI_TUNING.leashSampleCount;
    const leashColor = this.state.leashTension > 0.55 ? 0xa44c31 : 0x7b5b3c;
    const leashWidth = 3 + this.state.leashTension * 2.4;

    this.leashGraphics.clear();
    this.leashGraphics.lineStyle(leashWidth + 2, 0x2f1f14, 0.26);
    this.traceQuadratic(ownerX, ownerY + 2, controlX, controlY + 2, dogX, dogY + 2, sampleCount);
    this.leashGraphics.lineStyle(leashWidth, leashColor, 0.96);
    this.traceQuadratic(ownerX, ownerY, controlX, controlY, dogX, dogY, sampleCount);
    this.leashGraphics.fillStyle(0x2f1f14, 1).fillCircle(ownerX, ownerY, 4);
    this.leashGraphics.fillStyle(0x40505c, 1).fillCircle(dogX, dogY, 4);
  }

  private traceQuadratic(
    startX: number,
    startY: number,
    controlX: number,
    controlY: number,
    endX: number,
    endY: number,
    sampleCount: number
  ): void {
    this.leashGraphics.beginPath();
    this.leashGraphics.moveTo(startX, startY);

    for (let index = 1; index <= sampleCount; index += 1) {
      const t = index / sampleCount;
      const inverse = 1 - t;
      const x =
        inverse * inverse * startX +
        2 * inverse * t * controlX +
        t * t * endX;
      const y =
        inverse * inverse * startY +
        2 * inverse * t * controlY +
        t * t * endY;

      this.leashGraphics.lineTo(x, y);
    }

    this.leashGraphics.strokePath();
  }

  private syncDistractionVisuals(): void {
    const activeIds = new Set(this.state.activeDistractions.map((distraction) => distraction.id));

    for (const distraction of this.state.activeDistractions) {
      let visual = this.distractionVisuals.get(distraction.id);

      if (!visual) {
        visual = this.createDistractionVisual(distraction);
        this.distractionVisuals.set(distraction.id, visual);
      }

      this.updateDistractionVisual(visual, distraction);
    }

    for (const [id, visual] of this.distractionVisuals.entries()) {
      if (!activeIds.has(id)) {
        visual.destroy();
        this.distractionVisuals.delete(id);
      }
    }
  }

  private createDistractionVisual(
    distraction: ActiveDistractionState
  ): Phaser.GameObjects.Container {
    const definition = DISTRACTION_DEFINITIONS[distraction.kind];

    switch (distraction.kind) {
      case "cat": {
        return this.createSiberianCatVisual(distraction);
      }
      case "small_dog_owner":
      case "large_dog_owner": {
        return this.createDogWalkerVisual(distraction, definition);
      }
      case "rain": {
        const overlay = this.add.container(156, 112);
        overlay.setScrollFactor(0).setDepth(85);
        overlay.add(
          this.add.rectangle(0, 0, 180, 48, definition.color, 0.18).setStrokeStyle(1, definition.accentColor, 0.42)
        );
        overlay.add(
          this.add
            .text(0, -10, "rain", {
              fontFamily: "Trebuchet MS, sans-serif",
              fontSize: "22px",
              color: "#edf6ff"
            })
            .setOrigin(0.5)
        );

        for (let index = 0; index < 6; index += 1) {
          overlay.add(
            this.add.rectangle(
              -56 + index * 22,
              10 + (index % 2) * 4,
              2,
              18,
              definition.accentColor,
              0.72
            ).setAngle(22)
          );
        }

        return overlay;
      }
      default:
        return this.add
          .container(distraction.x, this.roundDefinition.groundY)
          .setDepth(8);
    }
  }

  private updateDistractionVisual(
    visual: Phaser.GameObjects.Container,
    distraction: ActiveDistractionState
  ): void {
    const alpha = 0.55 + 0.45 * (distraction.remainingMs / distraction.durationMs);

    if (distraction.kind === "rain") {
      visual.setPosition(156, 112);
      visual.setAlpha(alpha);
      return;
    }

    const baseScaleX = Number(visual.getData("baseScaleX") ?? 1);
    const baseScaleY = Number(visual.getData("baseScaleY") ?? 1);
    visual.setPosition(distraction.x, visual.y);
    visual.setScale(baseScaleX * distraction.direction, baseScaleY);
    visual.setAlpha(alpha);
  }

  private createSiberianCatVisual(
    distraction: ActiveDistractionState
  ): Phaser.GameObjects.Container {
    const coats = [
      {
        body: 0x8f7659,
        fluff: 0xe7d2b3,
        stripe: 0x6d5640
      },
      {
        body: 0x87929b,
        fluff: 0xe3e7eb,
        stripe: 0x68727c
      },
      {
        body: 0xcb8b54,
        fluff: 0xf1d4ad,
        stripe: 0x9e6435
      },
      {
        body: 0x48484c,
        fluff: 0xc8c8ce,
        stripe: 0x2d2d31
      }
    ] as const;
    const coat = coats[this.hashVariant(distraction.id, coats.length)];
    const fluffScale = 1.08 + this.hashVariant(`${distraction.id}-fluff`, 4) * 0.08;
    const shadow = this.add.ellipse(0, 10, 52, 12, 0x1a140f, 0.16);
    const cat = this.add.graphics();

    cat.lineStyle(2, 0x171717, 1);
    cat.fillStyle(coat.body).fillEllipse(-34, -18, 42, 24).strokeEllipse(-34, -18, 42, 24);
    cat.fillStyle(coat.fluff).fillEllipse(-30, -16, 22, 14);
    cat.fillStyle(coat.body).fillEllipse(2, -14, 78, 42).strokeEllipse(2, -14, 78, 42);
    cat.fillStyle(coat.fluff).fillEllipse(10, -12, 32, 24).strokeEllipse(10, -12, 32, 24);
    cat.fillStyle(coat.stripe).fillEllipse(-4, -16, 16, 22);
    cat.fillStyle(coat.stripe).fillEllipse(18, -18, 16, 24);
    cat.fillStyle(coat.body).fillEllipse(36, -30, 34, 30).strokeEllipse(36, -30, 34, 30);
    cat.fillStyle(coat.fluff).fillEllipse(40, -22, 18, 12).strokeEllipse(40, -22, 18, 12);
    cat.fillStyle(coat.body).fillTriangle(22, -40, 30, -60, 38, -38).strokeTriangle(22, -40, 30, -60, 38, -38);
    cat.fillStyle(coat.body).fillTriangle(38, -40, 50, -62, 58, -38).strokeTriangle(38, -40, 50, -62, 58, -38);
    cat.fillStyle(coat.fluff).fillEllipse(8, 6, 14, 26).strokeEllipse(8, 6, 14, 26);
    cat.fillStyle(coat.fluff).fillEllipse(26, 6, 14, 26).strokeEllipse(26, 6, 14, 26);
    cat.fillStyle(coat.fluff).fillEllipse(42, 4, 14, 24).strokeEllipse(42, 4, 14, 24);
    cat.fillStyle(coat.fluff).fillEllipse(-8, 4, 12, 24).strokeEllipse(-8, 4, 12, 24);
    cat.fillStyle(0x171717).fillCircle(44, -31, 2);
    cat.fillStyle(0x171717).fillCircle(32, -31, 2);
    cat.fillStyle(0xf2c1bf).fillTriangle(46, -24, 52, -20, 46, -16).strokeTriangle(46, -24, 52, -20, 46, -16);
    cat.lineBetween(38, -24, 54, -22);
    cat.lineBetween(38, -24, 54, -18);
    cat.lineBetween(30, -24, 14, -22);
    cat.lineBetween(30, -24, 14, -18);

    return this.add
      .container(distraction.x, this.roundDefinition.groundY + 8, [shadow, cat])
      .setDepth(8)
      .setScale(fluffScale, fluffScale)
      .setData("baseScaleX", fluffScale)
      .setData("baseScaleY", fluffScale);
  }

  private createDogWalkerVisual(
    distraction: ActiveDistractionState,
    definition: (typeof DISTRACTION_DEFINITIONS)[ActiveDistractionState["kind"]]
  ): Phaser.GameObjects.Container {
    const ownerPalettes = [
      { jacket: 0x47627f, shirt: 0x94b5cf, pants: 0x263547, hair: 0x2d221d },
      { jacket: 0x8f5b4d, shirt: 0xd8b1a4, pants: 0x4a2f28, hair: 0x6a4632 },
      { jacket: 0x587647, shirt: 0xc9ddb7, pants: 0x33422b, hair: 0xb48a5c },
      { jacket: 0x5d4f84, shirt: 0xc0b7ec, pants: 0x312949, hair: 0x1e1a16 }
    ] as const;
    const dogPalettes = [
      { body: definition.color, accent: definition.accentColor, patch: 0xf0eadf },
      { body: 0xb87c4a, accent: 0x6a4a36, patch: 0xf1dfc9 },
      { body: 0x3b3f47, accent: 0x828a95, patch: 0xe5e8eb },
      { body: 0xd2b272, accent: 0x8b6a3b, patch: 0xf5ebd6 }
    ] as const;
    const ownerPalette = ownerPalettes[this.hashVariant(`${distraction.id}-owner`, ownerPalettes.length)];
    const dogPalette = dogPalettes[this.hashVariant(`${distraction.id}-dog`, dogPalettes.length)];
    const feminineOwner = this.hashVariant(`${distraction.id}-gender`, 2) === 0;
    const hasHeadgear = this.hashVariant(`${distraction.id}-hat`, 3) === 0;
    const dogSize =
      distraction.kind === "large_dog_owner"
        ? 1.32 + this.hashVariant(`${distraction.id}-size`, 4) * 0.08
        : 1.0 + this.hashVariant(`${distraction.id}-size`, 3) * 0.04;
    const ownerScale = 1.08 + this.hashVariant(`${distraction.id}-stride`, 3) * 0.04;
    const ownerHeightScale = feminineOwner
      ? 0.94 + this.hashVariant(`${distraction.id}-height`, 3) * 0.04
      : 0.98 + this.hashVariant(`${distraction.id}-height`, 3) * 0.05;
    const ownerStride = this.hashVariant(`${distraction.id}-leg`, 2) === 0 ? 1 : -1;
    const visual = this.add.graphics();
    const ownerShadow = this.add.ellipse(-26, 12, 44, 10, 0x1a140f, 0.16);
    const dogShadow = this.add.ellipse(28, 18, 38 * dogSize, 10, 0x1a140f, 0.18);

    visual.lineStyle(2, 0x1b1b1b, 1);

    visual.fillStyle(0x2c221c).fillEllipse(-32, 8, 22, 8).strokeEllipse(-32, 8, 22, 8);
    visual.fillStyle(0x2c221c).fillEllipse(-18, 8, 22, 8).strokeEllipse(-18, 8, 22, 8);
    visual.fillStyle(ownerPalette.pants)
      .fillRoundedRect(-38, -30, 10, 38 * ownerHeightScale, 5)
      .strokeRoundedRect(-38, -30, 10, 38 * ownerHeightScale, 5);
    visual.fillStyle(ownerPalette.pants)
      .fillRoundedRect(-22, -34, 10, 42 * ownerHeightScale, 5)
      .strokeRoundedRect(-22, -34, 10, 42 * ownerHeightScale, 5);
    visual.fillStyle(ownerPalette.pants)
      .fillRoundedRect(-38 + ownerStride * 2, -30, 10, 10, 5)
      .strokeRoundedRect(-38 + ownerStride * 2, -30, 10, 10, 5);
    visual.fillStyle(ownerPalette.pants)
      .fillRoundedRect(-22 - ownerStride * 2, -34, 10, 10, 5)
      .strokeRoundedRect(-22 - ownerStride * 2, -34, 10, 10, 5);
    visual.fillStyle(ownerPalette.jacket)
      .fillRoundedRect(-44, -84, 34, 50 * ownerHeightScale, 12)
      .strokeRoundedRect(-44, -84, 34, 50 * ownerHeightScale, 12);
    if (feminineOwner) {
      visual
        .fillStyle(ownerPalette.jacket)
        .fillEllipse(-27, -36, 44, 18)
        .strokeEllipse(-27, -36, 44, 18);
    }
    visual.fillStyle(ownerPalette.shirt).fillRoundedRect(-36, -78, 18, 26, 8);
    visual.fillStyle(ownerPalette.jacket)
      .fillRoundedRect(-52, -78, 10, 32, 5)
      .strokeRoundedRect(-52, -78, 10, 32, 5);
    visual.fillStyle(ownerPalette.jacket)
      .fillRoundedRect(-10, -72, 10, 34, 5)
      .strokeRoundedRect(-10, -72, 10, 34, 5);
    visual.fillStyle(0xffd3b3).fillCircle(-50, -46, 5).strokeCircle(-50, -46, 5);
    visual.fillStyle(0xffd3b3).fillCircle(-3, -36, 5).strokeCircle(-3, -36, 5);
    visual.fillStyle(0xffd3b3).fillRect(-31, -104, 8, 16).strokeRect(-31, -104, 8, 16);
    visual.fillStyle(0xffd3b3).fillCircle(-27, -118, 18).strokeCircle(-27, -118, 18);
    if (feminineOwner) {
      visual.fillStyle(ownerPalette.hair).fillEllipse(-27, -126, 36, 18).strokeEllipse(-27, -126, 36, 18);
      visual.fillStyle(ownerPalette.hair).fillRoundedRect(-41, -126, 12, 24, 6).strokeRoundedRect(-41, -126, 12, 24, 6);
      visual.fillStyle(ownerPalette.hair).fillTriangle(-20, -128, -4, -122, -10, -104).strokeTriangle(-20, -128, -4, -122, -10, -104);
    } else {
      visual.fillStyle(ownerPalette.hair).fillEllipse(-27, -128, 34, 15).strokeEllipse(-27, -128, 34, 15);
      visual.fillStyle(ownerPalette.hair).fillRoundedRect(-39, -128, 10, 10, 4).strokeRoundedRect(-39, -128, 10, 10, 4);
    }
    if (hasHeadgear) {
      visual.fillStyle(0x2b2b35).fillEllipse(-27, -132, 42, 12).strokeEllipse(-27, -132, 42, 12);
      visual.fillStyle(0x2b2b35).fillRoundedRect(-42, -150, 30, 18, 6).strokeRoundedRect(-42, -150, 30, 18, 6);
    }

    visual.lineStyle(2, 0x432d1a, 1);
    visual.lineBetween(-2, -36, 20, -32);

    const dogX = 28;
    const dogY = -8;
    visual.lineStyle(2, 0x1b1b1b, 1);
    visual.fillStyle(0x2f241c)
      .fillEllipse(dogX - 2, dogY + 28, 28 * dogSize, 8 * dogSize)
      .strokeEllipse(dogX - 2, dogY + 28, 28 * dogSize, 8 * dogSize);
    visual.fillStyle(dogPalette.body)
      .fillEllipse(dogX, dogY + 6, 44 * dogSize, 24 * dogSize)
      .strokeEllipse(dogX, dogY + 6, 44 * dogSize, 24 * dogSize);
    visual.fillStyle(dogPalette.patch).fillEllipse(dogX + 6, dogY + 8, 18 * dogSize, 13 * dogSize);
    visual
      .fillStyle(dogPalette.accent)
      .fillEllipse(dogX - 18 * dogSize, dogY - 3 * dogSize, 14 * dogSize, 10 * dogSize)
      .strokeEllipse(dogX - 18 * dogSize, dogY - 3 * dogSize, 14 * dogSize, 10 * dogSize);
    visual.fillStyle(dogPalette.accent)
      .fillEllipse(dogX + 20 * dogSize, dogY - 4 * dogSize, 20 * dogSize, 18 * dogSize)
      .strokeEllipse(dogX + 20 * dogSize, dogY - 4 * dogSize, 20 * dogSize, 18 * dogSize);
    visual.fillStyle(dogPalette.patch)
      .fillEllipse(dogX + 24 * dogSize, dogY, 11 * dogSize, 7 * dogSize)
      .strokeEllipse(dogX + 24 * dogSize, dogY, 11 * dogSize, 7 * dogSize);
    visual.fillStyle(dogPalette.accent)
      .fillTriangle(
        dogX + 10 * dogSize,
        dogY - 10 * dogSize,
        dogX + 16 * dogSize,
        dogY - 22 * dogSize,
        dogX + 21 * dogSize,
        dogY - 8 * dogSize
      )
      .strokeTriangle(
        dogX + 10 * dogSize,
        dogY - 10 * dogSize,
        dogX + 16 * dogSize,
        dogY - 22 * dogSize,
        dogX + 21 * dogSize,
        dogY - 8 * dogSize
      );
    visual.fillStyle(dogPalette.accent)
      .fillTriangle(
        dogX + 22 * dogSize,
        dogY - 10 * dogSize,
        dogX + 28 * dogSize,
        dogY - 22 * dogSize,
        dogX + 33 * dogSize,
        dogY - 8 * dogSize
      )
      .strokeTriangle(
        dogX + 22 * dogSize,
        dogY - 10 * dogSize,
        dogX + 28 * dogSize,
        dogY - 22 * dogSize,
        dogX + 33 * dogSize,
        dogY - 8 * dogSize
      );
    visual.fillStyle(dogPalette.body)
      .fillRoundedRect(dogX - 12 * dogSize, dogY + 14 * dogSize, 7 * dogSize, 18 * dogSize, 4 * dogSize)
      .strokeRoundedRect(dogX - 12 * dogSize, dogY + 14 * dogSize, 7 * dogSize, 18 * dogSize, 4 * dogSize);
    visual.fillStyle(dogPalette.body)
      .fillRoundedRect(dogX + 2 * dogSize, dogY + 14 * dogSize, 7 * dogSize, 18 * dogSize, 4 * dogSize)
      .strokeRoundedRect(dogX + 2 * dogSize, dogY + 14 * dogSize, 7 * dogSize, 18 * dogSize, 4 * dogSize);
    visual.fillStyle(dogPalette.body)
      .fillRoundedRect(dogX + 16 * dogSize, dogY + 12 * dogSize, 6 * dogSize, 16 * dogSize, 4 * dogSize)
      .strokeRoundedRect(dogX + 16 * dogSize, dogY + 12 * dogSize, 6 * dogSize, 16 * dogSize, 4 * dogSize);
    visual.fillStyle(dogPalette.body)
      .fillEllipse(dogX - 20 * dogSize, dogY - 6 * dogSize, 18 * dogSize, 10 * dogSize)
      .strokeEllipse(dogX - 20 * dogSize, dogY - 6 * dogSize, 18 * dogSize, 10 * dogSize);
    visual.fillStyle(dogPalette.body)
      .fillCircle(dogX - 26 * dogSize, dogY - 12 * dogSize, 8 * dogSize)
      .strokeCircle(dogX - 26 * dogSize, dogY - 12 * dogSize, 8 * dogSize);
    visual.lineStyle(2, 0x432d1a, 1);
    visual.lineBetween(-2, -36, dogX - 2, dogY - 2);
    visual.fillStyle(0x151515).fillCircle(dogX + 24 * dogSize, dogY - 6 * dogSize, 1.8 * dogSize);

    return this.add
      .container(distraction.x, this.roundDefinition.groundY + 14, [
        ownerShadow,
        dogShadow,
        visual
      ])
      .setDepth(8)
      .setScale(ownerScale, ownerScale)
      .setData("baseScaleX", ownerScale)
      .setData("baseScaleY", ownerScale);
  }

  private updateDistractionDialogue(): void {
    for (const distraction of this.state.activeDistractions) {
      if (distraction.kind === "rain") {
        continue;
      }

      if (this.reactedDistractionIds.has(distraction.id)) {
        continue;
      }

      const activationDistance = Math.min(distraction.influenceRadius, 280);

      if (Math.abs(distraction.x - this.state.dog.x) > activationDistance) {
        continue;
      }

      this.reactedDistractionIds.add(distraction.id);
      this.showInteractionDialogue(distraction);
    }
  }

  private showInteractionDialogue(distraction: ActiveDistractionState): void {
    const shibaOffsetDirection = distraction.x >= this.state.dog.x ? -1 : 1;
    const shibaReaction = this.getShibaReaction(distraction);

    this.showSpeechBubble("shiba-voice", shibaReaction, { kind: "shiba" }, 108 * shibaOffsetDirection, -118);

    if (distraction.kind === "cat") {
      this.showSpeechBubble(
        `npc-${distraction.id}`,
        "meow",
        { kind: "distraction", distractionId: distraction.id, role: "animal" },
        30,
        -102
      );
      return;
    }

    const dogReplyPool =
      distraction.kind === "large_dog_owner"
        ? ["grrr", "woof", "ruff"]
        : ["bork", "arf", "yip"];
    const ownerReplyPool = ["wow!", "great doge", "much determined", "many love"];
    const dogReply = dogReplyPool[this.hashVariant(`dog-reply-${distraction.id}`, dogReplyPool.length)]!;
    const ownerReply =
      ownerReplyPool[this.hashVariant(`owner-reply-${distraction.id}`, ownerReplyPool.length)]!;

    this.showSpeechBubble(
      `npc-dog-${distraction.id}`,
      dogReply,
      { kind: "distraction", distractionId: distraction.id, role: "animal" },
      66,
      -104
    );
    this.showSpeechBubble(
      `npc-owner-${distraction.id}`,
      ownerReply,
      { kind: "distraction", distractionId: distraction.id, role: "owner" },
      -88,
      -150
    );
  }

  private getShibaReaction(distraction: ActiveDistractionState): string {
    switch (distraction.kind) {
      case "cat":
        return this.state.dogIntent === "chase_cat" ? "yip!" : "arf!";
      case "small_dog_owner":
        return this.state.dogIntent === "approach_small_dog" ? "bork!" : "arf!";
      case "large_dog_owner":
        return this.state.dogIntent === "avoid_large_dog" ? "grrr..." : "bork!";
      default:
        return "arf!";
    }
  }

  private showSpeechBubble(
    key: string,
    message: string,
    anchor: SpeechBubbleAnchor,
    offsetX: number,
    offsetY: number
  ): void {
    this.destroySpeechBubble(key);

    const text = this.add.text(0, 0, message, {
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "20px",
      color: "#1f2429",
      fontStyle: "bold"
    });
    text.setOrigin(0.5);

    const bubbleWidth = text.width + 24;
    const bubbleHeight = text.height + 20;
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0x2f2418, 1);
    graphics.fillStyle(0xfffcf4, 0.96);
    graphics.fillRoundedRect(-bubbleWidth * 0.5, -bubbleHeight * 0.5, bubbleWidth, bubbleHeight, 14);
    graphics.strokeRoundedRect(-bubbleWidth * 0.5, -bubbleHeight * 0.5, bubbleWidth, bubbleHeight, 14);
    graphics.fillTriangle(-6, bubbleHeight * 0.5 - 2, 6, bubbleHeight * 0.5 - 2, 0, bubbleHeight * 0.5 + 10);
    graphics.strokeTriangle(-6, bubbleHeight * 0.5 - 2, 6, bubbleHeight * 0.5 - 2, 0, bubbleHeight * 0.5 + 10);

    const container = this.add.container(0, 0, [graphics, text]).setDepth(40);

    this.activeSpeechBubbles.set(key, {
      anchor,
      container,
      expiresAt: this.time.now + BUBBLE_TUNING.durationMs,
      height: bubbleHeight + 10,
      offsetX,
      offsetY,
      width: bubbleWidth
    });
  }

  private updateSpeechBubbles(): void {
    const worldView = this.cameras.main.worldView;

    for (const [key, bubble] of this.activeSpeechBubbles.entries()) {
      if (this.time.now >= bubble.expiresAt) {
        this.destroySpeechBubble(key);
        continue;
      }

      const anchorPosition = this.getSpeechBubbleAnchorPosition(bubble.anchor);
      if (!anchorPosition) {
        continue;
      }

      const x = Phaser.Math.Clamp(
        anchorPosition.x + bubble.offsetX,
        worldView.x + bubble.width * 0.5 + BUBBLE_TUNING.margin,
        worldView.right - bubble.width * 0.5 - BUBBLE_TUNING.margin
      );
      const y = Phaser.Math.Clamp(
        anchorPosition.y + bubble.offsetY,
        worldView.y + bubble.height * 0.5 + BUBBLE_TUNING.margin,
        worldView.bottom - bubble.height * 0.5 - BUBBLE_TUNING.margin
      );

      bubble.container.setPosition(x, y);
    }
  }

  private getSpeechBubbleAnchorPosition(
    anchor: SpeechBubbleAnchor
  ): { x: number; y: number } | null {
    if (anchor.kind === "owner") {
      return {
        x: this.state.owner.x,
        y: this.ownerSprite.y - 4
      };
    }

    if (anchor.kind === "shiba") {
      return {
        x: this.state.dog.x,
        y: this.dogSprite.y
      };
    }

    const visual = this.distractionVisuals.get(anchor.distractionId);
    if (!visual) {
      return null;
    }

    const direction = Math.sign(visual.scaleX) || 1;
    if (anchor.role === "owner") {
      return {
        x: visual.x - 74 * direction,
        y: visual.y - 106
      };
    }

    return {
      x: visual.x + 48 * direction,
      y: visual.y - 68
    };
  }

  private destroySpeechBubble(key: string): void {
    const bubble = this.activeSpeechBubbles.get(key);
    if (!bubble) {
      return;
    }

    bubble.container.destroy();
    this.activeSpeechBubbles.delete(key);
  }

  private hashVariant(input: string, modulo: number): number {
    let hash = 0;

    for (let index = 0; index < input.length; index += 1) {
      hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
    }

    return modulo > 0 ? hash % modulo : 0;
  }

  private recordDistractionEvents(spawnedDistractions: ActiveDistractionState[]): void {
    for (const distraction of spawnedDistractions) {
      const currentCount = this.roundDistractionCounts.get(distraction.label) ?? 0;
      this.roundDistractionCounts.set(distraction.label, currentCount + 1);
    }
  }

  private getMajorDistractionEvents(): string[] {
    if (this.roundDistractionCounts.size === 0) {
      return [];
    }

    return Array.from(this.roundDistractionCounts.entries()).map(([label, count]) =>
      count > 1 ? `${label} x${count}` : label
    );
  }

  private destroyDistractionVisuals(): void {
    for (const visual of this.distractionVisuals.values()) {
      visual.destroy();
    }

    this.distractionVisuals.clear();
  }

  private destroySpeechBubbles(): void {
    for (const bubble of this.activeSpeechBubbles.values()) {
      bubble.container.destroy();
    }

    this.activeSpeechBubbles.clear();
  }

  private emitHudState(): void {
    gameEvents.emit(GAME_EVENT_KEYS.hudUpdated, {
      paused: this.state.paused,
      remainingMs: this.state.remainingMs,
      durationMs: this.roundDefinition.durationSeconds * 1000,
      stamina: this.state.stamina,
      availableTreats: this.state.availableTreats,
      screamCooldownRemainingMs: this.state.screamCooldownRemainingMs,
      destinationLabel: `${this.roundDefinition.name} ${this.sessionProgress.currentRoundIndex + 1}/${this.sessionProgress.totalRounds}`,
      dogIntent: this.state.dogIntent,
      dogLocomotionState: this.state.dogLocomotionState,
      leashTension: this.state.leashTension
    });
  }
}

function colorToHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function lightenColor(color: number, amount: number): number {
  const red = (color >> 16) & 0xff;
  const green = (color >> 8) & 0xff;
  const blue = color & 0xff;

  const nextRed = Math.round(red + (255 - red) * amount);
  const nextGreen = Math.round(green + (255 - green) * amount);
  const nextBlue = Math.round(blue + (255 - blue) * amount);

  return (nextRed << 16) | (nextGreen << 8) | nextBlue;
}
