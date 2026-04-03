import Phaser from "phaser";
import { UI_TUNING, VIEWPORT } from "../config/tuning";
import type { InputState } from "../types/gameplay";

type HoldControl = "forward" | "rest";

interface TouchPointerState {
  control: HoldControl;
  startedAt: number;
}

interface TouchButton {
  box: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class InputRouter {
  private readonly touchState: InputState = {
    moveHeld: false,
    pullHeld: false,
    restHeld: false,
    treatPressed: false,
    screamPressed: false
  };

  private readonly activePointers = new Map<number, TouchPointerState>();
  private pauseQueued = false;
  private treatQueued = false;
  private screamQueued = false;
  private treatCount = 0;
  private screamReady = true;

  private readonly moveKey: Phaser.Input.Keyboard.Key;
  private readonly rightKey: Phaser.Input.Keyboard.Key;
  private readonly pullKeyW: Phaser.Input.Keyboard.Key;
  private readonly upKey: Phaser.Input.Keyboard.Key;
  private readonly restKey: Phaser.Input.Keyboard.Key;
  private readonly leftKey: Phaser.Input.Keyboard.Key;
  private readonly calmKey: Phaser.Input.Keyboard.Key;
  private readonly downKey: Phaser.Input.Keyboard.Key;
  private readonly pullKey: Phaser.Input.Keyboard.Key;
  private readonly alternatePullKey: Phaser.Input.Keyboard.Key;
  private readonly pauseKey: Phaser.Input.Keyboard.Key;
  private readonly treatKey: Phaser.Input.Keyboard.Key;
  private readonly screamKey: Phaser.Input.Keyboard.Key;
  private readonly leftArrowButton: TouchButton;
  private readonly rightArrowButton: TouchButton;
  private readonly screamButton: TouchButton;
  private readonly treatButton: TouchButton;

  constructor(private readonly scene: Phaser.Scene) {
    const keyboard = this.scene.input.keyboard;

    if (!keyboard) {
      throw new Error("Keyboard input is not available.");
    }

    this.scene.input.addPointer(2);

    this.moveKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.rightKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.pullKeyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.upKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.restKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.leftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.calmKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.downKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.pullKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.alternatePullKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.pauseKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.treatKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.screamKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    this.pauseKey.on("down", () => {
      this.pauseQueued = true;
    });
    this.treatKey.on("down", () => {
      this.treatQueued = true;
    });
    this.screamKey.on("down", () => {
      this.screamQueued = true;
    });

    this.leftArrowButton = this.createTouchButton("←");
    this.rightArrowButton = this.createTouchButton("→");
    this.screamButton = this.createTouchButton("YIP", true);
    this.treatButton = this.createTouchButton("TREAT", true);

    this.bindHoldButton(this.leftArrowButton, "rest");
    this.bindHoldButton(this.rightArrowButton, "forward");
    this.bindActionButton(this.screamButton, "scream");
    this.bindActionButton(this.treatButton, "treat");
    this.layoutButtons();
    this.refreshButtonStates();

    this.scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerReleased, this);
    this.scene.input.on(Phaser.Input.Events.GAME_OUT, this.resetTouchState, this);
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.layoutButtons, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  getState(): InputState {
    this.syncTouchState();

    const restHeld =
      this.restKey.isDown ||
      this.leftKey.isDown ||
      this.calmKey.isDown ||
      this.downKey.isDown ||
      this.touchState.restHeld;
    const moveHeld =
      !restHeld && (this.moveKey.isDown || this.rightKey.isDown || this.touchState.moveHeld);
    const pullHeld =
      !restHeld &&
      (
        this.pullKey.isDown ||
        this.alternatePullKey.isDown ||
        this.pullKeyW.isDown ||
        this.upKey.isDown ||
        this.touchState.pullHeld
      );
    const treatPressed = this.treatQueued;
    const screamPressed = this.screamQueued;

    this.treatQueued = false;
    this.screamQueued = false;

    return {
      moveHeld,
      pullHeld,
      restHeld,
      treatPressed,
      screamPressed
    };
  }

  setTreatCount(count: number): void {
    this.treatCount = count;
    this.treatButton.label.setText(`TREAT\nx${count}`);
    this.refreshButtonStates();
  }

  setScreamReady(isReady: boolean): void {
    this.screamReady = isReady;
    this.refreshButtonStates();
  }

  consumePauseToggle(): boolean {
    const wasQueued = this.pauseQueued;
    this.pauseQueued = false;

    return wasQueued;
  }

  private createTouchButton(label: string, actionButton = false): TouchButton {
    const size = actionButton
      ? UI_TUNING.touchActionButtonSize
      : UI_TUNING.touchArrowButtonSize;
    const width = size.compactWidth;
    const height = size.compactHeight;
    const box = this.scene.add
      .rectangle(0, 0, width, height, 0x102027, 0.12)
      .setStrokeStyle(2, 0xf6ead8, 0.28)
      .setScrollFactor(0)
      .setDepth(120)
      .setInteractive({ useHandCursor: true });

    const text = this.scene.add
      .text(0, 0, label, {
        align: "center",
        fontFamily: "Trebuchet MS, sans-serif",
        fontSize: actionButton ? "24px" : "48px",
        color: "#fffaf0",
        fontStyle: "bold",
        lineSpacing: 2
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(121);

    return { box, label: text };
  }

  private bindHoldButton(button: TouchButton, control: HoldControl): void {
    button.box.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.activePointers.set(pointer.id, {
        control,
        startedAt: this.scene.time.now
      });
      this.syncTouchState();
      this.refreshButtonStates();
    });
  }

  private bindActionButton(
    button: TouchButton,
    action: "scream" | "treat"
  ): void {
    button.box.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (action === "scream") {
        if (!this.screamReady) {
          return;
        }

        this.screamQueued = true;
      } else {
        this.treatQueued = true;
      }

      this.applyVisualState(button, true, false);
      this.scene.time.delayedCall(140, () => this.refreshButtonStates());
    });
  }

  private handlePointerReleased(pointer: Phaser.Input.Pointer): void {
    if (!this.activePointers.delete(pointer.id)) {
      return;
    }

    this.syncTouchState();
    this.refreshButtonStates();
  }

  private resetTouchState(): void {
    if (this.activePointers.size === 0) {
      return;
    }

    this.activePointers.clear();
    this.syncTouchState();
    this.refreshButtonStates();
  }

  private syncTouchState(): void {
    let moveHeld = false;
    let pullHeld = false;
    let restHeld = false;
    const now = this.scene.time.now;

    for (const pointerState of this.activePointers.values()) {
      if (pointerState.control === "forward") {
        moveHeld = true;
        if (now - pointerState.startedAt >= UI_TUNING.touchPullHoldMs) {
          pullHeld = true;
        }
        continue;
      }

      restHeld = true;
    }

    this.touchState.moveHeld = moveHeld;
    this.touchState.pullHeld = pullHeld;
    this.touchState.restHeld = restHeld;
  }

  private refreshButtonStates(): void {
    this.applyVisualState(this.leftArrowButton, this.touchState.restHeld, false);
    this.applyVisualState(
      this.rightArrowButton,
      (this.touchState.moveHeld || this.touchState.pullHeld) && !this.touchState.restHeld,
      false
    );
    this.applyVisualState(this.screamButton, false, !this.screamReady);
    this.applyVisualState(this.treatButton, false, this.treatCount <= 0);
  }

  private applyVisualState(
    button: TouchButton,
    isActive: boolean,
    isDisabled: boolean
  ): void {
    if (isDisabled) {
      button.box.setFillStyle(0x102027, 0.06).setStrokeStyle(2, 0xf6ead8, 0.12);
      button.label.setAlpha(0.42).clearTint().setScale(1);
      return;
    }

    if (isActive) {
      button.box.setFillStyle(0xf4a261, 0.34).setStrokeStyle(3, 0xfff0dc, 0.82);
      button.label.setAlpha(1).setTint(0x2f1f13).setScale(1.03);
      return;
    }

    button.box.setFillStyle(0x102027, 0.12).setStrokeStyle(2, 0xf6ead8, 0.28);
    button.label.setAlpha(0.96).clearTint().setScale(1);
  }

  private layoutButtons(): void {
    const width = this.scene.scale.width || VIEWPORT.width;
    const height = this.scene.scale.height || VIEWPORT.height;
    const isCompact =
      width <= UI_TUNING.compactBreakpointWidth ||
      height <= UI_TUNING.compactBreakpointHeight;
    const arrowSize = isCompact
      ? UI_TUNING.touchArrowButtonSize.compactWidth
      : UI_TUNING.touchArrowButtonSize.width;
    const arrowHeight = isCompact
      ? UI_TUNING.touchArrowButtonSize.compactHeight
      : UI_TUNING.touchArrowButtonSize.height;
    const actionWidth = isCompact
      ? UI_TUNING.touchActionButtonSize.compactWidth
      : UI_TUNING.touchActionButtonSize.width;
    const actionHeight = isCompact
      ? UI_TUNING.touchActionButtonSize.compactHeight
      : UI_TUNING.touchActionButtonSize.height;
    const sideInset = UI_TUNING.touchSideInset;
    const bottomInset = isCompact
      ? UI_TUNING.touchCompactBottomInset
      : UI_TUNING.touchBottomInset;
    const buttonY = height - bottomInset - Math.max(arrowHeight, actionHeight) * 0.5;
    const actionGap = UI_TUNING.touchActionGap;

    this.resizeButton(this.leftArrowButton, arrowSize, arrowHeight, isCompact ? 52 : 48);
    this.resizeButton(this.rightArrowButton, arrowSize, arrowHeight, isCompact ? 52 : 48);
    this.resizeButton(this.screamButton, actionWidth, actionHeight, isCompact ? 22 : 20);
    this.resizeButton(this.treatButton, actionWidth, actionHeight, isCompact ? 22 : 20);

    this.positionButton(this.leftArrowButton, sideInset + arrowSize * 0.5, buttonY);
    this.positionButton(this.rightArrowButton, width - sideInset - arrowSize * 0.5, buttonY);
    this.positionButton(
      this.screamButton,
      width * 0.5 - actionWidth * 0.5 - actionGap * 0.5,
      buttonY
    );
    this.positionButton(
      this.treatButton,
      width * 0.5 + actionWidth * 0.5 + actionGap * 0.5,
      buttonY
    );
  }

  private resizeButton(
    button: TouchButton,
    width: number,
    height: number,
    fontSize: number
  ): void {
    button.box.setSize(width, height).setDisplaySize(width, height);
    button.box.input?.hitArea.setTo(-width * 0.5, -height * 0.5, width, height);
    button.label.setStyle({ fontSize: `${fontSize}px` });
  }

  private positionButton(button: TouchButton, x: number, y: number): void {
    button.box.setPosition(x, y);
    button.label.setPosition(x, y);
  }

  destroy(): void {
    this.resetTouchState();
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.layoutButtons, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerReleased, this);
    this.scene.input.off(Phaser.Input.Events.GAME_OUT, this.resetTouchState, this);
    this.pauseKey.off("down");
    this.treatKey.off("down");
    this.screamKey.off("down");

    for (const button of [
      this.leftArrowButton,
      this.rightArrowButton,
      this.screamButton,
      this.treatButton
    ]) {
      button.box.destroy();
      button.label.destroy();
    }
  }
}
