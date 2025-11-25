<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { navigating } from '$app/stores';
  import { initI18n } from '$lib/config/i18n';
  import { telemetry } from '$lib/services/telemetry.service';
  import { featureFlags } from '$lib/config/feature-flags';
  import ConsentBanner from '$lib/components/ConsentBanner.svelte';
  import Loading from '$lib/components/common/Loading.svelte';
  import { registerSW } from 'virtual:pwa-register';

  let isReady = $state(false);
  let isExercisesLoading = $state(false);

  initI18n();

  $effect(() => {
    const targetPath = $navigating?.to?.url?.pathname ?? '';
    isExercisesLoading = Boolean($navigating && targetPath.startsWith('/exercises'));
  });

  onMount(() => {
    telemetry.init(featureFlags.enableTelemetry);
    telemetry.emit('app_started');
    registerSW({
      immediate: true,
      onOfflineReady() {
        console.info('Aplicacao pronta para uso offline');
      }
    });
    isReady = true;

    const handleError = (event: ErrorEvent) => {
      telemetry.error(event.error || new Error(event.message), {
        source: event.filename,
        line: event.lineno,
        column: event.colno
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      telemetry.emit('ui_error', { message: reason.message, reason: String(event.reason) });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  });

  afterNavigate(() => {
    window.scrollTo({ top: 0 });
  });
</script>

{#if isReady}
  {#if isExercisesLoading}
    <Loading message="Carregando exercicios..." />
  {/if}
  <slot />
  <ConsentBanner />
{:else}
  <Loading message="Carregando..." />
{/if}
