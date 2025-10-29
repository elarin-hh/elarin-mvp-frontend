import { restClient } from './rest.client';
import type { LLMFeedbackResponse } from './llm.api';

/**
 * Tipos para integração TTS
 */
export interface TTSResponse {
  short_id: string;
  content_type: string;
  duration_ms?: number;
  cached: boolean;
  audio_url?: string;
  audio_base64?: string;
  message?: string;
}

/**
 * API Client para serviço TTS
 */
export const ttsApi = {
  /**
   * Sintetiza áudio a partir da saída do LLM
   * POST /tts/synthesize
   */
  async synthesize(llmOutput: LLMFeedbackResponse): Promise<TTSResponse> {
    const response = await restClient.post<TTSResponse>(
      '/tts/synthesize',
      llmOutput,
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to synthesize audio');
    }

    return response.data;
  },

  /**
   * Sintetiza e retorna áudio como stream/buffer
   * POST /tts/synthesize/stream
   */
  async synthesizeStream(llmOutput: LLMFeedbackResponse): Promise<ArrayBuffer> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3337';
    const url = `${baseUrl}/tts/synthesize/stream`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(llmOutput),
    });

    if (!response.ok) {
      throw new Error(`TTS stream failed: ${response.statusText}`);
    }

    return response.arrayBuffer();
  },
};
