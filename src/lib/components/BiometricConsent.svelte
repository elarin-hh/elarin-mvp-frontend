<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Lock, Loader2 } from "lucide-svelte";
  import { restClient } from "$lib/api/rest.client";

  export let visible = false;

  const dispatch = createEventDispatcher();

  const BIOMETRIC_CONSENT_TTL_DAYS = 180;

  let checkbox1 = false;
  let checkbox2 = false;
  let loading = false;

  async function handleAccept() {
    if (!checkbox1 || !checkbox2) {
      alert("Por favor, marque ambas as caixas para continuar.");
      return;
    }

    loading = true;

    try {
      const response = await restClient.patch("/auth/consent", {
        consent_type: "biometric",
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
      });

      if (response.success) {
        const now = new Date();
        const expiresAt = new Date(
          now.getTime() + BIOMETRIC_CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000,
        );

        localStorage.setItem("elarin_biometric_consent", "true");
        localStorage.setItem("elarin_biometric_consent_ts", now.toISOString());
        localStorage.setItem(
          "elarin_biometric_consent_exp",
          expiresAt.toISOString(),
        );
        dispatch("accepted");
        visible = false;
      } else {
        throw new Error(response.error?.message);
      }
    } catch (error) {
      console.error("Erro ao salvar consentimento biométrico:", error);
      alert("Erro ao salvar consentimento. Tente novamente.");
    } finally {
      loading = false;
    }
  }

  function handleDeny() {
    dispatch("denied");
    visible = false;
  }
</script>

{#if visible}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    style="background: rgba(0, 0, 0, 0.8);"
    role="dialog"
    aria-modal="true"
    aria-labelledby="biometric-title"
  >
    <div class="glass-modal w-full max-w-xl">
      <div class="modal-content p-8">
        <div class="flex items-start gap-3 mb-6">
          <Lock
            size={24}
            style="color: var(--color-primary-500); flex-shrink: 0;"
          />
          <div>
            <h2 id="biometric-title" class="text-xl font-bold text-white mb-1">
              Consentimento Biométrico
            </h2>
            <p class="text-xs text-white/50">LGPD Art. 11, II, alínea "a"</p>
          </div>
        </div>

        <div class="space-y-4 mb-6">
          <p class="text-sm text-white/70 leading-relaxed">
            O Elarin processa <strong class="text-white"
              >33 pontos de pose corporal</strong
            >
            para análise de movimento.
            <span style="color: var(--color-success);"
              >Processamento 100% local. Vídeo NUNCA é gravado ou transmitido.</span
            >
          </p>

          <div class="space-y-2 text-xs text-white/60">
            <p>? Você pode revogar este consentimento a qualquer momento</p>
            <p>? Dados biométricos não são armazenados no servidor</p>
            <p>? Apenas métricas agregadas são enviadas</p>
          </div>
        </div>

        <div class="space-y-3 mb-6 pb-6 border-b border-white/10">
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={checkbox1}
              class="mt-0.5 h-4 w-4 rounded flex-shrink-0"
              style="accent-color: var(--color-primary-500);"
            />
            <span class="text-sm text-white/80">
              Autorizo o processamento de dados biométricos conforme descrito
            </span>
          </label>

          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={checkbox2}
              class="mt-0.5 h-4 w-4 rounded flex-shrink-0"
              style="accent-color: var(--color-primary-500);"
            />
            <span class="text-sm text-white/80">
              Compreendo que posso revogar em Configurações
            </span>
          </label>
        </div>

        <div class="flex gap-3">
          <button
            on:click={handleDeny}
            disabled={loading}
            class="btn-secondary flex-1 px-4 py-3 text-sm font-medium"
          >
            Não Autorizo
          </button>
          <button
            on:click={handleAccept}
            disabled={!checkbox1 || !checkbox2 || loading}
            class="btn-primary flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2"
          >
            {#if loading}
              <Loader2 size={16} class="animate-spin" />
              <span>Salvando...</span>
            {:else}
              <span>Autorizar</span>
            {/if}
          </button>
        </div>

        <p class="text-xs text-center text-white/40 mt-4">
          <a
            href="/privacy"
            target="_blank"
            style="color: var(--color-primary-500);"
            class="hover:underline"
          >
            Ver Política de Privacidade
          </a>
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  .glass-modal {
    background: var(--color-glass-dark-strong);
    backdrop-filter: blur(var(--blur-xl));
    -webkit-backdrop-filter: blur(var(--blur-xl));
    border-radius: var(--radius-standard);
    border: 0.8px solid var(--color-border-light);
  }

  .modal-content {
    max-height: 85vh;
    overflow-y: auto;
  }

  .modal-content::-webkit-scrollbar {
    width: 8px;
  }

  .modal-content::-webkit-scrollbar-track {
    background: var(--color-glass-dark);
    border-radius: var(--radius-md);
  }

  .modal-content::-webkit-scrollbar-thumb {
    background: var(--color-glass-light);
    border-radius: var(--radius-md);
  }

  .modal-content::-webkit-scrollbar-thumb:hover {
    background: var(--color-glass-light-hover);
  }

  .btn-primary {
    background: var(--color-primary-500);
    color: var(--color-text-primary);
    border-radius: var(--radius-standard);
    transition: var(--transition-base);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-500);
  }

  .btn-primary:disabled {
    background: var(--color-gray-600);
    cursor: not-allowed;
    opacity: 0.5;
  }

  .btn-secondary {
    background: transparent;
    border: 0.8px solid var(--color-border-light);
    color: var(--color-text-primary);
    border-radius: var(--radius-standard);
    transition: var(--transition-base);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-glass-light-weak);
  }

  .btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
