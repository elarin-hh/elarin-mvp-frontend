<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  onMount(() => {
    const token = localStorage.getItem('access_token');

    if (token) {
      goto(`${base}/exercises`, { replaceState: true });
    } else {
      goto(`${base}/login`, { replaceState: true });
    }
  });
</script>
