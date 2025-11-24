import { get, writable } from 'svelte/store';
import type { FeedbackMessage, FeedbackMode } from '$lib/vision';
import type { ExerciseType } from './training.store';
import {
  AudioFeedbackService,
  StaticAudioFeedbackProvider,
  toAudioItem,
  feedbackMessageToId,
  type AudioFeedbackItem,
  type AudioFeedbackTone
} from '$lib/services/audio-feedback.service';

export interface AudioFeedbackState {
  isEnabled: boolean;
  isPlaying: boolean;
  volume: number;
  tone: AudioFeedbackTone;
  queue: AudioFeedbackItem[];
  current: AudioFeedbackItem | null;
  errorMessage: string | null;
}

const initialState: AudioFeedbackState = {
  isEnabled: true,
  isPlaying: false,
  volume: 100,
  tone: 'neutral',
  queue: [],
  current: null,
  errorMessage: null
};

const store = writable<AudioFeedbackState>(initialState);

// Provider resolves audio files from /audio/feedback/<slug>__<tone>.mp3
const provider = new StaticAudioFeedbackProvider({
  basePath: '/audio/feedback',
  includeToneInFilename: true
});

const service = new AudioFeedbackService(provider);

// Evita repetir o mesmo áudio em sequência (debounce).
const recentlyQueued = new Map<string, number>();
const RECENT_MESSAGE_WINDOW_MS = 1500;

service.onChange((snapshot) => {
  store.update((state) => ({
    ...state,
    isPlaying: snapshot.isPlaying,
    queue: snapshot.queue,
    current: snapshot.current
  }));
});

service.onError((message) => {
  store.update((state) => ({
    ...state,
    errorMessage: message
  }));
});

function shouldPlayMessage(id: string): boolean {
  const now = Date.now();
  const last = recentlyQueued.get(id);
  if (last && now - last < RECENT_MESSAGE_WINDOW_MS) {
    return false;
  }
  recentlyQueued.set(id, now);
  return true;
}

export const audioFeedbackStore = {
  subscribe: store.subscribe
};

export const audioFeedbackActions = {
  setEnabled(enabled: boolean) {
    store.update((state) => ({ ...state, isEnabled: enabled }));
    if (!enabled) {
      service.stop();
    }
  },

  toggleEnabled() {
    const next = !get(store).isEnabled;
    this.setEnabled(next);
  },

  setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(100, volume));
    service.setVolume(clamped);
    store.update((state) => ({ ...state, volume: clamped }));
  },

  clearError() {
    store.update((state) => ({ ...state, errorMessage: null }));
  },

  stop(clearQueue = true) {
    service.stop(clearQueue);
    store.update((state) => ({
      ...state,
      isPlaying: false,
      current: null,
      queue: clearQueue ? [] : state.queue
    }));
  },

  /**
   * Converte mensagens de feedback em áudio e toca na ordem de prioridade.
   */
  playFeedback(
    messages: FeedbackMessage[],
    options?: { mode?: FeedbackMode; exercise?: ExerciseType | null; replaceQueue?: boolean; tone?: AudioFeedbackTone }
  ) {
    const state = get(store);
    if (!state.isEnabled) return;

    const tone = options?.tone || state.tone;
    const audioItems = messages
      .map((message, index) => {
        const id = feedbackMessageToId(message) || `feedback-${index}`;
        if (!shouldPlayMessage(id)) return null;

        return toAudioItem(message, tone, {
          mode: options?.mode,
          exercise: options?.exercise ?? null
        });
      })
      .filter(Boolean) as AudioFeedbackItem[];

    if (audioItems.length === 0) return;

    service.setTone(tone);
    service.enqueue(audioItems, { replaceQueue: options?.replaceQueue !== false });
  }
};
