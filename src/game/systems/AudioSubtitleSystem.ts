import {
  AUDIO_SUBTITLE_MAP,
  type AudioSubtitleId
} from "../data/audioSubtitles";
import { GAME_EVENT_KEYS, gameEvents } from "../events";

export class AudioSubtitleSystem {
  getSubtitle(id: AudioSubtitleId): string {
    return AUDIO_SUBTITLE_MAP[id];
  }

  queueSubtitle(id: AudioSubtitleId, durationMs = 2200): string {
    const text = this.getSubtitle(id);

    gameEvents.emit(GAME_EVENT_KEYS.subtitleQueued, {
      cueId: id,
      text,
      durationMs
    });

    return text;
  }
}
