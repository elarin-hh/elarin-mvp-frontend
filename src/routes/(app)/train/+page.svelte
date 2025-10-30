<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { trainActions } from '$lib/stores/train.store';
  import { integratedTrainStore, integratedTrainActions } from '$lib/stores/integrated-train.store';
  import { authActions } from '$lib/stores/auth.store';
  import { goto } from '$app/navigation';
  import AppHeader from '$lib/components/common/AppHeader.svelte';
  import { isDeveloper } from '$lib/config/env.config';
  import { Bot, Ruler, Microscope, Settings, MessageSquare, MessageSquareOff } from 'lucide-svelte';
  import { ExerciseAnalyzer, loadExerciseConfig, type FeedbackRecord } from '$lib/vision';
  import Loading from '$lib/components/common/Loading.svelte';
  import BiometricConsent from '$lib/components/BiometricConsent.svelte';
  import { audioFeedbackStore } from '$lib/stores/audio-feedback.store';

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

  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let videoContainerElement: HTMLDivElement;
  let analyzer: ExerciseAnalyzer | null = $state(null);
  let pose: MediaPipePose | null = $state(null);
  let camera: MediaPipeCamera | null = $state(null);
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
  let orientation = $state<'portrait' | 'landscape'>('landscape');
  let currentFeedback: FeedbackRecord | null = $state(null);
  let skeletonColor = $state('var(--color-success)');
  let feedbackMessages: Array<{ type: string; text: string; severity: string; priority: number }> = $state([]);
  let isFeedbackEnabled = $state(true);
  let accuracy = $state(0);
  let confidence = $state(0);
  let elapsedTime = $state(0);
  let timerInterval: number | null = null;
  let feedbackMode = $state<'hybrid' | 'ml_only' | 'heuristic_only'>('hybrid');
  let modeIndicator = $state('Híbrido (ML + Heurística)');
  let showBiometricConsent = $state(false);
  let hasBiometricConsent = $state(false);

  let drawConnectors: ((ctx: CanvasRenderingContext2D, landmarks: unknown, connections: unknown, options: { color: string; lineWidth: number }) => void) | null = null;
  let drawLandmarks: ((ctx: CanvasRenderingContext2D, landmarks: unknown, options: { color: string; lineWidth: number; radius: number }) => void) | null = null;
  let POSE_CONNECTIONS: unknown = null;

  let lastFrameTime = 0;
  const FRAME_THROTTLE_MS = 60;
  let animationFrameId: number | null = null;

  // Controle de feedback de voz
  let lastAudioFeedbackTime = 0;
  let lastSpokenRepCount = 0;
  const AUDIO_FEEDBACK_COOLDOWN_MS = 4000; // 4 segundos entre feedbacks de erro

  function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: number | null = null;
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = window.setTimeout(() => func(...args), wait);
    };
  }

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
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Falha ao carregar ${name}: ${src}`));
      document.head.appendChild(script);
    });
  }

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

  async function loadAllDependencies() {
    try {
      loadingStage = 'Carregando MediaPipe Camera Utils...';
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js', 'MediaPipe Camera Utils');
      await waitForGlobal('Camera');

      loadingStage = 'Carregando MediaPipe Drawing Utils...';
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js', 'MediaPipe Drawing Utils');
      await waitForGlobal('drawConnectors');
      await waitForGlobal('drawLandmarks');

      loadingStage = 'Carregando MediaPipe Pose...';
      await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js', 'MediaPipe Pose');
      await waitForGlobal('Pose');
      await waitForGlobal('POSE_CONNECTIONS');

      loadingStage = 'Preparando tudo...';
      scriptsLoaded = true;
    } catch (error: unknown) {
      loadingStage = 'Erro ao carregar';
      errorMessage = `Falha ao carregar dependências: ${(error as Error).message}. Por favor, recarregue a página.`;
      scriptsLoaded = false;
    }
  }

  async function startCamera() {
    try {
      isLoading = true;
      errorMessage = '';

      // LGPD Art. 11: Check biometric consent before accessing camera
      const consent = localStorage.getItem('elarin_biometric_consent');
      if (!consent || consent !== 'true') {
        showBiometricConsent = true;
        isLoading = false;
        return;
      }

      hasBiometricConsent = true;

      if (!scriptsLoaded) {
        throw new Error('Dependências ainda não foram carregadas completamente. Aguarde...');
      }

      const selectedExercise = $integratedTrainStore.exerciseType;
      if (!selectedExercise) {
        throw new Error('Nenhum exercício selecionado. Por favor, volte e selecione um exercício.');
      }

      if (!$integratedTrainStore.backendSessionId) {
        await integratedTrainActions.selectExercise(selectedExercise);
      }

      const exerciseConfig = await loadExerciseConfig(selectedExercise);
      if (!exerciseConfig) {
        throw new Error('Falha ao carregar configuração do exercício');
      }

      analyzer = new ExerciseAnalyzer(exerciseConfig);
      analyzer.setCallbacks({
        onFeedback: handleFeedback,
        onMetricsUpdate: handleMetricsUpdate,
        onError: handleError
      });

      const success = await analyzer.initialize();
      if (!success) {
        throw new Error('Falha ao inicializar analyzer');
      }

      const Pose = (window as Record<string, unknown>).Pose as new (config: {
        locateFile: (file: string) => string;
      }) => MediaPipePose;
      pose = new Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
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

      drawConnectors = (window as Record<string, unknown>).drawConnectors as typeof drawConnectors;
      drawLandmarks = (window as Record<string, unknown>).drawLandmarks as typeof drawLandmarks;
      POSE_CONNECTIONS = (window as Record<string, unknown>).POSE_CONNECTIONS;

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
      trainActions.start();
      integratedTrainActions.start();
      startTimer();
      isCameraRunning = true;
      isLoading = false;

      // Reseta contadores de feedback de voz
      lastSpokenRepCount = 0;
      lastAudioFeedbackTime = 0;

      // Pré-carrega áudios de contagem (1-20) para Eleven Labs - executa em background
      audioFeedbackStore.preloadCountAudios().catch(err => {
        console.warn('[Train] Falha ao pré-carregar áudios de contagem:', err);
      });
    } catch (error: unknown) {
      errorMessage = `Erro ao iniciar: ${(error as Error).message}`;
      isLoading = false;
    }
  }

  async function onPoseResults(results: PoseResults) {
    if (!canvasElement || !results.poseLandmarks) return;

    const now = Date.now();
    if (now - lastFrameTime < FRAME_THROTTLE_MS) {
      return;
    }
    lastFrameTime = now;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    // Usar requestAnimationFrame para sincronizar com refresh rate
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = requestAnimationFrame(() => {
      ctx.save();
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      ctx.translate(canvasElement.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

      if (results.poseLandmarks && drawConnectors && drawLandmarks && POSE_CONNECTIONS) {
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
    });

    if (analyzer && results.poseLandmarks) {
      queueMicrotask(() => {
        analyzer?.analyzeFrame(results.poseLandmarks);
      });
    }
  }

  function handleFeedback(feedback: FeedbackRecord) {
    currentFeedback = feedback;

    if (feedback.visualization) {
      skeletonColor = feedback.visualization.color;
    }

    // Memoização: só atualiza se as mensagens mudaram
    const newMessages = feedback.messages || [];
    const hasNewMessages = JSON.stringify(newMessages) !== JSON.stringify(feedbackMessages);

    if (hasNewMessages) {
      feedbackMessages = newMessages;

      // 🔊 Feedback de voz para mensagens críticas/erros (com cooldown)
      if (isFeedbackEnabled) {
        const now = Date.now();
        const criticalMessages = newMessages.filter(
          m => (m.severity === 'critical' || m.severity === 'high' || m.type === 'error') &&
               m.text !== 'Movimento incorreto' && // Ignora feedback genérico
               !m.text.toLowerCase().includes('movimento incorreto') // Ignora variações
        );

        if (criticalMessages.length > 0 && (now - lastAudioFeedbackTime) > AUDIO_FEEDBACK_COOLDOWN_MS) {
          lastAudioFeedbackTime = now;

          // Converte para instrução natural e envia para Eleven Labs via audioFeedbackStore
          const technicalMessage = criticalMessages[0].text;
          const naturalInstruction = convertToNaturalInstruction(technicalMessage);

          console.log('[Feedback] Mensagem técnica:', technicalMessage);
          console.log('[Feedback] Instrução natural:', naturalInstruction);

          // Usa audioFeedbackStore para processar via LLM + Eleven Labs TTS
          audioFeedbackStore.playFeedback(
            naturalInstruction, // Envia a instrução natural direta
            {
              exercicio: $integratedTrainStore.exerciseType || 'squat',
              nivel: 'intermediário',
              language: 'pt-BR'
            }
          ).catch(err => {
            console.warn('[Train] Erro ao reproduzir feedback via Eleven Labs, usando fallback:', err);
            // Fallback para Web Speech API se Eleven Labs falhar
            speakInstruction(naturalInstruction);
          });
        }
      }
    }

    // Detecta repetições válidas
    if (feedback.heuristic?.details) {
      const repResult = feedback.heuristic.details.find(
        (d: unknown) => (d as { type?: string }).type === 'valid_repetition'
      );

      if (repResult && (repResult as { isValid?: boolean }).isValid) {
        integratedTrainActions.incrementReps();

        // 🔊 Fala o número da repetição usando Eleven Labs
        const newRepCount = $integratedTrainStore.reps;
        if (newRepCount > lastSpokenRepCount && isFeedbackEnabled) {
          lastSpokenRepCount = newRepCount;

          // Usa Eleven Labs com cache (mais profissional e rápido após primeira geração)
          audioFeedbackStore.speakNumber(newRepCount);
        }
      }
    }
  }


  // Função para falar instruções corretivas
  function speakInstruction(instruction: string) {
    if (!('speechSynthesis' in window)) return;

    // Cancela qualquer fala em andamento (exceto contagem de reps)
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(instruction);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0; // Velocidade normal para instruções
    utterance.pitch = 1.0; // Tom normal
    utterance.volume = 1.0;

    utterance.onstart = () => {
      console.log('[Speech] Falando instrução:', instruction);
    };

    utterance.onerror = (event) => {
      console.error('[Speech] Erro ao falar:', event);
    };

    window.speechSynthesis.speak(utterance);
  }

  // Converte mensagens técnicas em instruções naturais e diretas
  function convertToNaturalInstruction(technicalMessage: string): string {
    const message = technicalMessage.toLowerCase();

    // Mapeamento de mensagens técnicas para instruções naturais e corretivas
    const instructionMap: Record<string, string> = {
      // ===== VALIDAÇÕES DIRETAS DO SQUAT VALIDATOR =====

      // Tronco inclinado lateralmente
      'tronco inclinado para o lado': 'Seu tronco está inclinado para o lado. Desloque o peso para o centro e nivele os ombros',
      'mantenha ombros nivelados': 'Seus ombros estão desnivelados. Distribua o peso igualmente nos dois lados',

      // Assimetria bilateral
      'assimetria detectada': 'Movimento assimétrico. Um lado está descendo mais que o outro. Distribua o peso nos dois pés',
      'um lado está mais baixo': 'Um lado está mais baixo. Mantenha o movimento simétrico nos dois lados',

      // Distância dos pés (stance)
      'pés muito próximos': 'Seus pés estão muito juntos. Afaste-os na largura dos ombros',
      'abra mais as pernas': 'Abra mais as pernas. Aumente a distância entre os pés',
      'pés muito afastados': 'Seus pés estão muito afastados. Aproxime um pouco as pernas',
      'aproxime as pernas': 'Reduza a abertura das pernas. Seus pés estão longe demais',

      // Profundidade do movimento
      'profundidade insuficiente': 'Você não está descendo o suficiente. Desça mais, até a coxa ficar paralela ao chão',
      'desça mais': 'Desça mais. Você precisa atingir maior profundidade',
      'muito raso': 'Movimento muito raso. Desça mais para completar o agachamento',

      // Posição dos joelhos
      'joelhos ultrapassando': 'Seus joelhos estão ultrapassando demais os pés. Jogue o quadril mais para trás',
      'joelho muito à frente': 'Joelhos muito à frente. Empurre o quadril para trás ao descer',
      'joelhos': 'Atenção à posição dos joelhos. Mantenha-os alinhados com os pés',

      // Inclinação das costas
      'costas muito inclinadas': 'Suas costas estão muito inclinadas para frente. Mantenha o tronco mais ereto',
      'tronco para frente': 'Você está inclinando demais o tronco. Olhe para frente e endireite as costas',
      'mantenha as costas': 'Endireite as costas. Mantenha o peito para cima',

      // Calcanhares levantando
      'calcanhares levantando': 'Seus calcanhares estão saindo do chão. Mantenha todo o pé apoiado',
      'calcanhar': 'Calcanhar levantando. Pressione todo o pé contra o chão',
      'pés no chão': 'Mantenha os pés completamente apoiados no chão',

      // Alinhamento dos joelhos
      'joelhos desalinhados': 'Seus joelhos estão desalinhados. Mantenha-os na direção dos pés',
      'joelhos para dentro': 'Joelhos indo para dentro. Empurre-os para fora, alinhados com os pés',
      'joelhos para fora': 'Joelhos abrindo demais. Mantenha-os alinhados com os pés',

      // Velocidade do movimento
      'muito rápido': 'Você está indo muito rápido. Controle melhor o movimento',
      'movimento brusco': 'Movimento brusco. Desça e suba de forma mais controlada',

      // Postura geral
      'postura': 'Corrija sua postura. Mantenha o corpo alinhado',
      'equilíbrio': 'Você está perdendo o equilíbrio. Distribua melhor o peso'
    };

    // Procura por palavras-chave e retorna instrução correspondente
    for (const [keyword, instruction] of Object.entries(instructionMap)) {
      if (message.includes(keyword)) {
        return instruction;
      }
    }

    // Se não encontrar mapeamento específico, remove emojis e retorna mensagem limpa
    return technicalMessage.replace(/[🔴🟠🟡🟢]/g, '').trim();
  }

  function handleMetricsUpdate(metrics: {
    validReps?: number;
    accuracy?: string;
    avgConfidence?: number;
  }) {
    accuracy = parseFloat(metrics.accuracy || '0') || 0;
    confidence = (metrics.avgConfidence ? metrics.avgConfidence * 100 : 0) || 0;
  }

  function handleError(error: Error) {
    errorMessage = error.message || 'Erro desconhecido';
  }

  function startTimer() {
    elapsedTime = 0;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = window.setInterval(() => {
      elapsedTime += 1;
    }, 1000);
  }

  function pauseTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async function stopCamera() {
    if (camera) camera.stop();
    if (analyzer) analyzer.reset();
    trainActions.pause();
    integratedTrainActions.pause();
    pauseTimer();
    isCameraRunning = false;
    hasStartedCamera = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    // Para feedback de voz e reseta contadores
    audioFeedbackStore.stopAudio();
    window.speechSynthesis?.cancel();
    lastSpokenRepCount = 0;
    lastAudioFeedbackTime = 0;
  }

  async function finishTraining() {
    if (!analyzer) return;

    try {
      isLoading = true;
      await integratedTrainActions.finish();

      if (camera) camera.stop();
      pauseTimer();
      isCameraRunning = false;
      hasStartedCamera = false;

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      // Para feedback de voz e reseta contadores
      audioFeedbackStore.stopAudio();
      window.speechSynthesis?.cancel();

      setTimeout(() => {
        analyzer = null;
        pose = null;
        camera = null;
        integratedTrainActions.reset();
        trainActions.reset();
        feedbackMessages = [];
        currentFeedback = null;
        elapsedTime = 0;
        lastSpokenRepCount = 0;
        lastAudioFeedbackTime = 0;
      }, 2000);

      isLoading = false;
    } catch (error: unknown) {
      errorMessage = `Erro ao finalizar treino: ${(error as Error).message}`;
      isLoading = false;
    }
  }

  function changeFeedbackMode(mode: 'hybrid' | 'ml_only' | 'heuristic_only') {
    feedbackMode = mode;

    if (mode === 'ml_only') {
      modeIndicator = 'ML Only (Autoencoder)';
    } else if (mode === 'heuristic_only') {
      modeIndicator = 'Heurística Only (Biomecânica)';
    } else {
      modeIndicator = 'Híbrido (ML + Heurística)';
    }

    if (analyzer?.feedbackSystem) {
      analyzer.feedbackSystem.setMode(mode);
    }
  }

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
    } catch {}
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

  function handleBiometricConsentAccepted() {
    hasBiometricConsent = true;
    showBiometricConsent = false;
    // Restart camera after consent
    startCamera();
  }

  function handleBiometricConsentDenied() {
    showBiometricConsent = false;
    errorMessage = 'Consentimento biométrico negado. A câmera não pode ser iniciada sem sua autorização.';
    // Redirect back to exercises
    setTimeout(() => {
      goto('/exercises');
    }, 3000);
  }

  function detectOrientation() {
    orientation = window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
  }

  const debouncedDetectOrientation = debounce(detectOrientation, 150);

  function toggleFeedback() {
    isFeedbackEnabled = !isFeedbackEnabled;
  }

  let hasStartedCamera = $state(false);

  $effect(() => {
    if (scriptsLoaded && $integratedTrainStore.exerciseType && !isCameraRunning && !isLoading && !analyzer && !hasStartedCamera) {
      hasStartedCamera = true;
      setTimeout(() => startCamera(), 500);
    }
  });

  onMount(async () => {
    isDevMode = isDeveloper();
    await loadAllDependencies();
    detectOrientation();

    window.addEventListener('orientationchange', debouncedDetectOrientation);
    window.addEventListener('resize', debouncedDetectOrientation);

    const handleScroll = debounce((e: Event) => {
      const target = e.target as HTMLElement;
      isScrolled = target.scrollTop > 50;
    }, 100);

    const handleWindowScroll = debounce(() => {
      isScrolled = window.scrollY > 50;
    }, 100);

    const viewport = document.querySelector('.sa-viewport');
    if (viewport) {
      viewport.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      window.addEventListener('scroll', handleWindowScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('orientationchange', debouncedDetectOrientation);
      window.removeEventListener('resize', debouncedDetectOrientation);
      if (viewport) {
        viewport.removeEventListener('scroll', handleScroll);
      }
    };
  });

  onDestroy(() => {
    if (camera) camera.stop();
    if (analyzer) analyzer.destroy();
    if (timerInterval) clearInterval(timerInterval);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  });
</script>

<svelte:head>
  <title>Treinar - Elarin</title>
</svelte:head>

<main class="train-page">
  <AppHeader
    bind:isScrolled
    bind:showAvatarMenu
    hasDropdownMenu={true}
    onToggleAvatarMenu={toggleAvatarMenu}
    onSettings={handleSettings}
    onLogout={handleLogout}
    onClickOutside={handleClickOutside}
  />

  <div class="content">
    <div
      class="video-container"
      class:fullscreen={isFullscreen}
      class:portrait={orientation === 'portrait'}
      class:landscape={orientation === 'landscape'}
      bind:this={videoContainerElement}
    >
      <video bind:this={videoElement} class="video-input" playsinline style="display: none;">
        <track kind="captions" src="" label="No captions" />
      </video>

      <canvas bind:this={canvasElement} class="video-canvas" width="1280" height="720"></canvas>

      <div class="overlays-container">
        {#if isCameraRunning && isDevMode && isFeedbackEnabled}
          <div class="mode-indicator">
            {#if feedbackMode === 'hybrid'}
              <Microscope />
            {:else if feedbackMode === 'ml_only'}
              <Bot />
            {:else}
              <Ruler />
            {/if}
            <span class="mode-text">{modeIndicator}</span>
          </div>
        {/if}

        {#if isCameraRunning && feedbackMessages.length > 0 && isFeedbackEnabled}
          <div class="feedback-overlay">
            {#each feedbackMessages.slice(0, 3) as message}
              <div class="feedback-message {message.type}" class:critical={message.severity === 'critical'}>
                <span>{message.text}</span>
              </div>
            {/each}
          </div>
        {/if}

      </div>

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

      {#if isCameraRunning}
        <div class="video-controls">
          <button class="btn btn-glass" onclick={stopCamera}>Pausar</button>
          <button class="btn btn-primary" onclick={finishTraining}>Finalizar</button>
          <button
            class="btn btn-glass-icon"
            onclick={toggleFeedback}
            title={isFeedbackEnabled ? 'Desativar feedback' : 'Ativar feedback'}
          >
            {#if isFeedbackEnabled}
              <MessageSquare class="icon-responsive" />
            {:else}
              <MessageSquareOff class="icon-responsive" />
            {/if}
          </button>
          <button class="btn btn-glass-icon" onclick={toggleFullscreen}>
            <span class="fullscreen-icon">{isFullscreen ? '⛶' : '⛶'}</span>
          </button>
        </div>
      {/if}
    </div>

    {#if errorMessage}
      <div class="error-banner">
        <p>{errorMessage}</p>
      </div>
    {/if}

    {#if isCameraRunning && isDevMode}
      <div class="mode-selector-panel">
        <h3>
          <Settings class="mode-panel-icon" />
          Modo de Análise (Dev Only)
        </h3>
        <div class="mode-buttons">
          <button class="mode-btn" class:active={feedbackMode === 'hybrid'} onclick={() => changeFeedbackMode('hybrid')}>
            <Microscope class="mode-btn-icon" />
            Híbrido
            <span class="mode-desc">ML + Heurística</span>
          </button>

          <button class="mode-btn" class:active={feedbackMode === 'ml_only'} onclick={() => changeFeedbackMode('ml_only')}>
            <Bot class="mode-btn-icon" />
            ML Only
            <span class="mode-desc">Autoencoder</span>
          </button>

          <button class="mode-btn" class:active={feedbackMode === 'heuristic_only'} onclick={() => changeFeedbackMode('heuristic_only')}>
            <Ruler class="mode-btn-icon" />
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

    {#if debugMode}
      <div class="debug-panel">
        <h3>Debug Info</h3>
        <pre>{JSON.stringify(currentFeedback, null, 2)}</pre>
      </div>
    {/if}
  </div>

  {#if !isCameraRunning && (isLoading || !scriptsLoaded)}
    <Loading message={loadingStage} />
  {/if}

  <!-- Biometric Consent Modal (LGPD Art. 11) -->
  <BiometricConsent
    bind:visible={showBiometricConsent}
    on:accepted={handleBiometricConsentAccepted}
    on:denied={handleBiometricConsentDenied}
  />
</main>

<style>
  .train-page {
    min-height: 100vh;
    background: var(--color-bg-dark);
    color: var(--color-text-primary);
  }

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
    margin: 0 auto;
    border-radius: 12px;
    overflow: hidden;
    background: black;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    transition: all 0.3s ease-in-out;
  }

  .video-canvas {
    display: block;
    transition: all 0.3s ease-in-out;
  }

  .video-container.landscape {
    width: 100%;
    height: auto;
    max-width: 1280px;
  }

  .video-container.landscape .video-canvas {
    width: 100%;
    height: auto;
    object-fit: contain;
  }

  .video-container.portrait {
    width: auto;
    height: calc(100vh - 8rem);
    max-width: 500px;
    aspect-ratio: 9 / 16;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .video-container.portrait .video-canvas {
    width: auto;
    height: 100%;
    min-width: 100%;
    object-fit: cover;
    object-position: center center;
  }

  .video-container.fullscreen {
    position: fixed !important;
    inset: 0 !important;
    border-radius: 0 !important;
    margin: 0 !important;
    z-index: 9999 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: black !important;
  }

  .video-container.fullscreen.landscape {
    width: 100vw !important;
    height: auto !important;
    max-width: none !important;
    max-height: 100vh !important;
  }

  .video-container.fullscreen.landscape .video-canvas {
    width: 100% !important;
    height: auto !important;
    max-height: 100vh !important;
    object-fit: contain !important;
  }

  .video-container.fullscreen.portrait {
    width: auto !important;
    height: 100vh !important;
    max-width: 100vw !important;
    aspect-ratio: 9 / 16 !important;
    overflow: hidden !important;
  }

  .video-container.fullscreen.portrait .video-canvas {
    width: auto !important;
    height: 100% !important;
    min-width: 100% !important;
    object-fit: cover !important;
    object-position: center center !important;
  }

  @media (max-width: 768px) {
    .video-container.portrait {
      aspect-ratio: 9 / 16;
      max-height: 70vh;
    }

    .video-container.landscape {
      aspect-ratio: 16 / 9;
      max-height: 50vh;
    }

    .video-container.portrait .metrics-overlay {
      max-width: 85px;
    }

    .video-container.portrait .metric {
      padding: clamp(10px, 1.8vh, 18px) clamp(5px, 1.2vw, 8px);
      min-width: clamp(55px, 7vw, 75px);
    }

    .video-container.portrait .metric-label {
      font-size: clamp(7px, 1vw, 9px);
    }

    .video-container.portrait .metric-value {
      font-size: clamp(14px, 2.2vw, 18px);
    }
  }

  .overlays-container {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: clamp(8px, 1.5vh, 12px);
    padding: clamp(10px, 2vh, 20px) clamp(8px, 1.5vw, 10px);
    pointer-events: none;
    z-index: 50;
  }

  .feedback-overlay {
    display: flex;
    flex-direction: column;
    gap: clamp(6px, 1.2vh, 10px);
    max-width: clamp(200px, 50vw, 600px);
    width: 100%;
  }

  .feedback-message {
    background: var(--color-glass-dark);
    backdrop-filter: blur(var(--blur-md));
    -webkit-backdrop-filter: blur(var(--blur-md));
    border: 1px solid var(--color-border-light);
    padding: clamp(8px, 1.5vh, 12px) clamp(12px, 2.5vw, 20px);
    border-radius: var(--radius-md);
    font-size: clamp(12px, 2vw, 16px);
    font-weight: 500;
    border-left: clamp(3px, 0.5vw, 4px) solid transparent;
    animation: slideIn var(--transition-slow) ease;
    color: var(--color-text-primary);
  }

  .feedback-message.success {
    border-left-color: var(--color-success);
    color: var(--color-success);
  }

  .feedback-message.error {
    border-left-color: var(--color-error);
    color: var(--color-error);
  }

  .feedback-message.warning {
    border-left-color: var(--color-warning);
    color: var(--color-warning);
  }

  .feedback-message.critical {
    border-left-color: var(--color-error-dark);
    color: var(--color-error-dark);
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
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    pointer-events: none;
    background: var(--color-glass-dark);
    backdrop-filter: blur(var(--blur-md));
    -webkit-backdrop-filter: blur(var(--blur-md));
    border: 1px solid var(--color-border-light);
    border-left: none;
    border-top-right-radius: clamp(15px, 4vw, 40px);
    border-bottom-right-radius: clamp(15px, 4vw, 40px);
    max-width: clamp(70px, 12vw, 140px);
    max-height: 90vh;
    overflow: hidden;
    z-index: 10;
  }

  .metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(2px, 0.5vh, 4px);
    padding: clamp(12px, 2.5vh, 30px) clamp(6px, 1.5vw, 15px);
    position: relative;
    min-width: clamp(65px, 9vw, 110px);
  }

  .metric::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    height: 1px;
    background: var(--color-border-light);
  }

  .metric:last-child::after {
    display: none;
  }

  .metric-label {
    font-size: clamp(8px, 1.2vw, 12px);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: clamp(0.3px, 0.5px, 0.8px);
    text-align: center;
    white-space: nowrap;
  }

  .metric-value {
    font-size: clamp(16px, 2.5vw, 26px);
    font-weight: bold;
    color: var(--color-primary-500);
    line-height: 1.2;
  }

  .video-controls {
    position: absolute;
    bottom: clamp(12px, 2.5vh, 20px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: clamp(6px, 1.5vw, 10px);
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
    padding: 0 clamp(8px, 2vw, 16px);
    z-index: 20;
  }

  .btn {
    padding: 0 clamp(16px, 3vw, 24px);
    height: clamp(38px, 6vh, 48px);
    border: none;
    border-radius: var(--radius-md);
    font-size: clamp(13px, 2vw, 16px);
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition-base);
    backdrop-filter: blur(var(--blur-md));
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-primary {
    background: var(--color-primary-500);
    color: var(--color-text-primary);
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-600);
    transform: translateY(-2px);
    box-shadow: var(--glow-success);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-glass {
    background: var(--color-glass-dark);
    backdrop-filter: blur(var(--blur-md));
    -webkit-backdrop-filter: blur(var(--blur-md));
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-light);
  }

  .btn-glass:hover {
    background: var(--color-glass-dark-strong);
    border-color: var(--color-border-light-hover);
  }

  .btn-glass-icon {
    padding: 0;
    background: var(--color-glass-dark);
    backdrop-filter: blur(var(--blur-md));
    -webkit-backdrop-filter: blur(var(--blur-md));
    color: var(--color-text-primary);
    width: clamp(38px, 6vh, 48px);
    height: clamp(38px, 6vh, 48px);
    min-width: clamp(38px, 6vh, 48px);
    border: 1px solid var(--color-border-light);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .btn-glass-icon:hover {
    background: var(--color-glass-dark-strong);
    border-color: var(--color-border-light-hover);
  }

  .btn-glass-icon:active {
    transform: scale(0.95);
  }

  :global(.icon-responsive) {
    width: clamp(18px, 2.8vw, 22px) !important;
    height: clamp(18px, 2.8vw, 22px) !important;
    flex-shrink: 0;
  }

  .fullscreen-icon {
    font-size: clamp(18px, 2.8vw, 22px);
    line-height: 1;
  }

  .error-banner {
    max-width: 1280px;
    margin: 20px auto;
    padding: 16px;
    background: rgba(255, 68, 68, 0.1);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    color: var(--color-error);
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
    color: var(--color-primary-500);
  }

  .mode-indicator {
    background: var(--color-glass-dark);
    backdrop-filter: blur(var(--blur-md));
    -webkit-backdrop-filter: blur(var(--blur-md));
    border: 1px solid var(--color-border-light);
    padding: clamp(8px, 1.5vh, 12px) clamp(12px, 2.5vw, 20px);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    gap: clamp(4px, 1vw, 8px);
    font-size: clamp(12px, 2vw, 16px);
    font-weight: 500;
    color: var(--color-text-primary);
    max-width: clamp(180px, 50vw, 500px);
    width: fit-content;
  }

  .mode-indicator :global(svg) {
    width: clamp(14px, 2.2vw, 18px) !important;
    height: clamp(14px, 2.2vw, 18px) !important;
    flex-shrink: 0;
  }

  .mode-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mode-selector-panel {
    max-width: 1280px;
    margin: clamp(12px, 2.5vh, 20px) auto;
    padding: clamp(15px, 3vw, 25px);
    background: var(--color-bg-dark-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-light);
  }

  .mode-selector-panel h3 {
    color: var(--color-primary-500);
    margin-bottom: clamp(12px, 2.5vh, 20px);
    font-size: clamp(1.1rem, 2.5vw, 1.3rem);
    display: flex;
    align-items: center;
    gap: clamp(6px, 1.5vw, 10px);
  }

  :global(.mode-panel-icon) {
    width: clamp(16px, 2.5vw, 20px) !important;
    height: clamp(16px, 2.5vw, 20px) !important;
    flex-shrink: 0;
  }

  .mode-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: clamp(10px, 2vw, 15px);
    margin-bottom: clamp(12px, 2.5vh, 20px);
  }

  .mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(4px, 1vh, 8px);
    padding: clamp(12px, 2.5vw, 20px);
    background: var(--color-glass-light);
    border: 2px solid var(--color-border-light);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: clamp(14px, 2vw, 16px);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  :global(.mode-btn-icon) {
    width: clamp(18px, 2.8vw, 20px) !important;
    height: clamp(18px, 2.8vw, 20px) !important;
    flex-shrink: 0;
  }

  .mode-btn:hover {
    background: var(--color-border-light);
    border-color: var(--color-primary-600);
    transform: translateY(-2px);
  }

  .mode-btn.active {
    background: rgba(142, 180, 40, 0.2);
    border-color: var(--color-primary-500);
    box-shadow: 0 0 20px rgba(142, 180, 40, 0.3);
  }

  .mode-desc {
    font-size: clamp(10px, 1.5vw, 12px);
    color: var(--color-text-secondary);
    font-weight: 400;
  }

  .mode-info {
    background: rgba(0, 180, 255, 0.1);
    border-left: clamp(3px, 0.5vw, 4px) solid var(--color-info);
    padding: clamp(10px, 2vw, 15px);
    border-radius: var(--radius-md);
  }

  .mode-info p {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: clamp(12px, 1.8vw, 14px);
    line-height: 1.6;
  }

  .mode-info strong {
    color: var(--color-primary-500);
  }

  @media (max-width: 768px) {
    .overlays-container {
      padding: clamp(8px, 1.5vh, 15px) clamp(6px, 1.2vw, 8px);
      gap: clamp(6px, 1.2vh, 10px);
    }

    .metrics-overlay {
      max-width: clamp(65px, 10vw, 100px);
    }

    .metric {
      padding: clamp(10px, 2vh, 18px) clamp(5px, 1.2vw, 8px);
      min-width: clamp(55px, 7vw, 75px);
    }

    .metric-label {
      font-size: clamp(7px, 1vw, 10px);
    }

    .metric-value {
      font-size: clamp(14px, 2.2vw, 20px);
    }

    .mode-indicator {
      max-width: clamp(160px, 60vw, 400px);
      padding: clamp(6px, 1.2vh, 10px) clamp(10px, 2vw, 16px);
      font-size: clamp(11px, 1.8vw, 14px);
    }

    .mode-indicator :global(svg) {
      width: clamp(12px, 1.8vw, 16px) !important;
      height: clamp(12px, 1.8vw, 16px) !important;
    }

    .feedback-overlay {
      max-width: clamp(180px, 60vw, 400px);
    }

    .mode-buttons {
      grid-template-columns: 1fr;
      gap: clamp(8px, 2vw, 10px);
    }

    .mode-selector-panel {
      padding: clamp(12px, 3vw, 15px);
    }

    .mode-selector-panel h3 {
      font-size: clamp(1.1rem, 3vw, 1.3rem);
    }
  }

  @media (max-width: 640px) {
    .video-controls {
      gap: clamp(4px, 1vw, 8px);
      padding: 0 clamp(4px, 1vw, 8px);
    }

    .btn {
      padding: 0 clamp(12px, 2.5vw, 20px);
      height: clamp(34px, 5vh, 42px);
      font-size: clamp(11px, 1.8vw, 14px);
    }

    .btn-glass-icon {
      width: clamp(34px, 5vh, 42px);
      height: clamp(34px, 5vh, 42px);
      min-width: clamp(34px, 5vh, 42px);
    }

    :global(.icon-responsive) {
      width: clamp(16px, 2.5vw, 20px) !important;
      height: clamp(16px, 2.5vw, 20px) !important;
    }

    .fullscreen-icon {
      font-size: clamp(16px, 2.5vw, 20px);
    }
  }

  @media (max-width: 480px) {
    .overlays-container {
      padding: clamp(6px, 1vh, 12px) clamp(4px, 1vw, 6px);
    }

    .mode-indicator {
      max-width: clamp(140px, 70vw, 350px);
    }

    .feedback-overlay {
      max-width: clamp(150px, 65vw, 350px);
    }
  }
</style>
