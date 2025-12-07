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
  import { LANDMARK_GROUPS } from '$lib/vision/constants/mediapipe.constants';
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
  let isFeedbackEnabled = $state(true);
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
  const SKELETON_STYLE = {
    lineWidth: 5,
    pointRadius: 7,
    opacity: 0.9,
    glow: 0
  };
  const TORSO_ANCHOR_RADIUS = 8;
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
    if (!videoElement || !canvasElement || !videoContainerElement) return;

    // Usa o tamanho atual do container para evitar esticar/zoomer o layout
    const rect = videoContainerElement.getBoundingClientRect();
    const containerWidth = Math.round(rect.width);
    const containerHeight = Math.round(rect.height);

    const width = containerWidth || videoElement.clientWidth || videoElement.videoWidth;
    const height = containerHeight || videoElement.clientHeight || videoElement.videoHeight;
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
          drawLandmarks(ctx, renderLandmarks, {
            color: skeletonColor,
            lineWidth: Math.max(1, SKELETON_STYLE.lineWidth / 2),
            radius: SKELETON_STYLE.pointRadius
          });

          if (TORSO_LINE.enabled) {
            drawTorsoLine(ctx, renderLandmarks);
          }
          drawTorsoAnchors(ctx, renderLandmarks);

          ctx.restore();
        }

      ctx.restore();
    });

    if (analyzer && landmarks && !isPaused) {
      queueMicrotask(() => {
        analyzer?.analyzeFrame(landmarks);
      });
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

  function drawTorsoAnchors(ctx: CanvasRenderingContext2D, landmarks: PoseResults['poseLandmarks']) {
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
    ctx.fillStyle = skeletonColor;
    ctx.beginPath();
    ctx.arc(shoulderMid.x * ctx.canvas.width, shoulderMid.y * ctx.canvas.height, TORSO_ANCHOR_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hipMid.x * ctx.canvas.width, hipMid.y * ctx.canvas.height, TORSO_ANCHOR_RADIUS, 0, Math.PI * 2);
    ctx.fill();
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

  onDestroy(() => {
    if (camera) camera.stop();
    if (analyzer) analyzer.destroy();
    if (timerInterval) clearInterval(timerInterval);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  });
</script>

<svelte:head>
  <title>Elarin</title>
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

      <div class="overlays-container" style={`--overlay-scale:${overlayScale};`}>
        {#if isCameraRunning && isFeedbackEnabled && (isDevMode || feedbackMessages.length > 0 || reconstructionError !== null)}
          <div class="feedback-card" style={`--overlay-scale:${overlayScale};`}>
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
      <div class="overlay-scale-controls" style={`--overlay-scale:${overlayScale};`}>
        <button
          class="scale-btn card"
          onclick={() => (overlayScale = Math.min(OVERLAY_MAX_SCALE, parseFloat((overlayScale + 0.1).toFixed(2))))}
          aria-label="Aumentar tamanho do overlay"
          disabled={overlayScale >= OVERLAY_MAX_SCALE}
        >
          <Plus size={18} />
        </button>
        <button
          class="scale-btn card"
          onclick={() => (overlayScale = Math.max(OVERLAY_MIN_SCALE, parseFloat((overlayScale - 0.1).toFixed(2))))}
          aria-label="Diminuir tamanho do overlay"
          disabled={overlayScale <= OVERLAY_MIN_SCALE}
        >
          <Minus size={18} />
        </button>
      </div>

      {#if isCameraRunning || isPaused}
        <div class="metrics-overlay card" style={`--overlay-scale:${overlayScale};`}>
          <div class="metric">
            <span class="metric-label">Repetições</span>
            <span class="metric-value">{$trainingStore.reps}</span>
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
            <div class="metric">
              <span class="metric-label">FPS</span>
              <span class="metric-value">{fps}</span>
            </div>
          {/if}
        </div>
      {/if}

      {#if isCameraRunning || isPaused}
        <div class="video-controls">
          {#if isPaused}
            <button class="btn btn-primary" onclick={resumeTraining}>Retomar</button>
            <button class="btn btn-glass card" onclick={finishTraining}>Finalizar</button>
          {:else}
            <button class="btn btn-glass card" onclick={pauseTraining}>Pausar</button>
            <button class="btn btn-primary" onclick={finishTraining}>Finalizar</button>
          {/if}
          <button class="btn btn-glass-icon card" onclick={toggleFullscreen}>
            <span class="fullscreen-icon">{isFullscreen ? '⛶' : '⛶'}</span>
          </button>
        </div>
      {/if}
  </div>

  {#if isCameraRunning || isPaused}
    <div class="feedback-audio-controls">
      <button
        class="btn btn-glass card"
        onclick={toggleFeedback}
        title={isFeedbackEnabled ? 'Desativar feedback visual' : 'Ativar feedback visual'}
      >
        {#if isFeedbackEnabled}
          <MessageSquare class="icon-responsive" />
          <span>Feedback ligado</span>
        {:else}
          <MessageSquareOff class="icon-responsive" />
          <span>Feedback desligado</span>
        {/if}
      </button>
      <button
        class="btn btn-glass card"
        onclick={toggleAudio}
        title={$audioFeedbackStore.isEnabled ? 'Desativar áudio' : 'Ativar áudio'}
      >
        {#if $audioFeedbackStore.isEnabled}
          <Volume2 class="icon-responsive" />
          <span>Áudio ligado</span>
        {:else}
          <VolumeX class="icon-responsive" />
          <span>Áudio desligado</span>
        {/if}
      </button>
    </div>
  {/if}

  {#if errorMessage}
    <div class="error-banner">
      <p>{errorMessage}</p>
    </div>
  {/if}

    {#if isCameraRunning && isDevMode}
      <div class="mode-selector-panel">
        <h3>
          <Settings class="mode-panel-icon" />
          Modo de Análise
          <span class="dev-pill">Dev only</span>
        </h3>
        <div class="mode-buttons">
          <button class="mode-btn" class:active={feedbackMode === 'hybrid'} onclick={() => changeFeedbackMode('hybrid')}>
            <Microscope class="mode-btn-icon" />
            <div class="mode-labels">
              <span class="mode-title">Híbrido</span>
              <span class="mode-desc">ML + Heurística</span>
            </div>
          </button>

          <button class="mode-btn" class:active={feedbackMode === 'ml_only'} onclick={() => changeFeedbackMode('ml_only')}>
            <Bot class="mode-btn-icon" />
            <div class="mode-labels">
              <span class="mode-title">ML only</span>
              <span class="mode-desc">Autoencoder</span>
            </div>
          </button>

          <button class="mode-btn" class:active={feedbackMode === 'heuristic_only'} onclick={() => changeFeedbackMode('heuristic_only')}>
            <Ruler class="mode-btn-icon" />
            <div class="mode-labels">
              <span class="mode-title">Heurística</span>
              <span class="mode-desc">Biomecânica</span>
            </div>
          </button>
        </div>

        <div class="mode-info">
          {#if feedbackMode === 'hybrid'}
            <p><strong>Híbrido:</strong> ML + heurísticas biomecânicas.</p>
          {:else if feedbackMode === 'ml_only'}
            <p><strong>ML only:</strong> Apenas autoencoder.</p>
          {:else}
            <p><strong>Heurística:</strong> Regras biomecânicas dedicadas.</p>
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
  border-radius: 20px;
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
    border-radius: 20px;
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
    border-radius: 20px;
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
    border-radius: 20px;
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
    border-radius: 20px;
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
    border-radius: 20px;
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
    border-radius: 20px;
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
    backdrop-filter: blur(15px) saturate(75%);
    -webkit-backdrop-filter: blur(15px) saturate(75%);
    background-color: rgba(0, 0, 0, 0.4);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    box-shadow: 0 16px 50px rgba(0, 0, 0, 0.35);
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
    border-radius: 10px;
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
    border-radius: 20px;
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
    border-radius: 999px;
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

