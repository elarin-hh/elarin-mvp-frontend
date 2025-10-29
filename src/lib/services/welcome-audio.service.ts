import { llmApi } from '$lib/api/llm.api';
import { ttsApi } from '$lib/api/tts.api';

/**
 * Reproduz texto usando Web Speech API (fallback gratuito)
 */
function playWithWebSpeech(text: string, language: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Web Speech API not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'pt-BR' ? 'pt-BR' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;

    utterance.onend = () => {
      console.log('[WelcomeAudio] Web Speech playback completed');
      resolve();
    };

    utterance.onerror = (event) => {
      console.error('[WelcomeAudio] Web Speech error:', event);
      reject(event);
    };

    console.log('[WelcomeAudio] Playing with Web Speech API (free fallback)...');
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Serviço para reproduzir mensagem de boas-vindas
 * Tenta ElevenLabs primeiro, fallback para Web Speech API (gratuito)
 */
export async function playWelcomeAudio(
  exercicio: string = 'treino',
  language: string = 'pt-BR',
): Promise<void> {
  try {
    console.log('[WelcomeAudio] Generating welcome message...');

    // 1. Gerar texto com LLM
    const llmResponse = await llmApi.feedbackToSpeech({
      feedback_base: 'welcome_start',
      context: {
        exercicio,
        nivel: 'iniciante',
        language,
      },
      tone: 'encouraging',
      include_ssml: false,
    });

    console.log('[WelcomeAudio] LLM response:', llmResponse.text);

    // 2. Tentar ElevenLabs primeiro
    try {
      const audioBuffer = await ttsApi.synthesizeStream(llmResponse);

      if (audioBuffer.byteLength > 0) {
        // ElevenLabs funcionou!
        console.log('[WelcomeAudio] Using ElevenLabs TTS, buffer size:', audioBuffer.byteLength);

        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);

        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(audioUrl);
          console.log('[WelcomeAudio] ElevenLabs playback completed');
        });

        audio.addEventListener('error', (error) => {
          console.error('[WelcomeAudio] ElevenLabs playback error:', error);
          URL.revokeObjectURL(audioUrl);
        });

        await audio.play();
        return;
      }
    } catch (ttsError) {
      console.warn('[WelcomeAudio] ElevenLabs failed (no credits or API error), using Web Speech API fallback');
    }

    // 3. Fallback: Web Speech API (gratuito, funciona offline)
    console.log('[WelcomeAudio] Using Web Speech API (free, built-in browser TTS)');
    await playWithWebSpeech(llmResponse.text, language);

  } catch (error) {
    console.error('[WelcomeAudio] Error:', error);
    throw error;
  }
}
