<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { authActions } from '$lib/stores/auth.store';

  onMount(async () => {
    const result = await authActions.checkSession();
    const destination = result.success ? 'exercises' : 'login';
    goto(`${base}/${destination}`, { replaceState: true });
  });
</script>
