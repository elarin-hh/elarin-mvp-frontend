import type { PoseLandmarks } from '../types';
import type { MLResult } from '../core/FeedbackSystem';
import { assets } from '$app/paths';
import * as ort from 'onnxruntime-web';

if (typeof window !== 'undefined') {
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/';
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  ort.env.wasm.simd = false;
}

export interface ClassifierConfig {
  maxFrames?: number;
  minFrames?: number;
  predictionInterval?: number;
  threshold?: number;
  maxHistorySize?: number;
}

export interface ModelMetadata {
  threshold?: number;
  [key: string]: unknown;
}

export interface PerformanceMetrics {
  fps: string;
  avgFps: string;
  inferenceTime: string;
  avgInferenceTime: string;
}

export interface ErrorStatistics {
  errorStats: {
    count: number;
    min: number;
    max: number;
    mean: number;
    median: number;
    p25: number;
    p75: number;
    p95: number;
  };
  performance: PerformanceMetrics;
  config: Required<ClassifierConfig>;
}

export class GenericExerciseClassifier {
  private session: ort.InferenceSession | null;
  private isLoaded: boolean;
  private config: Required<ClassifierConfig>;
  private frameBuffer: number[][];
  private threshold: number;
  private errorHistory: number[];
  private inferenceTimesMs: number[];
  private frameTimestamps: number[];
  private lastFrameTime: number | null;
  private maxMetricHistory: number;

  constructor(config: ClassifierConfig = {}) {
    this.session = null;
    this.isLoaded = false;

    this.config = {
      maxFrames: config.maxFrames || 60,
      minFrames: config.minFrames || 15,
      predictionInterval: config.predictionInterval || 1,
      threshold: config.threshold || 0.05,
      maxHistorySize: config.maxHistorySize || 100
    };

    this.frameBuffer = [];
    this.threshold = this.config.threshold;
    this.errorHistory = [];
    this.inferenceTimesMs = [];
    this.frameTimestamps = [];
    this.lastFrameTime = null;
    this.maxMetricHistory = 50;
  }

  async loadModel(
    modelPath: string = './models/autoencoder.onnx',
    metadataFile: string | null = null
  ): Promise<void> {
    try {
      this.session = await ort.InferenceSession.create(modelPath);

      try {
        let metadataPath: string;
        if (metadataFile) {
          const modelDir = modelPath.substring(0, modelPath.lastIndexOf('/'));
          metadataPath = `${modelDir}/${metadataFile}`;
        } else {
          metadataPath = modelPath.replace('.onnx', '_metadata.json');
        }
        const response = await fetch(metadataPath);
        const metadata: ModelMetadata = await response.json();

        if (metadata.threshold) {
          this.threshold = metadata.threshold;
          this.config.threshold = metadata.threshold;
        }
      } catch (metadataError) {
      }

      this.isLoaded = true;
    } catch (error) {
      console.error('ONNX model load failed', error);
      throw error instanceof Error ? error : new Error('Failed to load ML model');
    }
  }

  private prepareLandmarks(landmarks: PoseLandmarks): number[] {
    const features: number[] = [];
    for (const landmark of landmarks) {
      const x = Math.max(0, Math.min(1, landmark.x || 0));
      const y = Math.max(0, Math.min(1, landmark.y || 0));
      const z = Math.max(0, Math.min(1, landmark.z || 0));

      features.push(x, y, z);
    }

    while (features.length < 99) {
      features.push(0);
    }

    return features.slice(0, 99);
  }

  private addFrame(landmarks: PoseLandmarks): void {
    const features = this.prepareLandmarks(landmarks);
    this.frameBuffer.push(features);

    const now = performance.now();
    if (this.lastFrameTime !== null) {
      this.frameTimestamps.push(now - this.lastFrameTime);
      if (this.frameTimestamps.length > this.maxMetricHistory) {
        this.frameTimestamps.shift();
      }
    }
    this.lastFrameTime = now;

    if (this.frameBuffer.length > this.config.maxFrames) {
      this.frameBuffer.shift();
    }
  }

  private calculateReconstructionError(input: number[], reconstruction: number[]): number {
    const numFrames = this.config.maxFrames;
    const numFeatures = 99;

    let totalFrameError = 0;

    for (let frame = 0; frame < numFrames; frame++) {
      let frameSquaredError = 0;

      for (let feature = 0; feature < numFeatures; feature++) {
        const idx = frame * numFeatures + feature;
        const diff = input[idx] - reconstruction[idx];
        frameSquaredError += diff * diff;
      }

      const frameError = frameSquaredError / numFeatures;
      totalFrameError += frameError;
    }

    return totalFrameError / numFrames;
  }

  private calculateAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private getBasicMetrics(): PerformanceMetrics {
    const avgFrameTime = this.calculateAverage(this.frameTimestamps);
    const currentFps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

    const avgInferenceTime = this.calculateAverage(this.inferenceTimesMs);

    return {
      fps: currentFps > 0 ? currentFps.toFixed(1) + ' FPS' : '-',
      avgFps: currentFps > 0 ? currentFps.toFixed(1) + ' FPS' : '-',
      inferenceTime:
        this.inferenceTimesMs.length > 0
          ? this.inferenceTimesMs[this.inferenceTimesMs.length - 1].toFixed(2) + ' ms'
          : '-',
      avgInferenceTime: avgInferenceTime > 0 ? avgInferenceTime.toFixed(2) + ' ms' : '-'
    };
  }

  private async predict(): Promise<MLResult> {
    if (!this.isLoaded) {
      throw new Error('Model not loaded');
    }

    if (this.frameBuffer.length < this.config.minFrames) {
      return {
        status: 'waiting',
        message: `Aguardando mais frames... (${this.frameBuffer.length}/${this.config.minFrames})`,
        frames: this.frameBuffer.length
      };
    }

    try {
      const inferenceStart = performance.now();

      const input = [...this.frameBuffer];

      while (input.length < this.config.maxFrames) {
        input.push(new Array(99).fill(0));
      }

      if (input.length > this.config.maxFrames) {
        input.splice(this.config.maxFrames);
      }

      const inputFlat = input.flat();
      const inputTensor = new ort.Tensor('float32', inputFlat, [1, this.config.maxFrames, 99]);

      const feeds = { input: inputTensor };
      const results = await this.session!.run(feeds);
      const reconstruction = results.reconstruction;

      const reconstructionError = this.calculateReconstructionError(
        inputFlat,
        Array.from(reconstruction.data as Float32Array)
      );

      const inferenceTime = performance.now() - inferenceStart;
      this.inferenceTimesMs.push(inferenceTime);
      if (this.inferenceTimesMs.length > this.maxMetricHistory) {
        this.inferenceTimesMs.shift();
      }

      this.errorHistory.push(reconstructionError);
      if (this.errorHistory.length > this.config.maxHistorySize) {
        this.errorHistory.shift();
      }

      const isCorrect = reconstructionError <= this.threshold;

      const ratio = reconstructionError / this.threshold;
      let qualityScore = 0;
      const toleranceMultiplier = 1.1;

      if (ratio <= 1.0) {
        qualityScore = 1.0;
      } else if (ratio <= toleranceMultiplier) {
        const tolerancePos = (ratio - 1.0) / (toleranceMultiplier - 1.0);
        qualityScore = 1.0 - tolerancePos;
      } else {
        qualityScore = 0;
      }

      const confidence = Math.max(0, Math.min(1, qualityScore));

      const metrics = this.getBasicMetrics();

      return {
        isCorrect: isCorrect,
        confidence: confidence,
        reconstructionError: reconstructionError,
        threshold: this.threshold,
        status: isCorrect ? 'correct' : 'incorrect',
        message: isCorrect
          ? 'Execução correta! Continue assim!'
          : 'Atenção! Movimento incorreto detectado.',
        details: {
          qualityScore: (qualityScore * 100).toFixed(1),
          error: reconstructionError.toFixed(6),
          threshold: this.threshold.toFixed(6),
          confidence: (confidence * 100).toFixed(1) + '%',
          frames: this.frameBuffer.length,
          avgError:
            this.errorHistory.length > 0
              ? this.calculateAverage(this.errorHistory).toFixed(6)
              : 'N/A',
          inferenceTime: metrics.inferenceTime,
          avgInferenceTime: metrics.avgInferenceTime,
          fps: metrics.fps,
          avgFps: metrics.avgFps
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Erro na análise'
      };
    }
  }

  async analyzeFrame(landmarks: PoseLandmarks): Promise<MLResult> {
    this.addFrame(landmarks);

    if (
      this.frameBuffer.length % this.config.predictionInterval === 0 &&
      this.frameBuffer.length >= this.config.minFrames
    ) {
      return await this.predict();
    }

    return {
      status: 'processing',
      frames: this.frameBuffer.length
    };
  }

  reset(): void {
    this.frameBuffer = [];
    this.errorHistory = [];
    this.inferenceTimesMs = [];
    this.frameTimestamps = [];
    this.lastFrameTime = null;
  }

  setThreshold(newThreshold: number): void {
    this.threshold = newThreshold;
    this.config.threshold = newThreshold;
  }

  autoCalibrate(): number {
    if (this.errorHistory.length < 20) {
      return this.threshold;
    }

    const sorted = [...this.errorHistory].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const newThreshold = sorted[p95Index];

    this.setThreshold(newThreshold);
    return newThreshold;
  }

  adjustThresholdForTolerance(factor: number = 1.5): number {
    this.threshold = this.threshold * factor;
    return this.threshold;
  }

  getStatistics(): ErrorStatistics | null {
    if (this.errorHistory.length === 0) {
      return null;
    }

    const sorted = [...this.errorHistory].sort((a, b) => a - b);
    const metrics = this.getBasicMetrics();

    return {
      errorStats: {
        count: this.errorHistory.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: this.calculateAverage(this.errorHistory),
        median: sorted[Math.floor(sorted.length / 2)],
        p25: sorted[Math.floor(sorted.length * 0.25)],
        p75: sorted[Math.floor(sorted.length * 0.75)],
        p95: sorted[Math.floor(sorted.length * 0.95)]
      },
      performance: metrics,
      config: this.config
    };
  }
}
