/**
 * Exercise Analyzer - Orquestrador Principal
 * ===========================================
 *
 * Orquestra toda a análise de exercícios combinando:
 * 1. ML Classifier (autoencoder one-class)
 * 2. Heuristic Validator (regras biomecânicas)
 * 3. Feedback System (integração inteligente)
 *
 * Esta é a classe principal que deve ser usada pelas páginas.
 */

import type { PoseLandmarks } from '../types';
import type { ValidationResult } from '../types/validator.types';
import type { ExerciseConfig } from '../types/exercise.types';
import type { MLResult, FeedbackRecord, FeedbackStatistics } from './FeedbackSystem';
import { GenericExerciseClassifier } from '../ml/GenericClassifier';
import { FeedbackSystem } from './FeedbackSystem';
import type { BaseValidator } from '../validators/BaseValidator';
import { createValidator, hasValidator } from '../validators';
import { base } from '$app/paths';

export interface AnalyzerMetrics {
  totalFrames: number;
  correctFrames: number;
  incorrectFrames: number;
  avgConfidence: number;
  sessionStart: number | null;
  sessionDuration: number;
}

export interface AnalyzerCallbacks {
  onFeedback?: (feedback: FeedbackRecord) => void;
  onMetricsUpdate?: (metrics: ExtendedMetrics) => void;
  onError?: (error: Error) => void;
}

export interface ExtendedMetrics extends AnalyzerMetrics {
  accuracy: string;
  formQualityScore: string;
  validReps: number;
  mlStats: ReturnType<GenericExerciseClassifier['getStatistics']>;
  heuristicStats: ReturnType<BaseValidator['getStatistics']> | null;
  feedbackStats: FeedbackStatistics | null;
}

export interface SessionReport {
  exercise: string;
  timestamp: string;
  duration: number;
  metrics: ExtendedMetrics;
  config: AnalyzerConfig;
}

export interface AnalyzerConfig {
  exercise: string;
  feedbackMode?: string;
  mlWeight?: number;
  heuristicWeight?: number;
  analysisInterval: number;
  mlConfig?: Record<string, unknown>;
  heuristicConfig?: Record<string, unknown>;
}

export class ExerciseAnalyzer {
  private config: ExerciseConfig & { analysisInterval?: number };
  private isInitialized: boolean;
  private mlClassifier: GenericExerciseClassifier | null;
  private heuristicValidator: BaseValidator | null;
  private feedbackSystem: FeedbackSystem | null;
  private frameCount: number;
  private isAnalyzing: boolean;
  private lastAnalysisTime: number;
  private analysisInterval: number;
  private metrics: AnalyzerMetrics;
  private onFeedback: ((feedback: FeedbackRecord) => void) | null;
  private onMetricsUpdate: ((metrics: ExtendedMetrics) => void) | null;
  private onError: ((error: Error) => void) | null;

  constructor(exerciseConfig: ExerciseConfig & { analysisInterval?: number }) {
    this.config = exerciseConfig;
    this.isInitialized = false;

    this.mlClassifier = null;
    this.heuristicValidator = null;
    this.feedbackSystem = null;

    this.frameCount = 0;
    this.isAnalyzing = false;
    this.lastAnalysisTime = 0;
    this.analysisInterval = exerciseConfig.analysisInterval || 100;

    this.metrics = {
      totalFrames: 0,
      correctFrames: 0,
      incorrectFrames: 0,
      avgConfidence: 0,
      sessionStart: null,
      sessionDuration: 0
    };

    this.onFeedback = null;
    this.onMetricsUpdate = null;
    this.onError = null;
  }

  /**
   * Inicializa todos os componentes
   */
  async initialize(): Promise<boolean> {
    try {
      // 1. Inicializa ML Classifier
      await this.initializeMLClassifier();

      // 2. Inicializa Heuristic Validator
      await this.initializeHeuristicValidator();

      // 3. Inicializa Feedback System
      this.initializeFeedbackSystem();

      this.isInitialized = true;
      this.metrics.sessionStart = Date.now();

      return true;
    } catch (error) {
      if (this.onError) {
        this.onError(error as Error);
      }
      return false;
    }
  }

  /**
   * Inicializa ML Classifier
   */
  private async initializeMLClassifier(): Promise<void> {
    this.mlClassifier = new GenericExerciseClassifier(
      (this.config.mlConfig as Record<string, unknown>) || {}
    );

    const rawModelPath =
      this.config.modelPath ||
      `./models/${(this.config as Record<string, unknown>).modelFile as string}`;
    const modelPath = rawModelPath.startsWith('http')
      ? rawModelPath
      : rawModelPath.startsWith('/')
        ? rawModelPath
        : `${base}${rawModelPath.replace(/^\./, '')}`;
    const metadataFile =
      ((this.config as Record<string, unknown>).metadataFile as string | null) || null;

    await this.mlClassifier.loadModel(modelPath, metadataFile);
  }

  /**
   * Inicializa Heuristic Validator
   * Usa o validator registry para carregar o validator correto
   */
  private async initializeHeuristicValidator(): Promise<void> {
    try {
      const exerciseId = this.config.exerciseName;

      // Verifica se existe validator registrado para este exercício
      if (!hasValidator(exerciseId)) {
        this.heuristicValidator = null;
        return;
      }

      // Cria instância do validator usando o registry
      this.heuristicValidator = createValidator(
        exerciseId,
        (this.config.heuristicConfig as Record<string, unknown>) || {}
      );
    } catch (error) {
      this.heuristicValidator = null;
    }
  }

  /**
   * Inicializa Feedback System
   */
  private initializeFeedbackSystem(): void {
    this.feedbackSystem = new FeedbackSystem(
      (this.config.feedbackConfig as Record<string, unknown>) || {}
    );
  }

  /**
   * Analisa frame de pose
   */
  async analyzeFrame(landmarks: PoseLandmarks): Promise<FeedbackRecord | null> {
    if (!this.isInitialized) {
      return null;
    }

    // Throttle para não sobrecarregar
    const now = performance.now();
    if (now - this.lastAnalysisTime < this.analysisInterval) {
      return null;
    }
    this.lastAnalysisTime = now;

    this.frameCount++;
    this.metrics.totalFrames++;

    try {
      // 1. Análise ML
      const mlResult = await this.analyzeWithML(landmarks);

      // 2. Validação Heurística
      const heuristicResult = this.analyzeWithHeuristics(landmarks);

      // 3. Integra resultados
      const feedback = this.feedbackSystem!.integrate(mlResult, heuristicResult);

      // 4. Atualiza métricas
      this.updateMetrics(feedback);

      // 5. Callback
      if (this.onFeedback) {
        this.onFeedback(feedback);
      }

      return feedback;
    } catch (error) {
      if (this.onError) {
        this.onError(error as Error);
      }
      return null;
    }
  }

  /**
   * Análise com ML
   */
  private async analyzeWithML(landmarks: PoseLandmarks): Promise<MLResult | null> {
    if (!this.mlClassifier) {
      return { status: 'unavailable' };
    }

    const result = await this.mlClassifier.analyzeFrame(landmarks);
    return result;
  }

  /**
   * Análise com Heurísticas
   */
  private analyzeWithHeuristics(landmarks: PoseLandmarks): ValidationResult | null {
    if (!this.heuristicValidator) {
      return null;
    }

    const result = this.heuristicValidator.validate(landmarks, this.frameCount);
    return result;
  }

  /**
   * Atualiza métricas
   */
  private updateMetrics(feedback: FeedbackRecord): void {
    if (feedback.combined.verdict === 'correct') {
      this.metrics.correctFrames++;
    } else if (feedback.combined.verdict === 'incorrect') {
      this.metrics.incorrectFrames++;
    }

    // Atualiza confiança média com validação robusta
    const total = this.metrics.correctFrames + this.metrics.incorrectFrames;

    const newConfidence = feedback.combined.confidence;
    const isValidConfidence =
      newConfidence !== undefined &&
      newConfidence !== null &&
      !isNaN(newConfidence) &&
      newConfidence >= 0 &&
      newConfidence <= 1;

    if (total > 0 && isValidConfidence) {
      if (
        this.metrics.avgConfidence === undefined ||
        isNaN(this.metrics.avgConfidence) ||
        this.metrics.avgConfidence === 0
      ) {
        this.metrics.avgConfidence = newConfidence;
      } else {
        this.metrics.avgConfidence =
          (this.metrics.avgConfidence * (total - 1) + newConfidence) / total;
      }
    }

    // Duração da sessão
    if (this.metrics.sessionStart) {
      this.metrics.sessionDuration = Date.now() - this.metrics.sessionStart;
    }

    // Callback
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(this.getMetrics());
    }
  }

  /**
   * Obtém métricas atuais
   */
  getMetrics(): ExtendedMetrics {
    const total = this.metrics.correctFrames + this.metrics.incorrectFrames;
    const accuracy = total > 0 ? (this.metrics.correctFrames / total) * 100 : 0;

    // Obtém número de repetições válidas do validator
    const validReps = (this.heuristicValidator as { validReps?: number })?.validReps || 0;

    return {
      ...this.metrics,
      accuracy: accuracy.toFixed(1),
      formQualityScore: this.calculateFormQualityScore(),
      validReps: validReps,
      mlStats: this.mlClassifier?.getStatistics() || null,
      heuristicStats: this.heuristicValidator?.getStatistics() || null,
      feedbackStats: this.feedbackSystem?.getStatistics() || null
    };
  }

  /**
   * Calcula score de qualidade de forma
   */
  private calculateFormQualityScore(): string {
    const accuracy =
      this.metrics.correctFrames + this.metrics.incorrectFrames > 0
        ? this.metrics.correctFrames / (this.metrics.correctFrames + this.metrics.incorrectFrames)
        : 0;

    const confidenceWeight = this.metrics.avgConfidence || 0;

    return ((accuracy * 0.7 + confidenceWeight * 0.3) * 100).toFixed(1);
  }

  /**
   * Reseta analisador
   */
  reset(): void {
    this.frameCount = 0;
    this.lastAnalysisTime = 0;

    if (this.mlClassifier) {
      this.mlClassifier.reset();
    }

    if (this.heuristicValidator) {
      this.heuristicValidator.reset();
    }

    if (this.feedbackSystem) {
      this.feedbackSystem.reset();
    }

    this.metrics = {
      totalFrames: 0,
      correctFrames: 0,
      incorrectFrames: 0,
      avgConfidence: 0,
      sessionStart: Date.now(),
      sessionDuration: 0
    };
  }

  /**
   * Calibra threshold do ML automaticamente
   */
  autoCalibrate(): number | null {
    if (this.mlClassifier && typeof this.mlClassifier.autoCalibrate === 'function') {
      return this.mlClassifier.autoCalibrate();
    }
    return null;
  }

  /**
   * Configura callbacks
   */
  setCallbacks({ onFeedback, onMetricsUpdate, onError }: AnalyzerCallbacks): void {
    if (onFeedback) this.onFeedback = onFeedback;
    if (onMetricsUpdate) this.onMetricsUpdate = onMetricsUpdate;
    if (onError) this.onError = onError;
  }

  /**
   * Muda modo de feedback
   */
  setFeedbackMode(mode: string): void {
    if (this.feedbackSystem) {
      this.feedbackSystem.setMode(mode as 'hybrid' | 'ml_only' | 'heuristic_only');
    }
  }

  /**
   * Ajusta pesos ML/Heurística
   */
  setFeedbackWeights(mlWeight: number, heuristicWeight: number): void {
    if (this.feedbackSystem) {
      this.feedbackSystem.setWeights(mlWeight, heuristicWeight);
    }
  }

  /**
   * Obtém configuração atual
   */
  getConfig(): AnalyzerConfig {
    return {
      exercise: this.config.exerciseName,
      feedbackMode: (this.feedbackSystem as { config?: { feedbackMode?: string } })?.config
        ?.feedbackMode,
      mlWeight: (this.feedbackSystem as { config?: { mlWeight?: number } })?.config?.mlWeight,
      heuristicWeight: (this.feedbackSystem as { config?: { heuristicWeight?: number } })?.config
        ?.heuristicWeight,
      analysisInterval: this.analysisInterval,
      mlConfig: this.config.mlConfig as Record<string, unknown>,
      heuristicConfig: this.config.heuristicConfig as Record<string, unknown>
    };
  }

  /**
   * Exporta relatório da sessão
   */
  exportReport(): SessionReport {
    return {
      exercise: this.config.exerciseName,
      timestamp: new Date().toISOString(),
      duration: this.metrics.sessionDuration,
      metrics: this.getMetrics(),
      config: this.getConfig()
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.reset();
    this.isInitialized = false;
    this.mlClassifier = null;
    this.heuristicValidator = null;
    this.feedbackSystem = null;
  }
}
