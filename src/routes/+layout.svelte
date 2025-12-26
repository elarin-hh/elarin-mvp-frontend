<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { navigating } from '$app/stores';
  import ConsentBanner from '$lib/components/ConsentBanner.svelte';
  import Loading from '$lib/components/common/Loading.svelte';
  import { setUnauthorizedHandler } from '$lib/api/rest.client';
  import { authActions } from '$lib/services/auth.facade';
  import { registerSW } from 'virtual:pwa-register';

  let isReady = $state(false);
  let isExercisesLoading = $state(false);

  if (typeof window !== 'undefined') {
    let handlingUnauthorized = false;
    setUnauthorizedHandler(() => {
      if (handlingUnauthorized) return;
      handlingUnauthorized = true;
      authActions.forceLogout();
      const loginPath = `${base}/login`;
      if (window.location.pathname !== loginPath) {
        goto(loginPath);
      }
    });
  }

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
