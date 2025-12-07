<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    isOpen?: boolean;
    onClose?: () => void;
    title?: string;
    showCloseButton?: boolean;
    class?: string;
    children?: Snippet;
  }

  let {
    isOpen = false,
    onClose,
    title,
    showCloseButton = true,
    class: className = '',
    children
  }: Props = $props();

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleEscape} />

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
    onclick={handleBackdropClick}
    onkeydown={handleEscape}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto {className}">
      {#if title || showCloseButton}
        <div class="flex items-center justify-between p-6 border-b">
          {#if title}
            <h2 class="text-2xl font-bold text-gray-900">{title}</h2>
          {/if}
          {#if showCloseButton && onClose}
            <button
              type="button"
              onclick={onClose}
              class="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fechar"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      {/if}
      
      <div class="p-6">
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}

