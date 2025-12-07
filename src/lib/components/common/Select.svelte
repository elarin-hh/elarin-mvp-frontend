<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Option {
    value: string | number;
    label: string;
  }

  interface Props {
    options: Option[];
    value?: string | number;
    placeholder?: string;
    disabled?: boolean;
    onchange?: (value: string | number) => void;
    class?: string;
    label?: string;
    error?: string;
  }

  let {
    options,
    value = $bindable(''),
    placeholder = 'Selecione...',
    disabled = false,
    onchange,
    class: className = '',
    label,
    error
  }: Props = $props();

  let isOpen = $state(false);
  let selectedLabel = $derived(
    options.find((opt) => opt.value === value)?.label || placeholder
  );

  function toggleDropdown() {
    if (!disabled) {
      isOpen = !isOpen;
    }
  }

  function selectOption(option: Option) {
    value = option.value;
    isOpen = false;
    if (onchange) {
      onchange(option.value);
    }
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select')) {
      isOpen = false;
    }
  }

  $effect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  });
</script>

<div class="w-full {className}">
  {#if label}
    <label class="block text-white/80 text-sm mb-2">
      {label}
    </label>
  {/if}

  <div class="custom-select relative">
    <button
      type="button"
      onclick={toggleDropdown}
      disabled={disabled}
      class="w-full px-6 py-3 bg-transparent border-white/20 text-left focus:outline-none focus:border-white/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      style="border-radius: var(--radius-standard); border-width: 0.8px;"
    >
      <span class={value ? 'text-white' : 'text-white/50'}>{selectedLabel}</span>
      <svg
        class="w-5 h-5 transition-transform"
        class:rotate-180={isOpen}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    {#if isOpen && !disabled}
      <div
        class="absolute z-50 w-full mt-2 bg-black/95 border border-white/20 backdrop-blur-lg overflow-hidden"
        style="border-radius: var(--radius-standard); max-height: 300px; overflow-y: auto;"
      >
        {#each options as option}
          <button
            type="button"
            onclick={() => selectOption(option)}
            class="w-full px-6 py-3 text-white text-left hover:bg-white/10 transition-colors {value === option.value ? 'bg-white/5' : ''}"
          >
            {option.label}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  {#if error}
    <p class="mt-2 text-sm text-red-400">
      {error}
    </p>
  {/if}
</div>

<style>
  .custom-select {
    position: relative;
  }
</style>
