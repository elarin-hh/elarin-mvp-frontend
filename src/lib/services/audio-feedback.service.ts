import { llmApi, type FeedbackToSpeechRequest, type LLMFeedbackResponse } from '$lib/api/llm.api';
import { ttsApi } from '$lib/api/tts.api';

/**
 * Serviço integrado de feedback por áudio
 * Orquestra chamadas LLM + TTS de forma desacoplada
 */
export class AudioFeedbackService {
  private audioContext: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    // Inicializar AudioContext para Web Audio API
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Gera e reproduz feedback por áudio completo (LLM + TTS)
   */
  async generateAndPlayFeedback(
    feedbackBase: string,
    context: { exercicio: string; nivel: string; language: string },
    tone: 'encouraging' | 'neutral' | 'motivational' | 'professional' = 'encouraging',
  ): Promise<{
    llmResponse: LLMFeedbackResponse;
    audioPlayed: boolean;
  }> {
    try {
      // Etapa 1: LLM - Gerar texto natural/SSML
      const llmRequest: FeedbackToSpeechRequest = {
        feedback_base: feedbackBase,
        context,
        tone,
        include_ssml: true,
      };

      const llmResponse = await llmApi.feedbackToSpeech(llmRequest);

      // Etapa 2: TTS - Sintetizar áudio
      let audioBuffer: ArrayBuffer;
      try {
        audioBuffer = await ttsApi.synthesizeStream(llmResponse);
      } catch (ttsError) {
        console.warn('TTS backend failed, will use Web Speech API:', ttsError);
        audioBuffer = new ArrayBuffer(0);
      }

      // Etapa 3: Reproduzir áudio (com fallback para Web Speech API)
      const audioPlayed = await this.playAudioBuffer(
        audioBuffer,
        llmResponse.text,
        context.language,
      );

      return {
        llmResponse,
        audioPlayed,
      };
    } catch (error) {
      console.error('Error generating audio feedback:', error);
      throw error;
    }
  }

  /**
   * Apenas gera o texto via LLM (sem TTS)
   */
  async generateFeedbackText(
    feedbackBase: string,
    context: { exercicio: string; nivel: string; language: string },
    tone: 'encouraging' | 'neutral' | 'motivational' | 'professional' = 'encouraging',
  ): Promise<LLMFeedbackResponse> {
    const llmRequest: FeedbackToSpeechRequest = {
      feedback_base: feedbackBase,
      context,
      tone,
      include_ssml: false,
    };

    return llmApi.feedbackToSpeech(llmRequest);
  }

  /**
   * Reproduz texto usando Web Speech API (fallback)
   */
  private async playTextWithWebSpeech(text: string, language: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('Web Speech API not supported');
        resolve(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'pt-BR' ? 'pt-BR' : 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;

      utterance.onend = () => {
        console.log('[AudioFeedback] Web Speech playback completed');
        resolve(true);
      };

      utterance.onerror = (event) => {
        console.error('[AudioFeedback] Web Speech error:', event);
        resolve(false);
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Reproduz áudio a partir de ArrayBuffer
   */
  private async playAudioBuffer(arrayBuffer: ArrayBuffer, fallbackText?: string, language?: string): Promise<boolean> {
    try {
      // Se buffer vazio, usar Web Speech API
      if (arrayBuffer.byteLength === 0 && fallbackText && language) {
        console.log('[AudioFeedback] Empty buffer, using Web Speech API');
        return await this.playTextWithWebSpeech(fallbackText, language);
      }

      // Método 1: HTMLAudioElement com Blob URL (mais simples)
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);

      // Parar áudio anterior se houver
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }

      this.currentAudio = new Audio(audioUrl);

      // Reproduzir
      await this.currentAudio.play();

      // Limpar URL após reprodução
      this.currentAudio.addEventListener('ended', () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
      });

      return true;
    } catch (error) {
      console.error('Error playing audio buffer:', error);
      // Fallback para Web Speech API
      if (fallbackText && language) {
        console.log('[AudioFeedback] Falling back to Web Speech API');
        return await this.playTextWithWebSpeech(fallbackText, language);
      }
      return false;
    }
  }

  /**
   * Reproduz áudio via Web Audio API (controle avançado)
   */
  private async playAudioWithWebAudioAPI(arrayBuffer: ArrayBuffer): Promise<boolean> {
    if (!this.audioContext) {
      console.warn('AudioContext not available');
      return false;
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);

      return true;
    } catch (error) {
      console.error('Error with Web Audio API:', error);
      return false;
    }
  }

  /**
   * Para a reprodução de áudio atual
   */
  stopAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  /**
   * Converte feedback técnico do ExerciseAnalyzer para formato LLM
   */
  feedbackRecordToLLMInput(
    feedbackRecord: {
      combined: { verdict: string; reason: string };
      messages: Array<{ text: string; type: string }>;
    },
    exercicio: string,
    nivel: string,
    language: string,
  ): string {
    // Extrair feedback técnico mais relevante
    const criticalMessages = feedbackRecord.messages
      .filter((m) => m.type === 'error' || m.type === 'warning')
      .map((m) => m.text)
      .join('; ');

    if (criticalMessages) {
      return criticalMessages;
    }

    // Se não há erros, usar o veredito
    if (feedbackRecord.combined.verdict === 'correct') {
      return 'correct_form';
    }

    return feedbackRecord.combined.reason || 'generic_feedback';
  }

  /**
   * Destrói recursos
   */
  destroy(): void {
    this.stopAudio();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Instância singleton
export const audioFeedbackService = new AudioFeedbackService();
