<script lang="ts">
  import Button from "./Button.svelte";

  interface Props {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "default";
    onConfirm: () => void;
    onCancel: () => void;
  }

  let {
    isOpen,
    title = "Confirmar ação",
    message,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    variant = "default",
    onConfirm,
    onCancel,
  }: Props = $props();

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onCancel();
    }
  }
</script>

<svelte:window onkeydown={isOpen ? handleEscape : undefined} />

{#if isOpen}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={handleBackdropClick}
    onkeydown={handleEscape}
  >
    <div class="confirm-dialog-content">
      <div class="p-6">
        <h3 class="text-xl font-bold text-white mb-2">{title}</h3>
        <p class="text-white/70 text-sm mb-6 leading-relaxed">
          {message}
        </p>

        <div class="flex justify-end gap-3">
          <button
            type="button"
            class="btn-ghost text-white/80"
            style="border-radius: var(--radius-md);"
            onclick={onCancel}
          >
            {cancelLabel}
          </button>

          {#if variant === "danger"}
            <Button
              class="btn-radius-md !bg-red-500 hover:!bg-red-600 text-white"
              onclick={onConfirm}
            >
              {#snippet children()}{confirmLabel}{/snippet}
            </Button>
          {:else if variant === "warning"}
            <Button
              class="btn-radius-md !bg-yellow-500 hover:!bg-yellow-600 text-white"
              onclick={onConfirm}
            >
              {#snippet children()}{confirmLabel}{/snippet}
            </Button>
          {:else}
            <Button
              variant="primary"
              class="btn-radius-md"
              onclick={onConfirm}
            >
              {#snippet children()}{confirmLabel}{/snippet}
            </Button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .confirm-dialog-content {
    width: 100%;
    max-width: 400px;
    background: var(--color-bg-dark-secondary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-standard);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    animation: scaleIn 0.2s ease-out forwards;
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  :global(.btn-ghost) {
    padding: 0.5rem 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.875rem;
    transition: background-color 0.2s;
  }
  :global(.btn-ghost:hover) {
    background: rgba(255, 255, 255, 0.05);
  }
</style>
