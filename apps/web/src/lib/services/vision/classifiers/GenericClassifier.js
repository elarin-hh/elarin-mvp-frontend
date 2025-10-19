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

class GenericExerciseClassifier {
    constructor(config = {}) {
        this.session = null;
        this.isLoaded = false;

        // Configuration (can be customized per exercise)
        this.config = {
            maxFrames: config.maxFrames || 60,
            minFrames: config.minFrames || 15,  // Reduzido para feedback mais rápido
            predictionInterval: config.predictionInterval || 1,  // Predição a cada frame
            threshold: config.threshold || 0.05,  // Threshold mais sensível
            maxHistorySize: config.maxHistorySize || 100,
            ...config
        };

        // Frame buffer
        this.frameBuffer = [];

        // Anomaly threshold
        this.threshold = this.config.threshold;

        // Error history for calibration and metrics
        this.errorHistory = [];

        // Performance metrics
        this.inferenceTimesMs = [];
        this.frameTimestamps = [];
        this.lastFrameTime = null;
        this.maxMetricHistory = 50;
    }

    /**
     * Loads ONNX model and metadata
     */
    async loadModel(modelPath = './models/autoencoder.onnx') {
        try {
            // Check ONNX Runtime
            if (typeof ort === 'undefined') {
                throw new Error('ONNX Runtime not loaded');
            }

            // Load model
            this.session = await ort.InferenceSession.create(modelPath);

            // Try to load metadata
            try {
                const metadataPath = modelPath.replace('.onnx', '_metadata.json');
                const response = await fetch(metadataPath);
                const metadata = await response.json();

                if (metadata.threshold) {
                    this.threshold = metadata.threshold;
                    this.config.threshold = metadata.threshold;
                }
            } catch (e) {
                // Metadata not found, using default threshold
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
    prepareLandmarks(landmarks) {
        const features = [];
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
    addFrame(landmarks) {
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
    calculateReconstructionError(input, reconstruction) {
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
    calculateAverage(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    /**
     * Gets current FPS metrics
     */
    getBasicMetrics() {
        const avgFrameTime = this.calculateAverage(this.frameTimestamps);
        const currentFps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

        const avgInferenceTime = this.calculateAverage(this.inferenceTimesMs);

        return {
            fps: currentFps > 0 ? currentFps.toFixed(1) + ' FPS' : '-',
            avgFps: currentFps > 0 ? currentFps.toFixed(1) + ' FPS' : '-',
            inferenceTime: this.inferenceTimesMs.length > 0
                ? this.inferenceTimesMs[this.inferenceTimesMs.length - 1].toFixed(2) + ' ms'
                : '-',
            avgInferenceTime: avgInferenceTime > 0
                ? avgInferenceTime.toFixed(2) + ' ms'
                : '-'
        };
    }

    /**
     * Makes prediction using autoencoder
     */
    async predict() {
        if (!this.isLoaded) {
            throw new Error('Model not loaded');
        }

        if (this.frameBuffer.length < this.config.minFrames) {
            return {
                status: 'waiting',
                message: `Aguardando mais frames... (${this.frameBuffer.length}/${this.config.minFrames})`,
                frames: this.frameBuffer.length,
                required: this.config.minFrames
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
            const results = await this.session.run(feeds);
            const reconstruction = results.reconstruction;

            // Calculate reconstruction error
            const reconstructionError = this.calculateReconstructionError(
                inputFlat,
                Array.from(reconstruction.data)
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
            // LOW error = CORRECT movement (model can reconstruct well)
            // HIGH error = INCORRECT movement (model cannot reconstruct)
            const isCorrect = reconstructionError <= this.threshold;

            // Calculate confidence based on distance to threshold
            let confidence;
            if (isCorrect) {
                // For correct movements: lower error = higher confidence
                // Mais sensível: se erro é muito baixo, confiança alta
                const errorRatio = reconstructionError / this.threshold;
                confidence = Math.max(0.7, Math.min(0.95, 0.8 + (1.0 - errorRatio) * 0.15));
            } else {
                // For incorrect movements: higher error = higher confidence of incorrect
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
                    avgError: this.errorHistory.length > 0
                        ? (this.calculateAverage(this.errorHistory)).toFixed(6)
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
                message: 'Erro na análise',
                error: error.message
            };
        }
    }

    /**
     * Real-time analysis
     */
    async analyzeFrame(landmarks) {
        this.addFrame(landmarks);

        // Prediction every N frames (configurable)
        if (this.frameBuffer.length % this.config.predictionInterval === 0
            && this.frameBuffer.length >= this.config.minFrames) {
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
    reset() {
        this.frameBuffer = [];
        this.errorHistory = [];
        this.inferenceTimesMs = [];
        this.frameTimestamps = [];
        this.lastFrameTime = null;
    }

    /**
     * Manually adjusts threshold (calibration)
     */
    setThreshold(newThreshold) {
        this.threshold = newThreshold;
        this.config.threshold = newThreshold;
    }

    /**
     * Automatic calibration based on history
     * Uses 95th percentile of observed errors
     */
    autoCalibrate() {
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
    adjustThresholdForTolerance(factor = 1.5) {
        this.threshold = this.threshold * factor;
        return this.threshold;
    }

    /**
     * Gets detailed statistics
     */
    getStatistics() {
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

// Export for browser
if (typeof window !== 'undefined') {
    window.GenericExerciseClassifier = GenericExerciseClassifier;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GenericExerciseClassifier;
}
