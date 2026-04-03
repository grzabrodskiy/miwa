import Phaser from "phaser";

type ShibaPose =
  | "idle"
  | "walk"
  | "pull"
  | "sit"
  | "tired"
  | "bark";

type OwnerPose = "walkA" | "walkB" | "brace";

export const CHARACTER_TEXTURE_KEYS = {
  ownerWalk: "character-owner-walk-v7",
  ownerWalkAlt: "character-owner-walk-alt-v7",
  ownerBrace: "character-owner-brace-v7",
  shibaIdle: "character-shiba-idle-v5",
  shibaWalk: "character-shiba-walk-v5",
  shibaPullBackward: "character-shiba-pull-backward-v5",
  shibaSitRefuse: "character-shiba-sit-refuse-v5",
  shibaTiredRecover: "character-shiba-tired-recover-v5",
  shibaBarkOneShot: "character-shiba-bark-v5",
  shibaLegBack: "character-shiba-leg-back-v5",
  shibaLegFront: "character-shiba-leg-front-v5"
} as const;

export function ensureCharacterTextures(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  generateTexture(scene, graphics, CHARACTER_TEXTURE_KEYS.ownerWalk, 170, 244, (ctx) =>
    drawOwner(ctx, "walkA")
  );
  generateTexture(scene, graphics, CHARACTER_TEXTURE_KEYS.ownerWalkAlt, 170, 244, (ctx) =>
    drawOwner(ctx, "walkB")
  );
  generateTexture(scene, graphics, CHARACTER_TEXTURE_KEYS.ownerBrace, 170, 244, (ctx) =>
    drawOwner(ctx, "brace")
  );
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

function drawOwner(graphics: Phaser.GameObjects.Graphics, pose: OwnerPose): void {
  applyOutline(graphics);

  const braced = pose === "brace";
  const hairBase = 0xd34839;
  const hairShadow = 0x8f271f;
  const coatBase = braced ? 0x2f485f : 0x3d5d77;
  const coatLight = braced ? 0x6f95b2 : 0x89afcc;
  const blouse = 0xf6ede6;
  const skirt = 0x1f2741;
  const belt = 0x8b5d42;
  const scarf = 0xf3bf8f;
  const skin = 0xffd2b1;
  const lip = 0xbf7268;
  const tights = 0x302d38;
  const boots = 0x312620;
  const frontLegX = pose === "walkA" ? 100 : pose === "walkB" ? 82 : 96;
  const backLegX = pose === "walkA" ? 70 : pose === "walkB" ? 90 : 74;
  const frontLegTop = pose === "walkA" ? 164 : pose === "walkB" ? 160 : 162;
  const backLegTop = pose === "walkA" ? 160 : pose === "walkB" ? 164 : 162;

  graphics.fillStyle(0x262433)
    .fillRoundedRect(backLegX, backLegTop, 14, 52, 8)
    .strokeRoundedRect(backLegX, backLegTop, 14, 52, 8);
  graphics.fillStyle(tights)
    .fillRoundedRect(frontLegX, frontLegTop, 14, 52, 8)
    .strokeRoundedRect(frontLegX, frontLegTop, 14, 52, 8);
  graphics.fillStyle(boots)
    .fillRoundedRect(backLegX - 2, 212, 22, 14, 7)
    .strokeRoundedRect(backLegX - 2, 212, 22, 14, 7);
  graphics.fillStyle(boots)
    .fillRoundedRect(frontLegX - 2, 212, 22, 14, 7)
    .strokeRoundedRect(frontLegX - 2, 212, 22, 14, 7);

  graphics.fillStyle(skirt).fillRoundedRect(68, 148, 44, 16, 8).strokeRoundedRect(68, 148, 44, 16, 8);
  graphics.fillStyle(skirt).fillTriangle(68, 162, 112, 162, 90, 174).strokeTriangle(68, 162, 112, 162, 90, 174);
  graphics.fillStyle(belt).fillRoundedRect(70, 146, 40, 7, 3).strokeRoundedRect(70, 146, 40, 7, 3);
  graphics.fillStyle(coatBase).fillEllipse(90, 84, 86, 22).strokeEllipse(90, 84, 86, 22);
  graphics.fillStyle(coatBase).fillRoundedRect(56, 82, 68, 74, 24).strokeRoundedRect(56, 82, 68, 74, 24);
  graphics.fillStyle(coatLight).fillRoundedRect(66, 88, 46, 56, 16);
  graphics.fillStyle(blouse).fillRoundedRect(80, 92, 18, 34, 9);
  graphics.fillStyle(scarf).fillRoundedRect(78, 78, 24, 14, 6).strokeRoundedRect(78, 78, 24, 14, 6);
  graphics.fillStyle(0xe2baa0).fillTriangle(90, 124, 102, 148, 78, 148).strokeTriangle(90, 124, 102, 148, 78, 148);
  graphics.fillStyle(coatBase).fillRoundedRect(48, 94, 14, braced ? 48 : 42, 8).strokeRoundedRect(48, 94, 14, braced ? 48 : 42, 8);
  graphics.fillStyle(coatBase).fillRoundedRect(118, braced ? 94 : 88, 14, braced ? 44 : 40, 8).strokeRoundedRect(118, braced ? 94 : 88, 14, braced ? 44 : 40, 8);
  graphics.fillStyle(skin).fillCircle(54, braced ? 136 : 130, 7).strokeCircle(54, braced ? 136 : 130, 7);
  graphics.fillStyle(skin).fillCircle(126, braced ? 132 : 126, 7).strokeCircle(126, braced ? 132 : 126, 7);

  graphics.fillStyle(skin).fillRoundedRect(85, 60, 10, 18, 5).strokeRoundedRect(85, 60, 10, 18, 5);
  graphics.fillStyle(skin).fillEllipse(90, 44, 48, 54).strokeEllipse(90, 44, 48, 54);
  graphics.fillStyle(hairBase).fillEllipse(88, 24, 50, 18).strokeEllipse(88, 24, 50, 18);
  graphics.fillStyle(hairShadow).fillRoundedRect(62, 22, 12, 22, 6).strokeRoundedRect(62, 22, 12, 22, 6);
  graphics.fillStyle(hairShadow).fillTriangle(72, 28, 56, 40, 70, 54).strokeTriangle(72, 28, 56, 40, 70, 54);
  graphics.fillStyle(hairBase).fillTriangle(76, 24, 116, 24, 98, 42).strokeTriangle(76, 24, 116, 24, 98, 42);
  graphics.fillStyle(hairBase).fillTriangle(100, 22, 126, 24, 110, 34).strokeTriangle(100, 22, 126, 24, 110, 34);
  graphics.fillStyle(hairBase).fillRoundedRect(96, 22, 10, 8, 4).strokeRoundedRect(96, 22, 10, 8, 4);
  graphics.fillStyle(0x2d241a).fillCircle(98, 43, 2);
  graphics.fillStyle(0x2d241a).fillCircle(82, 43, 2);
  graphics.lineStyle(2, 0x8a5a4a, 0.85);
  graphics.lineBetween(82, 56, 88, 58);
  graphics.fillStyle(lip).fillEllipse(90, 55, 8, 3);
}

function drawShibaBody(graphics: Phaser.GameObjects.Graphics, pose: ShibaPose): void {
  applyOutline(graphics, 3);

  const bodyColor = pose === "pull" ? 0xc0692a : pose === "tired" ? 0xbc6a2f : 0xc9712b;
  const headColor = pose === "pull" ? 0xd47d38 : 0xd98540;
  const cream = 0xf2d8b2;
  const harness = 0x5d6b77;
  const eyeY =
    pose === "tired" ? 60 : pose === "sit" ? 52 : pose === "pull" ? 48 : 50;
  const bodyY =
    pose === "sit" ? 90 : pose === "tired" ? 98 : pose === "pull" ? 82 : 78;
  const headX =
    pose === "pull" ? 142 : pose === "sit" ? 134 : pose === "tired" ? 128 : 144;
  const headY =
    pose === "pull" ? 58 : pose === "sit" ? 52 : pose === "tired" ? 78 : 56;

  drawShibaTail(graphics, pose, bodyColor);

  graphics.fillStyle(bodyColor).fillEllipse(108, bodyY, 112, pose === "sit" ? 44 : 52).strokeEllipse(108, bodyY, 112, pose === "sit" ? 44 : 52);
  graphics.fillStyle(headColor).fillEllipse(headX, headY, pose === "tired" ? 46 : 52, pose === "tired" ? 36 : 42).strokeEllipse(headX, headY, pose === "tired" ? 46 : 52, pose === "tired" ? 36 : 42);
  graphics.fillStyle(cream).fillEllipse(headX + 12, headY + 8, 20, 14);
  graphics.fillStyle(cream).fillEllipse(106, bodyY + 10, 30, 14);

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

  graphics.fillStyle(harness).fillRoundedRect(114, bodyY - 18, 12, 44, 6);
  graphics.fillStyle(harness).fillRoundedRect(88, bodyY - 4, 44, 10, 5);
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
}

function drawShibaRearLeg(graphics: Phaser.GameObjects.Graphics): void {
  applyOutline(graphics, 3);
  graphics.fillStyle(0xb65f28).fillRoundedRect(14, 8, 16, 56, 7).strokeRoundedRect(14, 8, 16, 56, 7);
  graphics.fillStyle(0x4a3827).fillRoundedRect(10, 60, 24, 12, 6).strokeRoundedRect(10, 60, 24, 12, 6);
}

function drawShibaFrontLeg(graphics: Phaser.GameObjects.Graphics): void {
  applyOutline(graphics, 3);
  graphics.fillStyle(0xcd7a37).fillRoundedRect(14, 8, 16, 56, 7).strokeRoundedRect(14, 8, 16, 56, 7);
  graphics.fillStyle(0x4a3827).fillRoundedRect(10, 60, 24, 12, 6).strokeRoundedRect(10, 60, 24, 12, 6);
}
