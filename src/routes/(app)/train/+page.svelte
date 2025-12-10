<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { trainingStore, trainingActions } from '$lib/stores/training.store';
  import { authActions } from '$lib/services/auth.facade';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import AppHeader from '$lib/components/common/AppHeader.svelte';
  import { isDeveloper } from '$lib/config/env.config';
  import { Bot, Ruler, Microscope, Settings, MessageSquare, MessageSquareOff, Plus, Minus, Volume2, VolumeX } from 'lucide-svelte';
  import { ExerciseAnalyzer, loadExerciseConfig, type FeedbackRecord, type FeedbackMessage } from '$lib/vision';
  import { LANDMARK_GROUPS, MEDIAPIPE_LANDMARKS } from '$lib/vision/constants/mediapipe.constants';
  import Loading from '$lib/components/common/Loading.svelte';
  import BiometricConsent from '$lib/components/BiometricConsent.svelte';
  import { getPoseAssetUrl, loadPoseModules, MEDIAPIPE_VERSIONS } from '$lib/services/mediapipe-loader';
  import { audioFeedbackActions, audioFeedbackStore } from '$lib/stores/audio-feedback.store';

  const BIOMETRIC_CONSENT_KEY = 'elarin_biometric_consent';
  const BIOMETRIC_CONSENT_TS_KEY = 'elarin_biometric_consent_ts';
  const BIOMETRIC_CONSENT_EXP_KEY = 'elarin_biometric_consent_exp';

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
  let splitContainerElement: HTMLDivElement;
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
  let currentLandmarks = $state<Array<{ x: number; y: number; z: number; visibility?: number }>>([]);
  let isFullscreen = $state(false);
  let showAvatarMenu = $state(false);
  let isDevMode = $state(false);
  let orientation = $state<'portrait' | 'landscape'>('landscape');
  let currentFeedback: FeedbackRecord | null = $state(null);
  let isPaused = $state(false);
  let reconstructionError = $state<number | null>(null);
  const SKELETON_COLORS = {
    correct: 'var(--color-skeleton-correct)',
    incorrect: 'var(--color-skeleton-incorrect)',
    neutral: 'var(--color-skeleton-neutral)'
  };

  const resolveCssColor = (value: string): string => {
    if (!value.startsWith('var(') || typeof document === 'undefined') return value;
    const varName = value.slice(4, -1);
    const resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return resolved || value;
  };

  let skeletonColor = $state(resolveCssColor(SKELETON_COLORS.correct));
  let feedbackMessages: FeedbackMessage[] = $state([]);
  let isFeedbackEnabled = $state(false);
  const OVERLAY_MIN_SCALE = 0.8;
  const OVERLAY_MAX_SCALE = 1.4;
  let overlayScale = $state(1);
  let accuracy = $state(0);
  let confidence = $state(0);
  let elapsedTime = $state(0);
  let timerInterval: number | null = null;
  let feedbackMode = $state<'hybrid' | 'ml_only' | 'heuristic_only'>('hybrid');
  let modeIndicator = $state('Híbrido (ML + Heurística)');
  let showBiometricConsent = $state(false);
  let hasBiometricConsent = $state(false);
  let hasSyncedCanvas = $state(false);
  let fps = $state(0);
  let showTimer = $state(true);
  let showScore = $state(true);
  let showReps = $state(true);
  let activeTab = $state<'display' | 'skeleton' | 'sound' | 'advanced' | 'dev'>('display');
  let layoutMode = $state<'side-by-side' | 'user-centered' | 'coach-centered'>('side-by-side');
  
  // PiP dragging state
  let pipPosition = $state({ x: 1064, y: 16 }); // Default top-right position (1280 - 200 - 16 = 1064)
  let isDraggingPip = $state(false);
  let dragOffset = { x: 0, y: 0 };
  
  // PiP resizing state
  let pipSize = $state({ width: 200, height: 112.5 }); // Default 200px width, 16:9 ratio
  let isResizingPip = $state(false);
  let resizeStartPos = { x: 0, y: 0 };
  let resizeStartSize = { width: 0, height: 0 };

  const SKELETON_STYLE = {
    lineWidth: 5,
    pointRadius: 7,
    opacity: 0.9,
    glow: 0
  };

  const TORSO_LINE = {
    enabled: true,
    lineWidth: 5,
    color: ''
  };
  let drawConnectors: ((ctx: CanvasRenderingContext2D, landmarks: unknown, connections: unknown, options: { color: string; lineWidth: number }) => void) | null = null;
  let drawLandmarks: ((ctx: CanvasRenderingContext2D, landmarks: unknown, options: { color: string; lineWidth: number; radius: number }) => void) | null = null;
  let POSE_CONNECTIONS: unknown = null;
  let POSE_CONNECTIONS_NO_FACE: unknown = null;

  let lastFrameTime = 0;
  const FRAME_THROTTLE_MS = 0; // no throttle, process every frame
  let animationFrameId: number | null = null;


  function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: number | null = null;
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = window.setTimeout(() => func(...args), wait);
    };
  }

  async function loadAllDependencies() {
    try {
      loadingStage = "Carregando dependencias...";
      const modules = await loadPoseModules();
      drawConnectors = modules.drawConnectors;
      drawLandmarks = modules.drawLandmarks;
      POSE_CONNECTIONS = modules.POSE_CONNECTIONS;
      POSE_CONNECTIONS_NO_FACE = removeTorsoSideLines(filterFaceConnections(POSE_CONNECTIONS));
      pose = new modules.Pose({
        locateFile: (file: string) => {
          return getPoseAssetUrl(file);
        }
      });
      loadingStage = "Dependencias carregadas";
      scriptsLoaded = true;
    } catch (error) {
      loadingStage = "Erro ao carregar";
      errorMessage = `Falha ao carregar dependencias: ${error}. Recarregue a pagina ou verifique a conexao.`;
      scriptsLoaded = false;
    }
  }

  function syncCanvasSize(force = false) {
    if (!videoElement || !canvasElement) return;

    // Decouple canvas buffer size from display size.
    // Use video native resolution to obtain correct aspect ratio.
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    
    if (!width || !height) return;

    const needsResize = force || canvasElement.width !== width || canvasElement.height !== height;
    if (needsResize) {
      canvasElement.width = width;
      canvasElement.height = height;
      hasSyncedCanvas = true;
    }
  }

  function clearBiometricConsentFlags() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(BIOMETRIC_CONSENT_KEY);
    localStorage.removeItem(BIOMETRIC_CONSENT_TS_KEY);
    localStorage.removeItem(BIOMETRIC_CONSENT_EXP_KEY);
  }

  function hasValidBiometricConsent(): boolean {
    if (typeof window === 'undefined') return false;
    const consent = localStorage.getItem(BIOMETRIC_CONSENT_KEY);
    if (consent !== 'true') return false;

    const expiresAt = localStorage.getItem(BIOMETRIC_CONSENT_EXP_KEY);
    if (!expiresAt) return false;

    const expDate = new Date(expiresAt);
    if (Number.isNaN(expDate.getTime())) return false;

    return expDate.getTime() > Date.now();
  }

  function ensureBiometricConsent(): boolean {
    const valid = hasValidBiometricConsent();
    if (!valid) {
      clearBiometricConsentFlags();
      showBiometricConsent = true;
      isLoading = false;
      return false;
    }

    hasBiometricConsent = true;
    return true;
  }

  async function startCamera() {
    try {
      isLoading = true;
      errorMessage = '';
      hasSyncedCanvas = false;
      isPaused = false;

      // LGPD Art. 11: Check biometric consent before accessing camera
      if (!ensureBiometricConsent()) {
        return;
      }

      if (!scriptsLoaded) {
        throw new Error('Dependências ainda não foram carregadas completamente. Aguarde...');
      }

      const selectedExercise = $trainingStore.exerciseType;
      if (!selectedExercise) {
        throw new Error('Nenhum exercício selecionado. Por favor, volte e selecione um exercício.');
      }

      if (!$trainingStore.backendSessionId) {
        trainingActions.selectExercise(selectedExercise);
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

      const Pose = (window as unknown as Record<string, unknown>).Pose as new (config: {
        locateFile: (file: string) => string;
      }) => MediaPipePose;
      pose = new Pose({
            locateFile: getPoseAssetUrl
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

      const globalScope = window as unknown as Record<string, unknown>;
      drawConnectors = globalScope.drawConnectors as typeof drawConnectors;
      drawLandmarks = globalScope.drawLandmarks as typeof drawLandmarks;
      POSE_CONNECTIONS = globalScope.POSE_CONNECTIONS;
      POSE_CONNECTIONS_NO_FACE = removeTorsoSideLines(filterFaceConnections(POSE_CONNECTIONS));

      const Camera = globalScope.Camera as new (
        video: HTMLVideoElement,
        config: { onFrame: () => Promise<void>; width: number; height: number }
      ) => MediaPipeCamera;
      camera = new Camera(videoElement, {
        onFrame: async () => {
          if (pose && videoElement) {
            await pose.send({ image: videoElement });
          }
        },
        width: 640,
        height: 360
      });

      await camera.start();
      trainingActions.start();
      syncCanvasSize();
      startTimer();
      isCameraRunning = true;
      isLoading = false;
    } catch (error: unknown) {
      errorMessage = `Erro ao iniciar: ${(error as Error).message}`;
      isLoading = false;
      console.error('vision_error:start_camera', error);
    }
  }

  async function onPoseResults(results: PoseResults) {
    if (!canvasElement || !results.poseLandmarks) return;
    const landmarks = results.poseLandmarks;

    const now = Date.now();
    const delta = lastFrameTime ? now - lastFrameTime : 0;
    if (FRAME_THROTTLE_MS > 0 && delta > 0 && delta < FRAME_THROTTLE_MS) {
      return;
    }
    lastFrameTime = now;
    if (delta > 0) {
      fps = Math.round(1000 / delta);
    }

    if (!hasSyncedCanvas) {
      syncCanvasSize(true);
    }

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

        const renderLandmarks = hideFaceLandmarks(landmarks);

        if (renderLandmarks && drawConnectors && drawLandmarks && POSE_CONNECTIONS_NO_FACE) {
          ctx.save();
          ctx.globalAlpha = SKELETON_STYLE.opacity;
          ctx.shadowBlur = SKELETON_STYLE.glow;
          ctx.shadowColor = skeletonColor;

          drawConnectors(ctx, renderLandmarks, POSE_CONNECTIONS_NO_FACE, {
            color: skeletonColor,
            lineWidth: SKELETON_STYLE.lineWidth
          });

          // Outer circle (glow)
          ctx.save();
          ctx.globalAlpha = 0.3;
          drawLandmarks(ctx, renderLandmarks, {
            color: skeletonColor,
            lineWidth: 0,
            radius: SKELETON_STYLE.pointRadius * 2.2
          });
          ctx.restore();

          drawLandmarks(ctx, renderLandmarks, {
            color: skeletonColor,
            lineWidth: Math.max(1, SKELETON_STYLE.lineWidth / 2),
            radius: SKELETON_STYLE.pointRadius
          });

          if (TORSO_LINE.enabled) {
            drawTorsoLine(ctx, renderLandmarks);
          }


          ctx.restore();
        }

      ctx.restore();
    });

    if (analyzer && landmarks && !isPaused) {
      queueMicrotask(() => {
        analyzer?.analyzeFrame(landmarks);
      });
    }

    // Update real-time landmarks for Dev tab
    if (activeTab === 'dev' && landmarks) {
      currentLandmarks = landmarks;
    }
  }

  function hideFaceLandmarks(landmarks: PoseResults['poseLandmarks']) {
    if (!landmarks) return landmarks;
    const clone = landmarks.map((lm) => ({ ...lm }));
    for (const idx of LANDMARK_GROUPS.FACE) {
      clone[idx] = { x: 0, y: 0, z: 0, visibility: 0 };
    }
    return clone;
  }

  function filterFaceConnections(connections: unknown) {
    if (!connections || !Array.isArray(connections)) return connections;
    const face = new Set(LANDMARK_GROUPS.FACE);
    return (connections as Array<[number, number]>).filter(
      ([a, b]) => !face.has(a as number) && !face.has(b as number)
    );
  }

  function removeTorsoSideLines(connections: unknown) {
    if (!connections || !Array.isArray(connections)) return connections;
    const blocked = new Set(['11-23', '12-24']);
    return (connections as Array<[number, number]>).filter(([a, b]) => {
      const key = `${a}-${b}`;
      const keyAlt = `${b}-${a}`;
      return !blocked.has(key) && !blocked.has(keyAlt);
    });
  }

  function drawTorsoLine(ctx: CanvasRenderingContext2D, landmarks: PoseResults['poseLandmarks']) {
    if (!landmarks) return;

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return;

    const visibility =
      (leftShoulder.visibility ?? 1) +
      (rightShoulder.visibility ?? 1) +
      (leftHip.visibility ?? 1) +
      (rightHip.visibility ?? 1);

    if (visibility < 1.5) return;

    const shoulderMid = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    const hipMid = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };

    ctx.save();
    ctx.strokeStyle = skeletonColor;
    ctx.lineWidth = TORSO_LINE.lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulderMid.x * ctx.canvas.width, shoulderMid.y * ctx.canvas.height);
    ctx.lineTo(hipMid.x * ctx.canvas.width, hipMid.y * ctx.canvas.height);
    ctx.stroke();
    ctx.restore();
  }



  function handleFeedback(feedback: FeedbackRecord) {
    currentFeedback = feedback;

    if (feedback.combined.verdict === 'correct') {
      skeletonColor = resolveCssColor(SKELETON_COLORS.correct);
    } else if (feedback.combined.verdict === 'incorrect') {
      skeletonColor = resolveCssColor(SKELETON_COLORS.incorrect);
    } else {
      skeletonColor = resolveCssColor(SKELETON_COLORS.neutral);
    }

    // Memoização: só atualiza se as mensagens mudaram
    const newMessages = feedback.messages || [];
    const hasNewMessages = JSON.stringify(newMessages) !== JSON.stringify(feedbackMessages);

    if (hasNewMessages) {
      feedbackMessages = newMessages;
      if (isFeedbackEnabled) {
        audioFeedbackActions.playFeedback(newMessages, {
          mode: feedbackMode,
          exercise: $trainingStore.exerciseType
        });
      }
    }

    // Detecta repetições válidas
    if (feedback.heuristic?.details) {
      const repResult = feedback.heuristic.details.find(
        (d: unknown) => (d as { type?: string }).type === 'valid_repetition'
      );

      if (repResult && (repResult as { isValid?: boolean }).isValid) {
        trainingActions.incrementReps();
      }
    }

    if (feedback.ml?.error !== undefined) {
      reconstructionError = feedback.ml.error;
    }
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
    console.error('vision_error:processing', error);
  }

  function startTimer(reset = true) {
    if (reset) {
      elapsedTime = 0;
    }
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

  async function finishTraining() {
    if (!analyzer) return;

    try {
      isLoading = true;
      await trainingActions.finish();

      if (camera) camera.stop();
      pauseTimer();
      isCameraRunning = false;
      hasStartedCamera = false;

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

    setTimeout(() => {
      analyzer = null;
      pose = null;
      camera = null;
      trainingActions.reset();
      feedbackMessages = [];
      currentFeedback = null;
      reconstructionError = null;
      elapsedTime = 0;
    }, 2000);

      isLoading = false;
    } catch (error: unknown) {
      errorMessage = `Erro ao finalizar treino: ${(error as Error).message}`;
      isLoading = false;
    }
  }

  function pauseTraining() {
    trainingActions.pause();
    pauseTimer();
    isPaused = true;
  }

  async function resumeTraining() {
    try {
      isPaused = false;
      trainingActions.resume();
      startTimer(false);
      isCameraRunning = true;
    } catch (error) {
      errorMessage = `Erro ao retomar: ${(error as Error).message}`;
      isPaused = true;
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

    analyzer?.setFeedbackMode(mode);
  }

  async function toggleFullscreen() {
    if (!splitContainerElement) return;

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
      const elem = splitContainerElement as HTMLDivElement & {
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

  async function exitFullscreenExplicit() {
    const doc = document as Document & {
      exitFullscreen?: () => Promise<void>;
      webkitExitFullscreen?: () => Promise<void>;
      mozCancelFullScreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
      fullscreenElement?: Element;
      webkitFullscreenElement?: Element;
      mozFullScreenElement?: Element;
      msFullscreenElement?: Element;
    };

    try {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    } finally {
      isFullscreen = false;
    }
  }

  function toggleAvatarMenu() {
    showAvatarMenu = !showAvatarMenu;
  }

  function handleSettings() {
    showAvatarMenu = false;
    goto(`${base}/settings`);
  }

  async function handleLogout() {
    showAvatarMenu = false;
    await authActions.logout();
    goto(`${base}/login`);
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
    clearBiometricConsentFlags();
    showBiometricConsent = false;
    errorMessage = 'Consentimento biométrico negado. A câmera não pode ser iniciada sem sua autorização.';
    // Redirect back to exercises
    setTimeout(() => {
      goto(`${base}/exercises`);
    }, 3000);
  }

  function detectOrientation() {
    orientation = window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';
    syncCanvasSize(true);
  }

  const debouncedDetectOrientation = debounce(detectOrientation, 150);

  function toggleFeedback() {
    isFeedbackEnabled = !isFeedbackEnabled;
    if (!isFeedbackEnabled) {
      audioFeedbackActions.stop();
    }
  }

  function toggleAudio() {
    audioFeedbackActions.toggleEnabled();
  }

  let hasStartedCamera = $state(false);

  $effect(() => {
    if (scriptsLoaded && $trainingStore.exerciseType && !isCameraRunning && !isLoading && !analyzer && !hasStartedCamera) {
      hasStartedCamera = true;
      setTimeout(() => startCamera(), 500);
    }
  });

  onMount(() => {
    (async () => {
      isDevMode = isDeveloper();
      await loadAllDependencies();
      detectOrientation();
    })();

    window.addEventListener('orientationchange', debouncedDetectOrientation);
    window.addEventListener('resize', debouncedDetectOrientation);
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        exitFullscreenExplicit();
      }
    };
    const handleFullscreenChange = () => {
      const doc = document as Document & {
        fullscreenElement?: Element;
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
      };
      const isCurrentlyFullscreen =
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement;
      isFullscreen = Boolean(isCurrentlyFullscreen);
    };
    window.addEventListener('keydown', handleKeydown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

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
      window.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (viewport) {
        viewport.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleWindowScroll);
      }
    };
  });

  // PiP drag handlers
  function handlePipMouseDown(e: MouseEvent) {
    if (layoutMode === 'side-by-side') return;
    
    isDraggingPip = true;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    e.preventDefault();
  }

  function handlePipMouseMove(e: MouseEvent) {
    if (!isDraggingPip || !splitContainerElement) return;

    const containerRect = splitContainerElement.getBoundingClientRect();
    const pipWidth = pipSize.width;
    const pipHeight = pipSize.height;

    let newX = e.clientX - containerRect.left - dragOffset.x;
    let newY = e.clientY - containerRect.top - dragOffset.y;

    // Constrain within container bounds
    newX = Math.max(0, Math.min(newX, containerRect.width - pipWidth));
    newY = Math.max(0, Math.min(newY, containerRect.height - pipHeight));

    pipPosition = { x: newX, y: newY };
  }

  function handlePipMouseUp() {
    isDraggingPip = false;
    isResizingPip = false;
  }

  // PiP resize handlers
  function handleResizeMouseDown(e: MouseEvent) {
    isResizingPip = true;
    resizeStartPos = { x: e.clientX, y: e.clientY };
    resizeStartSize = { ...pipSize };
    e.stopPropagation(); // Prevent drag from triggering
    e.preventDefault();
  }

  function handleResizeMouseMove(e: MouseEvent) {
    if (!isResizingPip || !splitContainerElement) return;

    const deltaX = e.clientX - resizeStartPos.x;
    const deltaY = e.clientY - resizeStartPos.y;
    
    // Use the larger delta to maintain aspect ratio
    const delta = Math.max(deltaX, deltaY);
    
    let newWidth = resizeStartSize.width + delta;
    
    // Constrain size (min 150px, max 700px)
    newWidth = Math.max(150, Math.min(700, newWidth));
    
    const newHeight = newWidth * (9/16); // Maintain 16:9 aspect ratio
    
    pipSize = { width: newWidth, height: newHeight };
    
    // Adjust position if resizing would push PiP out of bounds
    const containerRect = splitContainerElement.getBoundingClientRect();
    if (pipPosition.x + newWidth > containerRect.width) {
      pipPosition = { ...pipPosition, x: containerRect.width - newWidth };
    }
    if (pipPosition.y + newHeight > containerRect.height) {
      pipPosition = { ...pipPosition, y: containerRect.height - newHeight };
    }
  }

  onDestroy(() => {
    if (camera) camera.stop();
    if (analyzer) analyzer.destroy();
    if (timerInterval) clearInterval(timerInterval);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  });
</script>

{#snippet fullscreenButton()}
  <button class="fullscreen-btn-floating" onclick={toggleFullscreen} aria-label="Tela cheia">
    {#if isFullscreen}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
      </svg>
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>
    {/if}
  </button>
{/snippet}

{#snippet repCounter(cssClass: string)}
  <div class={cssClass}>
    <div class="rep-info">
      <span class="rep-label">Reps.</span>
      <span class="rep-count">{$trainingStore.reps} /30</span>
    </div>
    <div class="rep-progress">
      {#each Array(30) as _, i}
        <div 
          class="rep-line" 
          class:completed={i < $trainingStore.reps}
          class:current={i === $trainingStore.reps}
        ></div>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet verticalRepSlide(cssClass = '')}
  {@const progress = 92}
  <div class="vertical-rep-slide {cssClass}">
    <div class="v-slide-track">
      <div class="v-slide-inner">
        <div class="v-slide-fill" style:height="{progress}%"></div>
      </div>
      
      <!-- Handle pops out of the track -->
      <div class="v-slide-handle" style:bottom="{progress}%"></div>

      <!-- Bubble moves with the top of the fill -->
      <div class="v-slide-bubble" style:top="{100 - progress}%">
        92
      </div>
    </div>
  </div>
{/snippet}

<svelte:head>
  <title>Elarin</title>
</svelte:head>

<main class="train-page" onmousemove={(e) => { handlePipMouseMove(e); handleResizeMouseMove(e); }} onmouseup={handlePipMouseUp}>
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
      class="split-container"
      bind:this={splitContainerElement}
      class:fullscreen={isFullscreen}
      class:layout-side-by-side={layoutMode === 'side-by-side'}
      class:layout-user-centered={layoutMode === 'user-centered'}
      class:layout-coach-centered={layoutMode === 'coach-centered'}
    >
      <div
        class="video-container"
        class:portrait={orientation === 'portrait'}
        class:landscape={orientation === 'landscape'}
        bind:this={videoContainerElement}
        style={layoutMode === 'coach-centered' ? `left: ${pipPosition.x}px; top: ${pipPosition.y}px; width: ${pipSize.width}px; height: ${pipSize.height}px;` : ''}
        onmousedown={layoutMode === 'coach-centered' ? handlePipMouseDown : undefined}
        class:draggable-pip={layoutMode === 'coach-centered'}
      >
      <video bind:this={videoElement} class="video-input" playsinline style="display: none;">
        <track kind="captions" src="" label="No captions" />
      </video>

      <canvas bind:this={canvasElement} class="video-canvas" width="1280" height="720"></canvas>
      
      {#if layoutMode === 'coach-centered'}
        <div class="pip-resize-handle" onmousedown={handleResizeMouseDown}></div>
      {/if}

      <div class="overlays-container">
        {#if isCameraRunning && isFeedbackEnabled && (isDevMode || feedbackMessages.length > 0 || reconstructionError !== null)}
          <div class="feedback-card">
            {#if isDevMode}
              <div class="mode-indicator in-card card">
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

            {#if reconstructionError !== null}
              <div class="feedback-overlay">
                <div class="feedback-message info card">
                  <span>Erro de reconstrução: {reconstructionError.toFixed(4)}</span>
                </div>
              </div>
            {/if}

            {#if feedbackMessages.length > 0}
              <div class="feedback-overlay">
                {#each feedbackMessages
                  .filter((m) => !(m.text || '').toLowerCase().startsWith('erro de reconstrução'))
                  .slice(0, 3) as message}
                  <div class="feedback-message card {message.type}" class:critical={message.severity === 'critical'}>
                    <span>{message.text}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      {#if isCameraRunning || isPaused}
        {#if layoutMode === 'user-centered'}
          {@render repCounter('rep-counter-bar-overlay')}
          {@render verticalRepSlide('left-aligned')}
        {/if}

        {#if layoutMode !== 'coach-centered'}
          {@render fullscreenButton()}
        {/if}
      {/if}
    </div>

    <div class="reference-container"
      style={layoutMode === 'user-centered' ? `left: ${pipPosition.x}px; top: ${pipPosition.y}px; width: ${pipSize.width}px; height: ${pipSize.height}px;` : ''}
      onmousedown={layoutMode === 'user-centered' ? handlePipMouseDown : undefined}
      class:draggable-pip={layoutMode === 'user-centered'}
    >
      <video
        class="reference-video"
        src="{base}/videos/squat.mp4"
        playsinline
        loop
        autoplay
        muted
      >
        <track kind="captions" src="" label="No captions" />
      </video>
      
      {#if layoutMode === 'user-centered'}
        <div class="pip-resize-handle" onmousedown={handleResizeMouseDown}></div>
      {/if}

      {#if (isCameraRunning || isPaused) && layoutMode === 'coach-centered'}
        {@render repCounter('rep-counter-bar-overlay')}
        {@render verticalRepSlide('left-aligned')}
        {@render fullscreenButton()}
      {/if}
    </div>

    {#if (isCameraRunning || isPaused) && layoutMode === 'side-by-side'}
      {@render repCounter('rep-counter-bar-overlay')}
      {@render verticalRepSlide()}
    {/if}
  </div>



    {#if isCameraRunning || isPaused}
      <div class="settings-panel">
        <div class="settings-tabs">
          <button class="tab-btn" class:active={activeTab === 'display'} onclick={() => activeTab = 'display'}>Exibição</button>
          <button class="tab-btn" class:active={activeTab === 'skeleton'} onclick={() => activeTab = 'skeleton'}>Esqueleto</button>
          <button class="tab-btn" class:active={activeTab === 'sound'} onclick={() => activeTab = 'sound'}>Som e Efeitos</button>

          {#if isDevMode}
            <button class="tab-btn" class:active={activeTab === 'dev'} onclick={() => activeTab = 'dev'}>Dev</button>
          {/if}
        </div>

        <div class="settings-content">
          {#if activeTab === 'display'}
            <div class="settings-group">
              <h4>Escolher Layout de Exibição</h4>
              <div class="layout-options">
                  <div class="layout-option" class:active={layoutMode === 'side-by-side'} onclick={() => layoutMode = 'side-by-side'}>
                      <div class="layout-preview side-by-side"></div>
                      <span>Lado a Lado</span>
                  </div>
                  <div class="layout-option" class:active={layoutMode === 'user-centered'} onclick={() => layoutMode = 'user-centered'}>
                      <div class="layout-preview user-centered"></div>
                      <span>Usuário Centralizado</span>
                  </div>
                  <div class="layout-option" class:active={layoutMode === 'coach-centered'} onclick={() => layoutMode = 'coach-centered'}>
                      <div class="layout-preview coach-centered"></div>
                      <span>Treinador Centralizado</span>
                  </div>
              </div>
            </div>
            <div class="settings-group">
              <h4>Mais opções</h4>
              <div class="toggle-row">
                <span>Cronômetro</span>
                <div class="toggle-wrapper">
                  <button class="toggle-btn" class:on={showTimer} onclick={() => showTimer = !showTimer}></button>
                  <span class="toggle-label">{showTimer ? 'On' : 'Off'}</span>
                </div>
              </div>
              <div class="toggle-row">
                <span>Contador</span>
                <div class="toggle-wrapper">
                  <button class="toggle-btn" class:on={showReps} onclick={() => showReps = !showReps}></button>
                  <span class="toggle-label">{showReps ? 'On' : 'Off'}</span>
                </div>
              </div>
              <div class="toggle-row">
                <span>Feedback Visual</span>
                <div class="toggle-wrapper">
                  <button class="toggle-btn" class:on={isFeedbackEnabled} onclick={toggleFeedback}></button>
                  <span class="toggle-label">{isFeedbackEnabled ? 'On' : 'Off'}</span>
                </div>
              </div>
            </div>

          {:else if activeTab === 'sound'}
             <div class="settings-group">
              <h4>Configurações de Som</h4>
              <div class="toggle-row">
                <span>Feedback de Áudio</span>
                <div class="toggle-wrapper">
                  <button class="toggle-btn" class:on={$audioFeedbackStore.isEnabled} onclick={toggleAudio}></button>
                  <span class="toggle-label">{$audioFeedbackStore.isEnabled ? 'On' : 'Off'}</span>
                </div>
              </div>
            </div>

          {:else if activeTab === 'skeleton'}
             <div class="settings-group">
                 <h4>Sobreposição de Esqueleto</h4>
                 <div class="toggle-row">
                     <span>Mostrar Esqueleto</span>
                     <div class="toggle-wrapper">
                       <button class="toggle-btn" class:on={true} disabled></button>
                       <span class="toggle-label">On</span>
                     </div>
                 </div>
             </div>


          {:else if activeTab === 'dev'}
            <div class="settings-group" style="grid-column: 1 / -1;">
              <h4>Métricas de Desenvolvimento</h4>
              <div class="dev-metrics">
                <div class="dev-metric-card">
                  <span class="dev-metric-label">Precisão</span>
                  <span class="dev-metric-value">{accuracy.toFixed(1)}%</span>
                </div>
                <div class="dev-metric-card">
                  <span class="dev-metric-label">Confiança</span>
                  <span class="dev-metric-value">{confidence.toFixed(1)}%</span>
                </div>
                <div class="dev-metric-card">
                  <span class="dev-metric-label">FPS</span>
                  <span class="dev-metric-value">{fps}</span>
                </div>
              </div>

              <!-- Feedback Controls (Moved here) -->
              <h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem;">Controle de Feedback</h4>
              <div class="mode-buttons-mini">
                <button class="mini-btn" class:active={feedbackMode === 'hybrid'} onclick={() => changeFeedbackMode('hybrid')}>Híbrido</button>
                <button class="mini-btn" class:active={feedbackMode === 'ml_only'} onclick={() => changeFeedbackMode('ml_only')}>ML Apenas</button>
                <button class="mini-btn" class:active={feedbackMode === 'heuristic_only'} onclick={() => changeFeedbackMode('heuristic_only')}>Heurística</button>
              </div>
               <div class="debug-info-mini">
                 {modeIndicator}
               </div>
            </div>

            <!-- Landmark Metrics Grid -->
            <div class="settings-group" style="grid-column: 1 / -1;">
              <h4>Landmarks em Tempo Real (33 Pontos)</h4>
              <div class="landmark-grid">
                {#each Object.entries(MEDIAPIPE_LANDMARKS) as [name, index]}
                  {@const lm = currentLandmarks[index]}
                  <div class="landmark-card">
                    <div class="landmark-header">
                      <span class="landmark-id">{index}</span>
                      <span class="landmark-name">{name}</span>
                    </div>
                    {#if lm}
                      <div class="landmark-values">
                        <div class="val-row">
                          <span class="val-label">X:</span>
                          <span class="val-data">{lm.x.toFixed(4)}</span>
                        </div>
                        <div class="val-row">
                          <span class="val-label">Y:</span>
                          <span class="val-data">{lm.y.toFixed(4)}</span>
                        </div>
                        <div class="val-row">
                          <span class="val-label">Z:</span>
                          <span class="val-data">{lm.z.toFixed(4)}</span>
                        </div>
                        <div class="val-row">
                          <span class="val-label">Vis:</span>
                          <span class="val-data" style:color={lm.visibility && lm.visibility > 0.5 ? 'var(--color-success)' : 'var(--color-error)'}>
                            {(lm.visibility ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    {:else}
                      <div class="landmark-waiting">Aguardando dados...</div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
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
    max-width: 1600px; /* Allow wider layout for split screen */
    margin: 0 auto;
  }

  @media (min-width: 640px) {
    .content {
      padding-top: 6rem;
    }
  }

  .split-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0; /* Remove gap between containers */
    width: 1280px; /* Increased to match settings */
    height: auto; /* Auto height based on content */
    margin: 0 auto;
    margin-bottom: 4rem; /* Space for settings panel */
    align-items: center;
    position: relative;
  }

  @media (min-width: 1024px) {
    .split-container {
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }
  }

  @media (max-width: 1280px) {
    .split-container {
      width: 100%;
      height: auto;
      max-height: 70vh;
    }
  }

  .video-container {
    position: relative;
    margin: 0 auto;
    border-radius: var(--radius-md) 0 0 var(--radius-md); /* Rounded only on left side */
    overflow: hidden;
    background: black;
    display: flex;
    align-items: center;
    justify-content: center;
    background: black;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    /* Força o video-container a se comportar bem dentro do grid */
    width: 100%;
    max-height: 80vh; /* Prevent vertical overflow */
  }

  .reference-container {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9; /* Maintain aspect ratio */
    border-radius: 0 var(--radius-md) var(--radius-md) 0; /* Rounded only on right side */
    overflow: hidden;
    background: #000;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    max-height: 80vh; /* Prevent vertical overflow */
  }

  /* Layout Mode: User Centered */
  .split-container.layout-user-centered {
    grid-template-columns: 1fr;
    position: relative;
    /* Maintain same fixed dimensions */
    width: 1280px;
    height: 720px; /* 16:9 of 1280 */
  }

  .split-container.layout-user-centered .video-container {
    width: 100%;
    height: 100%;
    border-radius: var(--radius-md);
    max-height: none;
  }

  .split-container.layout-user-centered .reference-container {
    position: absolute;
    width: 200px;
    height: auto;
    aspect-ratio: 16/9;
    z-index: 50;
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
    max-height: none; /* Override for PiP */
  }

  /* Layout Mode: Coach Centered */
  .split-container.layout-coach-centered {
    grid-template-columns: 1fr;
    position: relative;
    /* Maintain same fixed dimensions */
    width: 1280px;
    height: 720px; /* 16:9 of 1280 */
  }

  .split-container.layout-coach-centered .reference-container {
    width: 100%;
    height: 100%;
    border-radius: var(--radius-md);
    max-height: none;
  }

  .split-container.layout-coach-centered .video-container {
    position: absolute;
    width: 200px;
    height: auto;
    aspect-ratio: 16/9;
    z-index: 50;
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
    max-height: none; /* Override for PiP */
  }

  /* Draggable PiP styles */
  .draggable-pip {
    cursor: move;
    user-select: none;
  }

  .draggable-pip:active {
    cursor: grabbing;
  }

  /* PiP Resize Handle */
  .pip-resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 20px;
    height: 20px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px 0 var(--radius-md) 0;
    cursor: nwse-resize;
    z-index: 20;
    transition: background 0.2s;
  }

  .pip-resize-handle:hover {
    background: rgba(255, 255, 255, 0.5);
  }

  .pip-resize-handle::before {
    content: '';
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 8px;
    height: 8px;
    border-right: 2px solid rgba(255, 255, 255, 0.8);
    border-bottom: 2px solid rgba(255, 255, 255, 0.8);
  }

  /* Floating Fullscreen Button */
  .fullscreen-btn-floating {
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: 48px;
    height: 48px;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #fff;
    transition: all 0.3s ease;
    z-index: 15;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .fullscreen-btn-floating:hover {
    background: rgba(0, 0, 0, 0.85);
    border-color: rgba(255, 255, 255, 0.4);
    transform: scale(1.05);
  }

  .fullscreen-btn-floating:active {
    transform: scale(0.95);
  }

  .fullscreen-btn-floating svg {
    flex-shrink: 0;
  }

  /* Rep Counter Progress Bar */
  /* Rep Counter Progress Bar */
  .rep-counter-bar {
    position: relative;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    z-index: 10;
  }

  /* Rep Counter as Overlay (inside video/reference containers) */
  .rep-counter-bar-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.60);
    backdrop-filter: blur(10px);
    
    /* Responsive scaling base: scales with viewport size */
    font-size: clamp(9px, 1.35vh, 17px); 
    
    /* All dimensions below use 'em' to scale with the above font-size */
    padding: 1em 1.5em; 
    
    display: flex;
    align-items: center;
    gap: 1.5em;
    z-index: 10;
  }

  .rep-info {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    min-width: 6em;
  }

  .rep-label {
    font-size: 1.2em;
    color: #888;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .rep-count {
    font-size: 5em;
    font-weight: 300;
    color: #fff;
    line-height: 1;
  }

  .rep-progress {
    flex: 1;
    display: flex;
    align-items: flex-end;
    gap: 1em;
    height: 7em; /* ~105px at 15px font-size */
    padding-bottom: 0.25em;
  }

  .rep-line {
    width: 1em; /* Scales proportionally */
    flex-shrink: 0;
    height: 100%;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 99em; /* Fully rounded relative to width */
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .rep-line::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 0%;
    background: linear-gradient(to top, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%);
    border-radius: 99em;
    transition: height 0.3s ease;
  }

  .rep-line.completed::before {
    height: 100%;
    background: linear-gradient(to top, #666 0%, #999 50%, #666 100%);
  }

  .rep-line.current::before {
    height: 100%;
    background: linear-gradient(to top, var(--color-primary-600) 0%, var(--color-primary-400) 50%, var(--color-primary-500) 100%);
    box-shadow: 0 0 12px var(--color-primary-500), inset 0 2px 8px rgba(255, 255, 255, 0.3);
    animation: pulse-tube 1.5s ease-in-out infinite;
  }

  @keyframes pulse-tube {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  /* Vertical Rep Slide */
  .vertical-rep-slide {
    position: absolute;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    height: 50%;
    width: 22px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    pointer-events: none;
  }

  .v-slide-track {
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    border-radius: 999px;
    position: relative;
    overflow: visible; /* Ensure bubble can pop out if needed, though bubble is likely inside or on top */
    border: 3px solid rgba(255, 255, 255, 0.1);
  }

  /* Inner track for masking overflow of fill */
  .v-slide-inner {
    width: 100%;
    height: 100%;
    border-radius: 999px;
    overflow: hidden;
    position: relative;
  }

  .v-slide-fill {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background: #ccff00; /* Neon green/lime */
    /* background: linear-gradient(to top, #ccff00, #aaff00); */
    transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 15px rgba(204, 255, 0, 0.5);
    border-radius: 28px 28px 0 0;
  }

  /* The top dot/handle of the fill */
  /* The top handle dot - separated to pop out of track */
  .v-slide-handle {
    position: absolute;
    left: 50%;
    transform: translate(-50%, 50%); /* Center horizontally, align center vertically to bottom anchor */
    width: 40px; /* Significantly wider than track (28px) */
    height: 40px;
    background: rgba(255, 255, 255, 1);
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10;
    transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Inner white dot for detail */
  .v-slide-handle::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 28px;
    height: 28px;
    background: #ccff00;
    border-radius: 50%;
  }

  .v-slide-bubble {
    position: absolute;
    right: -95px; /* Offset to the right of the bar */
    top: 0; /* Will be set dynamically via style or transform */
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.60);
    backdrop-filter: blur(10px);
    color: white;
    padding: 8px 22px;
    border-radius: 8px;
    font-size: 1.5rem;
    font-weight: 400;
    font-family: 'Inter', sans-serif; /* or inherit */
    white-space: nowrap;
    transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  /* Triangle pointing let */
  .v-slide-bubble::before {
    content: '';
    position: absolute;
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 6px solid rgba(0, 0, 0, 0.60);
  }

  /* Modifiers for Left Aligned Slide */
  .vertical-rep-slide.left-aligned {
    left: 2rem; /* Margin from left edge */
    right: auto;
    transform: translateY(-50%); /* Remove X centering */
  }

  /* Bubble stays on default (right) side for left alignment, so no extra overrides needed */

  @media (max-width: 1280px) {
    .split-container.layout-user-centered,
    .split-container.layout-coach-centered {
      width: 100%;
      height: auto;
      max-height: 70vh;
    }
  }

  .reference-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }



  /* Side-by-Side Fullscreen Only */
  .split-container.fullscreen.layout-side-by-side {
    position: fixed !important;
    inset: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 9999 !important;
    background: black !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
    max-width: none !important;
    display: grid !important;
    grid-template-columns: 50vw 50vw !important;
    align-items: stretch !important;
    gap: 0 !important;
  }

  .split-container.fullscreen.layout-side-by-side .video-container,
  .split-container.fullscreen.layout-side-by-side .reference-container {
    width: 100% !important;
    height: 100% !important;
    max-height: 100vh;
    border-radius: 0 !important;
    margin: 0 !important;
    aspect-ratio: auto !important;
  }

  /* User/Coach Centered Fullscreen Logic */
  .split-container.fullscreen.layout-user-centered,
  .split-container.fullscreen.layout-coach-centered {
    position: fixed !important;
    inset: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 9999 !important;
    background: black !important;
    display: block !important; /* Or flex if needed */
    margin: 0 !important;
    padding: 0 !important;
    max-width: none !important;
  }

  /* Main Container in User-Centered Fullscreen */
  .split-container.fullscreen.layout-user-centered .video-container {
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    max-height: none !important;
    margin: 0 !important;
    border-radius: 0 !important;
    position: absolute;
    top: 0;
    left: 0;
  }

  /* Main Container in Coach-Centered Fullscreen */
  .split-container.fullscreen.layout-coach-centered .reference-container {
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    max-height: none !important;
    margin: 0 !important;
    border-radius: 0 !important;
    position: absolute;
    top: 0;
    left: 0;
  }

  /* PiP in Fullscreen (Preserve positioning/sizing) */
  .split-container.fullscreen.layout-user-centered .reference-container,
  .split-container.fullscreen.layout-coach-centered .video-container {
     /* Allow inline styles to dictate position/size (drag) */
     /* Ensure z-index is high */
     z-index: 10000 !important;
     /* Do NOT force width/height 100% */
     position: absolute !important;
     max-height: none !important; /* Ensure PiP isn't capped */
  }

  /* Force video/canvas to fill container in fullscreen side-by-side */
  .split-container.fullscreen.layout-side-by-side .video-canvas,
  .split-container.fullscreen.layout-side-by-side .reference-video {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
  }

  /* Force video/canvas to fill container in Centered Fullscreen (Main) */
  .split-container.fullscreen.layout-user-centered .video-canvas,
  .split-container.fullscreen.layout-coach-centered .reference-video {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important; /* Or cover depending on preference */
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
    padding: clamp(10px, 2vh, 20px) clamp(8px, 1.5vw, 10px);
    pointer-events: none;
    z-index: 50;
    transform: scale(var(--overlay-scale, 1));
    transform-origin: top right;
  }

.feedback-card {
  background: transparent;
  border: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-radius: var(--radius-standard);
  position: relative;
  padding: clamp(8px, 1.5vh, 12px);
  display: flex;
  flex-direction: column;
    gap: clamp(10px, 1.8vh, 14px);
    align-items: flex-end;
    pointer-events: none;
  }

  .overlay-scale-controls {
    position: absolute;
    bottom: clamp(12px, 2.5vh, 20px);
    right: clamp(10px, 2vw, 16px);
    display: flex;
    flex-direction: column;
    gap: 6px;
    pointer-events: auto;
    z-index: 90;
  }

  .scale-btn {
    width: 42px;
    height: 42px;
    border-radius: var(--radius-standard);
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: var(--transition-base);
    overflow: hidden;
  }

  .scale-btn:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .scale-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .feedback-overlay {
    display: flex;
    flex-direction: column;
    gap: clamp(10px, 1.8vh, 14px);
    width: auto;
    align-items: flex-end;
  }

  .feedback-message {
    position: relative;
    overflow: hidden;
    padding: clamp(8px, 1.5vh, 12px) clamp(12px, 2.5vw, 20px);
    border-radius: var(--radius-standard);
    font-size: clamp(12px, 2vw, 16px);
    font-weight: 500;
    animation: slideIn var(--transition-slow) ease;
    color: var(--color-text-primary);
    align-self: flex-end;
    width: auto;
  }

  .feedback-message::before,
  .mode-indicator::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
  }

  .feedback-message::after,
  .mode-indicator::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 100%;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.8),
      transparent,
      rgba(255, 255, 255, 0.3)
    );
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
    left: clamp(10px, 2vw, 18px);
    transform: translateY(-50%) scale(var(--overlay-scale, 1));
    display: flex;
    flex-direction: column;
    pointer-events: none;
    border-radius: var(--radius-standard);
    max-width: clamp(70px, 12vw, 140px);
    max-height: 90vh;
    overflow: hidden;
    z-index: 10;
    transform-origin: center left;
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
    border-radius: var(--radius-standard);
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
    color: var(--color-text-primary);
    border-radius: var(--radius-standard);
    position: relative;
    overflow: hidden;
  }

  .btn-glass:hover {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .btn-glass-icon {
    padding: 0;
    color: var(--color-text-primary);
    width: clamp(38px, 6vh, 48px);
    height: clamp(38px, 6vh, 48px);
    min-width: clamp(38px, 6vh, 48px);
    border-radius: var(--radius-standard);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .btn-glass-icon:hover {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .btn-glass-icon:active {
    transform: scale(0.95);
  }

  .card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-backdrop);
    -webkit-backdrop-filter: var(--glass-backdrop);
    border-radius: var(--radius-standard);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
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

  .feedback-audio-controls {
    margin: clamp(12px, 2vh, 20px) auto;
    display: flex;
    gap: clamp(10px, 2vw, 16px);
    justify-content: center;
    flex-wrap: wrap;
    width: 100%;
    max-width: 820px;
  }

  .feedback-audio-controls .btn {
    gap: 8px;
    padding: 0 clamp(14px, 3vw, 22px);
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
    border-radius: var(--radius-md);
  }

  .debug-panel pre {
    overflow-x: auto;
    font-size: 12px;
    color: var(--color-primary-500);
  }

  .mode-indicator {
    position: relative;
    overflow: hidden;
    padding: clamp(8px, 1.5vh, 12px) clamp(12px, 2.5vw, 20px);
    border-radius: var(--radius-standard);
    display: flex;
    align-items: center;
    gap: clamp(4px, 1vw, 8px);
    font-size: clamp(12px, 2vw, 16px);
    font-weight: 500;
    color: var(--color-text-primary);
    max-width: clamp(180px, 50vw, 500px);
    width: fit-content;
    transform: scale(var(--overlay-scale, 1));
    transform-origin: top right;
    pointer-events: none;
  }

  .mode-indicator.in-card {
    width: auto;
    max-width: none;
    transform: none;
    justify-content: flex-start;
    align-self: flex-end;
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
    max-width: 980px;
    margin: clamp(10px, 2vh, 16px) auto;
    padding: clamp(10px, 2.5vw, 14px);
    background: var(--color-bg-dark-secondary);
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: clamp(8px, 1.5vh, 12px);
  }

  .mode-selector-panel h3 {
    color: var(--color-text-primary);
    margin: 0;
    font-size: clamp(1rem, 2vw, 1.15rem);
    display: flex;
    align-items: center;
    gap: clamp(6px, 1vw, 10px);
    font-weight: 600;
  }

  .dev-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    background: var(--color-border-light);
    color: var(--color-text-secondary);
    border-radius: var(--radius-full);
    font-size: clamp(10px, 1.6vw, 12px);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  :global(.mode-panel-icon) {
    width: clamp(16px, 2.5vw, 18px) !important;
    height: clamp(16px, 2.5vw, 18px) !important;
    flex-shrink: 0;
  }

  .mode-buttons {
    display: flex;
    gap: clamp(8px, 1.5vw, 12px);
    flex-wrap: wrap;
    margin: 0;
  }

  .mode-btn {
    display: flex;
    flex: 1 1 180px;
    align-items: center;
    gap: clamp(8px, 1vw, 10px);
    padding: clamp(8px, 2vw, 12px);
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    font-size: clamp(13px, 1.8vw, 14px);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .mode-labels {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: flex-start;
  }

  .mode-title {
    line-height: 1.2;
  }

  :global(.mode-btn-icon) {
    width: clamp(18px, 2.8vw, 20px) !important;
    height: clamp(18px, 2.8vw, 20px) !important;
    flex-shrink: 0;
  }

  .mode-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
  }

  .mode-btn.active {
    background: transparent;
    border-color: var(--color-primary-500);
    box-shadow: none;
  }

  .mode-desc {
    font-size: clamp(11px, 1.6vw, 12px);
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  .mode-info {
    display: flex;
    align-items: center;
    gap: clamp(8px, 1.2vw, 12px);
    background: var(--color-bg-dark-secondary);
    border: 1px dashed rgba(255, 255, 255, 0.14);
    padding: clamp(8px, 2vw, 12px);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    font-size: clamp(12px, 1.8vw, 13px);
  }

  .mode-info p {
    margin: 0;
    color: var(--color-text-secondary);
  }

  .mode-info strong {
    color: var(--color-text-primary);
  }

  @media (max-width: 768px) {
    .overlays-container {
      padding: clamp(8px, 1.5vh, 15px) clamp(6px, 1.2vw, 8px);
      gap: 0;
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
      flex-direction: column;
      gap: clamp(8px, 2vw, 12px);
    }

    .mode-btn {
      flex: 1 1 auto;
    }

    .mode-selector-panel {
      padding: clamp(12px, 3vw, 15px);
    }

    .mode-selector-panel h3 {
      font-size: clamp(1.05rem, 3vw, 1.2rem);
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

  /* Settings Panel Styles */
  .settings-panel {
    width: 100%;
    background: #000;
    color: #fff;
    padding: 1.5rem;
    padding-bottom: 2rem;
    margin-top: 1rem;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
  }

  .settings-tabs {
      display: flex;
      gap: 2rem;
      margin-bottom: 2rem;
      padding-bottom: 0.5rem;
  }

  .tab-btn {
      background: none;
      border: none;
      color: #888;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      padding-bottom: 0.5rem;
      position: relative;
      transition: color 0.2s;
  }

  .tab-btn:hover {
      color: #ccc;
  }

  .tab-btn.active {
      color: #fff;
  }

  .tab-btn.active::after {
      content: '';
      position: absolute;
      bottom: -0.6rem; /* Align with border-bottom of container */
      left: 0;
      width: 100%;
      height: 3px;
      background: #fff;
      border-radius: 2px;
  }

  .settings-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 3rem;
      align-items: start;
  }

  .settings-group h4 {
      font-size: 1rem;
      color: #fff;
      margin-bottom: 1.5rem;
      font-weight: 600;
  }

  .layout-options {
      display: flex;
      gap: 1.5rem;
  }

  .layout-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      opacity: 0.5;
  }

  .layout-option.active {
      opacity: 1;
  }

  .layout-preview {
      width: 100px;
      height: 60px;
      border: 2px solid #555;
      border-radius: 8px;
      background: #222;
      position: relative;
  }

  .layout-option.active .layout-preview {
      border-color: #fff;
      /* background: #000; Removed to keep the preview visible */
  }

  .layout-preview.side-by-side {
      background: linear-gradient(90deg, #333 50%, #fff 50%);
  }
  
  .layout-preview.user-centered {
      background: #333;
      position: relative;
  }

  .layout-preview.user-centered::before {
      content: '';
      position: absolute;
      top: 8px;
      left: 8px;
      width: 24px;
      height: 24px;
      background: #555;
      border-radius: 4px;
  }

  .layout-preview.coach-centered {
      background: #555;
      position: relative;
  }

  .layout-preview.coach-centered::before {
      content: '';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      background: #333;
      border-radius: 4px;
  }

  .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      min-width: 250px;
  }

  .toggle-row span {
      font-size: 1rem;
      font-weight: 500;
      color: #fff;
  }

  .toggle-wrapper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
  }

  .toggle-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #888;
      min-width: 28px;
      text-align: left;
  }

  /* Dev Metrics Styles */
  .dev-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
  }

  .dev-metric-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-sm);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: center;
      text-align: center;
  }

  .dev-metric-label {
      font-size: 0.85rem;
      color: #888;
      font-weight: 500;
  }

  .dev-metric-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-primary-500);
  }

  /* iOS-style Toggle Switch - Compact */
  .toggle-btn {
      position: relative;
      width: 44px;
      height: 24px;
      background: #39393d;
      border: none;
      border-radius: 24px;
      cursor: pointer;
      transition: background-color 0.3s ease;
      padding: 0;
      flex-shrink: 0;
  }

  .toggle-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
  }

  .toggle-btn::before {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: #fff;
      border-radius: 50%;
      transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      z-index: 2;
  }

  .toggle-btn.on {
      background: var(--color-primary-500);
  }

  .toggle-btn.on::before {
      transform: translateX(20px);
  }

  /* Landmark Grid Styles */
  .landmark-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .landmark-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-sm);
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .landmark-card:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .landmark-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .landmark-id {
    font-size: 0.7rem;
    background: rgba(255, 255, 255, 0.1);
    color: #aaa;
    padding: 2px 4px;
    border-radius: 4px;
    font-family: monospace;
  }

  .landmark-name {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .landmark-values {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .val-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
  }

  .val-label {
    color: #666;
    font-family: monospace;
  }

  .val-data {
    color: var(--color-text-primary);
    font-family: monospace;
    font-weight: 500;
  }

  .landmark-waiting {
    font-size: 0.75rem;
    color: #666;
    font-style: italic;
    text-align: center;
    padding: 1rem 0;
  }

  /* Mini controls for Dev panel */
  .mode-buttons-mini {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
  }
  
  .mini-btn {
      background: #222;
      border: 1px solid #444;
      color: #fff;
      padding: 0.3rem 0.8rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
  }

  .mini-btn.active {
      background: #fff;
      color: #000;
  }

  .debug-info-mini {
      font-size: 0.8rem;
      color: #888;
      margin-top: 0.5rem;
  }

</style>

