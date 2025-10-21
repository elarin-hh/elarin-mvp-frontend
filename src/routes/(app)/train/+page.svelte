<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { trainActions } from '$lib/stores/train.store';
  import { integratedTrainStore, integratedTrainActions } from '$lib/stores/integrated-train.store';
  import { authActions } from '$lib/stores/auth.store';
  import { goto } from '$app/navigation';
  import AppHeader from '$lib/components/common/AppHeader.svelte';
  import { isDeveloper } from '$lib/config/env.config';
  import { FlaskConical, Bot, Ruler, Microscope, Settings } from 'lucide-svelte';

  // ✅ Imports TypeScript do sistema de visão
  import { ExerciseAnalyzer, loadExerciseConfig, type FeedbackRecord } from '$lib/vision';

  // DOM References
  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let videoContainerElement: HTMLDivElement;

  // Reactive State
  let analyzer: ExerciseAnalyzer | null = $state(null);
  let pose: MediaPipePose | null = $state(null);
  let camera: MediaPipeCamera | null = $state(null);

  // Type definitions for MediaPipe
  type MediaPipePose = {
    setOptions: (options: Record<string, unknown>) => void;
    onResults: (callback: (results: PoseResults) => void) => void;
    send: (inputs: { image: HTMLVideoElement }) => Promise<void>;
  };

  type MediaPipeCamera = {
    start: () => Promise<void>;
    stop: () => void;
  };

  type PoseResults = {
    poseLandmarks?: Array<{ x: number; y: number; z: number; visibility?: number }>;
    image: HTMLVideoElement | HTMLCanvasElement;
  };
  let isLoading = $state(false);
  let errorMessage = $state('');
  let debugMode = $state(false);
  let isScrolled = $state(false);
  let scriptsLoaded = $state(false);
  let loadingStage = $state('Inicializando...');
  let isCameraRunning = $state(false);
  let isFullscreen = $state(false);
  let showAvatarMenu = $state(false);
  let isDevMode = $state(false);

  // Feedback state
  let currentFeedback: FeedbackRecord | null = $state(null);
  let skeletonColor = $state('#00ff88');
  let feedbackMessages: Array<{ type: string; text: string; severity: string; priority: number }> =
    $state([]);

  // Metrics
  let accuracy = $state(0);
  let confidence = $state(0);
  let elapsedTime = $state(0); // em segundos
  let timerInterval: number | null = null;

  // Feedback Mode
  let feedbackMode = $state<'hybrid' | 'ml_only' | 'heuristic_only'>('hybrid');
  let modeIndicator = $state('Híbrido (ML + Heurística)');

  /**
   * Carrega um script externo de forma assíncrona
   */
  function loadScript(src: string, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
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
        resolve();
      };

      script.onerror = () => {
        reject(new Error(`Falha ao carregar ${name}: ${src}`));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Aguarda até que uma variável global esteja disponível
   */
  async function waitForGlobal(globalName: string, timeout = 10000): Promise<unknown> {
    const startTime = Date.now();

    while (!(window as Record<string, unknown>)[globalName]) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout aguardando ${globalName}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return (window as Record<string, unknown>)[globalName];
  }

  /**
   * Carrega todas as dependências necessárias na ordem correta
   * ✅ Agora usa imports TypeScript estáticos + apenas MediaPipe CDN
   */
  async function loadAllDependencies() {
    try {
      // 1. MediaPipe Dependencies (apenas o necessário do CDN)
      loadingStage = 'Carregando MediaPipe Camera Utils...';
      await loadScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
        'MediaPipe Camera Utils'
      );
      await waitForGlobal('Camera');

      loadingStage = 'Carregando MediaPipe Drawing Utils...';
      await loadScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
        'MediaPipe Drawing Utils'
      );
      await waitForGlobal('drawConnectors');
      await waitForGlobal('drawLandmarks');

      loadingStage = 'Carregando MediaPipe Pose...';
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js', 'MediaPipe Pose');
      await waitForGlobal('Pose');
      await waitForGlobal('POSE_CONNECTIONS');

      // ✅ ONNX Runtime Web já está importado via npm (onnxruntime-web)
      // ✅ ExerciseAnalyzer, FeedbackSystem, Validators já estão importados via TypeScript
      // ✅ MEDIAPIPE_LANDMARKS já está importado via TypeScript

      loadingStage = 'Preparando tudo...';
      scriptsLoaded = true;
    } catch (error: unknown) {
      loadingStage = 'Erro ao carregar';
      errorMessage = `Falha ao carregar dependências: ${(error as Error).message}. Por favor, recarregue a página.`;
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

      if (!scriptsLoaded) {
        throw new Error('Dependências ainda não foram carregadas completamente. Aguarde...');
      }
      // 1. Obter exercício selecionado do store
      const selectedExercise = $integratedTrainStore.exerciseType;

      if (!selectedExercise) {
        throw new Error('Nenhum exercício selecionado. Por favor, volte e selecione um exercício.');
      }
      // 2. Verificar se sessão do backend existe
      if (!$integratedTrainStore.backendSessionId) {
        await integratedTrainActions.selectExercise(selectedExercise);
      }
      // 3. Carregar configuração do exercício (usando import TypeScript)
      const exerciseConfig = await loadExerciseConfig(selectedExercise);

      if (!exerciseConfig) {
        throw new Error('Falha ao carregar configuração do exercício');
      }
      // 3. Criar ExerciseAnalyzer (usando import TypeScript)
      analyzer = new ExerciseAnalyzer(exerciseConfig);

      // 4. Configurar callbacks
      analyzer.setCallbacks({
        onFeedback: handleFeedback,
        onMetricsUpdate: handleMetricsUpdate,
        onError: handleError
      });
      // 5. Inicializar analyzer
      const success = await analyzer.initialize();

      if (!success) {
        throw new Error('Falha ao inicializar analyzer');
      }
      // 6. Inicializar MediaPipe Pose
      const Pose = (window as Record<string, unknown>).Pose as new (config: {
        locateFile: (file: string) => string;
      }) => MediaPipePose;
      pose = new Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults(onPoseResults);
      // 7. Inicializar câmera
      const Camera = (window as Record<string, unknown>).Camera as new (
        video: HTMLVideoElement,
        config: { onFrame: () => Promise<void>; width: number; height: number }
      ) => MediaPipeCamera;
      camera = new Camera(videoElement, {
        onFrame: async () => {
          if (pose && videoElement) {
            await pose.send({ image: videoElement });
          }
        },
        width: 1280,
        height: 720
      });

      await camera.start();

      // 8. Iniciar treino e cronômetro
      trainActions.start();
      integratedTrainActions.start();
      startTimer();

      isCameraRunning = true;
      isLoading = false;
    } catch (error: unknown) {
      errorMessage = `Erro ao iniciar: ${(error as Error).message}`;
      isLoading = false;
    }
  }

  /**
   * Callback do MediaPipe Pose
   */
  async function onPoseResults(results: PoseResults) {
    if (!canvasElement || !results.poseLandmarks) return;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    // Limpa canvas
    ctx.save();
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Espelha horizontalmente (inverte o vídeo)
    ctx.translate(canvasElement.width, 0);
    ctx.scale(-1, 1);

    // Desenha vídeo espelhado
    ctx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // Analisa com ExerciseAnalyzer
    if (analyzer && results.poseLandmarks) {
      await analyzer.analyzeFrame(results.poseLandmarks);
    }

    // Desenha esqueleto
    const drawConnectors = (window as Record<string, unknown>).drawConnectors as (
      ctx: CanvasRenderingContext2D,
      landmarks: unknown,
      connections: unknown,
      options: { color: string; lineWidth: number }
    ) => void;
    const drawLandmarks = (window as Record<string, unknown>).drawLandmarks as (
      ctx: CanvasRenderingContext2D,
      landmarks: unknown,
      options: { color: string; lineWidth: number; radius: number }
    ) => void;
    const POSE_CONNECTIONS = (window as Record<string, unknown>).POSE_CONNECTIONS;

    if (results.poseLandmarks) {
      drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: skeletonColor,
        lineWidth: 4
      });
      drawLandmarks(ctx, results.poseLandmarks, {
        color: skeletonColor,
        lineWidth: 2,
        radius: 6
      });
    }

    ctx.restore();
  }

  /**
   * Handler de feedback do analyzer
   */
  function handleFeedback(feedback: FeedbackRecord) {
    currentFeedback = feedback;

    // Atualizar cor do esqueleto
    if (feedback.visualization) {
      skeletonColor = feedback.visualization.color;
    }

    // Atualizar mensagens
    feedbackMessages = feedback.messages || [];

    // Incrementar reps se válida
    if (feedback.heuristic && feedback.heuristic.details) {
      const validationDetails = feedback.heuristic.details;
      const repResult = validationDetails.find(
        (d: unknown) => (d as { type?: string }).type === 'valid_repetition'
      );

      if (repResult && (repResult as { isValid?: boolean }).isValid) {
        integratedTrainActions.incrementReps();
      }
    }
  }

  /**
   * Handler de métricas
   */
  function handleMetricsUpdate(metrics: {
    validReps?: number;
    accuracy?: string;
    avgConfidence?: number;
  }) {
    accuracy = parseFloat(metrics.accuracy || '0') || 0;
    confidence = (metrics.avgConfidence ? metrics.avgConfidence * 100 : 0) || 0;
  }

  /**
   * Handler de erro
   */
  function handleError(error: Error) {
    errorMessage = error.message || 'Erro desconhecido';
  }

  /**
   * Inicia o cronômetro
   */
  function startTimer() {
    elapsedTime = 0;
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    timerInterval = window.setInterval(() => {
      elapsedTime += 1;
    }, 1000);
  }

  /**
   * Pausa o cronômetro
   */
  function pauseTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  /**
   * Formata o tempo em MM:SS
   */
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Para a câmera
   */
  async function stopCamera() {
    if (camera) {
      camera.stop();
    }
    if (analyzer) {
      analyzer.reset();
    }
    trainActions.pause();
    integratedTrainActions.pause();
    pauseTimer();
    isCameraRunning = false;
  }

  /**
   * Finaliza treino
   */
  async function finishTraining() {
    if (!analyzer) return;

    try {
      isLoading = true;

      // Finalizar no backend
      await integratedTrainActions.finish();
      // Parar câmera e cronômetro
      if (camera) {
        camera.stop();
      }
      pauseTimer();
      isCameraRunning = false;

      // Resetar
      setTimeout(() => {
        analyzer = null;
        pose = null;
        camera = null;
        integratedTrainActions.reset();
        trainActions.reset();
        feedbackMessages = [];
        currentFeedback = null;
        elapsedTime = 0;
      }, 2000);

      isLoading = false;
    } catch (error: unknown) {
      errorMessage = `Erro ao finalizar treino: ${(error as Error).message}`;
      isLoading = false;
    }
  }

  /**
   * Muda o modo de feedback (ML, Heurístico ou Híbrido)
   */
  function changeFeedbackMode(mode: 'hybrid' | 'ml_only' | 'heuristic_only') {
    feedbackMode = mode;

    // Atualizar indicador
    if (mode === 'ml_only') {
      modeIndicator = 'ML Only (Autoencoder)';
    } else if (mode === 'heuristic_only') {
      modeIndicator = 'Heurística Only (Biomecânica)';
    } else {
      modeIndicator = 'Híbrido (ML + Heurística)';
    }

    // Se analyzer já existe, atualizar modo
    if (analyzer && analyzer.feedbackSystem) {
      analyzer.feedbackSystem.setMode(mode);
    }
  }

  /**
   * Alterna tela cheia
   */
  async function toggleFullscreen() {
    if (!videoContainerElement) return;

    try {
      const doc = document as Document & {
        fullscreenElement?: Element;
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
        exitFullscreen?: () => Promise<void>;
        webkitExitFullscreen?: () => Promise<void>;
        mozCancelFullScreen?: () => Promise<void>;
        msExitFullscreen?: () => Promise<void>;
      };
      const elem = videoContainerElement as HTMLDivElement & {
        requestFullscreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
        mozRequestFullScreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
      };

      const isCurrentlyFullscreen =
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement;

      if (!isCurrentlyFullscreen) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
        isFullscreen = true;
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
        isFullscreen = false;
      }
    } catch {
      // Fullscreen API not supported or user denied permission
    }
  }

  /**
   * Toggle avatar menu
   */
  function toggleAvatarMenu() {
    showAvatarMenu = !showAvatarMenu;
  }

  /**
   * Logout
   */
  async function handleLogout() {
    showAvatarMenu = false;
    await authActions.logout();
    goto('/login');
  }

  /**
   * Close menu when clicking outside
   */
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.avatar-menu-container')) {
      showAvatarMenu = false;
    }
  }

  // Auto-iniciar treino quando dependências carregarem e exercício estiver selecionado
  $effect(() => {
    if (
      scriptsLoaded &&
      $integratedTrainStore.exerciseType &&
      !isCameraRunning &&
      !isLoading &&
      !analyzer
    ) {
      setTimeout(() => {
        startCamera();
      }, 500);
    }
  });

  // Lifecycle
  onMount(async () => {
    isDevMode = isDeveloper();
    await loadAllDependencies();

    // Detectar scroll - IGUAL AO /exercises
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

  onDestroy(() => {
    if (camera) {
      camera.stop();
    }
    if (analyzer) {
      analyzer.destroy();
    }
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  });
</script>

<svelte:head>
  <title>Treinar - Elarin</title>
</svelte:head>

<main class="train-page">
  <!-- Header -->
  <AppHeader
    bind:isScrolled
    bind:showAvatarMenu
    hasDropdownMenu={true}
    onToggleAvatarMenu={toggleAvatarMenu}
    onLogout={handleLogout}
    onClickOutside={handleClickOutside}
  />

  <!-- Main Content -->
  <div class="content">
    <!-- Video Container -->
    <div class="video-container" class:fullscreen={isFullscreen} bind:this={videoContainerElement}>
      <video bind:this={videoElement} class="video-input" playsinline style="display: none;">
        <track kind="captions" src="" label="No captions" />
      </video>

      <canvas bind:this={canvasElement} class="video-canvas" width="1280" height="720"></canvas>

      <!-- Indicador de Modo (apenas para devs) -->
      {#if isCameraRunning && isDevMode}
        <div class="mode-indicator">
          {#if feedbackMode === 'hybrid'}
            <Microscope size={18} />
          {:else if feedbackMode === 'ml_only'}
            <Bot size={18} />
          {:else}
            <Ruler size={18} />
          {/if}
          <span class="mode-text">{modeIndicator}</span>
        </div>
      {/if}

      <!-- Overlay de feedback -->
      {#if isCameraRunning && feedbackMessages.length > 0}
        <div class="feedback-overlay" class:with-mode-indicator={isDevMode}>
          {#each feedbackMessages.slice(0, 3) as message}
            <div
              class="feedback-message {message.type}"
              class:critical={message.severity === 'critical'}
            >
              <span>{message.text}</span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Métricas -->
      {#if isCameraRunning}
        <div class="metrics-overlay">
          <div class="metric">
            <span class="metric-label">Repetições</span>
            <span class="metric-value">{$integratedTrainStore.reps}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Tempo</span>
            <span class="metric-value">{formatTime(elapsedTime)}</span>
          </div>
          {#if isDevMode}
            <div class="metric">
              <span class="metric-label">Precisão</span>
              <span class="metric-value">{accuracy.toFixed(0)}%</span>
            </div>
            <div class="metric">
              <span class="metric-label">Confiança</span>
              <span class="metric-value">{confidence.toFixed(0)}%</span>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Loading Overlay -->
      {#if !isCameraRunning && (isLoading || !scriptsLoaded)}
        <div class="loading-overlay">
          <div class="text-center">
            <div
              class="animate-spin rounded-full h-16 w-16 border-b-2 border-[#8EB428] mx-auto mb-4"
            ></div>
            <p class="text-white/70">{loadingStage}</p>
          </div>
        </div>
      {/if}

      <!-- Controles (apenas quando câmera está rodando) -->
      {#if isCameraRunning}
        <div class="video-controls">
          <button class="btn btn-glass" onclick={stopCamera}> Pausar </button>
          <button class="btn btn-primary" onclick={finishTraining}> Finalizar </button>
          <button class="btn btn-glass-icon" onclick={toggleFullscreen}>
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      {/if}
    </div>

    <!-- Error Message -->
    {#if errorMessage}
      <div class="error-banner">
        <p>{errorMessage}</p>
      </div>
    {/if}

    <!-- Mode Selector (apenas para devs) -->
    {#if isCameraRunning && isDevMode}
      <div class="mode-selector-panel">
        <h3>
          <Settings size={20} class="inline-block" />
          Modo de Análise (Dev Only)
        </h3>
        <div class="mode-buttons">
          <button
            class="mode-btn"
            class:active={feedbackMode === 'hybrid'}
            onclick={() => changeFeedbackMode('hybrid')}
          >
            <Microscope size={20} />
            Híbrido
            <span class="mode-desc">ML + Heurística</span>
          </button>

          <button
            class="mode-btn"
            class:active={feedbackMode === 'ml_only'}
            onclick={() => changeFeedbackMode('ml_only')}
          >
            <Bot size={20} />
            ML Only
            <span class="mode-desc">Autoencoder</span>
          </button>

          <button
            class="mode-btn"
            class:active={feedbackMode === 'heuristic_only'}
            onclick={() => changeFeedbackMode('heuristic_only')}
          >
            <Ruler size={20} />
            Heurística Only
            <span class="mode-desc">Biomecânica</span>
          </button>
        </div>

        <div class="mode-info">
          {#if feedbackMode === 'hybrid'}
            <p>
              <strong>Híbrido:</strong> Combina ML (detecção de anomalias) + Heurísticas (regras biomecânicas).
              Mais preciso e com feedback específico.
            </p>
          {:else if feedbackMode === 'ml_only'}
            <p>
              <strong>ML Only:</strong> Apenas o modelo de Machine Learning (autoencoder). Detecta padrões
              anômalos mas feedback é genérico.
            </p>
          {:else}
            <p>
              <strong>Heurística Only:</strong> Apenas regras biomecânicas. Feedback muito específico
              mas pode perder anomalias desconhecidas.
            </p>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Debug Info -->
    {#if debugMode}
      <div class="debug-panel">
        <h3>Debug Info</h3>
        <pre>{JSON.stringify(currentFeedback, null, 2)}</pre>
      </div>
    {/if}
  </div>
</main>

<style>
  .train-page {
    min-height: 100vh;
    background: #000000;
    color: white;
  }

  /* Header Styles - Copiado de /exercises */
  .content {
    padding: 1rem;
    padding-top: 5rem;
    width: 100%;
  }

  @media (min-width: 640px) {
    .content {
      padding-top: 6rem;
    }
  }

  .video-container {
    position: relative;
    max-width: 1280px;
    margin: 0 auto;
    border-radius: 12px;
    overflow: hidden;
    background: black;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .video-canvas {
    width: 100%;
    height: auto;
    display: block;
  }

  /* Mobile - Modo Retrato */
  @media (max-width: 768px) {
    .video-container {
      aspect-ratio: 9 / 16;
      max-height: 70vh;
    }

    .video-canvas {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }

  .feedback-overlay {
    position: absolute;
    top: 20px;
    right: 20px;
    max-width: calc(50% - 30px);
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
    z-index: 5;
  }

  .feedback-overlay.with-mode-indicator {
    top: 20px;
    right: 20px;
    left: auto;
  }

  @media (max-width: 768px) {
    .feedback-overlay {
      top: 10px;
      left: 20px;
      right: 20px;
      max-width: calc(100% - 40px);
    }

    .feedback-overlay.with-mode-indicator {
      top: 60px;
      right: 10px;
      left: auto;
      max-width: 80%;
    }
  }

  .feedback-message {
    background: rgba(18, 18, 18, 0.55);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 500;
    border-left: 4px solid transparent;
    animation: slideIn 0.3s ease;
    color: white;
  }

  .feedback-message.success {
    border-left-color: #00ff88;
    color: #00ff88;
  }

  .feedback-message.error {
    border-left-color: #ff4444;
    color: #ff4444;
  }

  .feedback-message.warning {
    border-left-color: #ffa500;
    color: #ffa500;
  }

  .feedback-message.critical {
    border-left-color: #ff0000;
    color: #ff0000;
    animation: pulse 1s infinite;
  }

  @keyframes slideIn {
    from {
      transform: translateX(-20px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .metrics-overlay {
    position: absolute;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    pointer-events: none;
    background: rgba(18, 18, 18, 0.55);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-left: none;
    border-top-right-radius: 40px;
    border-bottom-right-radius: 40px;
  }

  .metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 35px 10px;
    position: relative;
    min-width: 80px;
  }

  .metric::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }

  .metric:last-child::after {
    display: none;
  }

  .metric-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: center;
  }

  .metric-value {
    font-size: 24px;
    font-weight: bold;
    color: #8eb428;
  }

  .video-controls {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    backdrop-filter: blur(10px);
  }

  .btn-primary {
    background: #8eb428;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #7a9922;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(142, 180, 40, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-glass {
    background: rgba(18, 18, 18, 0.55);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .btn-glass:hover {
    background: rgba(18, 18, 18, 0.75);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .btn-glass-icon {
    padding: 12px;
    background: rgba(18, 18, 18, 0.55);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: white;
    width: 48px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .btn-glass-icon:hover {
    background: rgba(18, 18, 18, 0.75);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .btn-large {
    padding: 16px 32px;
    font-size: 18px;
  }

  .error-banner {
    max-width: 1280px;
    margin: 20px auto;
    padding: 16px;
    background: rgba(255, 68, 68, 0.1);
    border: 1px solid #ff4444;
    border-radius: 10px;
    color: #ff4444;
  }

  .debug-panel {
    max-width: 1280px;
    margin: 20px auto;
    padding: 20px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 10px;
  }

  .debug-panel pre {
    overflow-x: auto;
    font-size: 12px;
    color: #8eb428;
  }

  /* Mode Indicator (top-left overlay) */
  .mode-indicator {
    position: absolute;
    top: 20px;
    right: 10px;
    left: auto;
    max-width: calc(50% - 30px);
    background: rgba(18, 18, 18, 0.55);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px 20px;
    border-radius: 10px;
    pointer-events: none;
    z-index: 15;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mode-text {
    font-size: 16px;
    font-weight: 500;
    color: white;
  }

  /* Mode Selector Panel */
  .mode-selector-panel {
    max-width: 1280px;
    margin: 20px auto;
    padding: 25px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .mode-selector-panel h3 {
    color: #8eb428;
    margin-bottom: 20px;
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .mode-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin-bottom: 20px;
  }

  .mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: white;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: none;
    letter-spacing: normal;
  }

  .mode-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(142, 180, 40, 0.5);
    transform: translateY(-2px);
  }

  .mode-btn.active {
    background: rgba(142, 180, 40, 0.2);
    border-color: #8eb428;
    box-shadow: 0 0 20px rgba(142, 180, 40, 0.3);
  }

  .mode-desc {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 400;
  }

  .mode-info {
    background: rgba(0, 180, 255, 0.1);
    border-left: 4px solid #00b4ff;
    padding: 15px;
    border-radius: 10px;
  }

  .mode-info p {
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    line-height: 1.6;
  }

  .mode-info strong {
    color: #8eb428;
  }

  @media (max-width: 768px) {
    .metrics-overlay {
      top: 50%;
      left: 0;
      transform: translateY(-50%);
    }

    .metric {
      padding: 20px 10px;
      min-width: 70px;
    }

    .metric-label {
      font-size: 9px;
    }

    .metric-value {
      font-size: 18px;
    }

    .mode-indicator {
      top: 10px;
      left: 10px;
      max-width: 60%;
      padding: 10px 16px;
      font-size: 14px;
    }

    .feedback-message {
      font-size: 14px;
      padding: 10px 16px;
    }

    .mode-buttons {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .mode-selector-panel {
      padding: 15px;
    }
  }
</style>
