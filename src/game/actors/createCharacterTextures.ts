import Phaser from "phaser";

type ShibaPose =
  | "idle"
  | "walk"
  | "pull"
  | "sit"
  | "tired"
  | "bark";

export const CHARACTER_TEXTURE_KEYS = {
  ownerWalk: "character-owner-walk-v2",
  ownerBrace: "character-owner-brace-v2",
  shibaIdle: "character-shiba-idle-v2",
  shibaWalk: "character-shiba-walk-v2",
  shibaPullBackward: "character-shiba-pull-backward-v2",
  shibaSitRefuse: "character-shiba-sit-refuse-v2",
  shibaTiredRecover: "character-shiba-tired-recover-v2",
  shibaBarkOneShot: "character-shiba-bark-v2",
  shibaLegBack: "character-shiba-leg-back-v2",
  shibaLegFront: "character-shiba-leg-front-v2"
} as const;

export function ensureCharacterTextures(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  generateTexture(scene, graphics, CHARACTER_TEXTURE_KEYS.ownerWalk, 170, 244, drawOwnerWalk);
  generateTexture(scene, graphics, CHARACTER_TEXTURE_KEYS.ownerBrace, 170, 244, drawOwnerBrace);
  generateTexture(scene, graphics, CHARACTER_TEXTURE_KEYS.shibaIdle, 220, 154, (ctx) =>
    drawShibaBody(ctx, "idle")
  );
  generateTexture(scene, graphics, CHARACTER_TEXTURE_KEYS.shibaWalk, 220, 154, (ctx) =>
    drawShibaBody(ctx, "walk")
  );
  generateTexture(scene, graphics, CHARACTER_TEXTURE_KEYS.shibaPullBackward, 220, 154, (ctx) =>
    drawShibaBody(ctx, "pull")
  );
  generateTexture(scene, graphics, CHARACTER_TEXTURE_KEYS.shibaSitRefuse, 220, 154, (ctx) =>
    drawShibaBody(ctx, "sit")
  );
  generateTexture(
    scene,
    graphics,
    CHARACTER_TEXTURE_KEYS.shibaTiredRecover,
    220,
    154,
    (ctx) => drawShibaBody(ctx, "tired")
  );
  generateTexture(scene, graphics, CHARACTER_TEXTURE_KEYS.shibaBarkOneShot, 220, 154, (ctx) =>
    drawShibaBody(ctx, "bark")
  );
  generateTexture(scene, graphics, CHARACTER_TEXTURE_KEYS.shibaLegBack, 42, 86, drawShibaRearLeg);
  generateTexture(scene, graphics, CHARACTER_TEXTURE_KEYS.shibaLegFront, 42, 86, drawShibaFrontLeg);

  graphics.destroy();
}

function generateTexture(
  scene: Phaser.Scene,
  graphics: Phaser.GameObjects.Graphics,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void
): void {
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }

  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.clear();
}

function applyOutline(graphics: Phaser.GameObjects.Graphics, width = 4): void {
  graphics.lineStyle(width, 0x2a211a, 1);
}

function drawOwnerWalk(graphics: Phaser.GameObjects.Graphics): void {
  drawOwner(graphics, false);
}

function drawOwnerBrace(graphics: Phaser.GameObjects.Graphics): void {
  drawOwner(graphics, true);
}

function drawOwner(graphics: Phaser.GameObjects.Graphics, braced: boolean): void {
  applyOutline(graphics);

  const hairBase = 0xc9473a;
  const hairShadow = 0x902d24;
  const coatBase = braced ? 0x4c6476 : 0x5f7a90;
  const coatLight = braced ? 0x8eafc1 : 0xa6c4d0;
  const blouse = 0xf5eee2;
  const skirt = 0x37405a;
  const tights = 0x302d38;
  const boots = 0x312620;
  const skin = 0xffd2b1;
  const lip = 0xbf7268;

  graphics.fillStyle(boots).fillEllipse(72, 226, 34, 12).strokeEllipse(72, 226, 34, 12);
  graphics.fillStyle(boots).fillEllipse(106, 226, 34, 12).strokeEllipse(106, 226, 34, 12);

  graphics.fillStyle(tights).fillRoundedRect(68, 176, 14, 46, 8).strokeRoundedRect(68, 176, 14, 46, 8);
  graphics.fillStyle(tights).fillRoundedRect(96, braced ? 170 : 172, 14, 50, 8).strokeRoundedRect(96, braced ? 170 : 172, 14, 50, 8);

  graphics.fillStyle(skirt).fillEllipse(90, 170, 72, 22).strokeEllipse(90, 170, 72, 22);
  graphics.fillStyle(skirt).fillRoundedRect(62, 150, 56, 18, 9).strokeRoundedRect(62, 150, 56, 18, 9);
  graphics.fillStyle(coatBase).fillEllipse(90, 86, 82, 20).strokeEllipse(90, 86, 82, 20);
  graphics.fillStyle(coatBase).fillRoundedRect(58, 84, 64, 72, 22).strokeRoundedRect(58, 84, 64, 72, 22);
  graphics.fillStyle(coatLight).fillRoundedRect(68, 90, 42, 52, 16);
  graphics.fillStyle(blouse).fillRoundedRect(82, 92, 18, 34, 9);
  graphics.fillStyle(0xe0b79e).fillTriangle(90, 124, 100, 148, 80, 148).strokeTriangle(90, 124, 100, 148, 80, 148);

  graphics.fillStyle(coatBase).fillRoundedRect(48, 92, 14, braced ? 50 : 44, 8).strokeRoundedRect(48, 92, 14, braced ? 50 : 44, 8);
  graphics.fillStyle(coatBase).fillRoundedRect(118, braced ? 94 : 88, 14, braced ? 46 : 42, 8).strokeRoundedRect(118, braced ? 94 : 88, 14, braced ? 46 : 42, 8);
  graphics.fillStyle(skin).fillCircle(55, braced ? 136 : 130, 7).strokeCircle(55, braced ? 136 : 130, 7);
  graphics.fillStyle(skin).fillCircle(125, braced ? 132 : 126, 7).strokeCircle(125, braced ? 132 : 126, 7);

  graphics.fillStyle(skin).fillRoundedRect(85, 60, 10, 18, 5).strokeRoundedRect(85, 60, 10, 18, 5);
  graphics.fillStyle(skin).fillEllipse(90, 42, 48, 54).strokeEllipse(90, 42, 48, 54);
  graphics.fillStyle(hairBase).fillEllipse(88, 24, 50, 20).strokeEllipse(88, 24, 50, 20);
  graphics.fillStyle(hairShadow).fillRoundedRect(62, 22, 12, 24, 6).strokeRoundedRect(62, 22, 12, 24, 6);
  graphics.fillStyle(hairShadow).fillTriangle(74, 28, 56, 42, 72, 56).strokeTriangle(74, 28, 56, 42, 72, 56);
  graphics.fillStyle(hairBase).fillTriangle(76, 24, 114, 24, 98, 44).strokeTriangle(76, 24, 114, 24, 98, 44);
  graphics.fillStyle(hairBase).fillTriangle(102, 22, 124, 24, 108, 32).strokeTriangle(102, 22, 124, 24, 108, 32);
  graphics.fillStyle(hairBase).fillRoundedRect(96, 22, 10, 10, 5).strokeRoundedRect(96, 22, 10, 10, 5);
  graphics.fillStyle(0x2d241a).fillCircle(98, 42, 2);
  graphics.fillStyle(0x2d241a).fillCircle(84, 44, 2);
  graphics.lineStyle(2, 0x8a5a4a, 0.85);
  graphics.lineBetween(84, 56, 90, 58);
  graphics.fillStyle(lip).fillEllipse(90, 54, 8, 3);
}

function drawShibaBody(graphics: Phaser.GameObjects.Graphics, pose: ShibaPose): void {
  applyOutline(graphics, 3);

  const bodyColor = pose === "pull" ? 0xc0692a : pose === "tired" ? 0xbc6a2f : 0xc9712b;
  const headColor = pose === "pull" ? 0xd47d38 : 0xd98540;
  const cream = 0xf2d8b2;
  const harness = 0x5d6b77;
  const strap = 0x2f3d49;
  const eyeY =
    pose === "tired" ? 60 : pose === "sit" ? 52 : pose === "pull" ? 48 : 50;
  const bodyY =
    pose === "sit" ? 90 : pose === "tired" ? 98 : pose === "pull" ? 82 : 78;
  const headX =
    pose === "pull" ? 142 : pose === "sit" ? 134 : pose === "tired" ? 128 : 144;
  const headY =
    pose === "pull" ? 58 : pose === "sit" ? 52 : pose === "tired" ? 78 : 56;

  drawShibaTail(graphics, pose, bodyColor);

  graphics.fillStyle(0x4b3828).fillEllipse(100, 132, 116, 18);
  graphics.fillStyle(bodyColor).fillEllipse(108, bodyY, 112, pose === "sit" ? 44 : 52).strokeEllipse(108, bodyY, 112, pose === "sit" ? 44 : 52);
  graphics.fillStyle(headColor).fillEllipse(headX, headY, pose === "tired" ? 46 : 52, pose === "tired" ? 36 : 42).strokeEllipse(headX, headY, pose === "tired" ? 46 : 52, pose === "tired" ? 36 : 42);
  graphics.fillStyle(cream).fillEllipse(headX + 12, headY + 8, 20, 14).strokeEllipse(headX + 12, headY + 8, 20, 14);
  graphics.fillStyle(cream).fillEllipse(118, bodyY + 8, 24, 12);
  graphics.fillStyle(cream).fillEllipse(96, bodyY + 10, 18, 10);

  graphics.fillStyle(headColor)
    .fillTriangle(headX - 20, headY - 12, headX - 10, headY - 34, headX + 2, headY - 10)
    .strokeTriangle(headX - 20, headY - 12, headX - 10, headY - 34, headX + 2, headY - 10);
  graphics.fillStyle(headColor)
    .fillTriangle(headX - 4, headY - 12, headX + 8, headY - 36, headX + 16, headY - 8)
    .strokeTriangle(headX - 4, headY - 12, headX + 8, headY - 36, headX + 16, headY - 8);

  graphics.fillStyle(0x241d16).fillCircle(headX + 10, eyeY, pose === "tired" ? 2 : 3);
  graphics.fillStyle(0x241d16).fillEllipse(headX + 18, headY + 8, 8, 6);
  if (pose === "bark") {
    graphics.fillStyle(0xf2b5c1).fillTriangle(headX + 18, headY + 10, headX + 34, headY + 4, headX + 34, headY + 18).strokeTriangle(headX + 18, headY + 10, headX + 34, headY + 4, headX + 34, headY + 18);
  }

  graphics.fillStyle(harness).fillRoundedRect(114, bodyY - 18, 12, 44, 6).strokeRoundedRect(114, bodyY - 18, 12, 44, 6);
  graphics.fillStyle(harness).fillRoundedRect(88, bodyY - 4, 44, 10, 5).strokeRoundedRect(88, bodyY - 4, 44, 10, 5);
  graphics.fillStyle(strap).fillCircle(124, bodyY - 2, 5).strokeCircle(124, bodyY - 2, 5);
}

function drawShibaTail(
  graphics: Phaser.GameObjects.Graphics,
  pose: ShibaPose,
  outerColor: number
): void {
  const tailX = pose === "tired" ? 62 : pose === "sit" ? 60 : 58;
  const tailY = pose === "tired" ? 74 : pose === "sit" ? 52 : 56;
  const innerColor = 0xe9b27e;

  graphics.fillStyle(outerColor).fillCircle(tailX, tailY, 24).strokeCircle(tailX, tailY, 24);
  graphics.fillStyle(innerColor).fillCircle(tailX, tailY, 14).strokeCircle(tailX, tailY, 14);
  graphics.beginPath();
  graphics.arc(tailX, tailY, 17, Phaser.Math.DegToRad(26), Phaser.Math.DegToRad(334), false);
  graphics.strokePath();
  graphics.beginPath();
  graphics.arc(tailX + 2, tailY + 1, 7, Phaser.Math.DegToRad(300), Phaser.Math.DegToRad(118), true);
  graphics.strokePath();
}

function drawShibaRearLeg(graphics: Phaser.GameObjects.Graphics): void {
  applyOutline(graphics, 3);
  graphics.fillStyle(0xb65f28).fillRoundedRect(14, 8, 16, 58, 7).strokeRoundedRect(14, 8, 16, 58, 7);
  graphics.fillStyle(0x4a3827).fillEllipse(22, 70, 22, 10).strokeEllipse(22, 70, 22, 10);
}

function drawShibaFrontLeg(graphics: Phaser.GameObjects.Graphics): void {
  applyOutline(graphics, 3);
  graphics.fillStyle(0xcd7a37).fillRoundedRect(14, 8, 16, 58, 7).strokeRoundedRect(14, 8, 16, 58, 7);
  graphics.fillStyle(0x4a3827).fillEllipse(22, 70, 22, 10).strokeEllipse(22, 70, 22, 10);
}
