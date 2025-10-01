<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { goto } from '$app/navigation';
  import Header from '$lib/components/common/Header.svelte';
  import ExerciseSelect from '$lib/components/train/ExerciseSelect.svelte';
  import { trainActions } from '$lib/stores/train.store';
  import type { ExerciseType } from '$lib/stores/train.store';
  import { telemetry } from '$lib/services/telemetry.service';

  function handleExerciseSelect(exercise: ExerciseType) {
    trainActions.selectExercise(exercise);
    telemetry.emit('exercise_selected', { exercise });
    goto('/train/intro');
  }
</script>

<div class="min-h-screen bg-gray-50">
  <Header />
  
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">
        {$_('train.selectExercise')}
      </h1>
      <p class="text-lg text-gray-600">
        Choose an exercise to begin your training session
      </p>
    </div>

    <ExerciseSelect onSelect={handleExerciseSelect} />
  </main>
</div>

