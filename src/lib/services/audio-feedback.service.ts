import { base } from '$app/paths';
import type { FeedbackMode, FeedbackMessage } from '$lib/vision';
import type { MessageType, Severity } from '$lib/vision/types/feedback.types';

export type AudioFeedbackTone = 'encouraging' | 'motivational' | 'neutral' | 'professional';

export interface AudioFeedbackItem {
  id: string;
  text: string;
  type: MessageType;
  severity?: Severity;
  priority?: number;
  tone?: AudioFeedbackTone;
  metadata?: {
    mode?: FeedbackMode;
    exercise?: string | null;
  };
}

export interface PlaybackSnapshot {
  isPlaying: boolean;
  current: AudioFeedbackItem | null;
  queue: AudioFeedbackItem[];
}

export interface FeedbackAudioProvider {
  resolveAudioUrl(item: AudioFeedbackItem, tone: AudioFeedbackTone): Promise<string | null> | string | null;
}

/**
 * Provider that resolves audio files from the static `/audio/feedback` folder.
 * Files are resolved using a slug for the feedback text and an optional tone suffix:
 *   /audio/feedback/<slug>__<tone>.mp3
 */
export class StaticAudioFeedbackProvider implements FeedbackAudioProvider {
  private basePath: string;
  private includeToneInFilename: boolean;
  private overrides: Record<string, string>;

  constructor(options?: { basePath?: string; includeToneInFilename?: boolean; overrides?: Record<string, string> }) {
    this.basePath = options?.basePath || '/audio/feedback';
    this.includeToneInFilename = options?.includeToneInFilename !== false;
    this.overrides = options?.overrides || {};
  }

  resolveAudioUrl(item: AudioFeedbackItem, tone: AudioFeedbackTone): string {
    if (this.overrides[item.id]) {
      return this.overrides[item.id];
    }

    const filename = this.includeToneInFilename ? `${item.id}__${tone}.mp3` : `${item.id}.mp3`;
    return `${this.basePath}/${filename}`;
  }
}

export class AudioFeedbackService {
  private provider: FeedbackAudioProvider;
  private queue: AudioFeedbackItem[] = [];
  private current: AudioFeedbackItem | null = null;
  private isPlaying = false;
  private volume = 0.75;
  private tone: AudioFeedbackTone = 'neutral';
  private audioEl: HTMLAudioElement | null = null;
  private changeListeners = new Set<(snapshot: PlaybackSnapshot) => void>();
  private errorListeners = new Set<(message: string) => void>();
  private readyForAudio = typeof window !== 'undefined';

  constructor(provider?: FeedbackAudioProvider) {
    this.provider = provider || new StaticAudioFeedbackProvider();
  }

  onChange(listener: (snapshot: PlaybackSnapshot) => void): () => void {
    this.changeListeners.add(listener);
    listener(this.snapshot());
    return () => this.changeListeners.delete(listener);
  }

  onError(listener: (message: string) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  setTone(tone: AudioFeedbackTone) {
    this.tone = tone;
  }

  setVolume(percent: number) {
    const clamped = Math.max(0, Math.min(100, percent));
    this.volume = clamped / 100;
    if (this.audioEl) {
      this.audioEl.volume = this.volume;
    }
  }

  enqueue(items: AudioFeedbackItem[], options?: { replaceQueue?: boolean }) {
    if (!this.readyForAudio || items.length === 0) return;

    if (options?.replaceQueue) {
      this.queue = [...items];
    } else {
      this.queue.push(...items);
    }

    if (!this.isPlaying) {
      void this.playNext();
    }
    this.notify();
  }

  stop(clearQueue = true) {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
      this.audioEl = null;
    }
    this.isPlaying = false;
    this.current = null;
    if (clearQueue) {
      this.queue = [];
    }
    this.notify();
  }

  destroy() {
    this.stop();
    this.changeListeners.clear();
    this.errorListeners.clear();
  }

  private async playNext() {
    if (!this.readyForAudio) return;

    const next = this.queue.shift();
    this.current = next ?? null;

    if (!next) {
      this.isPlaying = false;
      this.notify();
      return;
    }

    const tone = next.tone ?? this.tone;
    let src: string | null = null;
    try {
      src = await this.provider.resolveAudioUrl(next, tone);
    } catch (error) {
      // Se não conseguir resolver, apenas ignora silenciosamente e vai para o próximo
      console.warn('Audio feedback: não foi possível resolver áudio', error);
    }

    if (!src) {
      return this.playNext();
    }

    const audioSrc = this.resolveAssetUrl(src);
    const audio = new Audio(audioSrc);
    audio.volume = this.volume;
    this.audioEl = audio;
    this.isPlaying = true;
    this.notify();

    audio.onended = () => {
      this.isPlaying = false;
      this.current = null;
      this.notify();
      void this.playNext();
    };

    audio.onerror = () => {
      this.isPlaying = false;
      this.current = null;
      this.notify();
      void this.playNext();
    };

    try {
      await audio.play();
    } catch (error) {
      // Ignora falhas de carregamento/reprodução e segue
      this.isPlaying = false;
      this.current = null;
      this.notify();
      void this.playNext();
    }
  }

  private snapshot(): PlaybackSnapshot {
    return {
      isPlaying: this.isPlaying,
      current: this.current,
      queue: [...this.queue]
    };
  }

  private notify() {
    const snapshot = this.snapshot();
    this.changeListeners.forEach((listener) => listener(snapshot));
  }

  private emitError(message: string) {
    this.errorListeners.forEach((listener) => listener(message));
  }

  private resolveAssetUrl(src: string): string {
    if (/^https?:\/\//i.test(src)) return src;
    const prefix = base === '/' ? '' : base;
    if (src.startsWith('/')) return `${prefix}${src}`;
    return `${prefix}/${src}`;
  }
}

/**
 * Converte um FeedbackMessage em uma entrada de áudio pronta para ser enfileirada.
 */
export function toAudioItem(
  message: FeedbackMessage,
  tone: AudioFeedbackTone,
  metadata?: AudioFeedbackItem['metadata']
): AudioFeedbackItem {
  const exercisePrefix = metadata?.exercise ? `${metadata.exercise}-` : '';
  const id = `${exercisePrefix}${feedbackMessageToId(message)}`;
  return {
    id,
    text: message.text,
    type: message.type,
    severity: message.severity,
    priority: message.priority,
    tone,
    metadata
  };
}

/**
 * Gera um ID de arquivo a partir do texto do feedback (remove acentos e símbolos).
 * O ID é usado como nome do arquivo MP3 na pasta /audio/feedback.
 */
export function feedbackMessageToId(message: FeedbackMessage): string {
  const base = (message.text || `${message.type}-${message.severity || 'low'}`).trim();
  const normalized = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalized || 'feedback';
}
