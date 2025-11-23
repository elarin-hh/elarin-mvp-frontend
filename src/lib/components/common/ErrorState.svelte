<script lang="ts">
  type Props = {
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void | Promise<void>;
    fullHeight?: boolean;
  };

  let {
    title = 'Algo deu errado',
    description = '',
    actionLabel = '',
    onAction,
    fullHeight = false
  }: Props = $props();

  let isPending = $state(false);

  async function handleAction() {
    if (!onAction) return;
    isPending = true;
    try {
      await onAction();
    } finally {
      isPending = false;
    }
  }
</script>

<div class={`state-wrapper ${fullHeight ? 'full-height' : ''}`}>
  <div class="state-card">
    <div class="state-icon error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01" />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10.29 3.86l-7.4 12.8A1.5 1.5 0 004.21 19.5h15.58a1.5 1.5 0 001.32-2.26l-7.4-12.8a1.5 1.5 0 00-2.62 0z"
        />
      </svg>
    </div>
    <div class="state-text">
      <h3>{title}</h3>
      {#if description}
        <p>{description}</p>
      {/if}
    </div>
    {#if actionLabel && onAction}
      <button class="state-button" type="button" onclick={handleAction} disabled={isPending}>
        {isPending ? 'Recarregando...' : actionLabel}
      </button>
    {/if}
  </div>
</div>

<style>
  .state-wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 2rem 1rem;
  }

  .state-wrapper.full-height {
    min-height: 60vh;
    align-items: center;
  }

  .state-card {
    background: var(--color-bg-dark-secondary);
    border: 1px solid var(--color-border-light);
    border-radius: 12px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    text-align: center;
    max-width: 480px;
    width: min(100%, 520px);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
  }

  .state-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: grid;
    place-items: center;
  }

  .state-icon.error {
    background: rgba(239, 68, 68, 0.12);
    color: var(--color-error);
    border: 1px solid rgba(239, 68, 68, 0.25);
  }

  .state-icon svg {
    width: 28px;
    height: 28px;
  }

  .state-text h3 {
    margin: 0;
    color: var(--color-text-primary);
    font-size: 1.1rem;
    font-weight: 700;
  }

  .state-text p {
    margin: 0.25rem 0 0;
    color: var(--color-text-secondary);
    line-height: 1.6;
    font-size: 0.95rem;
  }

  .state-button {
    margin-top: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--color-primary-500);
    color: var(--color-text-primary);
    border: none;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
    transition: var(--transition-base);
    width: fit-content;
  }

  .state-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .state-button:not(:disabled):hover {
    background: var(--color-primary-600);
    transform: translateY(-1px);
  }
</style>
