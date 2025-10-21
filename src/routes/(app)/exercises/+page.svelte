<script lang="ts">
  import { goto } from '$app/navigation';
  import type { ExerciseType } from '$lib/stores/train.store';
  import { trainActions } from '$lib/stores/train.store';
  import { integratedTrainActions } from '$lib/stores/integrated-train.store';
  import { telemetry } from '$lib/services/telemetry.service';
  import { onMount } from 'svelte';
  import { asset } from '$lib/utils/assets';
  import { exercisesApi, type Exercise } from '$lib/api/exercises.api';
  import { authActions } from '$lib/stores/auth.store';
  import AppHeader from '$lib/components/common/AppHeader.svelte';

  let isScrolled = $state(false);
  let exercises = $state<Exercise[]>([]);
  let isLoading = $state(true);
  let error = $state('');
  let showAvatarMenu = $state(false);

  // Mapeamento de imagens para os exercícios
  const exerciseImages: Record<string, string> = {
    plank: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop',
    squat: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&h=600&fit=crop',
    legPress: 'https://images.unsplash.com/photo-1434682772747-f16d3ea162c3?w=800&h=600&fit=crop',
    abdominal: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop',
    crossOver: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&h=600&fit=crop',
    biceps: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
    triceps: 'https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?w=800&h=600&fit=crop',
    glutes: 'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=800&h=600&fit=crop',
    shoulderPress:
      'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&h=600&fit=crop',
    deadlift: 'https://images.unsplash.com/photo-1517344884509-a0c97ec11bcc?w=800&h=600&fit=crop',
    benchPress: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop',
    pullUp: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&h=600&fit=crop',
    dip: 'https://images.unsplash.com/photo-1623874514711-0f321325f318?w=800&h=600&fit=crop',
    latPulldown:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop',
    cableRow: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
    lunges: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop',
    calfRaise: 'https://images.unsplash.com/photo-1558017487-06bf9f82613a?w=800&h=600&fit=crop',
    hamstringCurl:
      'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&h=600&fit=crop',
    chestFly: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&h=600&fit=crop',
    lateralRaise:
      'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=800&h=600&fit=crop',
    frontRaise: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&h=600&fit=crop',
    shrugs: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&h=600&fit=crop',
    arnoldPress:
      'https://images.unsplash.com/photo-1593476087123-36d1de271f08?w=800&h=600&fit=crop',
    push_up: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'
  };

  onMount(async () => {
    // Carregar exercícios do backend
    await loadExercises();

    // Setup scroll handler
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
    } else {
      const handleWindowScroll = () => {
        isScrolled = window.scrollY > 50;
      };
      window.addEventListener('scroll', handleWindowScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleWindowScroll);
      };
    }
  });

  async function loadExercises() {
    try {
      isLoading = true;
      error = '';
      const response = await exercisesApi.getAll();

      if (response.success && response.data) {
        exercises = response.data;
        console.log('✅ Exercícios carregados do backend:', exercises.length);
        console.log('📋 Exercícios:', exercises);
      } else {
        error = response.error?.message || 'Falha ao carregar exercícios';
        console.error('❌ Erro ao carregar exercícios:', error);
      }
    } catch (e: unknown) {
      error = (e as Error).message || 'Falha ao carregar exercícios';
      console.error('❌ Erro ao carregar exercícios:', e);
    } finally {
      isLoading = false;
    }
  }

  async function handleExerciseSelect(exercise: Exercise) {
    // Se o exercício está inativo, não faz nada
    if (!exercise.is_active) {
      return;
    }

    // Salvar no trainStore (compatibilidade)
    trainActions.selectExercise(exercise.type as ExerciseType);

    // Salvar no integratedTrainStore (usado pela página /train)
    await integratedTrainActions.selectExercise(exercise.type as ExerciseType);

    telemetry.emit('exercise_selected', { exercise: exercise.type });

    // Todos os exercícios vão para /framer primeiro (tela de preparação)
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

  async function handleLogout() {
    showAvatarMenu = false;
    await authActions.logout();
    goto('/login');
  }

  // Fechar menu ao clicar fora
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
    onLogout={handleLogout}
    onClickOutside={handleClickOutside}
  />

  <main class="w-full px-4 pb-4 pt-20 sm:pt-24">
    {#if isLoading}
      <!-- Loading State -->
      <div class="flex items-center justify-center py-20">
        <div class="text-center">
          <div
            class="animate-spin rounded-full h-16 w-16 border-b-2 border-[#8EB428] mx-auto mb-4"
          ></div>
          <p class="text-white/70">Carregando exercícios...</p>
        </div>
      </div>
    {:else if error}
      <!-- Error State -->
      <div class="flex items-center justify-center py-20">
        <div class="text-center text-red-400">
          <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="font-semibold mb-2">Erro ao carregar exercícios</p>
          <p class="text-sm text-white/50">{error}</p>
          <button onclick={() => loadExercises()} class="button-primary px-6 py-2 mt-4 text-white">
            Tentar novamente
          </button>
        </div>
      </div>
    {:else if exercises.length === 0}
      <!-- Empty State -->
      <div class="flex items-center justify-center py-20">
        <div class="text-center text-white/70">
          <p class="font-semibold mb-2">Nenhum exercício disponível</p>
          <p class="text-sm">Entre em contato com o suporte</p>
        </div>
      </div>
    {:else}
      <!-- Grid de exercícios -->
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
              ? `Selecionar ${exercise.name_pt}`
              : `${exercise.name_pt} - Em Breve`}
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
                  <span class="text-white text-sm sm:text-base font-medium">{exercise.name_pt}</span
                  >
                </div>
              </div>

              <!-- Badge de Indisponível -->
              {#if !exercise.is_active}
                <div class="absolute top-2 right-2 badge-inactive">Em Breve</div>
              {/if}
            </div>

            <span
              class="exercise-name text-white text-sm sm:text-base font-medium px-2 sm:px-3 py-2 pt-4 sm:pt-5 -mt-3 z-0 group-hover:rounded-b-lg"
            >
              <!-- {exercise.name_pt} -->
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<style>
  .button-primary {
    background: #8eb428;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .button-primary:hover {
    background: #7a9922;
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
    background: #8eb428;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  /* Estilos para exercícios inativos */
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

  /* Badge de indisponível */
  .badge-inactive {
    background: rgba(220, 53, 69, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: white;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
</style>
