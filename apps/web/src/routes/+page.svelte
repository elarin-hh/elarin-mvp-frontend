<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  onMount(() => {
    goto(`${base}/login`, { replaceState: true });
  });
</script>
