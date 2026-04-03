import { describe, expect, it } from "vitest";
import { SCENE_KEYS } from "./sceneKeys";

describe("scene scaffold", () => {
  it("includes the required scene keys", () => {
    expect(Object.values(SCENE_KEYS)).toEqual([
      "BootScene",
      "MenuScene",
      "RunScene",
      "UIScene",
      "SummaryScene"
    ]);
  });
});
