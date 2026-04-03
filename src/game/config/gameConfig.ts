import Phaser from "phaser";
import { VIEWPORT } from "./tuning";
import { BootScene } from "../scenes/BootScene";
import { MenuScene } from "../scenes/MenuScene";
import { RunScene } from "../scenes/RunScene";
import { UIScene } from "../scenes/UIScene";
import { SummaryScene } from "../scenes/SummaryScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: VIEWPORT.width,
  height: VIEWPORT.height,
  backgroundColor: "#f9f2e4",
  scene: [BootScene, MenuScene, RunScene, UIScene, SummaryScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  render: {
    antialias: true,
    pixelArt: false
  }
};
