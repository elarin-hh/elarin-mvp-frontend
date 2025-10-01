<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import Header from '$lib/components/common/Header.svelte';
  import StagePane from '$lib/components/train/StagePane.svelte';
  import HUD from '$lib/components/train/HUD.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import { trainStore, trainActions, type ExerciseType } from '$lib/stores/train.store';
  import { telemetry } from '$lib/services/telemetry.service';

  const exercise = $page.params.exercise as ExerciseType;
  
  let durationInterval: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    // Ensure exercise is selected
    if ($trainStore.exerciseType !== exercise) {
      trainActions.selectExercise(exercise);
    }
    
    // Auto-start training
    trainActions.start();
    telemetry.emit('training_started', { exercise });

    // Update duration every second
    durationInterval = setInterval(() => {
      if ($trainStore.status === 'training') {
        trainActions.updateDuration($trainStore.duration + 1);
      }
    }, 1000);
  });

  onDestroy(() => {
    if (durationInterval) {
      clearInterval(durationInterval);
    }
  });

  function handlePause() {
    if ($trainStore.status === 'training') {
      trainActions.pause();
      telemetry.emit('training_paused', { exercise });
    } else if ($trainStore.status === 'paused') {
      trainActions.resume();
      telemetry.emit('training_resumed', { exercise });
    }
  }

  function handleFinish() {
    trainActions.finish();
    telemetry.emit('training_finished', {
      exercise,
      reps: $trainStore.reps,
      sets: $trainStore.sets,
      duration: $trainStore.duration
    });
    goto(`/train/${exercise}/summary`);
  }

  // Mock: Simulate rep increment (TODO: Replace with actual pose detection)
  function simulateRep() {
    trainActions.incrementReps();
  }
</script>

<div class="min-h-screen bg-gray-50">
  <Header />
  
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        {$_('train.training')}: {$_(`train.${exercise}`)}
      </h1>
    </div>

    <!-- Main training area -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <StagePane exerciseType={exercise} />
      </div>

      <div class="space-y-6">
        <!-- HUD -->
        <HUD
          status={$trainStore.status}
          reps={$trainStore.reps}
          sets={$trainStore.sets}
          duration={$trainStore.duration}
        />

        <!-- Controls -->
        <div class="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h3 class="font-semibold text-gray-900 mb-4">Controls</h3>

          <div class="space-y-3">
            <Button
              variant="primary"
              class="w-full"
              onclick={handlePause}
              disabled={$trainStore.status === 'finished'}
            >
              {$trainStore.status === 'training' ? 'Pause' : 'Resume'}
            </Button>

            <Button
              variant="secondary"
              class="w-full"
              onclick={handleFinish}
              disabled={$trainStore.status === 'finished'}
            >
              {$_('common.finish')}
            </Button>

            <!-- Mock rep button (for testing UI) -->
            <div class="pt-4 border-t border-gray-200">
              <p class="text-xs text-gray-500 mb-2">MVP Testing:</p>
              <Button
                variant="outline"
                size="sm"
                class="w-full"
                onclick={simulateRep}
                disabled={$trainStore.status !== 'training'}
              >
                Simulate Rep (+1)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>

