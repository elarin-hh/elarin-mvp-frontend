<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Exercise } from "$lib/api/exercises.api";
  import { clickOutside } from "$lib/actions/clickOutside";

  export let exercise: Exercise;
  export let isOpen = false;

  const dispatch = createEventDispatcher();
  let isLoading = false;
  let formConfig: Record<string, any> = {};

  $: if (isOpen && exercise) {
    formConfig = { ...exercise.config };
    if (!formConfig.heuristicConfig) {
      formConfig.heuristicConfig = {};
    }
  }

  async function handleSave() {
    isLoading = true;
    try {
      dispatch("save", { exerciseId: exercise.id, config: formConfig });
    } finally {
      isLoading = false;
    }
  }

  function handleClose() {
    dispatch("close");
  }
</script>

{#if isOpen}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
  >
    <div
      class="bg-[#1e1e1e] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden"
      use:clickOutside={handleClose}
    >
      <div
        class="flex items-center justify-between p-6 border-b border-white/10"
      >
        <h2 class="text-xl font-semibold text-white">
          Configurar {exercise.name}
        </h2>
        <button
          on:click={handleClose}
          aria-label="Fechar modal de configuracao"
          type="button"
          class="text-white/50 hover:text-white transition-colors"
        >
          <svg
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {#if formConfig.heuristicConfig && Object.keys(formConfig.heuristicConfig).length > 0}
          <div class="space-y-4">
            {#each Object.entries(formConfig.heuristicConfig) as [key, value]}
              <div class="form-group">
                <label
                  for={key}
                  class="block text-sm font-medium text-gray-300 mb-1 capitalize"
                >
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </label>

                {#if typeof value === "number"}
                  <div class="flex items-center gap-4">
                    <input
                      id={key}
                      type="number"
                      step="0.1"
                      bind:value={formConfig.heuristicConfig[key]}
                      class="bg-[#2a2a2a] border border-white/10 rounded px-3 py-2 text-white w-full focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                {:else if typeof value === "boolean"}
                  <div class="flex items-center gap-4">
                    <input
                      id={key}
                      type="checkbox"
                      bind:checked={formConfig.heuristicConfig[key]}
                      class="w-5 h-5 accent-indigo-500 bg-gray-700 rounded border-gray-600 focus:ring-indigo-500 ring-offset-gray-800"
                    />
                    <span class="text-sm text-gray-400"
                      >{formConfig.heuristicConfig[key]
                        ? "Ativado"
                        : "Desativado"}</span
                    >
                  </div>
                {:else}
                  <input
                    id={key}
                    type="text"
                    bind:value={formConfig.heuristicConfig[key]}
                    class="bg-[#2a2a2a] border border-white/10 rounded px-3 py-2 text-white w-full focus:outline-none focus:border-indigo-500"
                  />
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-8 text-white/50">
            <p>Nenhuma configuração disponível para este exercício.</p>
          </div>
        {/if}
      </div>

      <div class="p-6 border-t border-white/10 flex justify-end gap-3">
        <button
          on:click={handleClose}
          class="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          on:click={handleSave}
          disabled={isLoading}
          class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {#if isLoading}
            <div
              class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"
            ></div>
          {/if}
          Salvar Alterações
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #1e1e1e;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 3px;
  }
</style>
