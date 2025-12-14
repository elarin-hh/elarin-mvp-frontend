<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { trainingStore, trainingActions } from "$lib/stores/training.store";
  import { authActions } from "$lib/services/auth.facade";
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import AppHeader from "$lib/components/common/AppHeader.svelte";
  import { isDeveloper } from "$lib/config/env.config";
  import { Bot, Ruler, Microscope } from "lucide-svelte";
  import {
    ExerciseAnalyzer,
    loadExerciseConfig,
    type FeedbackRecord,
    type FeedbackMessage,
  } from "$lib/vision";
  import {
    LANDMARK_GROUPS,
    MEDIAPIPE_LANDMARKS,
  } from "$lib/vision/constants/mediapipe.constants";
  import Loading from "$lib/components/common/Loading.svelte";
  import BiometricConsent from "$lib/components/BiometricConsent.svelte";
  import {
    getPoseAssetUrl,
    loadPoseModules,
    MEDIAPIPE_VERSIONS,
  } from "$lib/services/mediapipe-loader";
  import {
    audioFeedbackActions,
    audioFeedbackStore,
  } from "$lib/stores/audio-feedback.store";

  const BIOMETRIC_CONSENT_KEY = "elarin_biometric_consent";
  const BIOMETRIC_CONSENT_TS_KEY = "elarin_biometric_consent_ts";
  const BIOMETRIC_CONSENT_EXP_KEY = "elarin_biometric_consent_exp";

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
    poseLandmarks?: Array<{
      x: number;
      y: number;
      z: number;
      visibility?: number;
    }>;
    image: HTMLVideoElement | HTMLCanvasElement;
  };

  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let referenceVideoElement: HTMLVideoElement;
  let videoContainerElement: HTMLDivElement;
  let splitContainerElement: HTMLDivElement;
  let analyzer: ExerciseAnalyzer | null = $state(null);
  let pose: MediaPipePose | null = $state(null);
  let camera: MediaPipeCamera | null = $state(null);
  let isLoading = $state(false);
  let errorMessage = $state("");
  let isCameraEmulated = $state(false);
  let cameraFallbackReason = $state("");
  let debugMode = $state(false);
  let isScrolled = $state(false);
  let scriptsLoaded = $state(false);
  let loadingStage = $state("Inicializando...");
  let isCameraRunning = $state(false);
  let currentLandmarks = $state<
    Array<{ x: number; y: number; z: number; visibility?: number }>
  >([]);
  let isFullscreen = $state(false);
  let showAvatarMenu = $state(false);
  let isDevMode = $state(false);
  let orientation = $state<"portrait" | "landscape">("landscape");
  let currentFeedback: FeedbackRecord | null = $state(null);
  let isPaused = $state(false);
  let reconstructionError = $state<number | null>(null);
  const SKELETON_COLORS = {
    correct: "var(--color-skeleton-correct)",
    incorrect: "var(--color-skeleton-incorrect)",
    neutral: "var(--color-skeleton-neutral)",
  };
  const EMULATED_VIDEO_SRC = `${base}/videos/squat.mp4`;

  const resolveCssColor = (value: string): string => {
    if (!value.startsWith("var(") || typeof document === "undefined")
      return value;
    const varName = value.slice(4, -1);
    const resolved = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    return resolved || value;
  };

  const SCORE_ALPHA = 0.2;
  const ML_WEIGHT = 0.6;
  const HEUR_WEIGHT = 0.4;
  const MAX_REP_SLOTS = 30;
  const SCORE_BANDS = [
    { min: 85, color: "#22c55e" },
    { min: 70, color: "#fbbf24" },
    { min: 50, color: "#f97316" },
    { min: 0, color: "#ef4444" },
  ];

  let skeletonColor = $state(resolveCssColor(SKELETON_COLORS.correct));
  let feedbackMessages: FeedbackMessage[] = $state([]);
  let isFeedbackEnabled = $state(false);
  let emaScore = $state(0);
  let frameScore = $state(0);
  let confidence = $state(0);
  let repScores = $state<(number | null)[]>(Array(MAX_REP_SLOTS).fill(null));
  let currentRepFrames = $state<number[]>([]);
  let elapsedTime = $state(0);
  let timerInterval: number | null = null;
  let feedbackMode = $state<"hybrid" | "ml_only" | "heuristic_only">("ml_only");
  let modeIndicator = $state("ML Only (Autoencoder)");
  let showBiometricConsent = $state(false);
  let hasBiometricConsent = $state(false);
  let hasSyncedCanvas = $state(false);
  let fps = $state(0);
  let showTimer = $state(true);
  let showReps = $state(true);
  let activeTab = $state<"display" | "skeleton" | "sound" | "dev">("display");
  let layoutMode = $state<"side-by-side" | "user-centered" | "coach-centered">(
    "side-by-side",
  );

  let pipPosition = $state({ x: 0, y: 0 });
  let isDraggingPip = $state(false);
  let dragOffset = { x: 0, y: 0 };

  let pipSize = $state({ width: 260, height: 146.25 });
  let isResizingPip = $state(false);
  let resizeStartPos = { x: 0, y: 0 };
  let resizeStartSize = { ...pipSize };
  const PIP_MARGIN = 16;
  const PIP_BOTTOM_BUFFER = 0;
  let emulatedFrameId: number | null = null;

  const SEVERITY_PENALTIES: Record<string, number> = {
    critical: 60,
    high: 40,
    medium: 25,
    low: 10,
  };

  const clampScore = (value: number) => Math.max(0, Math.min(100, value));

  function scoreToColor(score: number | null | undefined): string {
    if (score === null || score === undefined || Number.isNaN(score)) {
      return "rgba(255, 255, 255, 0.25)";
    }
    const value = clampScore(score);
    const band = SCORE_BANDS.find((b) => value >= b.min);
    return band ? band.color : SCORE_BANDS[SCORE_BANDS.length - 1].color;
  }

  const average = (values: number[]) =>
    values.length === 0
      ? 0
      : values.reduce((sum, val) => sum + val, 0) / values.length;

  function getMlScore(feedback: FeedbackRecord): number | null {
    const rawQuality =
      (feedback.ml?.details as Record<string, unknown> | undefined)
        ?.qualityScore ?? null;

    const parsedQuality =
      typeof rawQuality === "string"
        ? parseFloat(rawQuality)
        : (rawQuality as number | null);

    if (typeof parsedQuality === "number" && !Number.isNaN(parsedQuality)) {
      return clampScore(parsedQuality);
    }

    const confidenceValue =
      feedback.ml?.confidence ?? feedback.combined.confidence ?? null;

    if (typeof confidenceValue === "number" && !Number.isNaN(confidenceValue)) {
      return clampScore(confidenceValue * 100);
    }

    return null;
  }

  function getHeuristicScore(feedback: FeedbackRecord): number | null {
    const heuristic = feedback.heuristic;
    if (!heuristic || !heuristic.available) return null;

    if (heuristic.isValid) return 95;

    const issues = heuristic.issues || [];
    const penalty = issues.reduce((acc, issue) => {
      const weight =
        SEVERITY_PENALTIES[
          (issue.severity as keyof typeof SEVERITY_PENALTIES) ?? "low"
        ] ?? 0;
      return acc + weight;
    }, 0);

    return clampScore(100 - penalty);
  }

  function combineScores(
    mlScore: number | null,
    heuristicScore: number | null,
  ): number | null {
    if (mlScore === null && heuristicScore === null) return null;
    if (mlScore === null) return heuristicScore;
    if (heuristicScore === null) return mlScore;
    return clampScore(mlScore * ML_WEIGHT + heuristicScore * HEUR_WEIGHT);
  }

  function calculateFrameScore(feedback: FeedbackRecord): number | null {
    const mlScore = getMlScore(feedback);
    const heuristicScore = getHeuristicScore(feedback);
    return combineScores(mlScore, heuristicScore);
  }

  const pipStyle = () =>
    showCountdown
      ? "display: none;"
      : `left: ${pipPosition.x}px; top: ${pipPosition.y}px; width: ${pipSize.width}px; height: ${pipSize.height}px;`;

  function clampPipPosition() {
    if (!splitContainerElement || layoutMode === "side-by-side") return;
    const rect = splitContainerElement.getBoundingClientRect();
    const maxX = Math.max(0, rect.width - pipSize.width);
    const maxY = Math.max(0, rect.height - pipSize.height - PIP_BOTTOM_BUFFER);
    pipPosition = {
      x: Math.min(Math.max(0, pipPosition.x), maxX),
      y: Math.min(Math.max(0, pipPosition.y), maxY),
    };
  }

  function resetPipPosition() {
    if (!splitContainerElement || layoutMode === "side-by-side") return;
    const rect = splitContainerElement.getBoundingClientRect();
    const availableHeight = Math.max(0, rect.height - PIP_BOTTOM_BUFFER);
    const centerY = Math.max(0, (availableHeight - pipSize.height) / 2);
    pipPosition = {
      x: Math.max(0, rect.width - pipSize.width - PIP_MARGIN),
      y: centerY,
    };
  }

  function snapPipToCenter() {
    resetPipPosition();
    clampPipPosition();
    requestAnimationFrame(() => {
      resetPipPosition();
      clampPipPosition();
    });
  }

  let showCountdown = $state(true);
  let countdownValue = $state("Iniciar");
  let countdownActive = $state(false);
  let countdownTimeouts: ReturnType<typeof setTimeout>[] = [];

  function clearCountdown() {
    countdownTimeouts.forEach(clearTimeout);
    countdownTimeouts = [];
  }

  function pauseReferenceVideo() {
    try {
      referenceVideoElement?.pause();
    } catch {}
  }

  function resumeReferenceVideo() {
    if (!referenceVideoElement) return;
    const playPromise = referenceVideoElement.play();
    if (playPromise) {
      playPromise.catch(() => {});
    }
  }

  function handleCountdownComplete() {
    countdownActive = false;
    showCountdown = false;
    resumeReferenceVideo();
    countdownTimeouts = [];
    if (isPaused) {
      void resumeTraining();
    }
  }

  function pauseForFullscreenExit() {
    pauseReferenceVideo();
    if (isCameraRunning && !isPaused) {
      pauseTraining();
    }
    countdownValue =
      elapsedTime > 0 || $trainingStore.reps > 0 ? "Retomar" : "Iniciar";
    showCountdown = true;
    countdownActive = false;
  }

  function startCountdown() {
    if (countdownActive) return;
    pauseReferenceVideo();

    if (!isFullscreen) {
      toggleFullscreen();
    }

    clearCountdown();
    countdownActive = true;

    countdownValue = "5";

    const t1 = setTimeout(() => (countdownValue = "4"), 1000);
    const t2 = setTimeout(() => (countdownValue = "3"), 2000);
    const t3 = setTimeout(() => (countdownValue = "2"), 3000);
    const t4 = setTimeout(() => (countdownValue = "1"), 4000);
    const t5 = setTimeout(() => (countdownValue = "Vai!"), 5000);
    const t6 = setTimeout(() => {
      handleCountdownComplete();
    }, 6000);

    countdownTimeouts = [t1, t2, t3, t4, t5, t6];
  }

  const SKELETON_STYLE = {
    lineWidth: 5,
    pointRadius: 7,
    opacity: 0.9,
    glow: 0,
  };

  const TORSO_LINE = {
    enabled: true,
    lineWidth: 5,
    color: "",
  };
  let drawConnectors:
    | ((
        ctx: CanvasRenderingContext2D,
        landmarks: unknown,
        connections: unknown,
        options: { color: string; lineWidth: number },
      ) => void)
    | null = null;
  let drawLandmarks:
    | ((
        ctx: CanvasRenderingContext2D,
        landmarks: unknown,
        options: { color: string; lineWidth: number; radius: number },
      ) => void)
    | null = null;
  let POSE_CONNECTIONS: unknown = null;
  let lastFrameTime = 0;
  const FRAME_THROTTLE_MS = 0;
  let animationFrameId: number | null = null;

  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
  ): (...args: Parameters<T>) => void {
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

      pose = new modules.Pose({
        locateFile: (file: string) => {
          return getPoseAssetUrl(file);
        },
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

    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;

    if (!width || !height) return;

    const needsResize =
      force || canvasElement.width !== width || canvasElement.height !== height;
    if (needsResize) {
      canvasElement.width = width;
      canvasElement.height = height;
      hasSyncedCanvas = true;
    }
  }

  function setEmulatedState(reason?: string) {
    cameraFallbackReason =
      reason || "Modo demonstração: usando vídeo de exemplo.";
    isCameraEmulated = true;
  }

  function clearEmulatedState() {
    cameraFallbackReason = "";
    isCameraEmulated = false;
  }

  function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    if (video.readyState >= 2) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener("loadeddata", handleReady);
        video.removeEventListener("canplay", handleReady);
        video.removeEventListener("error", handleError);
      };

      const handleReady = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        reject(new Error("Falha ao carregar vídeo de demonstração"));
      };

      video.addEventListener("loadeddata", handleReady, { once: true });
      video.addEventListener("canplay", handleReady, { once: true });
      video.addEventListener("error", handleError, { once: true });
    });
  }

  async function hasVideoInputAvailable(): Promise<boolean> {
    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.enumerateDevices
      ) {
        return false;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some((device) => device.kind === "videoinput");
    } catch (error) {
      console.warn("vision_warning:enumerate_devices_failed", error);
      return false;
    }
  }

  function createEmulatedCamera(reason?: string): MediaPipeCamera {
    return {
      async start() {
        if (!videoElement) throw new Error("Elemento de vídeo indisponível");
        if (!pose) throw new Error("Pose não inicializado");

        setEmulatedState(reason);

        if (emulatedFrameId) {
          cancelAnimationFrame(emulatedFrameId);
          emulatedFrameId = null;
        }

        videoElement.srcObject = null;
        videoElement.src = EMULATED_VIDEO_SRC;
        videoElement.loop = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.currentTime = 0;

        await waitForVideoReady(videoElement);
        await videoElement.play();
        syncCanvasSize(true);

        const renderFrame = async () => {
          if (!isCameraEmulated || !pose || !videoElement) return;

          try {
            await pose.send({ image: videoElement });
          } catch (err) {
            console.error("vision_error:emulated_frame", err);
          }

          emulatedFrameId = requestAnimationFrame(renderFrame);
        };

        emulatedFrameId = requestAnimationFrame(renderFrame);
      },
      stop() {
        if (emulatedFrameId) {
          cancelAnimationFrame(emulatedFrameId);
          emulatedFrameId = null;
        }

        if (videoElement) {
          videoElement.pause();
          videoElement.currentTime = 0;
          videoElement.srcObject = null;
        }

        clearEmulatedState();
      },
    };
  }

  function clearBiometricConsentFlags() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(BIOMETRIC_CONSENT_KEY);
    localStorage.removeItem(BIOMETRIC_CONSENT_TS_KEY);
    localStorage.removeItem(BIOMETRIC_CONSENT_EXP_KEY);
  }

  function hasValidBiometricConsent(): boolean {
    if (typeof window === "undefined") return false;
    const consent = localStorage.getItem(BIOMETRIC_CONSENT_KEY);
    if (consent !== "true") return false;

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
      errorMessage = "";
      hasSyncedCanvas = false;
      isPaused = false;
      resetQualityTracking();

      if (!ensureBiometricConsent()) {
        return;
      }

      if (!scriptsLoaded) {
        throw new Error(
          "Dependências ainda não foram carregadas completamente. Aguarde...",
        );
      }

      const selectedExercise = $trainingStore.exerciseType;
      if (!selectedExercise) {
        throw new Error(
          "Nenhum exercício selecionado. Por favor, volte e selecione um exercício.",
        );
      }

      if (!$trainingStore.backendSessionId) {
        trainingActions.selectExercise(selectedExercise);
      }

      const exerciseConfig = await loadExerciseConfig(selectedExercise);
      if (!exerciseConfig) {
        throw new Error("Falha ao carregar configuração do exercício");
      }

      analyzer = new ExerciseAnalyzer(exerciseConfig);
      analyzer.setCallbacks({
        onFeedback: handleFeedback,
        onMetricsUpdate: handleMetricsUpdate,
        onError: handleError,
      });

      const success = await analyzer.initialize();
      if (!success) {
        throw new Error("Falha ao inicializar analyzer");
      }

      if (!videoElement) {
        throw new Error("Elemento de vídeo não foi carregado corretamente.");
      }

      const Pose = (window as unknown as Record<string, unknown>)
        .Pose as new (config: {
        locateFile: (file: string) => string;
      }) => MediaPipePose;
      pose = new Pose({
        locateFile: getPoseAssetUrl,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onPoseResults);

      const globalScope = window as unknown as Record<string, unknown>;
      drawConnectors = globalScope.drawConnectors as typeof drawConnectors;
      drawLandmarks = globalScope.drawLandmarks as typeof drawLandmarks;
      POSE_CONNECTIONS = globalScope.POSE_CONNECTIONS;

      const Camera = globalScope.Camera as
        | (new (
            video: HTMLVideoElement,
            config: {
              onFrame: () => Promise<void>;
              width: number;
              height: number;
            },
          ) => MediaPipeCamera)
        | undefined;

      const hasPhysicalCamera = await hasVideoInputAvailable();
      const startWithRealCamera = async () => {
        if (!Camera) throw new Error("Biblioteca de câmera não encontrada.");

        clearEmulatedState();
        camera = new Camera(videoElement, {
          onFrame: async () => {
            if (pose && videoElement) {
              await pose.send({ image: videoElement });
            }
          },
          width: 1280,
          height: 720,
        });

        await camera.start();
        syncCanvasSize(true);
      };

      const startWithEmulatedCamera = async (reason: string) => {
        camera = createEmulatedCamera(reason);
        await camera.start();
      };

      if (hasPhysicalCamera && Camera) {
        try {
          await startWithRealCamera();
        } catch (cameraError) {
          console.warn(
            "vision_warning:camera_start_failed_fallback_to_emulation",
            cameraError,
          );
          await startWithEmulatedCamera(
            "Não conseguimos acessar a câmera. Usando vídeo de demonstração para testar.",
          );
        }
      } else {
        await startWithEmulatedCamera(
          "Nenhuma câmera detectada. Usando vídeo de demonstração para testar.",
        );
      }

      trainingActions.start();
      syncCanvasSize();
      startTimer();
      isCameraRunning = true;
      isLoading = false;
    } catch (error: unknown) {
      errorMessage = `Erro ao iniciar: ${(error as Error).message}`;
      clearEmulatedState();
      isCameraRunning = false;
      isLoading = false;
      console.error("vision_error:start_camera", error);
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

    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = requestAnimationFrame(() => {
      ctx.save();
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      ctx.translate(canvasElement.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(
        results.image,
        0,
        0,
        canvasElement.width,
        canvasElement.height,
      );

      const renderLandmarks = filterLandmarks(landmarks);

      if (
        renderLandmarks &&
        drawConnectors &&
        drawLandmarks &&
        POSE_CONNECTIONS
      ) {
        ctx.save();
        ctx.globalAlpha = SKELETON_STYLE.opacity;
        ctx.shadowBlur = SKELETON_STYLE.glow;
        ctx.shadowColor = skeletonColor;

        drawConnectors(
          ctx,
          renderLandmarks,
          removeTorsoSideLines(filterConnections(POSE_CONNECTIONS)),
          {
            color: skeletonColor,
            lineWidth: SKELETON_STYLE.lineWidth,
          },
        );

        ctx.save();
        ctx.globalAlpha = 0.3;
        drawLandmarks(ctx, renderLandmarks, {
          color: skeletonColor,
          lineWidth: 0,
          radius: SKELETON_STYLE.pointRadius * 2.2,
        });
        ctx.restore();

        drawLandmarks(ctx, renderLandmarks, {
          color: skeletonColor,
          lineWidth: Math.max(1, SKELETON_STYLE.lineWidth / 2),
          radius: SKELETON_STYLE.pointRadius,
        });

        if (
          TORSO_LINE.enabled &&
          skeletonVisibility.upperBody &&
          skeletonVisibility.lowerBody
        ) {
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

    if (activeTab === "dev" && landmarks) {
      currentLandmarks = landmarks;
    }
  }

  let skeletonVisibility = $state({
    face: false,
    upperBody: true,
    hands: true,
    lowerBody: true,
    feet: true,
  });

  function toggleAllSkeleton() {
    const allVisible =
      skeletonVisibility.face &&
      skeletonVisibility.upperBody &&
      skeletonVisibility.hands &&
      skeletonVisibility.lowerBody &&
      skeletonVisibility.feet;

    const newState = !allVisible;
    skeletonVisibility.face = newState;
    skeletonVisibility.upperBody = newState;
    skeletonVisibility.hands = newState;
    skeletonVisibility.lowerBody = newState;
    skeletonVisibility.feet = newState;
  }

  function filterLandmarks(landmarks: PoseResults["poseLandmarks"]) {
    if (!landmarks) return landmarks;
    const clone = landmarks.map((lm) => ({ ...lm }));

    if (!skeletonVisibility.face) {
      for (const idx of LANDMARK_GROUPS.FACE) {
        clone[idx] = { x: 0, y: 0, z: 0, visibility: 0 };
      }
    }

    if (!skeletonVisibility.upperBody) {
      for (const idx of LANDMARK_GROUPS.UPPER_BODY) {
        clone[idx] = { x: 0, y: 0, z: 0, visibility: 0 };
      }
    }

    if (!skeletonVisibility.hands) {
      for (const idx of LANDMARK_GROUPS.HANDS) {
        clone[idx] = { x: 0, y: 0, z: 0, visibility: 0 };
      }
    }

    if (!skeletonVisibility.lowerBody) {
      for (const idx of LANDMARK_GROUPS.LOWER_BODY) {
        clone[idx] = { x: 0, y: 0, z: 0, visibility: 0 };
      }
    }

    if (!skeletonVisibility.feet) {
      for (const idx of LANDMARK_GROUPS.FEET) {
        clone[idx] = { x: 0, y: 0, z: 0, visibility: 0 };
      }
    }

    return clone;
  }

  function filterConnections(connections: unknown) {
    if (!connections || !Array.isArray(connections)) return connections;

    const hiddenIndices = new Set<number>();

    if (!skeletonVisibility.face)
      LANDMARK_GROUPS.FACE.forEach((i) => hiddenIndices.add(i));
    if (!skeletonVisibility.upperBody)
      LANDMARK_GROUPS.UPPER_BODY.forEach((i) => hiddenIndices.add(i));
    if (!skeletonVisibility.hands)
      LANDMARK_GROUPS.HANDS.forEach((i) => hiddenIndices.add(i));
    if (!skeletonVisibility.lowerBody)
      LANDMARK_GROUPS.LOWER_BODY.forEach((i) => hiddenIndices.add(i));
    if (!skeletonVisibility.feet)
      LANDMARK_GROUPS.FEET.forEach((i) => hiddenIndices.add(i));

    return (connections as Array<[number, number]>).filter(
      ([a, b]) =>
        !hiddenIndices.has(a as number) && !hiddenIndices.has(b as number),
    );
  }

  function removeTorsoSideLines(connections: unknown) {
    if (!connections || !Array.isArray(connections)) return connections;
    const blocked = new Set(["11-23", "12-24"]);
    return (connections as Array<[number, number]>).filter(([a, b]) => {
      const key = `${a}-${b}`;
      const keyAlt = `${b}-${a}`;
      return !blocked.has(key) && !blocked.has(keyAlt);
    });
  }

  function drawTorsoLine(
    ctx: CanvasRenderingContext2D,
    landmarks: PoseResults["poseLandmarks"],
  ) {
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
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const hipMid = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };

    ctx.save();
    ctx.strokeStyle = skeletonColor;
    ctx.lineWidth = TORSO_LINE.lineWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(
      shoulderMid.x * ctx.canvas.width,
      shoulderMid.y * ctx.canvas.height,
    );
    ctx.lineTo(hipMid.x * ctx.canvas.width, hipMid.y * ctx.canvas.height);
    ctx.stroke();
    ctx.restore();
  }

  function resetQualityTracking() {
    repScores = Array(MAX_REP_SLOTS).fill(null);
    currentRepFrames = [];
    emaScore = 0;
    frameScore = 0;
    trainingStore.update((state) => ({ ...state, reps: 0 }));
  }

  function trackFrameScore(score: number) {
    frameScore = score;
    emaScore =
      emaScore === 0 ? score : SCORE_ALPHA * score + (1 - SCORE_ALPHA) * emaScore;
    currentRepFrames = [...currentRepFrames, score];
  }

  function maybeRegisterRep(feedback: FeedbackRecord) {
    const heuristicSummary = feedback.heuristic
      ?.summary as { validReps?: number } | null;
    const heuristicReps = heuristicSummary?.validReps ?? null;
    const currentReps = $trainingStore.reps;
    const nextRepCount =
      typeof heuristicReps === "number" ? heuristicReps : currentReps;

    if (nextRepCount > currentReps) {
      const repIndex = Math.min(nextRepCount - 1, MAX_REP_SLOTS - 1);
      const repScore =
        currentRepFrames.length > 0
          ? clampScore(average(currentRepFrames))
          : clampScore(frameScore || 0);

      const updated = [...repScores];
      updated[repIndex] = repScore;
      repScores = updated;
      currentRepFrames = [];
      trainingActions.incrementReps();
    }
  }

  function handleFeedback(feedback: FeedbackRecord) {
    currentFeedback = feedback;

    const frameQuality = calculateFrameScore(feedback);
    if (frameQuality !== null) {
      trackFrameScore(frameQuality);
    }

    confidence = clampScore(
      ((feedback.combined?.confidence ?? 0) as number) * 100,
    );

    skeletonColor = resolveCssColor(
      feedback.combined.verdict === "correct"
        ? SKELETON_COLORS.correct
        : feedback.combined.verdict === "incorrect"
          ? SKELETON_COLORS.incorrect
          : SKELETON_COLORS.neutral,
    );

    const newMessages = feedback.messages || [];
    const hasNewMessages =
      JSON.stringify(newMessages) !== JSON.stringify(feedbackMessages);

    if (hasNewMessages) {
      feedbackMessages = newMessages;
      if (isFeedbackEnabled) {
        const warningMessages = newMessages.filter(
          (msg) => msg.type === "warning",
        );
        if (warningMessages.length > 0) {
          audioFeedbackActions.playFeedback(warningMessages, {
            mode: feedbackMode,
            exercise: $trainingStore.exerciseType,
          });
        }
      }
    }

    maybeRegisterRep(feedback);

    if (feedback.ml?.error !== undefined) {
      reconstructionError = feedback.ml.error;
    }
  }

  function handleMetricsUpdate(metrics: {
    validReps?: number;
    accuracy?: string;
    avgConfidence?: number;
  }) {
    if (typeof metrics.avgConfidence === "number") {
      confidence = clampScore(metrics.avgConfidence * 100);
    }
  }

  function handleError(error: Error) {
    errorMessage = error.message || "Erro desconhecido";
    console.error("vision_error:processing", error);
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
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  async function finishTraining() {
    if (!analyzer) return;

    try {
      isLoading = true;
      await trainingActions.finish();

      if (camera) camera.stop();
      clearEmulatedState();
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
        resetQualityTracking();
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

  function changeFeedbackMode(mode: "hybrid" | "ml_only" | "heuristic_only") {
    feedbackMode = mode;

    if (mode === "ml_only") {
      modeIndicator = "ML Only (Autoencoder)";
    } else if (mode === "heuristic_only") {
      modeIndicator = "Heurística Only (Biomecânica)";
    } else {
      modeIndicator = "Híbrido (ML + Heurística)";
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
        orientation = "landscape";
        void enforceLandscapeOrientation();
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
        releaseOrientationLock();
        detectOrientation();
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
      releaseOrientationLock();
      detectOrientation();
      pauseForFullscreenExit();
      clearCountdown();
    }
  }

  async function enforceLandscapeOrientation() {
    orientation = "landscape";

    if (typeof screen === "undefined") return;
    const screenWithOrientation = screen as Screen & {
      orientation?: ScreenOrientation;
      lockOrientation?: (orientation: string) => Promise<void> | void;
      mozLockOrientation?: (orientation: string) => Promise<void> | void;
      msLockOrientation?: (orientation: string) => Promise<void> | void;
    };

    try {
      if (screenWithOrientation.orientation?.lock) {
        await screenWithOrientation.orientation
          .lock("landscape")
          .catch(() =>
            screenWithOrientation.orientation?.lock?.("landscape-primary"),
          );
      } else if (typeof screenWithOrientation.lockOrientation === "function") {
        screenWithOrientation.lockOrientation("landscape");
      } else if (
        typeof screenWithOrientation.mozLockOrientation === "function"
      ) {
        screenWithOrientation.mozLockOrientation("landscape");
      } else if (
        typeof screenWithOrientation.msLockOrientation === "function"
      ) {
        screenWithOrientation.msLockOrientation("landscape");
      }
    } catch {}
  }

  function releaseOrientationLock() {
    if (typeof screen === "undefined") return;
    const screenWithOrientation = screen as Screen & {
      orientation?: ScreenOrientation;
      unlockOrientation?: () => void;
      mozUnlockOrientation?: () => void;
      msUnlockOrientation?: () => void;
    };

    try {
      if (screenWithOrientation.orientation?.unlock) {
        screenWithOrientation.orientation.unlock();
      } else if (
        typeof screenWithOrientation.unlockOrientation === "function"
      ) {
        screenWithOrientation.unlockOrientation();
      } else if (
        typeof screenWithOrientation.mozUnlockOrientation === "function"
      ) {
        screenWithOrientation.mozUnlockOrientation();
      } else if (
        typeof screenWithOrientation.msUnlockOrientation === "function"
      ) {
        screenWithOrientation.msUnlockOrientation();
      }
    } catch {}
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
    if (!target.closest(".avatar-menu-container")) {
      showAvatarMenu = false;
    }
  }

  function handleBiometricConsentAccepted() {
    hasBiometricConsent = true;
    showBiometricConsent = false;
    startCamera();
  }

  function handleBiometricConsentDenied() {
    clearBiometricConsentFlags();
    showBiometricConsent = false;
    errorMessage =
      "Consentimento biométrico negado. A câmera não pode ser iniciada sem sua autorização.";
    setTimeout(() => {
      goto(`${base}/exercises`);
    }, 3000);
  }

  function detectOrientation() {
    if (isFullscreen) {
      orientation = "landscape";
      void enforceLandscapeOrientation();
    } else {
      orientation = window.matchMedia("(orientation: portrait)").matches
        ? "portrait"
        : "landscape";
    }
    syncCanvasSize(true);
    clampPipPosition();
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
    if (
      scriptsLoaded &&
      $trainingStore.exerciseType &&
      !isCameraRunning &&
      !isLoading &&
      !analyzer &&
      !hasStartedCamera
    ) {
      hasStartedCamera = true;
      setTimeout(() => startCamera(), 500);
    }
  });

  $effect(() => {
    if (layoutMode !== "side-by-side") {
      resetPipPosition();
    }
  });

  onMount(() => {
    (async () => {
      isDevMode = isDeveloper();
      await loadAllDependencies();
      detectOrientation();
    })();

    window.addEventListener("orientationchange", debouncedDetectOrientation);
    window.addEventListener("resize", debouncedDetectOrientation);
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Esc") {
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

      if (isFullscreen) {
        orientation = "landscape";
        void enforceLandscapeOrientation();
        snapPipToCenter();
      } else {
        releaseOrientationLock();
        detectOrientation();
        pauseForFullscreenExit();
        clearCountdown();
        snapPipToCenter();
      }

      clampPipPosition();
    };
    window.addEventListener("keydown", handleKeydown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    const handleScroll = debounce((e: Event) => {
      const target = e.target as HTMLElement;
      isScrolled = target.scrollTop > 50;
    }, 100);

    const handleWindowScroll = debounce(() => {
      isScrolled = window.scrollY > 50;
    }, 100);

    const viewport = document.querySelector(".sa-viewport");
    if (viewport) {
      viewport.addEventListener("scroll", handleScroll, { passive: true });
    } else {
      window.addEventListener("scroll", handleWindowScroll, { passive: true });
    }

    return () => {
      window.removeEventListener(
        "orientationchange",
        debouncedDetectOrientation,
      );
      window.removeEventListener("resize", debouncedDetectOrientation);
      window.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange,
      );
      if (viewport) {
        viewport.removeEventListener("scroll", handleScroll);
      } else {
        window.removeEventListener("scroll", handleWindowScroll);
      }
    };
  });

  function getClientPosition(e: MouseEvent | TouchEvent) {
    if (e instanceof TouchEvent) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function handlePipMouseDown(e: MouseEvent | TouchEvent) {
    if (layoutMode === "side-by-side") return;

    isDraggingPip = true;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const { x, y } = getClientPosition(e);
    dragOffset = {
      x: x - rect.left,
      y: y - rect.top,
    };
    e.preventDefault();
  }

  function handlePipMouseMove(e: MouseEvent | TouchEvent) {
    if (!isDraggingPip || !splitContainerElement) return;

    const containerRect = splitContainerElement.getBoundingClientRect();
    const pipWidth = pipSize.width;
    const pipHeight = pipSize.height;

    const { x, y } = getClientPosition(e);
    let newX = x - containerRect.left - dragOffset.x;
    let newY = y - containerRect.top - dragOffset.y;

    newX = Math.max(0, Math.min(newX, containerRect.width - pipWidth));
    newY = Math.max(0, Math.min(newY, containerRect.height - pipHeight));

    pipPosition = { x: newX, y: newY };
  }

  function handlePipMouseUp() {
    isDraggingPip = false;
    isResizingPip = false;
  }

  function handleResizeMouseDown(e: MouseEvent | TouchEvent) {
    isResizingPip = true;
    const { x, y } = getClientPosition(e);
    resizeStartPos = { x, y };
    resizeStartSize = { ...pipSize };
    e.stopPropagation();
    e.preventDefault();
  }

  function handleResizeMouseMove(e: MouseEvent | TouchEvent) {
    if (!isResizingPip || !splitContainerElement) return;

    const { x, y } = getClientPosition(e);
    const deltaX = x - resizeStartPos.x;
    const deltaY = y - resizeStartPos.y;

    const delta = Math.max(deltaX, deltaY);

    let newWidth = resizeStartSize.width + delta;

    newWidth = Math.max(150, Math.min(700, newWidth));

    const newHeight = newWidth * (9 / 16);

    pipSize = { width: newWidth, height: newHeight };
    clampPipPosition();
  }

  onDestroy(() => {
    if (camera) camera.stop();
    clearEmulatedState();
    if (analyzer) analyzer.destroy();
    if (timerInterval) clearInterval(timerInterval);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
  });
</script>

{#snippet fullscreenButton()}
  <button
    class="fullscreen-btn-floating"
    onclick={toggleFullscreen}
    aria-label="Tela cheia"
  >
    {#if isFullscreen}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"
        />
      </svg>
    {:else}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
        />
      </svg>
    {/if}
  </button>
{/snippet}

{#snippet repCounter(cssClass: string)}
  <div class={cssClass}>
    <div class="rep-info">
      <span class="rep-label">Reps.</span>
      <span class="rep-count">{$trainingStore.reps} /{MAX_REP_SLOTS}</span>
    </div>
    <div class="rep-progress">
      {#each Array(MAX_REP_SLOTS) as _, i}
        {@const storedScore = repScores[i]}
        {@const partialScore =
          storedScore === null && i === $trainingStore.reps
            ? (currentRepFrames.length ? clampScore(average(currentRepFrames)) : null)
            : storedScore}
        {@const fill = partialScore === null ? 0 : clampScore(partialScore)}
        {@const color =
          partialScore === null
            ? "rgba(255, 255, 255, 0.15)"
            : scoreToColor(fill)}
        <div
          class="rep-line"
          style={`--rep-fill-height:${fill}%; --rep-fill-color:${color};`}
        ></div>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet verticalRepSlide(cssClass = "")}
  {@const sliderFill = clampScore(emaScore)}
  {@const sliderColor = scoreToColor(sliderFill)}
  <div class="vertical-rep-slide {cssClass}">
    <div
      class="v-slide-track"
      style={`--slider-fill-color:${sliderColor}; --slider-fill-height:${sliderFill}%;`}
    >
      <div class="v-slide-inner">
        <div
          class="v-slide-fill"
          style:height={`${sliderFill}%`}
          style:background={sliderColor}
          style:box-shadow={`0 0 15px ${sliderColor}66`}
        ></div>
      </div>

      <div
        class="v-slide-handle"
        style:bottom={`${sliderFill}%`}
        style:background={sliderColor}
        style:box-shadow={`0 4px 12px ${sliderColor}55`}
      ></div>

      <div
        class="v-slide-bubble"
        style:top={`${100 - sliderFill}%`}
        style:color={sliderColor}
      >
        {Math.round(sliderFill)}
      </div>
    </div>
  </div>
{/snippet}

<svelte:head>
  <title>Elarin</title>
</svelte:head>

<main
  class="train-page"
  onmousemove={(e) => {
    handlePipMouseMove(e);
    handleResizeMouseMove(e);
  }}
  onmouseup={handlePipMouseUp}
  ontouchmove={(e) => {
    handlePipMouseMove(e);
    handleResizeMouseMove(e);
  }}
  ontouchend={handlePipMouseUp}
  ontouchcancel={handlePipMouseUp}
>
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
    {#if errorMessage}
      <div class="inline-alert error-alert">{errorMessage}</div>
    {/if}

    {#if isCameraEmulated}
      <div class="inline-alert info-alert">
        <span class="inline-alert-strong">Modo demonstração:</span>
        <span>{cameraFallbackReason}</span>
      </div>
    {/if}

    <div
      class="split-container"
      bind:this={splitContainerElement}
      class:fullscreen={isFullscreen}
      class:layout-side-by-side={layoutMode === "side-by-side"}
      class:layout-user-centered={layoutMode === "user-centered"}
      class:layout-coach-centered={layoutMode === "coach-centered"}
    >
      <div
        class="video-container"
        class:portrait={orientation === "portrait"}
        class:landscape={orientation === "landscape"}
        bind:this={videoContainerElement}
        style={layoutMode === "coach-centered" ? pipStyle() : undefined}
        onmousedown={layoutMode === "coach-centered"
          ? handlePipMouseDown
          : undefined}
        ontouchstart={layoutMode === "coach-centered"
          ? handlePipMouseDown
          : undefined}
        class:draggable-pip={layoutMode === "coach-centered"}
      >
        <video
          bind:this={videoElement}
          class="video-input"
          playsinline
          style="display: none;"
        >
          <track kind="captions" src="" label="No captions" />
        </video>

        <canvas
          bind:this={canvasElement}
          class="video-canvas"
          width="1280"
          height="720"
        ></canvas>

        {#if layoutMode === "coach-centered"}
          <div
            class="pip-resize-handle"
            onmousedown={handleResizeMouseDown}
          ></div>
        {/if}

        <div class="overlays-container">
          {#if (isCameraRunning || isPaused) && showTimer && !showCountdown && layoutMode === "user-centered"}
            <div class="timer-overlay card glass">
              <span class="timer-value">{formatTime(elapsedTime)}</span>
            </div>
          {/if}

          {#if (isCameraRunning || isPaused) && !showCountdown && isFeedbackEnabled && (isDevMode || feedbackMessages.length > 0 || reconstructionError !== null)}
            <div class="feedback-card">
              {#if isDevMode}
                <div class="mode-indicator in-card card glass">
                  {#if feedbackMode === "hybrid"}
                    <Microscope />
                  {:else if feedbackMode === "ml_only"}
                    <Bot />
                  {:else}
                    <Ruler />
                  {/if}
                  <span class="mode-text">{modeIndicator}</span>
                </div>
              {/if}

              {#if reconstructionError !== null}
                <div class="feedback-overlay">
                  <div class="feedback-message info card glass">
                    <span
                      >Erro de reconstrução: {reconstructionError.toFixed(
                        4,
                      )}</span
                    >
                  </div>
                </div>
              {/if}

              {#if feedbackMessages.length > 0}
                <div class="feedback-overlay">
                  {#each feedbackMessages
                    .filter((m) => !(m.text || "")
                          .toLowerCase()
                          .startsWith("erro de reconstrução"))
                    .slice(0, 3) as message}
                    <div
                      class="feedback-message card glass {message.type}"
                      class:critical={message.severity === "critical"}
                    >
                      <span>{message.text}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        {#if isCameraRunning || isPaused}
          {#if layoutMode === "user-centered" && !showCountdown && showReps}
            {@render repCounter("rep-counter-bar-overlay")}
            {@render verticalRepSlide("left-aligned")}
          {/if}

          {#if layoutMode !== "coach-centered"}
            {@render fullscreenButton()}
          {/if}
        {/if}
      </div>

      <div
        class="reference-container"
        style={layoutMode === "user-centered" ? pipStyle() : undefined}
        onmousedown={layoutMode === "user-centered"
          ? handlePipMouseDown
          : undefined}
        ontouchstart={layoutMode === "user-centered"
          ? handlePipMouseDown
          : undefined}
        class:draggable-pip={layoutMode === "user-centered"}
      >
        <video
          class="reference-video"
          bind:this={referenceVideoElement}
          src="{base}/videos/squat.mp4"
          playsinline
          loop
          muted
        >
          <track kind="captions" src="" label="No captions" />
        </video>

        <div class="overlays-container">
          {#if (isCameraRunning || isPaused) && showTimer && !showCountdown && (layoutMode === "side-by-side" || layoutMode === "coach-centered")}
            <div class="timer-overlay card glass">
              <span class="timer-value">{formatTime(elapsedTime)}</span>
            </div>
          {/if}
        </div>

        {#if layoutMode === "user-centered"}
          <div
            class="pip-resize-handle"
            onmousedown={handleResizeMouseDown}
            ontouchstart={handleResizeMouseDown}
          ></div>
        {/if}

        {#if (isCameraRunning || isPaused) && layoutMode === "coach-centered" && !showCountdown}
          {#if showReps}
            {@render repCounter("rep-counter-bar-overlay")}
            {@render verticalRepSlide("left-aligned")}
          {/if}
          {@render fullscreenButton()}
        {/if}
      </div>

      {#if isCameraRunning || isPaused}
        {#if showCountdown}
          <div class="countdown-overlay">
            <button
              class="countdown-circle"
              class:pulsing={countdownActive}
              onclick={startCountdown}
              disabled={countdownActive && countdownValue !== "Iniciar"}
            >
              <span
                class="countdown-text"
                class:is-number={["5", "4", "3", "2", "1"].includes(
                  countdownValue,
                )}>{countdownValue}</span
              >
            </button>
          </div>
        {:else if layoutMode === "side-by-side" && showReps}
          {@render repCounter("rep-counter-bar-overlay")}
          {@render verticalRepSlide()}
        {/if}
      {/if}
    </div>

    {#if isCameraRunning || isPaused}
      <div class="settings-panel">
        <div class="settings-tabs">
          <button
            class="tab-btn"
            class:active={activeTab === "display"}
            onclick={() => (activeTab = "display")}>Exibição</button
          >
          <button
            class="tab-btn"
            class:active={activeTab === "skeleton"}
            onclick={() => (activeTab = "skeleton")}>Esqueleto</button
          >
          <button
            class="tab-btn"
            class:active={activeTab === "sound"}
            onclick={() => (activeTab = "sound")}>Som e Efeitos</button
          >

          {#if isDevMode}
            <button
              class="tab-btn"
              class:active={activeTab === "dev"}
              onclick={() => (activeTab = "dev")}>Dev</button
            >
          {/if}
        </div>

        <div class="settings-content">
          {#if activeTab === "display"}
            <div class="settings-group">
              <h4>Escolher Layout de Exibição</h4>
              <div class="layout-options">
                <div
                  class="layout-option"
                  class:active={layoutMode === "side-by-side"}
                  onclick={() => (layoutMode = "side-by-side")}
                >
                  <div class="layout-preview side-by-side"></div>
                  <span>Lado a Lado</span>
                </div>
                <div
                  class="layout-option"
                  class:active={layoutMode === "user-centered"}
                  onclick={() => (layoutMode = "user-centered")}
                >
                  <div class="layout-preview user-centered"></div>
                  <span>Usuário Centralizado</span>
                </div>
                <div
                  class="layout-option"
                  class:active={layoutMode === "coach-centered"}
                  onclick={() => (layoutMode = "coach-centered")}
                >
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
                  <button
                    class="toggle-btn"
                    class:on={showTimer}
                    onclick={() => (showTimer = !showTimer)}
                  ></button>
                  <span class="toggle-label">{showTimer ? "On" : "Off"}</span>
                </div>
              </div>
              <div class="toggle-row">
                <span>Contador de repetições</span>
                <div class="toggle-wrapper">
                  <button
                    class="toggle-btn"
                    class:on={showReps}
                    onclick={() => (showReps = !showReps)}
                  ></button>
                  <span class="toggle-label">{showReps ? "On" : "Off"}</span>
                </div>
              </div>
              <div class="toggle-row">
                <span>Feedback Visual</span>
                <div class="toggle-wrapper">
                  <button
                    class="toggle-btn"
                    class:on={isFeedbackEnabled}
                    onclick={toggleFeedback}
                  ></button>
                  <span class="toggle-label"
                    >{isFeedbackEnabled ? "On" : "Off"}</span
                  >
                </div>
              </div>
            </div>
          {:else if activeTab === "sound"}
            <div class="settings-group">
              <h4>Configurações de Som</h4>
              <div class="toggle-row">
                <span>Feedback de Áudio</span>
                <div class="toggle-wrapper">
                  <button
                    class="toggle-btn"
                    class:on={$audioFeedbackStore.isEnabled}
                    onclick={toggleAudio}
                  ></button>
                  <span class="toggle-label"
                    >{$audioFeedbackStore.isEnabled ? "On" : "Off"}</span
                  >
                </div>
              </div>
            </div>
          {:else if activeTab === "skeleton"}
            <div class="settings-group">
              <h4>Sobreposição de Esqueleto</h4>

              <div class="toggle-row">
                <span><strong>Mostrar Tudo</strong></span>
                <div class="toggle-wrapper">
                  <button
                    class="toggle-btn"
                    class:on={skeletonVisibility.face &&
                      skeletonVisibility.upperBody &&
                      skeletonVisibility.hands &&
                      skeletonVisibility.lowerBody &&
                      skeletonVisibility.feet}
                    onclick={toggleAllSkeleton}
                    aria-label="Toggle All Skeleton Parts"
                  ></button>
                  <span class="toggle-label"
                    >{skeletonVisibility.face &&
                    skeletonVisibility.upperBody &&
                    skeletonVisibility.hands &&
                    skeletonVisibility.lowerBody &&
                    skeletonVisibility.feet
                      ? "On"
                      : "Off"}</span
                  >
                </div>
              </div>

              <div class="toggle-row">
                <span>Face</span>
                <div class="toggle-wrapper">
                  <button
                    class="toggle-btn"
                    class:on={skeletonVisibility.face}
                    onclick={() =>
                      (skeletonVisibility.face = !skeletonVisibility.face)}
                    aria-label="Toggle Face Visibility"
                  ></button>
                  <span class="toggle-label"
                    >{skeletonVisibility.face ? "On" : "Off"}</span
                  >
                </div>
              </div>

              <div class="toggle-row">
                <span>Tronco Superior</span>
                <div class="toggle-wrapper">
                  <button
                    class="toggle-btn"
                    class:on={skeletonVisibility.upperBody}
                    onclick={() =>
                      (skeletonVisibility.upperBody =
                        !skeletonVisibility.upperBody)}
                    aria-label="Toggle Upper Body Visibility"
                  ></button>
                  <span class="toggle-label"
                    >{skeletonVisibility.upperBody ? "On" : "Off"}</span
                  >
                </div>
              </div>

              <div class="toggle-row">
                <span>Mãos</span>
                <div class="toggle-wrapper">
                  <button
                    class="toggle-btn"
                    class:on={skeletonVisibility.hands}
                    onclick={() =>
                      (skeletonVisibility.hands = !skeletonVisibility.hands)}
                    aria-label="Toggle Hands Visibility"
                  ></button>
                  <span class="toggle-label"
                    >{skeletonVisibility.hands ? "On" : "Off"}</span
                  >
                </div>
              </div>

              <div class="toggle-row">
                <span>Tronco Inferior</span>
                <div class="toggle-wrapper">
                  <button
                    class="toggle-btn"
                    class:on={skeletonVisibility.lowerBody}
                    onclick={() =>
                      (skeletonVisibility.lowerBody =
                        !skeletonVisibility.lowerBody)}
                    aria-label="Toggle Lower Body Visibility"
                  ></button>
                  <span class="toggle-label"
                    >{skeletonVisibility.lowerBody ? "On" : "Off"}</span
                  >
                </div>
              </div>

              <div class="toggle-row">
                <span>Pés</span>
                <div class="toggle-wrapper">
                  <button
                    class="toggle-btn"
                    class:on={skeletonVisibility.feet}
                    onclick={() =>
                      (skeletonVisibility.feet = !skeletonVisibility.feet)}
                    aria-label="Toggle Feet Visibility"
                  ></button>
                  <span class="toggle-label"
                    >{skeletonVisibility.feet ? "On" : "Off"}</span
                  >
                </div>
              </div>
            </div>
          {:else if activeTab === "dev"}
            <div class="settings-group settings-group-full">
              <h4>Métricas de Desenvolvimento</h4>
              <div class="dev-metrics">
                <div class="dev-metric-card">
                  <span class="dev-metric-label">Precisão</span>
                  <span class="dev-metric-value">{emaScore.toFixed(1)}%</span>
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

              <h4 class="dev-section-title">Controle de Feedback</h4>
              <div class="mode-buttons-mini">
                <button
                  class="mini-btn"
                  class:active={feedbackMode === "hybrid"}
                  onclick={() => changeFeedbackMode("hybrid")}>Híbrido</button
                >
                <button
                  class="mini-btn"
                  class:active={feedbackMode === "ml_only"}
                  onclick={() => changeFeedbackMode("ml_only")}
                  >ML Apenas</button
                >
                <button
                  class="mini-btn"
                  class:active={feedbackMode === "heuristic_only"}
                  onclick={() => changeFeedbackMode("heuristic_only")}
                  >Heurística</button
                >
              </div>
              <div class="debug-info-mini">{modeIndicator}</div>
            </div>

            <div class="settings-group settings-group-full">
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
                          <span
                            class="val-data"
                            style:color={lm.visibility && lm.visibility > 0.5
                              ? "var(--color-success)"
                              : "var(--color-error)"}
                          >
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

    <BiometricConsent
      bind:visible={showBiometricConsent}
      on:accepted={handleBiometricConsentAccepted}
      on:denied={handleBiometricConsentDenied}
    />
  </div>
</main>

<style>
  .train-page {
    --player-min-width: 320px;
    --player-max-width: 960px;
    --player-width: clamp(
      var(--player-min-width),
      45vw,
      var(--player-max-width)
    );
    --player-height: calc(var(--player-width) * 0.5625);
    --player-zoom: 1.06;
    --layout-max-width: 1280px;

    min-height: 100vh;
    background: var(--color-bg-dark);
    color: var(--color-text-primary);
  }

  .content {
    padding: 1rem;
    width: 100%;
    max-width: 1600px;
    margin: 0 auto;
  }

  .inline-alert {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    border-radius: var(--radius-md);
    background: var(--glass-bg, rgba(255, 255, 255, 0.04));
    border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
    color: var(--color-text-primary);
    backdrop-filter: var(--glass-backdrop, blur(12px));
    -webkit-backdrop-filter: var(--glass-backdrop, blur(12px));
  }

  .inline-alert-strong {
    font-weight: 700;
  }

  .inline-alert.error-alert {
    border-left: 4px solid var(--color-error);
  }

  .inline-alert.info-alert {
    border-left: 4px solid var(--color-warning);
  }

  .split-container {
    --container-gap: 0;
    --container-max-width: var(--layout-max-width);
    --container-height: calc(100vh - 6rem);

    display: grid;
    width: min(100%, var(--container-max-width));
    max-width: var(--container-max-width);
    height: var(--container-height);
    min-height: 60vh;
    margin: 0 auto 2rem;
    gap: var(--container-gap);
    position: relative;
    justify-self: center;

    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }

  .split-container.layout-side-by-side {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr;
  }

  .split-container.layout-user-centered,
  .split-container.layout-coach-centered {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }

  @media (max-width: 1280px) {
    .split-container {
      max-height: 70vh;
    }
  }

  .video-container {
    position: relative;
    margin: 0 auto;
    border-radius: var(--radius-md) 0 0 var(--radius-md);
    overflow: hidden;
    background: var(--color-bg-deep, #000);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    width: 100%;
    height: 100%;
    max-height: none;
    aspect-ratio: 16 / 9;
  }

  .reference-container {
    position: relative;
    width: 100%;
    height: 100%;
    aspect-ratio: 16/9;
    border-radius: 0 var(--radius-md) var(--radius-md) 0;
    overflow: hidden;
    background: var(--color-bg-deep, #000);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    max-height: none;
  }

  .split-container.layout-user-centered:not(.fullscreen),
  .split-container.layout-coach-centered:not(.fullscreen) {
    grid-template-columns: 1fr;
    position: relative;
    width: 100%;
    max-width: 1280px;
    height: auto;
    min-height: 0;
  }

  .split-container.layout-user-centered:not(.fullscreen) .video-container {
    width: 100%;
    height: var(--player-height);
    max-height: 80vh;
    border-radius: var(--radius-md);
  }

  .split-container.layout-user-centered .reference-container {
    position: absolute;
    width: 200px;
    height: auto;
    aspect-ratio: 16/9;
    z-index: 50;
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
    max-height: none;
  }

  .split-container.layout-coach-centered:not(.fullscreen) .reference-container {
    width: 100%;
    height: var(--player-height);
    max-height: 80vh;
    border-radius: var(--radius-md);
  }

  .split-container.layout-coach-centered .video-container {
    position: absolute;
    width: 200px;
    height: auto;
    aspect-ratio: 16/9;
    z-index: 50;
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
    max-height: none;
  }

  .draggable-pip {
    cursor: move;
    user-select: none;
  }

  .draggable-pip:active {
    cursor: grabbing;
  }

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
    content: "";
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 8px;
    height: 8px;
    border-right: 2px solid rgba(255, 255, 255, 0.8);
    border-bottom: 2px solid rgba(255, 255, 255, 0.8);
  }

  .fullscreen-btn-floating {
    position: absolute;
    top: 1rem;
    left: 1rem;
    width: 48px;
    height: 48px;
    background: var(--glass-bg, rgba(0, 0, 0, 0.7));
    backdrop-filter: var(--glass-backdrop, blur(10px));
    -webkit-backdrop-filter: var(--glass-backdrop, blur(10px));
    border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.2));
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-text-primary, #fff);
    transition: all 0.3s ease;
    z-index: 15;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .fullscreen-btn-floating:hover {
    background: var(--glass-bg, rgba(0, 0, 0, 0.85));
    border-color: var(--glass-border, rgba(255, 255, 255, 0.4));
    transform: scale(1.05);
  }

  .fullscreen-btn-floating:active {
    transform: scale(0.95);
  }

  .fullscreen-btn-floating svg {
    flex-shrink: 0;
  }

  .rep-counter-bar {
    position: relative;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.06),
      rgba(255, 255, 255, 0.02)
    );
    backdrop-filter: blur(14px) saturate(120%);
    -webkit-backdrop-filter: blur(14px) saturate(120%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    padding: 0.75rem 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    z-index: 10;
  }

  .rep-counter-bar-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.55),
      rgba(0, 0, 0, 0.35)
    );
    backdrop-filter: blur(14px) saturate(120%);
    -webkit-backdrop-filter: blur(14px) saturate(120%);
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    border-inline: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 -10px 30px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    font-size: clamp(9px, 1.35vh, 17px);
    padding: 1em 1.5em;
    display: flex;
    align-items: center;
    gap: 1.5em;
    z-index: 20;
    pointer-events: none;
  }

  .rep-counter-bar-overlay * {
    pointer-events: auto;
  }

  .rep-info {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    min-width: 6em;
  }

  .rep-label {
    font-size: 1.2em;
    color: var(--color-text-secondary, #888);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .rep-count {
    font-size: 5em;
    font-weight: 300;
    color: var(--color-text-primary, #fff);
    line-height: 1;
  }

  .rep-progress {
    flex: 1;
    display: flex;
    align-items: flex-end;
    gap: 1em;
    height: 7em;
    padding-bottom: 0.25em;
  }

  .rep-line {
    width: 1em;
    flex-shrink: 0;
    height: 100%;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 99em;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    --rep-fill-height: 0%;
    --rep-fill-color: rgba(255, 255, 255, 0.2);
  }

  .rep-line::before {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: var(--rep-fill-height);
    background: var(--rep-fill-color);
    border-radius: 99em;
    box-shadow: 0 0 10px
      color-mix(in srgb, var(--rep-fill-color) 40%, transparent);
    transition: height 0.3s ease, background 0.2s ease;
  }

  @keyframes pulse-tube {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  .vertical-rep-slide {
    position: absolute;
    top: 50%;
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
    background: var(--glass-bg, rgba(0, 0, 0, 0.6));
    backdrop-filter: var(--glass-backdrop, blur(4px));
    -webkit-backdrop-filter: var(--glass-backdrop, blur(4px));
    border-radius: 999px;
    position: relative;
    overflow: visible;
    border: 3px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  }

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
    background: var(--slider-fill-color, #22c55e);
    transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 15px
      color-mix(
        in srgb,
        var(--slider-fill-color, #22c55e) 45%,
        transparent
      );
    border-radius: 28px 28px 0 0;
  }

  .v-slide-handle {
    position: absolute;
    left: 50%;
    transform: translate(-50%, 50%);
    width: 40px;
    height: 40px;
    background: var(--slider-fill-color, rgba(255, 255, 255, 1));
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10;
    transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .countdown-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .countdown-circle {
    width: clamp(140px, 28vw, 220px);
    height: clamp(140px, 28vw, 220px);
    border-radius: 50%;
    background: var(--glass-bg, rgba(0, 0, 0, 0.6));
    backdrop-filter: var(--glass-backdrop, blur(10px));
    -webkit-backdrop-filter: var(--glass-backdrop, blur(10px));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.5);
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }

  .countdown-circle:hover:not(:disabled) {
    background: var(--glass-bg, rgba(0, 0, 0, 0.8));
    border-color: var(--glass-border, rgba(255, 255, 255, 0.6));
    transform: scale(1.05);
    box-shadow: 0 0 40px rgba(255, 255, 255, 0.1);
  }

  .countdown-circle:disabled {
    cursor: default;
  }

  .countdown-text {
    font-size: clamp(1.4rem, 4vw, 2rem);
    font-weight: 300;
    color: var(--color-text-primary, #fff);
    letter-spacing: 0.05em;
  }

  .countdown-circle.pulsing {
    animation: pulse-countdown 1s ease-in-out infinite;
    background: var(--glass-bg);
    border-color: var(--color-primary-500);
    box-shadow: 0 0 50px var(--color-primary-500);
  }

  .countdown-circle.pulsing .countdown-text {
    color: var(--color-primary-500);
    text-shadow: 0 0 20px rgba(var(--color-primary-500-rgb), 0.5);
  }

  .countdown-text.is-number {
    font-size: clamp(2.5rem, 9vw, 4.5rem);
    font-weight: 300;
  }

  .split-container.fullscreen .countdown-circle {
    width: clamp(180px, 24vh, 320px);
    height: clamp(180px, 24vh, 320px);
  }

  .split-container.fullscreen .countdown-text {
    font-size: clamp(1.8rem, 5vw, 2.6rem);
  }

  .split-container.fullscreen .countdown-text.is-number {
    font-size: clamp(3rem, 11vw, 5.5rem);
  }

  @keyframes pulse-countdown {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0
        color-mix(in srgb, var(--slider-fill-color, #22c55e) 70%, transparent);
    }
    70% {
      transform: scale(1.1);
      box-shadow: 0 0 0 30px
        color-mix(in srgb, var(--slider-fill-color, #22c55e) 0%, transparent);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 transparent;
    }
  }

  .v-slide-handle::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 30px;
    height: 30px;
    background: #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.5);
    z-index: 2;
  }

  .v-slide-handle::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 28px;
    height: 28px;
    background: var(--slider-fill-color, #22c55e);
    border-radius: 50%;
    z-index: 1;
  }

  .v-slide-bubble {
    position: absolute;
    right: -95px;
    top: 0;
    transform: translateY(-50%);
    background: var(--glass-bg);
    backdrop-filter: var(--glass-backdrop);
    -webkit-backdrop-filter: var(--glass-backdrop);
    color: var(--color-text-primary);
    padding: 8px 22px;
    border-radius: var(--radius-sm);
    font-size: 1.5rem;
    font-weight: 400;
    font-family: "Inter", sans-serif;
    white-space: nowrap;
    transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .v-slide-bubble::before {
    content: "";
    position: absolute;
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 6px solid var(--glass-bg);
  }

  .vertical-rep-slide.left-aligned {
    left: 2rem;
    right: auto;
    transform: translateY(-50%);
  }

  .reference-video {
    width: auto;
    min-width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scale(var(--player-zoom));
    transform-origin: center;
  }

  @media (max-width: 1023px) {
    .split-container {
      height: auto;
      min-height: 0;
      max-height: none;
    }

    .split-container.layout-side-by-side:not(.fullscreen) {
      grid-template-columns: 1fr;
      gap: 0;
    }

    .split-container.layout-side-by-side:not(.fullscreen) .video-container {
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }

    .split-container.layout-side-by-side:not(.fullscreen) .reference-container {
      border-radius: 0 0 var(--radius-md) var(--radius-md);
    }

    .split-container.layout-user-centered:not(.fullscreen) .video-container,
    .split-container.layout-coach-centered:not(.fullscreen)
      .reference-container {
      height: calc(var(--player-height) * 2);
    }
  }

  .split-container.layout-side-by-side:not(.fullscreen) {
    justify-items: stretch;
    align-items: stretch;
    height: auto;
    min-height: 0;
  }

  .split-container.layout-side-by-side:not(.fullscreen) .video-container,
  .split-container.layout-side-by-side:not(.fullscreen) .reference-container {
    width: 100%;
    max-width: 100%;
    height: var(--player-height);
    max-height: 80vh;
    margin: 0;
    align-self: center;
    justify-self: center;
  }

  .split-container.fullscreen.layout-side-by-side {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    background: var(--color-bg-dark);
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    max-width: none;
    display: grid;
    grid-template-columns: 50vw 50vw;
    align-items: center;
    justify-items: center;
    gap: 0;
  }

  .split-container.fullscreen.layout-side-by-side .video-container,
  .split-container.fullscreen.layout-side-by-side .reference-container {
    width: 100%;
    height: 100vh;
    border-radius: 0;
    margin: 0;
    align-self: stretch;
    justify-self: stretch;
  }

  .split-container.fullscreen.layout-user-centered,
  .split-container.fullscreen.layout-coach-centered {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    background: var(--color-bg-dark);
    display: block;
    margin: 0;
    padding: 0;
    max-width: none;
  }

  .split-container.fullscreen.layout-user-centered .video-container {
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    margin: 0;
    border-radius: 0;
    position: absolute;
    top: 0;
    left: 0;
  }

  .split-container.fullscreen.layout-coach-centered .reference-container {
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
    margin: 0;
    border-radius: 0;
    position: absolute;
    top: 0;
    left: 0;
  }

  .split-container.fullscreen.layout-user-centered .reference-container,
  .split-container.fullscreen.layout-coach-centered .video-container {
    z-index: 10000;
    position: absolute;
    max-height: none;
  }

  .split-container.fullscreen.layout-side-by-side .video-canvas,
  .split-container.fullscreen.layout-side-by-side .reference-video {
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    transform: scale(var(--player-zoom));
    transform-origin: center;
  }

  .split-container.fullscreen.layout-user-centered .video-canvas,
  .split-container.fullscreen.layout-coach-centered .reference-video {
    width: 100%;
    height: 100%;
    max-height: 100%;
    object-fit: cover;
    transform: scale(var(--player-zoom));
    transform-origin: center;
  }

  .video-canvas {
    display: block;
    transition: all 0.3s ease-in-out;
    width: auto;
    min-width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scale(var(--player-zoom));
    transform-origin: center;
  }

  .video-container.landscape {
    width: 100%;
    height: auto;
    max-width: 1280px;
    aspect-ratio: 16 / 9;
  }

  .video-container.landscape .video-canvas {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scale(var(--player-zoom));
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
    width: 100%;
    height: 100%;
    max-width: 100%;
    object-fit: cover;
    transform: scale(var(--player-zoom));
    object-position: center center;
  }

  .video-container.fullscreen {
    position: fixed;
    inset: 0;
    border-radius: 0;
    margin: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-dark);
  }

  .video-container.fullscreen.landscape {
    width: 100vw;
    height: auto;
    max-width: none;
    max-height: 100vh;
  }

  .video-container.fullscreen.landscape .video-canvas {
    width: 100%;
    height: auto;
    max-height: 100vh;
    object-fit: contain;
  }

  .video-container.fullscreen.portrait {
    width: auto;
    height: 100vh;
    max-width: 100vw;
    aspect-ratio: 9 / 16;
    overflow: hidden;
  }

  .video-container.fullscreen.portrait .video-canvas {
    width: auto;
    height: 100%;
    min-width: unset;
    object-fit: contain;
    object-position: center center;
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
  }

  .overlays-container {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding: clamp(10px, 2vh, 20px) clamp(8px, 1.5vw, 10px);
    pointer-events: none;
    z-index: 50;
    transform: scale(var(--overlay-scale, 1));
    transform-origin: top right;
  }

  .timer-overlay {
    --timer-size: clamp(108px, 11vw, 136px);
    position: absolute;
    right: clamp(12px, 2vw, 18px);
    top: clamp(12px, 2vw, 18px);
    transform: none;
    width: var(--timer-size);
    height: var(--timer-size);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50% !important;
    padding: 0;
    pointer-events: none;
    overflow: hidden;
    border: 1px solid var(--glass-border);
  }

  .timer-value {
    font-size: 1.6rem;
    font-weight: 300;
    color: var(--color-text-primary);
    line-height: 1.1;
    text-align: center;
    letter-spacing: 0.08em;
    font-variant-numeric: tabular-nums;
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
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.8),
      transparent
    );
  }

  .feedback-message::after,
  .mode-indicator::after {
    content: "";
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
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .card {
    border-radius: var(--radius-standard);
  }

  .debug-panel {
    max-width: 1280px;
    margin: 20px auto;
    padding: 20px;
    background: var(--color-bg-dark-strong);
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
    width: clamp(14px, 2.2vw, 18px);
    height: clamp(14px, 2.2vw, 18px);
    flex-shrink: 0;
  }

  .mode-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
      width: clamp(12px, 1.8vw, 16px);
      height: clamp(12px, 1.8vw, 16px);
    }

    .feedback-overlay {
      max-width: clamp(180px, 60vw, 400px);
    }
  }

  .settings-panel {
    width: min(100%, var(--layout-max-width));
    max-width: var(--layout-max-width);
    margin: 0 auto;
    justify-self: center;
    background: var(--color-bg-dark);
    color: var(--color-text-primary);
    padding: clamp(1rem, 4vw, 1.5rem);
    padding-bottom: clamp(1.5rem, 5vw, 2rem);
    animation: slideUp 0.3s ease-out;
    border-radius: var(--radius-lg);
    box-shadow: var(--glass-shadow);
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .settings-tabs {
    display: flex;
    gap: 2rem;
    margin-bottom: 2rem;
    padding-bottom: 0.5rem;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--glass-border);
  }

  .tab-btn {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    padding-bottom: 0.5rem;
    position: relative;
    transition: color 0.2s;
  }

  .tab-btn:hover {
    color: var(--color-text-primary);
  }

  .tab-btn.active {
    color: var(--color-text-primary);
  }

  .tab-btn.active::after {
    content: "";
    position: absolute;
    bottom: -0.6rem;
    left: 0;
    width: 100%;
    height: 3px;
    background: var(--color-primary-500);
    border-radius: 2px;
  }

  .settings-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 3rem;
    align-items: start;
  }

  @media (max-width: 768px) {
    .settings-content {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .settings-tabs {
      gap: 1rem;
    }

    .settings-panel {
      padding: 1rem;
    }
  }

  .settings-group h4 {
    font-size: 1rem;
    color: var(--color-text-primary);
    margin-bottom: 1.5rem;
    font-weight: 600;
  }

  .settings-group-full {
    grid-column: 1 / -1;
  }

  .dev-section-title {
    margin: 1.5rem 0 0.5rem;
  }

  .layout-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1.5rem;
    justify-items: center;
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

  .layout-option.active .layout-preview::after {
    content: "";
    position: absolute;
    inset: 1px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: calc(var(--radius-md) - 3px);
    pointer-events: none;
  }

  .layout-preview {
    width: 100px;
    height: 60px;
    border: 2px solid var(--glass-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-dark-quaternary);
    position: relative;
  }

  .layout-option.active .layout-preview {
    border-color: var(--color-primary-500);
  }

  .layout-preview.side-by-side {
    background: linear-gradient(90deg, #333 50%, #fff 50%);
  }

  .layout-preview.user-centered {
    background: #333;
    position: relative;
  }

  .layout-preview.user-centered::before {
    content: "";
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
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
    content: "";
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
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
    color: var(--color-text-primary);
  }

  .toggle-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .toggle-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-text-secondary);
    min-width: 28px;
    text-align: left;
  }

  .dev-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .dev-metric-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
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
    color: var(--color-text-secondary, #888);
    font-weight: 500;
  }

  .dev-metric-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-primary-500);
  }

  .toggle-btn {
    position: relative;
    width: 44px;
    height: 24px;
    background: var(--color-bg-dark-secondary, #39393d);
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
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: var(--color-text-primary, #fff);
    border-radius: 50%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    z-index: 2;
  }

  .toggle-btn.on {
    background: var(--color-primary-500);
  }

  .toggle-btn.on::before {
    transform: translateX(20px);
  }

  .landmark-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .landmark-card {
    background: var(--glass-bg, rgba(255, 255, 255, 0.03));
    border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
    border-radius: var(--radius-sm);
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition:
      transform 0.2s ease,
      background 0.2s ease;
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
    background: var(--glass-bg, rgba(255, 255, 255, 0.1));
    color: var(--color-text-secondary, #aaa);
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
    color: var(--color-text-secondary, #666);
    font-family: monospace;
  }

  .val-data {
    color: var(--color-text-primary);
    font-family: monospace;
    font-weight: 500;
  }

  .landmark-waiting {
    font-size: 0.75rem;
    color: var(--color-text-secondary, #666);
    font-style: italic;
    text-align: center;
    padding: 1rem 0;
  }

  .mode-buttons-mini {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .mini-btn {
    background: var(--color-bg-dark-secondary, #222);
    border: 1px solid var(--glass-border, #444);
    color: var(--color-text-primary);
    padding: 0.3rem 0.8rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .mini-btn.active {
    background: var(--color-text-primary, #fff);
    color: var(--color-bg-deep, #000);
  }

  .debug-info-mini {
    font-size: 0.8rem;
    color: var(--color-text-secondary, #888);
    margin-top: 0.5rem;
  }
</style>
