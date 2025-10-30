import { writable, derived } from 'svelte/store';
import { audioFeedbackService } from '$lib/services/audio-feedback.service';
import type { LLMFeedbackResponse } from '$lib/api/llm.api';

/**
 * Store para gerenciar estado de feedback por áudio
 */

interface AudioFeedbackState {
  isEnabled: boolean;
  isPlaying: boolean;
  lastFeedback: LLMFeedbackResponse | null;
  errorMessage: string | null;
  volume: number; // 0-100
  tone: 'encouraging' | 'neutral' | 'motivational' | 'professional';
}

const initialState: AudioFeedbackState = {
  isEnabled: true,
  isPlaying: false,
  lastFeedback: null,
  errorMessage: null,
  volume: 80,
  tone: 'encouraging',
};

function createAudioFeedbackStore() {
  const { subscribe, set, update } = writable<AudioFeedbackState>(initialState);

  return {
    subscribe,

    /**
     * Ativa/desativa feedback por áudio
     */
    toggleEnabled: () => {
      update((state) => ({ ...state, isEnabled: !state.isEnabled }));
    },

    /**
     * Define o volume (0-100)
     */
    setVolume: (volume: number) => {
      update((state) => ({ ...state, volume: Math.max(0, Math.min(100, volume)) }));
    },

    /**
     * Define o tom do feedback
     */
    setTone: (tone: AudioFeedbackState['tone']) => {
      update((state) => ({ ...state, tone }));
    },

    /**
     * Gera e reproduz feedback por áudio
     */
    playFeedback: async (
      feedbackBase: string,
      context: { exercicio: string; nivel: string; language: string },
    ) => {
      let currentTone: AudioFeedbackState['tone'] = 'encouraging';
      let isEnabled = true;

      // Obter estado atual
      update((state) => {
        currentTone = state.tone;
        isEnabled = state.isEnabled;
        return { ...state, isPlaying: true, errorMessage: null };
      });

      // Se desabilitado, apenas gerar texto sem áudio
      if (!isEnabled) {
        try {
          const llmResponse = await audioFeedbackService.generateFeedbackText(
            feedbackBase,
            context,
            currentTone,
          );

          update((state) => ({
            ...state,
            lastFeedback: llmResponse,
            isPlaying: false,
          }));

          return llmResponse;
        } catch (error) {
          update((state) => ({
            ...state,
            errorMessage: (error as Error).message,
            isPlaying: false,
          }));
          throw error;
        }
      }

      // Gerar e reproduzir áudio
      try {
        const result = await audioFeedbackService.generateAndPlayFeedback(
          feedbackBase,
          context,
          currentTone,
        );

        update((state) => ({
          ...state,
          lastFeedback: result.llmResponse,
          isPlaying: false,
        }));

        return result.llmResponse;
      } catch (error) {
        update((state) => ({
          ...state,
          errorMessage: (error as Error).message,
          isPlaying: false,
        }));
        throw error;
      }
    },

    /**
     * Para a reprodução de áudio
     */
    stopAudio: () => {
      audioFeedbackService.stopAudio();
      update((state) => ({ ...state, isPlaying: false }));
    },

    /**
     * Fala um número (contagem de repetições) usando Eleven Labs
     */
    speakNumber: async (number: number) => {
      let isEnabled = true;

      update((state) => {
        isEnabled = state.isEnabled;
        return state;
      });

      if (!isEnabled) return;

      try {
        await audioFeedbackService.speakNumber(number, 'pt-BR');
      } catch (error) {
        console.warn('[AudioFeedbackStore] Erro ao falar número:', error);
      }
    },

    /**
     * Pré-carrega áudios de contagem (1-20) - chame no início do treino
     */
    preloadCountAudios: async () => {
      try {
        await audioFeedbackService.preloadRepCountAudios('pt-BR');
      } catch (error) {
        console.warn('[AudioFeedbackStore] Erro ao pré-carregar áudios:', error);
      }
    },

    /**
     * Limpa mensagens de erro
     */
    clearError: () => {
      update((state) => ({ ...state, errorMessage: null }));
    },

    /**
     * Reseta o store ao estado inicial
     */
    reset: () => {
      audioFeedbackService.stopAudio();
      set(initialState);
    },
  };
}

export const audioFeedbackStore = createAudioFeedbackStore();

/**
 * Derived store para obter texto do último feedback
 */
export const lastFeedbackText = derived(
  audioFeedbackStore,
  ($store) => $store.lastFeedback?.text || null,
);

/**
 * Derived store para obter micro-dica
 */
export const lastMicroTip = derived(
  audioFeedbackStore,
  ($store) => $store.lastFeedback?.micro_tip || null,
);
