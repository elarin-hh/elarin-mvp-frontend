<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { initI18n } from '$lib/config/i18n';
  import { telemetry } from '$lib/services/telemetry.service';
  import { featureFlags } from '$lib/config/feature-flags';
  import { ScrollArea } from '$lib/components/common';

  let isReady = $state(false);

  initI18n();

  onMount(() => {
    telemetry.init(featureFlags.enableTelemetry);
    telemetry.emit('app_started');
    isReady = true;
  });
</script>

{#if isReady}
  <ScrollArea className="min-h-screen" style="height:100vh;">
    <slot />
  </ScrollArea>
{:else}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      <p class="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
{/if}
