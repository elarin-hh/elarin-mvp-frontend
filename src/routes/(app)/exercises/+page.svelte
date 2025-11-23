<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import type { PageData } from './$types';
  import { trainingActions, type ExerciseType } from '$lib/stores/training.store';
  import { telemetry } from '$lib/services/telemetry.service';
  import { onMount } from 'svelte';
  import { asset } from '$lib/utils/assets';
  import type { Exercise } from '$lib/api/exercises.api';
  import { authActions } from '$lib/services/auth.facade';
  import AppHeader from '$lib/components/common/AppHeader.svelte';
  import Loading from '$lib/components/common/Loading.svelte';
  import ErrorState from '$lib/components/common/ErrorState.svelte';
  import EmptyState from '$lib/components/common/EmptyState.svelte';

  let { data }: { data: PageData } = $props();

  let isScrolled = $state(false);
  let exercises = $state<Exercise[]>(data.exercises ?? []);
  let errorMessage = $state(data.errorMessage ?? '');
  let showAvatarMenu = $state(false);
  let isRefreshing = $state(false);

  const exerciseImages: Record<string, string> = {
    squat: asset('/exercisesImages/squat.webp')
  };

  $effect(() => {
    exercises = data.exercises ?? [];
    errorMessage = data.errorMessage ?? '';
  });

  onMount(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      isScrolled = target.scrollTop > 50;
    };

    const viewport = document.querySelector('.sa-viewport');

    if (viewport) {
      viewport.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        viewport.removeEventListener('scroll', handleScroll);
      };
    }

    const handleWindowScroll = () => {
      isScrolled = window.scrollY > 50;
    };
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
    };
  });

  async function handleRefresh() {
    isRefreshing = true;
    try {
      await invalidateAll();
    } catch (err) {
      errorMessage = (err as Error)?.message || 'Falha ao recarregar exercicios';
    } finally {
      isRefreshing = false;
    }
  }

  async function handleExerciseSelect(exercise: Exercise) {
    if (!exercise.is_active) {
      return;
    }

    trainingActions.selectExercise(exercise.type as ExerciseType);
    telemetry.emit('exercise_selected', { exercise: exercise.type });
    goto('/framer');
  }

  function getExerciseImage(type: string): string {
    return (
      exerciseImages[type] ||
      'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop'
    );
  }

  function toggleAvatarMenu() {
    showAvatarMenu = !showAvatarMenu;
  }

  function handleSettings() {
    showAvatarMenu = false;
    goto('/settings');
  }

  async function handleLogout() {
    showAvatarMenu = false;
    await authActions.logout();
    goto('/login');
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.avatar-menu-container')) {
      showAvatarMenu = false;
    }
  }
</script>

<div class="min-h-screen bg-black">
  <AppHeader
    bind:isScrolled
    bind:showAvatarMenu
    hasDropdownMenu={true}
    onToggleAvatarMenu={toggleAvatarMenu}
    onSettings={handleSettings}
    onLogout={handleLogout}
    onClickOutside={handleClickOutside}
  />

  <main class="w-full px-4 pb-4 pt-4">
    {#if errorMessage}
      <ErrorState
        fullHeight={true}
        title="Erro ao carregar exercicios"
        description={errorMessage}
        actionLabel="Tentar novamente"
        onAction={handleRefresh}
      />
    {:else if exercises.length === 0}
      <EmptyState
        fullHeight={true}
        title="Nenhum exercicio disponivel"
        description="Entre em contato com o suporte."
      />
    {:else}
      <div
        class="grid grid-cols-2 max-[420px]:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full"
      >
        {#each exercises as exercise}
          <div
            class="flex flex-col cursor-pointer group {!exercise.is_active
              ? 'exercise-inactive'
              : ''}"
            onclick={() => handleExerciseSelect(exercise)}
            onkeypress={(e) => e.key === 'Enter' && handleExerciseSelect(exercise)}
            role="button"
            tabindex={exercise.is_active ? 0 : -1}
            aria-label={exercise.is_active
              ? `Selecionar ${exercise.name}`
              : `${exercise.name} - Em Breve`}
          >
            <div class="relative h-36 sm:h-44 rounded overflow-hidden w-full z-10">
              <img
                src={getExerciseImage(exercise.type)}
                alt={exercise.name_pt}
                class="absolute inset-0 w-full h-full object-cover"
              />

              <div class="glass-overlay absolute inset-0"></div>

              <div class="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
                <div
                  class="button-primary px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3"
                >
                  <svg
                    class="w-4 h-4 sm:w-5 sm:h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span class="text-white text-sm sm:text-base font-medium">{exercise.name}</span
                  >
                </div>
              </div>

              {#if !exercise.is_active}
                <div class="absolute top-2 right-2 badge-inactive">Em Breve</div>
              {/if}
            </div>

            <span
              class="exercise-name text-white text-sm sm:text-base font-medium px-2 sm:px-3 py-2 pt-4 sm:pt-5 -mt-3 z-0 group-hover:rounded-b-lg"
            >
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </main>

  {#if isRefreshing}
    <Loading message="Recarregando exercicios..." />
  {/if}

</div>

<style>
  .button-primary {
    background: var(--color-primary-500);
    border-radius: 8px;
    transition: var(--transition-base);
  }

  .button-primary:hover {
    background: var(--color-primary-600);
  }

  .glass-overlay {
    background: rgba(70, 70, 70, 0.25);
    backdrop-filter: blur(2px);
  }

  .exercise-name {
    background: transparent;
    transition: all 0.3s ease;
  }

  .group:hover .exercise-name {
    background: var(--color-primary-500);
    backdrop-filter: blur(var(--blur-md));
    -webkit-backdrop-filter: blur(var(--blur-md));
  }

  .exercise-inactive {
    opacity: 0.6;
    cursor: not-allowed !important;
    pointer-events: none;
  }

  .exercise-inactive img {
    filter: grayscale(100%);
  }

  .exercise-inactive .glass-overlay {
    background: rgba(0, 0, 0, 0.7);
  }

  .exercise-inactive .button-primary {
    background: #6c757d !important;
  }

  .exercise-inactive:hover .exercise-name {
    background: transparent !important;
  }

  .badge-inactive {
    background: rgba(220, 53, 69, 0.9);
    backdrop-filter: blur(var(--blur-md));
    -webkit-backdrop-filter: blur(var(--blur-md));
    color: var(--color-text-primary);
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
</style>
