<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let showBanner = false;
  let isVisible = false;

  onMount(() => {
    // Verificar se consentimento já foi dado
    const consent = localStorage.getItem('elarin_consent');

    if (!consent) {
      showBanner = true;
      // Animação de entrada
      setTimeout(() => {
        isVisible = true;
      }, 100);
    }
  });

  function acceptConsent() {
    const timestamp = new Date().toISOString();

    // Salvar localmente
    localStorage.setItem('elarin_consent', 'true');
    localStorage.setItem('elarin_consent_timestamp', timestamp);

    // Fechar banner
    isVisible = false;
    setTimeout(() => {
      showBanner = false;
    }, 300);
  }

  function rejectConsent() {
    // Redirecionar para home
    goto('/');
  }
</script>

{#if showBanner}
  <div
    class="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 {isVisible ? 'translate-y-0' : 'translate-y-full'}"
    role="dialog"
    aria-labelledby="consent-title"
    aria-describedby="consent-description"
  >
    <div class="bg-gray-900 dark:bg-gray-800 text-white shadow-2xl border-t-4 border-primary">
      <div class="container mx-auto px-4 py-6 max-w-6xl">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <!-- Texto -->
          <div class="flex-1">
            <h2 id="consent-title" class="text-xl font-bold mb-2">
              Sua Privacidade Importa
            </h2>
            <p id="consent-description" class="text-gray-300 text-sm leading-relaxed">
              Usamos cookies essenciais para autenticação e processamos
              <strong>dados biométricos localmente</strong> (33 pontos corporais)
              para análise de exercícios.
              <strong>Seu vídeo NUNCA é armazenado ou transmitido.</strong>
              <br />
              Ao continuar, você concorda com nossos
              <a href="/terms" class="text-primary hover:underline font-semibold" target="_blank">
                Termos de Uso
              </a> e
              <a href="/privacy" class="text-primary hover:underline font-semibold" target="_blank">
                Política de Privacidade
              </a>.
            </p>
          </div>

          <!-- Botões -->
          <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              on:click={rejectConsent}
              class="px-6 py-3 rounded-lg border border-gray-600 hover:bg-gray-700 transition-colors text-sm font-semibold"
            >
              Recusar
            </button>
            <button
              on:click={acceptConsent}
              class="px-6 py-3 rounded-lg bg-primary hover:bg-primary-dark transition-colors text-sm font-semibold"
            >
              Aceitar e Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .border-primary {
    border-color: var(--primary-color, #3b82f6);
  }

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

  .translate-y-full {
    transform: translateY(100%);
  }

  .translate-y-0 {
    transform: translateY(0);
  }
</style>
