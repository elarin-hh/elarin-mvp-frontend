<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { tokenStorage } from '$lib/services/token-storage';

  onMount(() => {
    const token = tokenStorage.getAccessToken();

    if (token) {
      goto(`${base}/exercises`, { replaceState: true });
    } else {
      goto(`${base}/login`, { replaceState: true });
    }
  });
</script>
