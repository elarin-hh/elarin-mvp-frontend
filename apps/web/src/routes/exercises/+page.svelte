<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { goto } from '$app/navigation';
  import type { ExerciseType } from '$lib/stores/train.store';
  import { trainActions } from '$lib/stores/train.store';
  import { telemetry } from '$lib/services/telemetry.service';
  import { onMount } from 'svelte';

  let isScrolled = $state(false);

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

  const exercises: ExerciseType[] = [
    'plank', 'squat', 'legPress', 'abdominal', 'crossOver', 'biceps', 'triceps', 'glutes',
    'shoulderPress', 'deadlift', 'benchPress', 'pullUp', 'dip', 'latPulldown', 'cableRow',
    'lunges', 'calfRaise', 'hamstringCurl', 'chestFly', 'lateralRaise', 'frontRaise', 'shrugs', 'arnoldPress'
  ];

  const exerciseImages: Record<ExerciseType, string> = {
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
    arnoldPress: 'https://images.unsplash.com/photo-1593476087123-36d1de271f08?w=800&h=600&fit=crop'
  };

  function handleExerciseSelect(exercise: ExerciseType) {
    trainActions.selectExercise(exercise);
    telemetry.emit('exercise_selected', { exercise });
    goto('/train/intro');
  }
</script>

<style>
  .button-primary {
    background: #8EB428;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .button-primary:hover {
    background: #7a9922;
  }

  .glass-button {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 8px;
    border: 0.2px solid rgba(255, 255, 255, 0.05);
  }

  .glass-button-round {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 50%;
    border: 0.2px solid rgba(255, 255, 255, 0.05);
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
    background: rgba(18, 18, 18, 0.75);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    /* border: 1px solid rgba(255, 255, 255, 0.05); */
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
</style>

<div class="min-h-screen bg-black">
  <header class="fixed top-0 left-0 right-0 z-50">
    <div class="header-container px-3 sm:px-4" class:scrolled={isScrolled}>
      <div class="header-glass mx-auto py-2" class:scrolled={isScrolled}>
      <div class="flex items-center justify-between px-4">
        <div class="flex items-center">
          <img src="/logo-elarin.png" alt="Elarin" class="h-12 sm:h-14" />
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
          
          <button type="button" class="glass-button-round w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center overflow-hidden p-0" aria-label="Perfil do usuário">
            <svg class="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </button>
        </div>
      </div>
      </div>
    </div>
  </header>
  
  <main class="w-full px-4 pb-4 pt-20 sm:pt-24">
    <div class="grid grid-cols-2 max-[420px]:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full">
      {#each exercises as exercise}
        <div class="flex flex-col cursor-pointer group" onclick={() => handleExerciseSelect(exercise)} onkeypress={(e) => e.key === 'Enter' && handleExerciseSelect(exercise)} role="button" tabindex="0" aria-label="Selecionar {$_(`train.${exercise}`)}">
          <div class="relative h-36 sm:h-44 rounded overflow-hidden w-full z-10">
            <img 
              src={exerciseImages[exercise]} 
              alt={$_(`train.${exercise}`)}
              class="absolute inset-0 w-full h-full object-cover"
            />
            
            <div class="glass-overlay absolute inset-0"></div>
            
            <div class="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
               <div class="button-primary px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3">
                <svg class="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                <span class="text-white text-sm sm:text-base font-medium">{$_(`train.${exercise}`)}</span>
              </div>
            </div>
          </div>
          
          <span class="exercise-name text-white text-sm sm:text-base font-medium px-2 sm:px-3 py-2 pt-4 sm:pt-5 -mt-3 z-0 group-hover:rounded-b-lg">
            <!-- {$_(`train.${exercise}`)} -->
          </span>
        </div>
      {/each}
    </div>
  </main>
</div>

