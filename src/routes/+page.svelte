<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  onMount(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('access_token');

    if (token) {
      // User is logged in, redirect to exercises
      goto(`${base}/exercises`, { replaceState: true });
    } else {
      // User is not logged in, redirect to login
      goto(`${base}/login`, { replaceState: true });
    }
  });
</script>
