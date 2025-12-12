<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let showBanner = false;
  let isVisible = false;
  const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;

  onMount(() => {
    const consent = localStorage.getItem('elarin_consent');
    const expiresAt = localStorage.getItem('elarin_consent_exp');

    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (Number.isNaN(expDate.getTime()) || expDate.getTime() <= Date.now()) {
        localStorage.removeItem('elarin_consent');
        localStorage.removeItem('elarin_consent_timestamp');
        localStorage.removeItem('elarin_consent_exp');
      }
    }

    if (!consent) {
      showBanner = true;
      setTimeout(() => {
        isVisible = true;
      }, 100);
    }
  });

  function acceptConsent() {
    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + CONSENT_TTL_MS).toISOString();
    localStorage.setItem('elarin_consent', 'true');
    localStorage.setItem('elarin_consent_timestamp', timestamp);
    localStorage.setItem('elarin_consent_exp', expiresAt);

    isVisible = false;
    setTimeout(() => {
      showBanner = false;
    }, 300);
  }

  function rejectConsent() {
    goto('/');
  }
</script>

<style>
  .consent-banner {
    background: var(--color-glass-dark-strong);
    backdrop-filter: blur(var(--blur-xl));
    -webkit-backdrop-filter: blur(var(--blur-xl));
    border-top: 2px solid var(--color-primary-500);
  }

  .btn-accept {
    background: var(--color-primary-500);
    color: var(--color-text-primary);
    border-radius: var(--radius-standard);
    transition: var(--transition-base);
  }

  .btn-accept:hover {
    background: var(--color-primary-600);
  }

  .btn-reject {
    background: transparent;
    border: 0.8px solid var(--color-border-light);
    color: var(--color-text-primary);
    border-radius: var(--radius-standard);
    transition: var(--transition-base);
  }

  .btn-reject:hover {
    background: var(--color-glass-light-weak);
  }

  .translate-y-full {
    transform: translateY(100%);
  }

  .translate-y-0 {
    transform: translateY(0);
  }
</style>

{#if showBanner}
  <div
    class="consent-banner fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 {isVisible ? 'translate-y-0' : 'translate-y-full'}"
    role="dialog"
    aria-labelledby="consent-title"
    aria-describedby="consent-description"
  >
    <div class="container mx-auto px-4 py-5 max-w-6xl">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="flex-1">
          <h2 id="consent-title" class="text-lg font-bold mb-2 text-white">
            Sua Privacidade Importa
          </h2>
          <p id="consent-description" class="text-white/70 text-sm leading-relaxed">
            Usamos cookies essenciais para autenticação e processamos
            <strong class="text-white">dados biométricos localmente</strong> (33 pontos corporais)
            para análise de exercícios.
            <strong class="text-white">Seu vídeo NUNCA é armazenado ou transmitido.</strong>
            <br />
            Ao continuar, você concorda com nossos
            <a href="/terms" style="color: var(--color-primary-500);" class="hover:underline font-semibold" target="_blank">
              Termos de Uso
            </a> e
            <a href="/privacy" style="color: var(--color-primary-500);" class="hover:underline font-semibold" target="_blank">
              Política de Privacidade
            </a>.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            on:click={rejectConsent}
            class="btn-reject px-6 py-3 text-sm font-medium"
          >
            Recusar
          </button>
          <button
            on:click={acceptConsent}
            class="btn-accept px-6 py-3 text-sm font-medium"
          >
            Aceitar e Continuar
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
