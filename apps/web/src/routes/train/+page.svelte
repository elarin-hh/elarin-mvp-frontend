<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { trainStore, trainActions } from '$lib/stores/train.store';
  import { _ } from 'svelte-i18n';
  import { asset } from '$lib/utils/assets';

  // DOM References
  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;

  // Reactive State
  let detector: any = $state(null);
  let isLoading = $state(false);
  let errorMessage = $state('');
  let debugMode = $state(false);
  let isScrolled = $state(false);
  let scriptsLoaded = $state(false);
  let loadingStage = $state('Inicializando...');
  let isCameraRunning = $state(false); // Controle do estado da câmera

  // Error history tracking (persistente entre sessões)
  let errorList: Array<{type: string, message: string, timestamp: number}> = $state([]);
  let errorCount = $state(0);

  /**
   * Carrega um script externo de forma assíncrona
   */
  function loadScript(src: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Verifica se o script já foi carregado
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        console.log(`✅ ${name} carregado`);
        resolve();
      };

      script.onerror = () => {
        console.error(`❌ Erro ao carregar ${name}`);
        reject(new Error(`Falha ao carregar ${name}: ${src}`));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Aguarda até que uma variável global esteja disponível
   */
  async function waitForGlobal(globalName: string, timeout = 10000): Promise<any> {
    const startTime = Date.now();

    while (!(window as any)[globalName]) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout aguardando ${globalName}`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return (window as any)[globalName];
  }

  /**
   * Carrega todas as dependências necessárias na ordem correta
   */
  async function loadAllDependencies() {
    try {
      console.log('🚀 Iniciando carregamento de dependências...');

      // 1. MediaPipe Dependencies (ordem importa!)
      loadingStage = 'Carregando MediaPipe Camera Utils...';
      await loadScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
        'MediaPipe Camera Utils'
      );
      await waitForGlobal('Camera');

      loadingStage = 'Carregando MediaPipe Control Utils...';
      await loadScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
        'MediaPipe Control Utils'
      );

      loadingStage = 'Carregando MediaPipe Drawing Utils...';
      await loadScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
        'MediaPipe Drawing Utils'
      );
      await waitForGlobal('drawConnectors');
      await waitForGlobal('drawLandmarks');

      loadingStage = 'Carregando MediaPipe Pose...';
      await loadScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
        'MediaPipe Pose'
      );
      await waitForGlobal('Pose');
      await waitForGlobal('POSE_CONNECTIONS');

      // 2. TensorFlow.js
      loadingStage = 'Carregando TensorFlow.js...';
      await loadScript(
        'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js',
        'TensorFlow.js'
      );
      await waitForGlobal('tf');

      // 3. Detectores locais (ordem de dependência)
      loadingStage = 'Carregando PoseDetector...';
      await loadScript('/js/PoseDetector.js', 'PoseDetector');
      await waitForGlobal('PoseDetector');

      loadingStage = 'Carregando ExerciseDetector...';
      await loadScript('/js/ExerciseDetector.js', 'ExerciseDetector');
      await waitForGlobal('ExerciseDetector');

      loadingStage = 'Carregando MLDetector...';
      await loadScript('/js/MLDetector.js', 'MLDetector');
      await waitForGlobal('MLDetector');

      loadingStage = 'Carregando SquatDetectorML...';
      await loadScript('/js/SquatDetectorML.js', 'SquatDetectorML');
      await waitForGlobal('SquatDetectorML');

      loadingStage = 'Tudo pronto!';
      scriptsLoaded = true;
      console.log('✅ Todas as dependências carregadas com sucesso!');

    } catch (error: any) {
      console.error('❌ Erro ao carregar dependências:', error);
      loadingStage = 'Erro ao carregar';
      errorMessage = `Falha ao carregar dependências: ${error.message}. Por favor, recarregue a página.`;
      scriptsLoaded = false;
    }
  }

  /**
   * Inicializa e inicia a câmera
   */
  async function startCamera() {
    try {
      isLoading = true;
      errorMessage = '';

      // Verificação de segurança
      if (!scriptsLoaded) {
        throw new Error('Dependências ainda não foram carregadas completamente. Aguarde...');
      }

      const SquatDetectorML = (window as any).SquatDetectorML;
      if (!SquatDetectorML) {
        throw new Error('SquatDetectorML não está disponível');
      }

      console.log('🎥 Inicializando detector...');

      // Criar detector
      detector = new SquatDetectorML('quality');

      // Sobrescrever onResults para atualizar histórico de erros
      const originalOnResults = detector.onResults.bind(detector);
      detector.onResults = function(results: any) {
        originalOnResults(results);
        updateErrorHistory();
        updateTrainStore();
      };

      console.log('📹 Inicializando câmera...');
      await detector.initialize(videoElement, canvasElement);

      console.log('▶️ Iniciando stream de câmera...');
      await detector.startCamera();

      trainActions.start();
      isCameraRunning = true; // Marca câmera como ativa
      isLoading = false;

      console.log('✅ Câmera iniciada com sucesso!');

    } catch (error: any) {
      errorMessage = `Erro ao iniciar câmera: ${error.message}`;
      console.error('❌ Erro completo:', error);
      isLoading = false;
    }
  }

  /**
   * Para a câmera mantendo o histórico de erros
   */
  function stopCamera() {
    if (detector) {
      detector.stopCamera();
      trainActions.pause();
      isCameraRunning = false; // Marca câmera como parada
      // NÃO limpa o detector para preservar o histórico de erros
    }
  }

  /**
   * Alterna modo debug
   */
  function toggleDebug() {
    debugMode = !debugMode;
    (window as any).debugMode = debugMode;
  }

  /**
   * Limpa histórico de erros (apenas via botão manual)
   */
  function clearErrors() {
    if (detector && detector.errors) {
      detector.errors = [];
    }
    errorList = [];
    errorCount = 0;
  }

  /**
   * Atualiza histórico de erros
   */
  function updateErrorHistory() {
    if (!detector || !detector.errors) return;
    errorList = detector.errors;
    errorCount = errorList.length;
  }

  /**
   * Atualiza store de treinamento
   */
  function updateTrainStore() {
    if (!detector) return;
    trainActions.updateDuration(
      Math.floor((Date.now() - ($trainStore.startTime || Date.now())) / 1000)
    );
  }

  /**
   * Formata duração em MM:SS
   */
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Formata tempo relativo (ex: "5s atrás")
   */
  function formatTimeAgo(timestamp: number): string {
    const timeAgo = Math.floor((Date.now() - timestamp) / 1000);
    if (timeAgo < 1) return 'agora';
    if (timeAgo < 60) return `${timeAgo}s atrás`;
    const minutes = Math.floor(timeAgo / 60);
    return `${minutes}min atrás`;
  }

  /**
   * Lifecycle: onMount
   */
  onMount(async () => {
    // Configurar canvas
    if (canvasElement) {
      canvasElement.width = 854;
      canvasElement.height = 480;
    }

    // Disponibilizar debugMode globalmente
    (window as any).debugMode = debugMode;

    // Carregar todas as dependências
    await loadAllDependencies();

    // Scroll handler
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      isScrolled = target.scrollTop > 50;
    };

    const viewport = document.querySelector('.sa-viewport');
    if (viewport) {
      viewport.addEventListener('scroll', handleScroll, { passive: true });
      return () => viewport.removeEventListener('scroll', handleScroll);
    } else {
      const handleWindowScroll = () => {
        isScrolled = window.scrollY > 50;
      };
      window.addEventListener('scroll', handleWindowScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleWindowScroll);
    }
  });

  /**
   * Lifecycle: onDestroy
   */
  onDestroy(() => {
    if (detector) {
      detector.stopCamera();
    }
  });
</script>

<svelte:head>
  <title>{$_('train.training')} - Elarin</title>
</svelte:head>

<style>
  .glass-button {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    transition: all 0.2s ease;
  }

  .glass-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
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

  .video-container {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .stats-card {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .error-card {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
  }

  .button-primary {
    background: #8EB428;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .button-primary:hover:not(:disabled) {
    background: #7a9922;
  }

  .button-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .button-danger {
    background: rgba(239, 68, 68, 0.8);
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .button-danger:hover {
    background: rgba(220, 38, 38, 0.9);
  }

  .loading-status {
    background: rgba(142, 180, 40, 0.1);
    border: 1px solid rgba(142, 180, 40, 0.3);
    border-radius: 8px;
  }
</style>

<div class="min-h-screen bg-black text-white">
  <!-- Header -->
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

  <!-- Main Content -->
  <main class="min-h-screen pt-20 sm:pt-24 px-4 pb-8 flex items-center justify-center">
    <div class="w-full max-w-7xl">
      <!-- Page Title -->
      <div class="mb-6 text-center">
        <h1 class="text-2xl sm:text-3xl font-bold text-white mb-2">🏋️ {$_('train.squat')}</h1>
        <p class="text-white/60 text-sm sm:text-base">Detecção de movimento em tempo real</p>
      </div>

      <div class="space-y-6">
        <!-- Loading Status -->
        {#if !scriptsLoaded && !errorMessage}
          <div class="loading-status p-4 text-center">
            <div class="flex items-center justify-center gap-3 mb-2">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-[#8EB428]"></div>
              <span class="text-[#8EB428] font-semibold">{loadingStage}</span>
            </div>
            <p class="text-white/50 text-sm">Carregando bibliotecas necessárias...</p>
          </div>
        {/if}

        <!-- Video Container -->
        <div class="video-container p-4">
          <div class="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
            <video
              bind:this={videoElement}
              class="hidden"
              autoplay
              playsinline
            ></video>
            <canvas
              bind:this={canvasElement}
              class="w-full h-full"
            ></canvas>

            {#if isLoading}
              <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                <div class="text-center text-white">
                  <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-[#8EB428] mx-auto mb-4"></div>
                  <p class="text-xl">Inicializando câmera...</p>
                </div>
              </div>
            {/if}

            {#if !detector && !isLoading}
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center text-white p-8">
                  <svg class="w-24 h-24 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {#if scriptsLoaded}
                    <p class="text-xl mb-2">Clique em "Iniciar Câmera" para começar</p>
                    <p class="text-sm text-white/50">{$_('train.privacyNote')}</p>
                  {:else}
                    <p class="text-xl mb-2">Carregando dependências...</p>
                    <p class="text-sm text-white/50">Aguarde enquanto preparamos tudo</p>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Controls -->
        <div class="flex gap-3 flex-wrap justify-center">
          {#if !isCameraRunning}
            <button
              onclick={startCamera}
              class="button-primary text-white px-6 py-3 font-semibold flex items-center gap-2"
              disabled={isLoading || !scriptsLoaded}
            >
              {#if !scriptsLoaded}
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Carregando...
              {:else}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Iniciar Câmera
              {/if}
            </button>
          {:else}
            <button
              onclick={stopCamera}
              class="button-danger text-white px-6 py-3 font-semibold flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Parar Câmera
            </button>
          {/if}

          {#if detector}
            <button
              onclick={toggleDebug}
              class="glass-button text-white px-6 py-3 font-semibold"
            >
              🐛 Debug {debugMode ? 'ON' : 'OFF'}
            </button>
          {/if}
        </div>

        {#if errorMessage}
          <div class="error-card p-4 text-red-200 text-sm text-center">
            ❌ {errorMessage}
          </div>
        {/if}

        <!-- Stats -->
        {#if detector}
          <div class="stats-card p-6">
            <div class="grid grid-cols-3 gap-4">
              <div class="text-center">
                <div class="text-xs text-white/60 mb-1">{$_('train.reps')}</div>
                <div class="text-3xl font-bold text-[#8EB428]">{detector.counter || 0}</div>
              </div>

              <div class="text-center">
                <div class="text-xs text-white/60 mb-1">{$_('train.sets')}</div>
                <div class="text-3xl font-bold text-[#8EB428]">{$trainStore.sets}</div>
              </div>

              <div class="text-center">
                <div class="text-xs text-white/60 mb-1">{$_('train.duration')}</div>
                <div class="text-3xl font-bold text-white">{formatDuration($trainStore.duration)}</div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Error History -->
        <div class="stats-card p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-white">📋 Histórico de Erros</h3>
            <span class="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-semibold">
              {errorCount}
            </span>
          </div>

          <div class="max-h-64 overflow-y-auto mb-4 space-y-2">
            {#if errorList.length === 0}
              <p class="text-white/50 text-center py-8 text-sm">Nenhum erro detectado ainda</p>
            {:else}
              {#each errorList.slice(0, 20).reverse() as error}
                <div class="error-card p-3">
                  <div class="flex items-start justify-between mb-1">
                    <span class="font-semibold text-red-300 text-sm">⚠️ {error.type}</span>
                    <span class="text-xs text-red-400">{formatTimeAgo(error.timestamp)}</span>
                  </div>
                  <p class="text-xs text-red-200">{error.message}</p>
                </div>
              {/each}
              {#if errorCount > 20}
                <p class="text-xs text-white/50 text-center mt-3">
                  + {errorCount - 20} erros anteriores
                </p>
              {/if}
            {/if}
          </div>

          {#if errorList.length > 0}
            <button
              onclick={clearErrors}
              class="w-full glass-button text-white px-4 py-2 text-sm font-semibold"
            >
              Limpar Histórico
            </button>
          {/if}
        </div>
      </div>
    </div>
  </main>
</div>
