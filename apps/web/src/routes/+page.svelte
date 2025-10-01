<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { goto } from '$app/navigation';
  import Header from '$lib/components/common/Header.svelte';
  import Button from '$lib/components/common/Button.svelte';
  import Card from '$lib/components/common/Card.svelte';

  // Mock stats (TODO: Replace with actual data from API)
  const mockStats = {
    totalWorkouts: 0,
    currentStreak: 0,
    personalBest: 0
  };

  const mockRecentSessions: any[] = [];

  function startTraining() {
    goto('/train/select');
  }
</script>

<div class="min-h-screen bg-gray-50">
  <Header />
  
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Welcome Section -->
    <div class="mb-8">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">
        {$_('dashboard.welcome')}!
      </h1>
      <p class="text-lg text-gray-600">
        Ready to train?
      </p>
    </div>

    <!-- CTA Button -->
    <div class="mb-12">
      <Button variant="primary" size="lg" onclick={startTraining}>
        <span class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {$_('dashboard.startTraining')}
        </span>
      </Button>
    </div>

    <!-- Stats -->
    <div class="mb-12">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">{$_('dashboard.stats')}</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div class="text-center">
            <p class="text-sm font-medium text-gray-600 mb-2">
              {$_('dashboard.totalWorkouts')}
            </p>
            <p class="text-4xl font-bold text-primary-600">
              {mockStats.totalWorkouts}
            </p>
          </div>
        </Card>

        <Card>
          <div class="text-center">
            <p class="text-sm font-medium text-gray-600 mb-2">
              {$_('dashboard.currentStreak')}
            </p>
            <p class="text-4xl font-bold text-primary-600">
              {mockStats.currentStreak}
            </p>
          </div>
        </Card>

        <Card>
          <div class="text-center">
            <p class="text-sm font-medium text-gray-600 mb-2">
              {$_('dashboard.personalBest')}
            </p>
            <p class="text-4xl font-bold text-primary-600">
              {mockStats.personalBest}
            </p>
          </div>
        </Card>
      </div>
    </div>

    <!-- Recent Sessions -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 mb-4">
        {$_('dashboard.recentSessions')}
      </h2>
      
      {#if mockRecentSessions.length === 0}
        <Card>
          <div class="text-center py-12">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p class="text-gray-600">{$_('dashboard.noSessions')}</p>
            <p class="text-sm text-gray-500 mt-2">
              Start your first workout to see your progress here
            </p>
          </div>
        </Card>
      {/if}
    </div>
  </main>
</div>

