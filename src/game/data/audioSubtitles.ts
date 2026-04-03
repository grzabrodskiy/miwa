export const AUDIO_SUBTITLE_MAP = {
  bark: "Shiba: arf!",
  whine: "Shiba: worried whine",
  cheer: "Owner: nice work!",
  cat_crossing: "A cat darts across the path.",
  small_dog_owner: "A small dog and owner appear nearby.",
  large_dog_owner: "A large dog and owner approach.",
  rain_starts: "Rain starts falling. The Shiba wants to head home."
} as const;

export type AudioSubtitleId = keyof typeof AUDIO_SUBTITLE_MAP;
