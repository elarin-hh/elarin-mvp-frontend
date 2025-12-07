<script lang="ts">
  type Props = {
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void | Promise<void>;
    fullHeight?: boolean;
  };

  let {
    title = 'Nada para ver por aqui',
    description = 'Nenhum item foi encontrado ou ainda não há dados disponíveis.',
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
    <div class="state-icon empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 7l9-4 9 4-9 4-9-4z"
        />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10l9 4 9-4V7" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 17l9-4 9 4" />
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
        {isPending ? 'Carregando...' : actionLabel}
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
    border-radius: var(--radius-md);
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    text-align: center;
    max-width: 520px;
    width: min(100%, 520px);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
  }

  .state-icon {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-full);
    display: grid;
    place-items: center;
  }

  .state-icon.empty {
    background: rgba(255, 255, 255, 0.06);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border-light);
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
    border-radius: var(--radius-md);
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
