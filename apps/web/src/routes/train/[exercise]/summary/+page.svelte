<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Header from '$lib/components/common/Header.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import Card from '$lib/components/common/Card.svelte';
  import { trainStore, trainActions, type ExerciseType } from '$lib/stores/train.store';

  const exercise = $page.params.exercise as ExerciseType;

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  function handleBackToDashboard() {
    trainActions.reset();
    goto('/');
  }
</script>

<div class="min-h-screen bg-gray-50">
  <Header />
  
  <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-center mb-12">
      <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h1 class="text-4xl font-bold text-gray-900 mb-2">
        {$_('summary.workoutComplete')}
      </h1>
      <p class="text-lg text-gray-600">
        {$_('summary.greatJob')}
      </p>
    </div>

    <!-- Summary Stats -->
    <Card class="mb-8">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">{$_('summary.summary')}</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <p class="text-sm font-medium text-gray-600 mb-2">
            {$_('summary.exercisePerformed')}
          </p>
          <p class="text-2xl font-bold text-primary-600">
            {$_(`train.${exercise}`)}
          </p>
        </div>

        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <p class="text-sm font-medium text-gray-600 mb-2">
            {$_('summary.totalReps')}
          </p>
          <p class="text-2xl font-bold text-primary-600">
            {$trainStore.reps}
          </p>
        </div>

        <div class="text-center p-4 bg-gray-50 rounded-lg">
          <p class="text-sm font-medium text-gray-600 mb-2">
            {$_('summary.totalDuration')}
          </p>
          <p class="text-2xl font-bold text-primary-600">
            {formatDuration($trainStore.duration)}
          </p>
        </div>
      </div>
    </Card>

    <!-- Actions -->
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <Button variant="primary" size="lg" onclick={handleBackToDashboard}>
        {$_('summary.backToDashboard')}
      </Button>
      
      <!-- TODO: Implement share functionality when backend is ready -->
      <Button variant="outline" size="lg" disabled>
        {$_('summary.shareResults')}
      </Button>
    </div>
  </main>
</div>

