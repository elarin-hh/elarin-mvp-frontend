<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { initI18n } from '$lib/config/i18n';
  import { telemetry } from '$lib/services/telemetry.service';
  import { featureFlags } from '$lib/config/feature-flags';
  import { ScrollArea } from '$lib/components/common';
  import ConsentBanner from '$lib/components/ConsentBanner.svelte';

  let isReady = $state(false);

  initI18n();

  onMount(() => {
    telemetry.init(featureFlags.enableTelemetry);
    telemetry.emit('app_started');
    isReady = true;
  });

  afterNavigate(() => {
    const viewport = document.querySelector('.sa-viewport') as HTMLElement | null;
    if (viewport) {
      viewport.scrollTo({ top: 0 });
    } else {
      window.scrollTo({ top: 0 });
    }
  });
</script>

{#if isReady}
  <ScrollArea className="min-h-screen" style="height:100vh;">
    <slot />
  </ScrollArea>
  <ConsentBanner />
{:else}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      <p class="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
{/if}
