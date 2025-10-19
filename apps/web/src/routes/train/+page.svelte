<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { trainStore, trainActions } from '$lib/stores/train.store';
  import { integratedTrainStore, integratedTrainActions } from '$lib/stores/integrated-train.store';
  import { _ } from 'svelte-i18n';
  import { asset } from '$lib/utils/assets';
  import { authActions } from '$lib/stores/auth.store';
  import { goto } from '$app/navigation';

  // DOM References
  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let videoContainerElement: HTMLDivElement;

  // Reactive State
  let analyzer: any = $state(null);
  let pose: any = $state(null);
  let camera: any = $state(null);
  let isLoading = $state(false);
  let errorMessage = $state('');
  let debugMode = $state(false);
  let isScrolled = $state(false);
  let scriptsLoaded = $state(false);
  let loadingStage = $state('Inicializando...');
  let isCameraRunning = $state(false);
  let isFullscreen = $state(false);
  let showAvatarMenu = $state(false);

  // Feedback state
  let currentFeedback: any = $state(null);
  let skeletonColor = $state('#00ff88');
  let feedbackMessages: any[] = $state([]);

  // Metrics
  let validReps = $state(0);
  let accuracy = $state(0);
  let confidence = $state(0);

  // Feedback Mode
  let feedbackMode = $state<'hybrid' | 'ml_only' | 'heuristic_only'>('hybrid');
  let modeIndicator = $state('🔬 Híbrido (ML + Heurística)');

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

      // 1. MediaPipe Dependencies
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
      await loadScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
        'MediaPipe Pose'
      );
      await waitForGlobal('Pose');
      await waitForGlobal('POSE_CONNECTIONS');

      // 2. ONNX Runtime Web (substituindo TensorFlow.js)
      loadingStage = 'Carregando ONNX Runtime Web...';
      await loadScript(
        'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js',
        'ONNX Runtime Web'
      );
      await waitForGlobal('ort');

      // 3. Constantes e utilitários
      loadingStage = 'Carregando MediaPipe Landmarks...';
      await loadScript('/js/constants/mediapipe-landmarks.js', 'MediaPipe Landmarks');
      await waitForGlobal('MEDIAPIPE_LANDMARKS');

      // 4. Sistema de validação
      loadingStage = 'Carregando BaseValidator...';
      await loadScript('/exercises/BaseValidator.js', 'BaseValidator');
      await waitForGlobal('BaseValidator');

      // 5. Classificador ML genérico
      loadingStage = 'Carregando Generic Classifier...';
      await loadScript('/js/generic_classifier.js', 'GenericExerciseClassifier');
      await waitForGlobal('GenericExerciseClassifier');

      // 6. Sistema de Feedback
      loadingStage = 'Carregando Feedback System...';
      await loadScript('/js/core/FeedbackSystem.js', 'FeedbackSystem');
      await waitForGlobal('FeedbackSystem');

      // 7. Analisador de Exercícios
      loadingStage = 'Carregando Exercise Analyzer...';
      await loadScript('/js/analyzers/ExerciseAnalyzer.js', 'ExerciseAnalyzer');
      await waitForGlobal('ExerciseAnalyzer');

      // 8. Config loader
      loadingStage = 'Carregando Exercise Configs...';
      await loadScript('/js/config/exerciseConfigs.js', 'ExerciseConfigs');
      await waitForGlobal('loadExerciseConfig');

      // 9. Validadores específicos
      loadingStage = 'Carregando Squat Validator...';
      await loadScript('/exercises/squat/validator.js', 'SquatValidator');
      await waitForGlobal('SquatValidator');

      loadingStage = 'Carregando Lunge Validator...';
      await loadScript('/exercises/lunge/validator.js', 'LungeValidator');
      await waitForGlobal('LungeValidator');

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

      if (!scriptsLoaded) {
        throw new Error('Dependências ainda não foram carregadas completamente. Aguarde...');
      }

      console.log('🎥 Inicializando sistema de análise...');

      // 1. Criar sessão no backend
      await integratedTrainActions.selectExercise('squat');
      console.log('✅ Sessão criada no backend:', $integratedTrainStore.backendSessionId);

      // 2. Carregar configuração do exercício
      const loadExerciseConfig = (window as any).loadExerciseConfig;
      const exerciseConfig = await loadExerciseConfig('squat');

      if (!exerciseConfig) {
        throw new Error('Falha ao carregar configuração do exercício');
      }

      console.log('📋 Configuração carregada:', exerciseConfig);

      // 3. Criar ExerciseAnalyzer
      const ExerciseAnalyzer = (window as any).ExerciseAnalyzer;
      analyzer = new ExerciseAnalyzer(exerciseConfig);

      // 4. Configurar callbacks
      analyzer.setCallbacks({
        onFeedback: handleFeedback,
        onMetricsUpdate: handleMetricsUpdate,
        onError: handleError
      });

      // 5. Inicializar analyzer
      console.log('🔧 Inicializando analyzer...');
      const success = await analyzer.initialize();

      if (!success) {
        throw new Error('Falha ao inicializar analyzer');
      }

      console.log('✅ Analyzer inicializado com sucesso!');

      // 6. Inicializar MediaPipe Pose
      console.log('📹 Inicializando MediaPipe Pose...');
      const Pose = (window as any).Pose;
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
      console.log('📷 Iniciando câmera...');
      const Camera = (window as any).Camera;
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

      // 8. Iniciar treino
      trainActions.start();
      integratedTrainActions.start();

      isCameraRunning = true;
      isLoading = false;

      console.log('✅ Sistema iniciado com sucesso!');

    } catch (error: any) {
      errorMessage = `Erro ao iniciar: ${error.message}`;
      console.error('❌ Erro completo:', error);
      isLoading = false;
    }
  }

  /**
   * Callback do MediaPipe Pose
   */
  async function onPoseResults(results: any) {
    if (!canvasElement || !results.poseLandmarks) return;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    // Limpa canvas
    ctx.save();
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Desenha vídeo
    ctx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // Analisa com ExerciseAnalyzer
    if (analyzer && results.poseLandmarks) {
      await analyzer.analyzeFrame(results.poseLandmarks);
    }

    // Desenha esqueleto
    const drawConnectors = (window as any).drawConnectors;
    const drawLandmarks = (window as any).drawLandmarks;
    const POSE_CONNECTIONS = (window as any).POSE_CONNECTIONS;

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
  function handleFeedback(feedback: any) {
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
      const repResult = validationDetails.find((d: any) => d.type === 'valid_repetition');

      if (repResult && repResult.isValid) {
        integratedTrainActions.incrementReps();
      }
    }
  }

  /**
   * Handler de métricas
   */
  function handleMetricsUpdate(metrics: any) {
    validReps = metrics.validReps || 0;
    accuracy = parseFloat(metrics.accuracy) || 0;
    confidence = (metrics.avgConfidence * 100) || 0;
  }

  /**
   * Handler de erro
   */
  function handleError(error: any) {
    console.error('Erro no analyzer:', error);
    errorMessage = error.message || 'Erro desconhecido';
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

      console.log('✅ Treino finalizado e enviado ao backend!');

      // Parar câmera
      if (camera) {
        camera.stop();
      }
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
      }, 2000);

      isLoading = false;
    } catch (error: any) {
      errorMessage = `Erro ao finalizar treino: ${error.message}`;
      console.error('❌ Erro:', error);
      isLoading = false;
    }
  }

  /**
   * Alterna modo debug
   */
  function toggleDebug() {
    debugMode = !debugMode;
  }

  /**
   * Muda o modo de feedback (ML, Heurístico ou Híbrido)
   */
  function changeFeedbackMode(mode: 'hybrid' | 'ml_only' | 'heuristic_only') {
    feedbackMode = mode;

    // Atualizar indicador
    if (mode === 'ml_only') {
      modeIndicator = '🤖 ML Only (Autoencoder)';
    } else if (mode === 'heuristic_only') {
      modeIndicator = '📐 Heurística Only (Biomecânica)';
    } else {
      modeIndicator = '🔬 Híbrido (ML + Heurística)';
    }

    // Se analyzer já existe, atualizar modo
    if (analyzer && analyzer.feedbackSystem) {
      analyzer.feedbackSystem.setMode(mode);
      console.log(`✅ Modo alterado para: ${mode}`);
    }
  }

  /**
   * Alterna tela cheia
   */
  async function toggleFullscreen() {
    if (!videoContainerElement) return;

    try {
      const doc = document as any;
      const elem = videoContainerElement as any;

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
    } catch (error) {
      console.error('Erro ao alternar fullscreen:', error);
    }
  }

  /**
   * Logout
   */
  function handleLogout() {
    authActions.logout();
    goto('/login');
  }

  // Lifecycle
  onMount(async () => {
    console.log('🎬 Componente montado');
    await loadAllDependencies();

    // Detectar scroll
    const handleScroll = () => {
      isScrolled = window.scrollY > 10;
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  });

  onDestroy(() => {
    console.log('🛑 Limpando componente');
    if (camera) {
      camera.stop();
    }
    if (analyzer) {
      analyzer.destroy();
    }
  });
</script>

<svelte:head>
  <title>Treinar - Elarin</title>
</svelte:head>

<main class="train-page">
  <!-- Header -->
  <header class="header" class:scrolled={isScrolled}>
    <div class="container">
      <div class="header-content">
        <div class="logo">
          <img src={asset('/elarin-logo.svg')} alt="Elarin" />
        </div>

        <div class="header-actions">
          <button class="avatar-btn" on:click={() => showAvatarMenu = !showAvatarMenu}>
            <div class="avatar-circle">
              {$integratedTrainStore.user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </button>

          {#if showAvatarMenu}
            <div class="avatar-menu">
              <button on:click={handleLogout}>Sair</button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <div class="content">
    <!-- Video Container -->
    <div
      class="video-container"
      class:fullscreen={isFullscreen}
      bind:this={videoContainerElement}
    >
      <video
        bind:this={videoElement}
        class="video-input"
        playsinline
        style="display: none;"
      ></video>

      <canvas
        bind:this={canvasElement}
        class="video-canvas"
        width="1280"
        height="720"
      ></canvas>

      <!-- Indicador de Modo -->
      {#if isCameraRunning}
        <div class="mode-indicator">
          <span class="mode-text">{modeIndicator}</span>
        </div>
      {/if}

      <!-- Overlay de feedback -->
      {#if isCameraRunning && feedbackMessages.length > 0}
        <div class="feedback-overlay">
          {#each feedbackMessages.slice(0, 3) as message}
            <div class="feedback-message {message.type}" class:critical={message.severity === 'critical'}>
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
            <span class="metric-label">Precisão</span>
            <span class="metric-value">{accuracy.toFixed(0)}%</span>
          </div>
          <div class="metric">
            <span class="metric-label">Confiança</span>
            <span class="metric-value">{confidence.toFixed(0)}%</span>
          </div>
        </div>
      {/if}

      <!-- Controles -->
      <div class="video-controls">
        {#if !isCameraRunning}
          <button
            class="btn btn-primary btn-large"
            on:click={startCamera}
            disabled={isLoading || !scriptsLoaded}
          >
            {#if isLoading}
              Iniciando...
            {:else if !scriptsLoaded}
              {loadingStage}
            {:else}
              Iniciar Treino
            {/if}
          </button>
        {:else}
          <button class="btn btn-secondary" on:click={stopCamera}>
            Pausar
          </button>
          <button class="btn btn-primary" on:click={finishTraining}>
            Finalizar
          </button>
          <button class="btn btn-icon" on:click={toggleFullscreen}>
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        {/if}
      </div>
    </div>

    <!-- Error Message -->
    {#if errorMessage}
      <div class="error-banner">
        <p>{errorMessage}</p>
      </div>
    {/if}

    <!-- Mode Selector -->
    {#if isCameraRunning}
      <div class="mode-selector-panel">
        <h3>Modo de Análise</h3>
        <div class="mode-buttons">
          <button
            class="mode-btn"
            class:active={feedbackMode === 'hybrid'}
            on:click={() => changeFeedbackMode('hybrid')}
          >
            🔬 Híbrido
            <span class="mode-desc">ML + Heurística</span>
          </button>

          <button
            class="mode-btn"
            class:active={feedbackMode === 'ml_only'}
            on:click={() => changeFeedbackMode('ml_only')}
          >
            🤖 ML Only
            <span class="mode-desc">Autoencoder</span>
          </button>

          <button
            class="mode-btn"
            class:active={feedbackMode === 'heuristic_only'}
            on:click={() => changeFeedbackMode('heuristic_only')}
          >
            📐 Heurística Only
            <span class="mode-desc">Biomecânica</span>
          </button>
        </div>

        <div class="mode-info">
          {#if feedbackMode === 'hybrid'}
            <p><strong>Híbrido:</strong> Combina ML (detecção de anomalias) + Heurísticas (regras biomecânicas). Mais preciso e com feedback específico.</p>
          {:else if feedbackMode === 'ml_only'}
            <p><strong>ML Only:</strong> Apenas o modelo de Machine Learning (autoencoder). Detecta padrões anômalos mas feedback é genérico.</p>
          {:else}
            <p><strong>Heurística Only:</strong> Apenas regras biomecânicas. Feedback muito específico mas pode perder anomalias desconhecidas.</p>
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
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: white;
  }

  .header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(26, 26, 46, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }

  .header.scrolled {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 2rem;
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
  }

  .logo img {
    height: 40px;
  }

  .avatar-btn {
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
  }

  .avatar-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
  }

  .avatar-menu {
    position: absolute;
    top: 50px;
    right: 0;
    background: #2d2d44;
    border-radius: 8px;
    padding: 0.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .avatar-menu button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0.5rem 1rem;
    width: 100%;
    text-align: left;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .avatar-menu button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .content {
    padding: 2rem;
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

  .feedback-overlay {
    position: absolute;
    top: 20px;
    left: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
  }

  .feedback-message {
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    border-left: 4px solid transparent;
    animation: slideIn 0.3s ease;
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
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .metrics-overlay {
    position: absolute;
    bottom: 80px;
    right: 20px;
    display: flex;
    gap: 15px;
    pointer-events: none;
  }

  .metric {
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    padding: 12px 20px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .metric-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .metric-value {
    font-size: 24px;
    font-weight: bold;
    color: #00ff88;
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
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    backdrop-filter: blur(10px);
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .btn-large {
    padding: 16px 32px;
    font-size: 18px;
  }

  .btn-icon {
    padding: 12px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    width: 48px;
  }

  .error-banner {
    max-width: 1280px;
    margin: 20px auto;
    padding: 16px;
    background: rgba(255, 68, 68, 0.1);
    border: 1px solid #ff4444;
    border-radius: 8px;
    color: #ff4444;
  }

  .debug-panel {
    max-width: 1280px;
    margin: 20px auto;
    padding: 20px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 8px;
  }

  .debug-panel pre {
    overflow-x: auto;
    font-size: 12px;
    color: #00ff88;
  }

  /* Mode Indicator (top-right overlay) */
  .mode-indicator {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    padding: 12px 20px;
    border-radius: 25px;
    border: 2px solid rgba(102, 126, 234, 0.5);
    pointer-events: none;
    z-index: 10;
  }

  .mode-text {
    font-size: 14px;
    font-weight: 600;
    color: #00ff88;
  }

  /* Mode Selector Panel */
  .mode-selector-panel {
    max-width: 1280px;
    margin: 20px auto;
    padding: 25px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .mode-selector-panel h3 {
    color: #00ff88;
    margin-bottom: 20px;
    font-size: 1.3rem;
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
    border-radius: 12px;
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
    border-color: rgba(102, 126, 234, 0.5);
    transform: translateY(-2px);
  }

  .mode-btn.active {
    background: rgba(102, 126, 234, 0.2);
    border-color: #667eea;
    box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
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
    border-radius: 8px;
  }

  .mode-info p {
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    line-height: 1.6;
  }

  .mode-info strong {
    color: #00ff88;
  }

  @media (max-width: 768px) {
    .metrics-overlay {
      bottom: 100px;
      right: 10px;
      left: 10px;
      justify-content: space-between;
    }

    .metric {
      flex: 1;
      padding: 8px 12px;
    }

    .metric-value {
      font-size: 18px;
    }

    .feedback-overlay {
      top: 10px;
      left: 10px;
      right: 10px;
    }

    .feedback-message {
      font-size: 14px;
      padding: 10px 16px;
    }

    .mode-buttons {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .mode-indicator {
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      font-size: 12px;
    }

    .mode-selector-panel {
      padding: 15px;
    }
  }
</style>
