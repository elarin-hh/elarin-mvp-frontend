<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { goto } from '$app/navigation';
  import type { ExerciseType } from '$lib/stores/train.store';
  import { trainActions } from '$lib/stores/train.store';
  import { integratedTrainActions } from '$lib/stores/integrated-train.store';
  import { telemetry } from '$lib/services/telemetry.service';
  import { onMount } from 'svelte';
  import { asset } from '$lib/utils/assets';
  import { exercisesApi, type Exercise } from '$lib/api/exercises.api';
  import { authActions } from '$lib/stores/auth.store';

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
    shoulderPress: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&h=600&fit=crop',
    deadlift: 'https://images.unsplash.com/photo-1517344884509-a0c97ec11bcc?w=800&h=600&fit=crop',
    benchPress: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop',
    pullUp: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&h=600&fit=crop',
    dip: 'https://images.unsplash.com/photo-1623874514711-0f321325f318?w=800&h=600&fit=crop',
    latPulldown: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop',
    cableRow: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop',
    lunges: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop',
    calfRaise: 'https://images.unsplash.com/photo-1558017487-06bf9f82613a?w=800&h=600&fit=crop',
    hamstringCurl: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&h=600&fit=crop',
    chestFly: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&h=600&fit=crop',
    lateralRaise: 'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=800&h=600&fit=crop',
    frontRaise: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&h=600&fit=crop',
    shrugs: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&h=600&fit=crop',
    arnoldPress: 'https://images.unsplash.com/photo-1593476087123-36d1de271f08?w=800&h=600&fit=crop',
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
    } catch (e: any) {
      error = e.message || 'Falha ao carregar exercícios';
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

    // Se for squat ou push_up (exercícios com ML), redirecionar para train
    if (exercise.type === 'squat' || exercise.type === 'push_up') {
      goto('/train');
    } else {
      // Para outros exercícios, redirecionar para intro
      goto('/train/intro');
    }
  }

  function getExerciseImage(type: string): string {
    return exerciseImages[type] || 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop';
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

<svelte:window onclick={handleClickOutside} />

<style>
  .button-primary {
    background: #8EB428;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .button-primary:hover {
    background: #7a9922;
  }

  .glass-button {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border-radius: 8px;
    position: relative;
    overflow: hidden;
  }

  .glass-button-round {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border-radius: 50%;
    position: relative;
    overflow: hidden;
  }

  .header-container {
    transition: all 0.3s ease;
    padding: 0;
  }

  .header-container.scrolled {
    padding: 8px;
  }

  .header-glass {
    transition: all 0.3s ease;
    width: 100%;
  }

  .header-glass.scrolled {
    background: rgba(18, 18, 18, 0.55);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 16px;
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
    background: #8EB428;
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

  /* Avatar menu */
  .avatar-menu-container {
    position: relative;
  }

  .glass-button-round:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 180px;
    background: rgba(18, 18, 18, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    opacity: 0;
    transform: translateY(-10px);
    pointer-events: none;
    transition: all 0.2s ease;
  }

  .dropdown-menu.show {
    opacity: 1;
    transform: translateY(0);
    pointer-events: all;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    color: #ef4444;
    border-radius: 8px;
    transition: all 0.2s ease;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .menu-item:hover {
    background: rgba(239, 68, 68, 0.1);
  }
</style>

<div class="min-h-screen bg-black">
  <header class="fixed top-0 left-0 right-0 z-50">
    <div class="header-container px-3 sm:px-4" class:scrolled={isScrolled}>
      <div class="header-glass mx-auto py-2" class:scrolled={isScrolled}>
        <div class="flex items-center justify-between px-4">
          <div class="flex items-center">
            <img src={asset('/logo-elarin.png')} alt="Elarin" class="h-12 sm:h-14" />
          </div>

          <div class="flex items-center gap-2 sm:gap-4">
            <button type="button" class="text-white hover:text-white/80 transition-colors p-1" aria-label="Menu">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            <div class="glass-button w-10 h-6 sm:w-12 sm:h-8 flex items-center justify-center rounded-full">
              <span class="text-white text-xs font-semibold whitespace-nowrap">PRO</span>
            </div>

            <div class="avatar-menu-container">
              <button type="button" class="glass-button-round w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center overflow-hidden p-0" aria-label="Perfil do usuário" onclick={toggleAvatarMenu}>
                <svg class="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </button>

              <div class="dropdown-menu" class:show={showAvatarMenu}>
                <button type="button" class="menu-item w-full text-left" onclick={handleLogout}>
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <main class="w-full px-4 pb-4 pt-20 sm:pt-24">
    {#if isLoading}
      <!-- Loading State -->
      <div class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-[#8EB428] mx-auto mb-4"></div>
          <p class="text-white/70">Carregando exercícios...</p>
        </div>
      </div>
    {:else if error}
      <!-- Error State -->
      <div class="flex items-center justify-center py-20">
        <div class="text-center text-red-400">
          <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="font-semibold mb-2">Erro ao carregar exercícios</p>
          <p class="text-sm text-white/50">{error}</p>
          <button
            onclick={() => loadExercises()}
            class="button-primary px-6 py-2 mt-4 text-white"
          >
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
      <div class="grid grid-cols-2 max-[420px]:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full">
        {#each exercises as exercise}
          <div
            class="flex flex-col cursor-pointer group {!exercise.is_active ? 'exercise-inactive' : ''}"
            onclick={() => handleExerciseSelect(exercise)}
            onkeypress={(e) => e.key === 'Enter' && handleExerciseSelect(exercise)}
            role="button"
            tabindex={exercise.is_active ? 0 : -1}
            aria-label={exercise.is_active ? `Selecionar ${exercise.name_pt}` : `${exercise.name_pt} - Em Breve`}
          >
            <div class="relative h-36 sm:h-44 rounded overflow-hidden w-full z-10">
              <img
                src={getExerciseImage(exercise.type)}
                alt={exercise.name_pt}
                class="absolute inset-0 w-full h-full object-cover"
              />

              <div class="glass-overlay absolute inset-0"></div>

              <div class="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
                <div class="button-primary px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3">
                  <svg class="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <span class="text-white text-sm sm:text-base font-medium">{exercise.name_pt}</span>
                </div>
              </div>

              <!-- Badge de Indisponível -->
              {#if !exercise.is_active}
                <div class="absolute top-2 right-2 badge-inactive">
                  Em Breve                
                </div>
              {/if}
            </div>

            <span class="exercise-name text-white text-sm sm:text-base font-medium px-2 sm:px-3 py-2 pt-4 sm:pt-5 -mt-3 z-0 group-hover:rounded-b-lg">
              <!-- {exercise.name_pt} -->
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>
