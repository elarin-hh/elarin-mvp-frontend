<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { initI18n } from '$lib/config/i18n';
  import { telemetry } from '$lib/services/telemetry.service';
  import { featureFlags } from '$lib/config/feature-flags';
  import ConsentBanner from '$lib/components/ConsentBanner.svelte';
  import Loading from '$lib/components/common/Loading.svelte';
  import { registerSW } from 'virtual:pwa-register';

  let isReady = $state(false);

  initI18n();

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
  });

  afterNavigate(() => {
    window.scrollTo({ top: 0 });
  });
</script>

{#if isReady}
  <slot />
  <ConsentBanner />
{:else}
  <Loading message="Carregando..." />
{/if}
