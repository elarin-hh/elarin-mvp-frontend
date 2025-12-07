<script lang="ts">
  import { onDestroy } from 'svelte';
  import { audioFeedbackActions, audioFeedbackStore } from '$lib/stores/audio-feedback.store';

  let isEnabled = true;
  let isPlaying = false;
  let errorMessage: string | null = null;

  const unsubscribe = audioFeedbackStore.subscribe((state) => {
    isEnabled = state.isEnabled;
    isPlaying = state.isPlaying;
    errorMessage = state.errorMessage;
  });

  onDestroy(unsubscribe);

  function toggleAudio() {
    audioFeedbackActions.toggleEnabled();
  }
</script>

<div class="audio-feedback-controls">
  <div class="row">
    <div class="status-block">
      <span class="dot" class:on={isEnabled}></span>
      <div class="status-copy">
        <span class="status-title">{isEnabled ? 'Audio ativado' : 'Audio desativado'}</span>
      </div>
    </div>
    <button
      onclick={toggleAudio}
      class="toggle-btn"
      class:enabled={isEnabled}
      disabled={isPlaying}
      aria-label={isEnabled ? 'Desativar feedback por audio' : 'Ativar feedback por audio'}
    >
      {isEnabled ? 'Desativar' : 'Ativar'}
    </button>
  </div>

  {#if isPlaying}
    <div class="chip playing">Reproduzindo feedback...</div>
  {/if}

  {#if errorMessage}
    <div class="chip error">
      Ops, {errorMessage}
      <button onclick={() => audioFeedbackActions.clearError()} class="close-btn">A-</button>
    </div>
  {/if}
</div>

<style>
  .audio-feedback-controls {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.85rem 1rem;
    padding: 0.85rem 1rem;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-backdrop);
    -webkit-backdrop-filter: var(--glass-backdrop);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    border-radius: var(--radius-standard);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .status-block {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .status-copy {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .status-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #fff;
  }

  .status-sub {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.68);
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.26);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.07);
  }

  .dot.on {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.12);
    background: var(--color-primary-500);
    border-color: var(--color-primary-600);
    box-shadow: 0 0 0 3px rgba(116, 198, 17, 0.15);
  }

  .toggle-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.8rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: var(--radius-standard);
    color: #fff;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .toggle-btn.enabled {
    background: transparent;
    border-color: rgba(255, 255, 255, 0.18);
    color: #f5f7fb;
  }

  .toggle-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .chip {
    padding: 0.45rem 0.7rem;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.03);
  }

  .chip.playing {
    color: #9ac6ff;
    border-color: rgba(59, 130, 246, 0.35);
    background: rgba(59, 130, 246, 0.12);
  }

  .chip.error {
    color: #ffb4b4;
    border-color: rgba(239, 68, 68, 0.4);
    background: rgba(239, 68, 68, 0.12);
  }

  .close-btn {
    margin-left: auto;
    background: transparent;
    border: none;
    color: inherit;
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    opacity: 0.7;
  }

  @media (max-width: 640px) {
    .audio-feedback-controls {
      padding: 0.75rem;
    }

    .row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .toggle-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
