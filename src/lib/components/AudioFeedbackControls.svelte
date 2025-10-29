<script lang="ts">
  import { audioFeedbackStore } from '$lib/stores/audio-feedback.store';
  import { Volume2, VolumeX, Mic, MicOff } from 'lucide-svelte';

  let { isEnabled, isPlaying, volume, tone, errorMessage } = $derived($audioFeedbackStore);

  const toneOptions: Array<{ value: string; label: string }> = [
    { value: 'encouraging', label: 'Encorajador' },
    { value: 'motivational', label: 'Motivacional' },
    { value: 'neutral', label: 'Neutro' },
    { value: 'professional', label: 'Profissional' },
  ];

  function toggleAudio() {
    audioFeedbackStore.toggleEnabled();
  }

  function handleVolumeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    audioFeedbackStore.setVolume(parseInt(target.value, 10));
  }

  function handleToneChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    audioFeedbackStore.setTone(
      target.value as 'encouraging' | 'neutral' | 'motivational' | 'professional',
    );
  }
</script>

<div class="audio-feedback-controls">
  <!-- Toggle de Áudio -->
  <button
    onclick={toggleAudio}
    class="toggle-btn"
    class:enabled={isEnabled}
    disabled={isPlaying}
    aria-label={isEnabled ? 'Desativar feedback por áudio' : 'Ativar feedback por áudio'}
  >
    {#if isEnabled}
      <Volume2 size={20} />
      <span>Áudio Ativado</span>
    {:else}
      <VolumeX size={20} />
      <span>Áudio Desativado</span>
    {/if}
  </button>

  <!-- Controles Expandidos (apenas se habilitado) -->
  {#if isEnabled}
    <div class="expanded-controls">
      <!-- Seletor de Tom -->
      <div class="control-group">
        <label for="tone-select">
          <Mic size={16} />
          Tom:
        </label>
        <select id="tone-select" bind:value={tone} onchange={handleToneChange} disabled={isPlaying}>
          {#each toneOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <!-- Controle de Volume -->
      <div class="control-group">
        <label for="volume-slider">
          {#if volume === 0}
            <VolumeX size={16} />
          {:else}
            <Volume2 size={16} />
          {/if}
          Volume: {volume}%
        </label>
        <input
          id="volume-slider"
          type="range"
          min="0"
          max="100"
          step="5"
          value={volume}
          oninput={handleVolumeChange}
          disabled={isPlaying}
        />
      </div>
    </div>
  {/if}

  <!-- Status de Reprodução -->
  {#if isPlaying}
    <div class="status playing">
      <div class="spinner"></div>
      Reproduzindo feedback...
    </div>
  {/if}

  <!-- Mensagem de Erro -->
  {#if errorMessage}
    <div class="status error">
      ⚠️ {errorMessage}
      <button onclick={() => audioFeedbackStore.clearError()} class="close-btn">×</button>
    </div>
  {/if}
</div>

<style>
  .audio-feedback-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    color: #fff;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .toggle-btn.enabled {
    background: rgba(34, 197, 94, 0.2);
    border-color: rgba(34, 197, 94, 0.4);
  }

  .toggle-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .expanded-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .control-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
  }

  .control-group select {
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    color: #fff;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .control-group select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .control-group input[type='range'] {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    outline: none;
    -webkit-appearance: none;
  }

  .control-group input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    background: #22c55e;
    border-radius: 50%;
    cursor: pointer;
  }

  .control-group input[type='range']::-moz-range-thumb {
    width: 16px;
    height: 16px;
    background: #22c55e;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }

  .control-group input[type='range']:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status {
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status.playing {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.4);
    color: #60a5fa;
  }

  .status.error {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #f87171;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #60a5fa;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .close-btn {
    margin-left: auto;
    background: transparent;
    border: none;
    color: inherit;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    opacity: 0.7;
  }

  /* Mobile */
  @media (max-width: 640px) {
    .audio-feedback-controls {
      padding: 0.75rem;
    }

    .toggle-btn {
      font-size: 0.875rem;
      padding: 0.625rem 0.875rem;
    }
  }
</style>
