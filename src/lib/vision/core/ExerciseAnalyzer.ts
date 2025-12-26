import type { PoseLandmarks, FeedbackMode } from '../types';
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

    this.scoreHistory = [];
  }

  private scoreHistory: number[];
  private readonly HISTORY_WINDOW_SIZE = 3;

  async initialize(): Promise<boolean> {
    try {
      await this.initializeMLClassifier();

      await this.initializeHeuristicValidator();

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

  private async initializeMLClassifier(): Promise<void> {
    this.mlClassifier = new GenericExerciseClassifier(this.config.mlConfig || {});

    const rawModelPath = this.config.modelPath;
    if (!rawModelPath) {
      throw new Error('Modelo do exercício não configurado');
    }
    const modelPath = rawModelPath.startsWith('http')
      ? rawModelPath
      : rawModelPath.startsWith('/')
        ? rawModelPath
        : `${base}${rawModelPath.replace(/^\./, '')}`;

    await this.mlClassifier.loadModel(modelPath);
  }

  private async initializeHeuristicValidator(): Promise<void> {
    try {
      const exerciseId = this.config.exerciseType;

      if (!exerciseId) {
        this.heuristicValidator = null;
        return;
      }

      if (!hasValidator(exerciseId)) {
        this.heuristicValidator = null;
        return;
      }

      this.heuristicValidator = createValidator(
        exerciseId,
        this.config.heuristicConfig || {},
        this.config.exerciseName
      );
    } catch (error) {
      this.heuristicValidator = null;
    }
  }

  private initializeFeedbackSystem(): void {
    this.feedbackSystem = new FeedbackSystem(this.config.feedbackConfig || {});
  }

  async analyzeFrame(landmarks: PoseLandmarks): Promise<FeedbackRecord | null> {
    if (!this.isInitialized) {
      return null;
    }

    const now = performance.now();
    if (now - this.lastAnalysisTime < this.analysisInterval) {
      return null;
    }
    this.lastAnalysisTime = now;

    this.frameCount++;
    this.metrics.totalFrames++;

    try {
      const mlResult = await this.analyzeWithML(landmarks);

      const heuristicResult = this.analyzeWithHeuristics(landmarks);

      const feedback = this.feedbackSystem!.integrate(mlResult, heuristicResult);

      this.updateMetrics(feedback);

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

  private async analyzeWithML(landmarks: PoseLandmarks): Promise<MLResult | null> {
    if (!this.mlClassifier) {
      return { status: 'unavailable' };
    }

    const result = await this.mlClassifier.analyzeFrame(landmarks);
    return result;
  }

  private analyzeWithHeuristics(landmarks: PoseLandmarks): ValidationResult | null {
    if (!this.heuristicValidator) {
      return null;
    }

    const result = this.heuristicValidator.validate(landmarks, this.frameCount);
    return result;
  }

  private updateMetrics(feedback: FeedbackRecord): void {
    const isCorrect = feedback.combined.verdict === 'correct';
    if (isCorrect) {
      this.metrics.correctFrames++;
    } else {
      this.metrics.incorrectFrames++;
    }

    let frameScore = 0;

    if (feedback.ml?.details && typeof feedback.ml.details === 'object' && 'qualityScore' in feedback.ml.details) {
      frameScore = parseFloat(feedback.ml.details.qualityScore as string) || 0;
    } else {
      frameScore = isCorrect ? 100 : 0;
    }

    this.scoreHistory.push(frameScore);
    if (this.scoreHistory.length > this.HISTORY_WINDOW_SIZE) {
      this.scoreHistory.shift();
    }

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

    if (this.metrics.sessionStart) {
      this.metrics.sessionDuration = Date.now() - this.metrics.sessionStart;
    }

    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(this.getMetrics());
    }
  }

  getMetrics(): ExtendedMetrics {
    const totalFrames = this.metrics.correctFrames + this.metrics.incorrectFrames;

    let rollingAccuracy = 0;
    if (this.scoreHistory.length > 0) {
      const sum = this.scoreHistory.reduce((a, b) => a + b, 0);
      rollingAccuracy = sum / this.scoreHistory.length;
    } else {
      rollingAccuracy = 0;
    }

    const validReps = (this.heuristicValidator as { validReps?: number })?.validReps || 0;

    return {
      ...this.metrics,
      accuracy: rollingAccuracy.toFixed(1),
      formQualityScore: this.calculateFormQualityScore(rollingAccuracy),
      validReps: validReps,
      mlStats: this.mlClassifier?.getStatistics() || null,
      heuristicStats: this.heuristicValidator?.getStatistics() || null,
      feedbackStats: this.feedbackSystem?.getStatistics() || null
    };
  }

  private calculateFormQualityScore(accuracyValue?: number): string {
    let accuracy = 0;

    if (accuracyValue !== undefined) {
      accuracy = accuracyValue / 100;
    } else {
      const total = this.metrics.correctFrames + this.metrics.incorrectFrames;
      accuracy = total > 0 ? this.metrics.correctFrames / total : 0;
    }

    const confidenceWeight = this.metrics.avgConfidence || 0;

    return ((accuracy * 0.7 + confidenceWeight * 0.3) * 100).toFixed(1);
  }

  reset(): void {
    this.frameCount = 0;
    this.lastAnalysisTime = 0;
    this.scoreHistory = [];

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

  autoCalibrate(): number | null {
    if (this.mlClassifier && typeof this.mlClassifier.autoCalibrate === 'function') {
      return this.mlClassifier.autoCalibrate();
    }
    return null;
  }

  setCallbacks({ onFeedback, onMetricsUpdate, onError }: AnalyzerCallbacks): void {
    if (onFeedback) this.onFeedback = onFeedback;
    if (onMetricsUpdate) this.onMetricsUpdate = onMetricsUpdate;
    if (onError) this.onError = onError;
  }

  setFeedbackMode(mode: FeedbackMode): void {
    if (this.feedbackSystem) {
      this.feedbackSystem.setMode(mode);
    }
  }

  setFeedbackWeights(mlWeight: number, heuristicWeight: number): void {
    if (this.feedbackSystem) {
      this.feedbackSystem.setWeights(mlWeight, heuristicWeight);
    }
  }

  getConfig(): AnalyzerConfig {
    const feedbackConfig = this.feedbackSystem?.getConfig();
    return {
      exercise: this.config.exerciseName,
      feedbackMode: feedbackConfig?.feedbackMode,
      mlWeight: feedbackConfig?.mlWeight,
      heuristicWeight: feedbackConfig?.heuristicWeight,
      analysisInterval: this.analysisInterval,
      mlConfig: this.config.mlConfig as Record<string, unknown> | undefined,
      heuristicConfig: this.config.heuristicConfig as Record<string, unknown> | undefined
    };
  }

  exportReport(): SessionReport {
    return {
      exercise: this.config.exerciseName,
      timestamp: new Date().toISOString(),
      duration: this.metrics.sessionDuration,
      metrics: this.getMetrics(),
      config: this.getConfig()
    };
  }

  destroy(): void {
    this.reset();
    this.isInitialized = false;
    this.mlClassifier = null;
    this.heuristicValidator = null;
    this.feedbackSystem = null;
  }
}
