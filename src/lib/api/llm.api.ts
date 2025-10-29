import { restClient } from './rest.client';

/**
 * Tipos para integração LLM
 */
export interface FeedbackContext {
  exercicio: string;
  nivel: string;
  language: string;
}

export interface FeedbackToSpeechRequest {
  feedback_base: string;
  context: FeedbackContext;
  tone: 'encouraging' | 'neutral' | 'motivational' | 'professional';
  include_ssml: boolean;
}

export interface LLMFeedbackResponse {
  text: string;
  ssml: string | null;
  language: string;
  tone_used: string;
  micro_tip: string | null;
  short_id: string;
  moderated: boolean;
}

/**
 * API Client para serviço LLM
 */
export const llmApi = {
  /**
   * Converte feedback técnico em texto natural/SSML
   * POST /llm/feedback-to-speech
   */
  async feedbackToSpeech(
    request: FeedbackToSpeechRequest,
  ): Promise<LLMFeedbackResponse> {
    const response = await restClient.post<LLMFeedbackResponse>(
      '/llm/feedback-to-speech',
      request,
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to generate feedback speech');
    }

    return response.data;
  },
};
