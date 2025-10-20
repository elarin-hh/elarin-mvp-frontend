/**
 * Generic Exercise Classifier - One-Class Anomaly Detection
 * ==========================================================
 *
 * This is a generic classifier that can work with any exercise model.
 * It uses the One-Class Learning approach trained only with correct examples.
 *
 * How it works:
 * 1. Model reconstructs the movement
 * 2. Calculates reconstruction error (MSE)
 * 3. If error > threshold → INCORRECT
 * 4. If error ≤ threshold → CORRECT
 */

import type { PoseLandmarks } from '../types';
import type { MLResult } from '../core/FeedbackSystem';
import * as ort from 'onnxruntime-web';
import { logger } from '../utils/Logger';

// Configure ONNX Runtime Web to use WASM from CDN
if (typeof window !== 'undefined') {
	ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/';
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

	/**
	 * Loads ONNX model and metadata
	 */
	async loadModel(modelPath: string = './models/autoencoder.onnx', metadataFile: string | null = null): Promise<boolean> {
		try {
			// Load model
			this.session = await ort.InferenceSession.create(modelPath);

			// Try to load metadata
			try {
				// Use metadataFile from config or derive from modelPath
				let metadataPath: string;
				if (metadataFile) {
					// Extract directory from modelPath
					const modelDir = modelPath.substring(0, modelPath.lastIndexOf('/'));
					metadataPath = `${modelDir}/${metadataFile}`;
				} else {
					metadataPath = modelPath.replace('.onnx', '_metadata.json');
				}

				logger.log('ML-Load', 'Loading metadata from:', metadataPath);
				const response = await fetch(metadataPath);
				const metadata: ModelMetadata = await response.json();

				logger.log('ML-Load', 'Metadata loaded:', metadata);

				if (metadata.threshold) {
					logger.log('ML-Load', 'Using threshold from metadata:', metadata.threshold);
					this.threshold = metadata.threshold;
					this.config.threshold = metadata.threshold;
				}
			} catch (e) {
				logger.log('ML-Load', 'Metadata not found, using default threshold:', this.threshold);
			}

			this.isLoaded = true;
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Prepares MediaPipe landmarks into feature array
	 */
	private prepareLandmarks(landmarks: PoseLandmarks): number[] {
		// DEBUG: Log primeiro landmark para verificar formato
		if (landmarks.length > 0) {
			logger.log('ML-Landmarks', 'Sample landmark:', landmarks[0]);
		}

		const features: number[] = [];
		for (const landmark of landmarks) {
			// Ensure landmarks are normalized (0-1 range)
			const x = Math.max(0, Math.min(1, landmark.x || 0));
			const y = Math.max(0, Math.min(1, landmark.y || 0));
			const z = Math.max(0, Math.min(1, landmark.z || 0));

			features.push(x, y, z);
		}

		// Ensure we have exactly 99 features (33 landmarks * 3 coordinates)
		while (features.length < 99) {
			features.push(0);
		}

		return features.slice(0, 99);
	}

	/**
	 * Adds frame to buffer
	 */
	private addFrame(landmarks: PoseLandmarks): void {
		const features = this.prepareLandmarks(landmarks);
		this.frameBuffer.push(features);

		// Track frame timing for FPS
		const now = performance.now();
		if (this.lastFrameTime !== null) {
			this.frameTimestamps.push(now - this.lastFrameTime);
			if (this.frameTimestamps.length > this.maxMetricHistory) {
				this.frameTimestamps.shift();
			}
		}
		this.lastFrameTime = now;

		// Maintain buffer size
		if (this.frameBuffer.length > this.config.maxFrames) {
			this.frameBuffer.shift();
		}
	}

	/**
	 * Calculates reconstruction error (MSE)
	 */
	private calculateReconstructionError(input: number[], reconstruction: number[]): number {
		let sumSquaredError = 0;
		let count = 0;

		for (let i = 0; i < input.length; i++) {
			const diff = input[i] - reconstruction[i];
			sumSquaredError += diff * diff;
			count++;
		}

		return sumSquaredError / count;
	}

	/**
	 * Calculates average from array
	 */
	private calculateAverage(arr: number[]): number {
		if (arr.length === 0) return 0;
		return arr.reduce((a, b) => a + b, 0) / arr.length;
	}

	/**
	 * Gets current FPS metrics
	 */
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

	/**
	 * Makes prediction using autoencoder
	 */
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

			// Prepare input (padding if necessary)
			const input = [...this.frameBuffer];

			// Ensure we have exactly maxFrames (60)
			while (input.length < this.config.maxFrames) {
				input.push(new Array(99).fill(0));
			}

			// Truncate if we have more than maxFrames
			if (input.length > this.config.maxFrames) {
				input.splice(this.config.maxFrames);
			}

			// Convert to ONNX tensor: [1, maxFrames, 99]
			const inputFlat = input.flat();
			const inputTensor = new ort.Tensor('float32', inputFlat, [1, this.config.maxFrames, 99]);

			// Prediction (autoencoder reconstructs the input)
			const feeds = { input: inputTensor };
			const results = await this.session!.run(feeds);
			const reconstruction = results.reconstruction;

			// Calculate reconstruction error
			const reconstructionError = this.calculateReconstructionError(
				inputFlat,
				Array.from(reconstruction.data as Float32Array)
			);

			// Track inference time
			const inferenceTime = performance.now() - inferenceStart;
			this.inferenceTimesMs.push(inferenceTime);
			if (this.inferenceTimesMs.length > this.maxMetricHistory) {
				this.inferenceTimesMs.shift();
			}

			// Add to history
			this.errorHistory.push(reconstructionError);
			if (this.errorHistory.length > this.config.maxHistorySize) {
				this.errorHistory.shift();
			}

			// Decide if correct or incorrect
			const isCorrect = reconstructionError <= this.threshold;

			// DEBUG: Log ML decision
			logger.log('ML-Decision', 'ML Prediction Result', {
				reconstructionError: reconstructionError.toFixed(6),
				threshold: this.threshold.toFixed(6),
				isCorrect,
				comparison: `${reconstructionError.toFixed(6)} ${isCorrect ? '<=' : '>'} ${this.threshold.toFixed(6)}`
			});

			// Calculate confidence based on distance to threshold
			let confidence: number;
			if (isCorrect) {
				const errorRatio = reconstructionError / this.threshold;
				confidence = Math.max(0.7, Math.min(0.95, 0.8 + (1.0 - errorRatio) * 0.15));
			} else {
				const errorRatio = reconstructionError / this.threshold;
				confidence = Math.max(0.7, Math.min(0.95, 0.8 + (errorRatio - 1.0) * 0.15));
			}

			// Garante que confidence está no range válido [0, 1]
			confidence = Math.max(0, Math.min(1, confidence));

			// Validação extra para garantir que não há NaN
			if (isNaN(confidence)) {
				confidence = 0.7;
			}

			// Get metrics
			const metrics = this.getBasicMetrics();

			return {
				isCorrect: isCorrect,
				confidence: confidence,
				reconstructionError: reconstructionError,
				threshold: this.threshold,
				status: isCorrect ? 'correct' : 'incorrect',
				message: isCorrect
					? '✅ Execução correta! Continue assim!'
					: '⚠️ Atenção! Movimento incorreto detectado.',
				details: {
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

	/**
	 * Real-time analysis
	 */
	async analyzeFrame(landmarks: PoseLandmarks): Promise<MLResult> {
		this.addFrame(landmarks);

		// Prediction every N frames (configurable)
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

	/**
	 * Resets buffer and history
	 */
	reset(): void {
		this.frameBuffer = [];
		this.errorHistory = [];
		this.inferenceTimesMs = [];
		this.frameTimestamps = [];
		this.lastFrameTime = null;
	}

	/**
	 * Manually adjusts threshold (calibration)
	 */
	setThreshold(newThreshold: number): void {
		this.threshold = newThreshold;
		this.config.threshold = newThreshold;
	}

	/**
	 * Automatic calibration based on history
	 * Uses 95th percentile of observed errors
	 */
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

	/**
	 * Ajusta threshold para ser mais tolerante
	 */
	adjustThresholdForTolerance(factor: number = 1.5): number {
		this.threshold = this.threshold * factor;
		return this.threshold;
	}

	/**
	 * Gets detailed statistics
	 */
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
