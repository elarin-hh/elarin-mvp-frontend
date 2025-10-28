<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let visible = false;

  const dispatch = createEventDispatcher();

  let checkbox1 = false; // Autorizo processamento
  let checkbox2 = false; // Compreendo revogação
  let loading = false;

  async function handleAccept() {
    if (!checkbox1 || !checkbox2) {
      alert('Por favor, marque ambas as caixas para continuar.');
      return;
    }

    loading = true;

    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch('/api/auth/consent', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          consent_type: 'biometric',
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
        })
      });

      if (response.ok) {
        localStorage.setItem('elarin_biometric_consent', 'true');
        localStorage.setItem('elarin_biometric_consent_ts', new Date().toISOString());
        dispatch('accepted');
        visible = false;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar consentimento');
      }
    } catch (error) {
      console.error('Erro ao salvar consentimento biométrico:', error);
      alert('Erro ao salvar consentimento. Tente novamente.');
    } finally {
      loading = false;
    }
  }

  function handleDeny() {
    dispatch('denied');
    visible = false;
  }
</script>

{#if visible}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="biometric-title"
  >
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="bg-primary text-white p-6 rounded-t-2xl">
        <h2 id="biometric-title" class="text-2xl font-bold">
          🔒 Consentimento para Análise de Movimento
        </h2>
        <p class="text-sm mt-1 opacity-90">
          Conforme Lei nº 13.709/2018 (LGPD) Art. 11, II, alínea "a"
        </p>
      </div>

      <!-- Conteúdo -->
      <div class="p-6 space-y-6">
        <p class="text-gray-700 dark:text-gray-300">
          Para funcionar corretamente, o Elarin precisa processar <strong>dados biométricos</strong>
          (33 pontos de pose corporal) capturados pela sua câmera.
        </p>

        <!-- O que vamos coletar -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded">
          <h3 class="font-bold text-blue-900 dark:text-blue-300 mb-2">
            📹 O que vamos capturar:
          </h3>
          <ul class="space-y-1 text-blue-800 dark:text-blue-200 text-sm">
            <li>✅ Posição de 33 pontos corporais (nariz, ombros, cotovelos, joelhos, etc.)</li>
            <li>✅ Ângulos de juntas e alinhamento postural</li>
            <li>✅ Movimentos em tempo real durante exercícios</li>
          </ul>
        </div>

        <!-- Garantias de privacidade -->
        <div class="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded">
          <h3 class="font-bold text-green-900 dark:text-green-300 mb-2">
            🛡️ Sua privacidade está protegida:
          </h3>
          <ul class="space-y-1 text-green-800 dark:text-green-200 text-sm">
            <li>✅ <strong>Processamento 100% local</strong> (no seu dispositivo)</li>
            <li>✅ <strong>Vídeo NUNCA é gravado</strong> ou transmitido</li>
            <li>✅ <strong>Dados biométricos NÃO são armazenados</strong></li>
            <li>✅ Apenas <strong>métricas agregadas</strong> (reps, qualidade) são enviadas</li>
          </ul>
        </div>

        <!-- Direitos -->
        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded">
          <h3 class="font-bold mb-2">⚖️ Seus Direitos (LGPD):</h3>
          <ul class="text-sm space-y-1 text-gray-700 dark:text-gray-300">
            <li>✅ Você pode <strong>revogar</strong> este consentimento em Configurações</li>
            <li>✅ Revogação impede uso da análise de exercícios</li>
            <li>✅ Você pode <strong>deletar sua conta</strong> a qualquer momento</li>
          </ul>
        </div>

        <!-- Checkboxes -->
        <div class="space-y-3 border-t dark:border-gray-700 pt-4">
          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={checkbox1}
              class="mt-1 h-5 w-5 text-primary rounded"
            />
            <span class="text-sm">
              Eu <strong>autorizo</strong> o processamento de dados biométricos
              conforme descrito acima, ciente de que o processamento é <strong>local</strong>
              e meu vídeo <strong>nunca é transmitido</strong>.
            </span>
          </label>

          <label class="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              bind:checked={checkbox2}
              class="mt-1 h-5 w-5 text-primary rounded"
            />
            <span class="text-sm">
              Eu <strong>compreendo</strong> que posso revogar este consentimento
              a qualquer momento em Configurações > Privacidade.
            </span>
          </label>
        </div>

        <!-- Botões -->
        <div class="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            on:click={handleDeny}
            disabled={loading}
            class="flex-1 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            Não Autorizo
          </button>
          <button
            on:click={handleAccept}
            disabled={!checkbox1 || !checkbox2 || loading}
            class="flex-1 px-6 py-3 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {#if loading}
              <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Salvando...</span>
            {:else}
              <span>Autorizo e Iniciar Treino</span>
            {/if}
          </button>
        </div>

        <!-- Link Política -->
        <p class="text-xs text-center text-gray-500">
          Dúvidas? Leia nossa
          <a href="/privacy" target="_blank" class="text-primary hover:underline">
            Política de Privacidade
          </a>
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  .bg-primary {
    background-color: var(--primary-color, #3b82f6);
  }

  .text-primary {
    color: var(--primary-color, #3b82f6);
  }

  .bg-primary-dark {
    background-color: var(--primary-dark-color, #2563eb);
  }

  .hover\:bg-primary-dark:hover {
    background-color: var(--primary-dark-color, #2563eb);
  }
</style>
