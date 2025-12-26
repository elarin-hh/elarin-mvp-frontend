<script lang="ts">
  import { env } from '$lib/config/env.config';

  let loading = false;
  let error = '';
  let success = false;
  const apiBaseUrl = env.apiBaseUrl;

  async function exportData() {
    loading = true;
    error = '';
    success = false;

    try {
      const response = await fetch(`${apiBaseUrl}/auth/me/export`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erro ao exportar dados');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `elarin-dados-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      success = true;
      setTimeout(() => {
        success = false;
      }, 5000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error(err);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Exportar Dados - Elarin</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-2xl">
  <h1 class="text-3xl font-bold mb-6">Exportar Meus Dados</h1>

  <div class="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded mb-6">
    <h2 class="font-bold text-blue-900 dark:text-blue-300 mb-2">
      Portabilidade de Dados (LGPD Art. 18, V)
    </h2>
    <p class="text-blue-800 dark:text-blue-200 text-sm">
      Voce tem o direito de receber uma copia de todos os seus dados pessoais
      armazenados no Elarin em formato estruturado e legivel por maquina (JSON).
    </p>
  </div>

  <div class="bg-white dark:bg-gray-800 rounded-standard shadow-lg p-6">
    <h3 class="text-xl font-semibold mb-4">O que sera exportado:</h3>

    <ul class="space-y-2 mb-6">
      <li class="flex items-start gap-2">
        <span class="text-primary">-</span>
        <span><strong>Perfil:</strong> Nome, email, data de nascimento, altura, peso</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-primary">-</span>
        <span><strong>Consentimentos:</strong> Datas de consentimentos dados</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-primary">-</span>
        <span><strong>Historico de Treinos:</strong> Todas as secoes, exercicios, metricas</span>
      </li>
      <li class="flex items-start gap-2">
        <span class="text-primary">-</span>
        <span><strong>Organizacoes:</strong> Vinculos com academias (se aplicavel)</span>
      </li>
    </ul>

    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded mb-6">
      <h4 class="font-semibold mb-2">Importante:</h4>
      <ul class="text-sm space-y-1 text-gray-700 dark:text-gray-300">
        <li>- Formato: JSON (compatvel com qualquer software)</li>
        <li>- Dados sensíveis: Senha não é exportada</li>
        <li>- Dados biométricos: Não armazenamos, então não há o que exportar</li>
        <li>- Prazo de entrega: Imediato (download instantaneo)</li>
      </ul>
    </div>

    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    {/if}

    {#if success}
      <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        Dados exportados com sucesso! Verifique seus downloads.
      </div>
    {/if}

    <button
      on:click={exportData}
      disabled={loading}
      class="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
    >
      {#if loading}
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Exportando...</span>
      {:else}
        <span>Baixar Meus Dados (JSON)</span>
      {/if}
    </button>

    <p class="text-xs text-gray-500 text-center mt-4">
      Duvidas? Entre em contato:
      <a href="mailto:privacidade@elarin.com.br" class="text-primary hover:underline">
        privacidade@elarin.com.br
      </a>
    </p>
  </div>

  <div class="mt-6">
    <a href="/settings" class="text-primary hover:underline">
      Voltar para Configuracoes
    </a>
  </div>
</div>

<style>
  .text-primary {
    color: var(--primary-color, #3b82f6);
  }

  .bg-primary {
    background-color: var(--primary-color, #3b82f6);
  }

  .bg-primary-dark {
    background-color: var(--primary-dark-color, #2563eb);
  }

  .hover\:bg-primary-dark:hover {
    background-color: var(--primary-dark-color, #2563eb);
  }

  .border-primary {
    border-color: var(--primary-color, #3b82f6);
  }
</style>
