<script lang="ts">
  import { goto } from '$app/navigation';
  import Header from '$lib/components/common/Header.svelte';
  import PermissionIntro from '$lib/components/train/PermissionIntro.svelte';
  import { currentExercise } from '$lib/stores/train.store';

  function handleContinue() {
    const exercise = $currentExercise;
    if (!exercise) {
      goto('/train/select');
      return;
    }
    goto(`/train/${exercise}`);
  }
</script>

<div class="min-h-screen bg-gray-50">
  <Header />
  
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <PermissionIntro onContinue={handleContinue} />
  </main>
</div>

