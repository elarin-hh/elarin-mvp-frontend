<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { asset } from '$lib/utils/assets';

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
</script>

<style>
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

  .glass-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .button-primary {
    background: #8EB428;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .button-primary:hover {
    background: #7a9922;
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
    <div class="max-w-2xl mx-auto">
      <!-- Icon -->
      <div class="flex justify-center mb-8">
        <div class="w-20 h-20 rounded-full bg-[#8EB428]/10 flex items-center justify-center">
          <svg class="w-10 h-10 text-[#8EB428]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>

      <h1 class="text-2xl sm:text-3xl font-bold text-white text-center mb-8">
        Antes de Começar
      </h1>

      <div class="glass-card mb-4 p-6 rounded-lg border border-blue-500/20">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
            <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 class="text-white font-semibold mb-2">Aviso MVP</h2>
            <p class="text-white/70 text-sm">
              Esta versão MVP demonstra o fluxo da interface. A captura de câmera e detecção de exercícios em tempo real serão habilitadas na próxima fase.
            </p>
          </div>
        </div>
      </div>

      <div class="glass-card mb-8 p-6 rounded-lg border border-green-500/20">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
            <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 class="text-white font-semibold mb-2">Privacidade</h2>
            <p class="text-white/70 text-sm">
              Sua privacidade é importante. Todo o processamento acontecerá localmente no seu dispositivo.
            </p>
          </div>
        </div>
      </div>

      <div class="flex justify-center">
        <button
          type="button"
          class="button-primary px-8 py-3 text-white font-semibold text-lg"
          onclick={() => goto('/train')}
        >
          Começar
        </button>
      </div>
    </div>
  </main>
</div>

