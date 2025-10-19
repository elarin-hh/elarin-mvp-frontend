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

class ExerciseAnalyzer {
    constructor(exerciseConfig) {
        this.config = exerciseConfig;
        this.isInitialized = false;

        // Componentes principais
        this.mlClassifier = null;
        this.heuristicValidator = null;
        this.feedbackSystem = null;

        // Estado
        this.frameCount = 0;
        this.isAnalyzing = false;
        this.lastAnalysisTime = 0;
        this.analysisInterval = exerciseConfig.analysisInterval || 100; // ms

        // Métricas
        this.metrics = {
            totalFrames: 0,
            correctFrames: 0,
            incorrectFrames: 0,
            avgConfidence: 0,
            sessionStart: null,
            sessionDuration: 0
        };

        // Callbacks
        this.onFeedback = null;
        this.onMetricsUpdate = null;
        this.onError = null;
    }

    /**
     * Inicializa todos os componentes
     */
    async initialize() {
        try {
            // 1. Inicializa ML Classifier
            await this.initializeMLClassifier();

            // 2. Inicializa Heuristic Validator (agora async)
            await this.initializeHeuristicValidator();

            // 3. Inicializa Feedback System
            this.initializeFeedbackSystem();

            this.isInitialized = true;
            this.metrics.sessionStart = Date.now();

            return true;

        } catch (error) {
            if (this.onError) {
                this.onError(error);
            }
            return false;
        }
    }

    /**
     * Inicializa ML Classifier
     */
    async initializeMLClassifier() {
        // Usa GenericExerciseClassifier
        this.mlClassifier = new GenericExerciseClassifier(this.config.mlConfig || {});

        const modelPath = this.config.modelPath || `./models/${this.config.modelFile}`;
        
        const success = await this.mlClassifier.loadModel(modelPath);

        if (!success) {
            throw new Error('Failed to load ML model');
        }
    }

    /**
     * Inicializa Heuristic Validator
     * Carrega dinamicamente se necessário
     */
    async initializeHeuristicValidator() {
        // Se não tem validatorPath, não tem validator
        if (!this.config.validatorPath) {
            this.heuristicValidator = null;
            return;
        }

        try {
            // Obtém classe do validator (já carregado estaticamente)
            const validatorClass = this.getValidatorClass();

            if (!validatorClass) {
                // Tenta carregar dinamicamente como fallback
                await this.loadValidatorScript(this.config.validatorPath);
                const fallbackClass = this.getValidatorClass();
                if (!fallbackClass) {
                    this.heuristicValidator = null;
                    return;
                }
                this.heuristicValidator = new fallbackClass(this.config.heuristicConfig || {});
            } else {
                this.heuristicValidator = new validatorClass(this.config.heuristicConfig || {});
            }

        } catch (error) {
            this.heuristicValidator = null;
        }
    }

    /**
     * Carrega script do validator dinamicamente
     */
    async loadValidatorScript(scriptPath) {
        // Verifica se já está carregado
        const validatorClass = this.getValidatorClass();
        if (validatorClass) {
            return;
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptPath;
            script.onload = () => {
                resolve();
            };
            script.onerror = () => {
                reject(new Error(`Failed to load validator: ${scriptPath}`));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Obtém classe de validação baseado no exercício
     * As classes são registradas globalmente pelos scripts
     */
    getValidatorClass() {
        const validators = {
            'squat': window.SquatValidator,
            'lunge': window.LungeValidator,
            'pushup': window.PushupValidator,
            'plank': window.PlankValidator
        };

        const validatorClass = validators[this.config.exerciseName];
        return validatorClass;
    }

    /**
     * Inicializa Feedback System
     */
    initializeFeedbackSystem() {
        this.feedbackSystem = new FeedbackSystem(this.config.feedbackConfig || {});
    }

    /**
     * Analisa frame de pose
     */
    async analyzeFrame(landmarks) {
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
            const feedback = this.feedbackSystem.integrate(mlResult, heuristicResult);

            // 4. Atualiza métricas
            this.updateMetrics(feedback);

            // 5. Callback
            if (this.onFeedback) {
                this.onFeedback(feedback);
            }

            return feedback;

        } catch (error) {
            if (this.onError) {
                this.onError(error);
            }
            return null;
        }
    }

    /**
     * Análise com ML
     */
    async analyzeWithML(landmarks) {
        if (!this.mlClassifier) {
            return { status: 'unavailable' };
        }

        const result = await this.mlClassifier.analyzeFrame(landmarks);
        return result;
    }

    /**
     * Análise com Heurísticas
     */
    analyzeWithHeuristics(landmarks) {
        if (!this.heuristicValidator) {
            return null;
        }

        const result = this.heuristicValidator.validate(landmarks, this.frameCount);
        return result;
    }

    /**
     * Atualiza métricas
     */
    updateMetrics(feedback) {
        if (feedback.combined.verdict === 'correct') {
            this.metrics.correctFrames++;
        } else if (feedback.combined.verdict === 'incorrect') {
            this.metrics.incorrectFrames++;
        }

        // Atualiza confiança média com validação robusta
        const total = this.metrics.correctFrames + this.metrics.incorrectFrames;

        // Verifica se feedback tem confidence válido
        const newConfidence = feedback.combined.confidence;
        const isValidConfidence = (
            newConfidence !== undefined &&
            newConfidence !== null &&
            !isNaN(newConfidence) &&
            newConfidence >= 0 &&
            newConfidence <= 1
        );

        if (total > 0 && isValidConfidence) {
            // Inicializa ou atualiza avgConfidence
            if (this.metrics.avgConfidence === undefined ||
                isNaN(this.metrics.avgConfidence) ||
                this.metrics.avgConfidence === 0) {
                this.metrics.avgConfidence = newConfidence;
            } else {
                // Média ponderada com frames anteriores
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
    getMetrics() {
        const total = this.metrics.correctFrames + this.metrics.incorrectFrames;
        const accuracy = total > 0 ? (this.metrics.correctFrames / total) * 100 : 0;

        // Obtém número de repetições válidas do validator
        const validReps = this.heuristicValidator?.validReps || 0;

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
    calculateFormQualityScore() {
        const accuracy = this.metrics.correctFrames + this.metrics.incorrectFrames > 0
            ? (this.metrics.correctFrames / (this.metrics.correctFrames + this.metrics.incorrectFrames))
            : 0;

        const confidenceWeight = this.metrics.avgConfidence || 0;

        // Score combinado (0-100)
        return ((accuracy * 0.7 + confidenceWeight * 0.3) * 100).toFixed(1);
    }

    /**
     * Reseta analisador
     */
    reset() {
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
    autoCalibrate() {
        if (this.mlClassifier && typeof this.mlClassifier.autoCalibrate === 'function') {
            return this.mlClassifier.autoCalibrate();
        }
        return null;
    }

    /**
     * Configura callbacks
     */
    setCallbacks({ onFeedback, onMetricsUpdate, onError }) {
        if (onFeedback) this.onFeedback = onFeedback;
        if (onMetricsUpdate) this.onMetricsUpdate = onMetricsUpdate;
        if (onError) this.onError = onError;
    }

    /**
     * Muda modo de feedback
     */
    setFeedbackMode(mode) {
        if (this.feedbackSystem) {
            this.feedbackSystem.setMode(mode);
        }
    }

    /**
     * Ajusta pesos ML/Heurística
     */
    setFeedbackWeights(mlWeight, heuristicWeight) {
        if (this.feedbackSystem) {
            this.feedbackSystem.setWeights(mlWeight, heuristicWeight);
        }
    }

    /**
     * Obtém configuração atual
     */
    getConfig() {
        return {
            exercise: this.config.exerciseName,
            feedbackMode: this.feedbackSystem?.config.feedbackMode,
            mlWeight: this.feedbackSystem?.config.mlWeight,
            heuristicWeight: this.feedbackSystem?.config.heuristicWeight,
            analysisInterval: this.analysisInterval,
            mlConfig: this.config.mlConfig,
            heuristicConfig: this.config.heuristicConfig
        };
    }

    /**
     * Exporta relatório da sessão
     */
    exportReport() {
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
    destroy() {
        this.reset();
        this.isInitialized = false;
        this.mlClassifier = null;
        this.heuristicValidator = null;
        this.feedbackSystem = null;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.ExerciseAnalyzer = ExerciseAnalyzer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExerciseAnalyzer;
}
