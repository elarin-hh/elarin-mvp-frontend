<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { navigating } from '$app/stores';
  import { initI18n } from '$lib/config/i18n';
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
  {#if isExercisesLoading}
    <Loading message="Carregando exercicios..." />
  {/if}
  <slot />
  <ConsentBanner />
{:else}
  <Loading message="Carregando..." />
{/if}
