// Classe base para detecção de exercícios com suporte a ML (Machine Learning)
//
// Objetivo:
// - Fornecer a infraestrutura comum para exercícios baseados em ML no navegador usando TensorFlow.js.
// - Carregar modelo e scaler por exercício, extrair features dos landmarks e realizar predições.
// - Combinar ML (assíncrono) com regras heurísticas (síncronas) em um fluxo híbrido e responsivo.
//
// Como estender:
// - Crie uma subclasse por exercício (ex.: SquatDetectorML) e implemente:
//   1) getImportantLandmarks(): quais índices de landmarks serão usados como features.
//   2) updateFromMLPrediction(prediction): como interpretar a saída do modelo (classe/confiança) no estado do exercício.
//   3) (Opcional) detectWithRules(results): validações heurísticas específicas do exercício (para feedback e segurança).
//
// Convenções de I/O:
// - Features: para cada landmark importante: [x, y, z, visibility] na mesma ordem do treino.
// - Scaler: JSON com { type, mean[], scale[] } compatível com StandardScaler; ausente => sem normalização.
// - Info do modelo: <exercise>_info.json com { classes: [...] } para mapear o índice de saída para classe textual.
class MLDetector extends ExerciseDetector {
    constructor(exerciseType, performanceMode = 'performance') {
        super(exerciseType, performanceMode);
        
        // Registro de objetos customizados no TensorFlow.js (por ex.: regularizador L2)
        if (typeof tf !== 'undefined' && !MLDetector._customObjectsRegistered) {
            // Register L2 regularizer
            tf.serialization.registerClass({
                className: 'L2',
                fromConfig: (cls, config) => {
                    return tf.regularizers.l2(config.l2 || 0.01);
                }
            });
            MLDetector._customObjectsRegistered = true;
        }
        
        // Estado do ML
        this.mlModel = null;
        this.mlScaler = null;
        this.mlLoaded = false;
        this.mlLoading = false;
        
        // Controle de fallback: se ML falhar, usar apenas regras
        this.useML = true;
        this.mlConfidenceThreshold = 0.7;
        
        // Configuração de features: lista de landmarks relevantes definida pela subclasse
        this.importantLandmarks = this.getImportantLandmarks();
    }

    // Abstract method - each exercise defines its important landmarks
    // Método abstrato: a subclasse deve informar quais landmarks importam para o modelo
    getImportantLandmarks() {
        throw new Error('getImportantLandmarks() must be implemented by subclass');
    }

    // Carrega o modelo de ML e, se disponível, o scaler e metadados (classes)
    async loadMLModel() {
        if (this.mlLoading || this.mlLoaded) return;
        
        this.mlLoading = true;
        
        try {
            // Modelo por exercício (pasta baseada em exerciseType)
            const modelResponse = await fetch(`/models_tfjs/${this.exerciseType.toLowerCase()}/model/model.json`);
            if (!modelResponse.ok) {
                // console.log(`⚠️  ML model not found for ${this.exerciseType} - using rules only`);
                this.useML = false;
                return;
            }
            
            // Carrega modelo (layers) permitindo objetos customizados
            this.mlModel = await tf.loadLayersModel(
                `/models_tfjs/${this.exerciseType.toLowerCase()}/model/model.json`,
                {
                    strict: false // Allows loading models with custom layers/regularizers
                }
            );
            
            // Carrega scaler (opcional)
            try {
                const scalerResponse = await fetch(`/models_tfjs/${this.exerciseType.toLowerCase()}/scaler.json`);
                if (scalerResponse.ok) {
                    this.mlScaler = await scalerResponse.json();
                    // Normaliza formatos inválidos (ex.: NoScaler) para null
                    const s = this.mlScaler;
                    const invalidScaler = !s || s.type === 'NoScaler' || !Array.isArray(s.mean) || !Array.isArray(s.scale);
                    if (invalidScaler) {
                        // console.log(`ℹ️  No scaler for ${this.exerciseType} (not required)`);
                        this.mlScaler = null;
                    } else {
                        // console.log(`✅ Scaler loaded for ${this.exerciseType}`);
                    }
                } else {
                    // console.log(`ℹ️  No scaler for ${this.exerciseType} (not required)`);
                    this.mlScaler = null;
                }
            } catch (error) {
                // console.log(`ℹ️  Scaler not available for ${this.exerciseType} (optional)`);
                this.mlScaler = null;
            }
            
            // Carrega metadados do modelo (classes, versão, etc.)
            const infoResponse = await fetch(`/models_tfjs/${this.exerciseType.toLowerCase()}/${this.exerciseType.toLowerCase()}_info.json`);
            if (infoResponse.ok) {
                this.modelInfo = await infoResponse.json();
            }
            
            this.mlLoaded = true;
            // console.log(`✅ ML model loaded for ${this.exerciseType}`);
            
        } catch (error) {
            // console.log(`❌ Failed to load ML model for ${this.exerciseType}:`, error);
            this.useML = false;
        } finally {
            this.mlLoading = false;
        }
    }

    // Extrai features dos landmarks (mesmo esquema do treino em Python)
    extractFeatures(landmarks) {
        const features = [];
        
        for (const idx of this.importantLandmarks) {
            const landmark = landmarks[idx];
            if (landmark) {
                features.push(landmark.x, landmark.y, landmark.z, landmark.visibility);
            } else {
                // Preenche com zeros caso falte o landmark
                features.push(0, 0, 0, 0);
            }
        }
        
        return features;
    }

    // Aplica transformação do scaler, se presente
    applyScaler(features) {
        const s = this.mlScaler;
        if (!s || s.type === 'NoScaler' || !Array.isArray(s.mean) || !Array.isArray(s.scale)) {
            return features;
        }
        
        const mean = s.mean;
        const scale = s.scale;
        
        return features.map((val, i) => {
            const m = mean[i];
            const sc = scale[i];
            if (m !== undefined && sc !== undefined && sc !== 0) {
                return (val - m) / sc;
            }
            return val;
        });
    }

    // Faz predição no modelo de ML (retorna classe, confiança e vetor de probabilidades)
    async predictWithML(features) {
        if (!this.mlModel || !this.mlLoaded) return null;
        
        try {
            // 1) Aplica scaler
            const scaledFeatures = this.applyScaler(features);
            
            // 2) Converte para tensor 2D [1, num_features]
            const input = tf.tensor2d([scaledFeatures], [1, scaledFeatures.length]);
            
            // 3) Predição e extração das probabilidades
            const predictions = this.mlModel.predict(input);
            const probabilities = await predictions.data();
            
            // 4) Libera memória do TensorFlow
            input.dispose();
            predictions.dispose();
            
            // 5) Seleciona a classe de maior probabilidade
            const maxIdx = probabilities.indexOf(Math.max(...probabilities));
            const confidence = probabilities[maxIdx];
            
            return {
                class: this.modelInfo.classes[maxIdx],
                confidence: confidence,
                probabilities: Array.from(probabilities)
            };
            
        } catch (error) {
            console.error('ML prediction error:', error);
            return null;
        }
    }

    // Detecta o exercício combinando ML (assíncrono) e Regras (síncronas)
    // - ML: classifica estágio/erro; executa em paralelo e atualiza estado ao concluir.
    // - Regras: rodam sempre, garantindo feedback imediato e interpretável.
    detectExercise(results) {
        // Carrega modelo sob demanda (assíncrono, sem bloquear o frame)
        if (!this.mlLoaded && !this.mlLoading) {
            this.loadMLModel();
        }

        const landmarks = results.poseLandmarks;
        this.hasError = false;

        // Se ML indisponível, emite erro e retorna (subclasse pode adaptar esse comportamento)
        if (!this.useML || !this.mlLoaded) {
            this.hasError = true;
            this.addError('Model Not Available', 'ML model not loaded - cannot detect exercise');
            return;
        }

        try {
            // Verificação de visibilidade mínima dos landmarks críticos
            const requiredLandmarks = this.importantLandmarks.map(idx => landmarks[idx]).filter(l => l);
            if (!this.checkVisibility(requiredLandmarks, this.visibilityThreshold)) {
                return;
            }

            // Passo 1: Executa ML (assíncrono) para classificar estágio/erros
            const features = this.extractFeatures(landmarks);
            this.predictWithML(features).then(mlPrediction => {
                if (mlPrediction) {
                    this.updateFromMLPrediction(mlPrediction);
                }
            }).catch(error => {
                console.error('ML prediction error:', error);
            });
            
            // Passo 2: Sempre roda regras de forma síncrona
            // Garante que hasError/feedback estejam prontos antes do drawResults()
            if (typeof this.detectWithRules === 'function') {
                this.detectWithRules(results);
            }
            
        } catch (error) {
            console.error('Detection error:', error);
            this.hasError = true;
            this.addError('ML Error', error.message);
        }
    }

    // Método abstrato: a subclasse interpreta a saída do modelo e atualiza o estado (ex.: stage/counter)
    updateFromMLPrediction(prediction) {
        throw new Error('updateFromMLPrediction() must be implemented by subclass');
    }

    // Utilitário: registra erros no painel de histórico
    addError(type, message) {
        const timestamp = Date.now();

        // Inicializa array de erros se não existir
        if (!this.errors) {
            this.errors = [];
        }

        // Evita duplicatas: só adiciona se o mesmo erro não foi registrado nos últimos 2 segundos
        const isDuplicate = this.errors.some(e =>
            e.type === type &&
            e.message === message &&
            (timestamp - e.timestamp) < 2000
        );

        if (isDuplicate) {
            return; // Ignora erro duplicado
        }

        // Adiciona novo erro ao histórico
        this.errors.push({
            type: type,
            message: message,
            timestamp: timestamp,
            id: `error_${timestamp}_${Math.random().toString(36).substr(2, 9)}` // ID único
        });

        // Mantém apenas os últimos 100 erros (histórico completo da sessão)
        if (this.errors.length > 100) {
            this.errors.shift(); // Remove o mais antigo
        }

        // Log SEMPRE (para debug) - REMOVER em produção
        console.log(`✅ [ERRO ADICIONADO] ${type} | Total no histórico: ${this.errors.length}`);

        // Log detalhado se debug mode ativo
        if (window.debugMode) {
            console.log(`   Mensagem: ${message}`);
            console.log(`   Timestamp: ${timestamp}`);
            console.log(`   Histórico completo:`, this.errors);
        }
    }

    // Sobrepõe overlay de debug para incluir status do ML
    drawStatsOverlay() {
        super.drawStatsOverlay();

        if (window.debugMode) {
            const ctx = this.canvasCtx;
            const canvas = this.canvasElement;

            // Salva o estado e desfaz o espelhamento
            ctx.save();
            ctx.scale(-1, 1);

            // Mostra status do ML (ajustado para canvas espelhado)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(-210, 60, 200, 60);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';

            if (this.mlLoaded) {
                ctx.fillStyle = '#00FF00';
                ctx.fillText('🧠 ML: ACTIVE', -200, 80);
            } else if (this.mlLoading) {
                ctx.fillStyle = '#FFFF00';
                ctx.fillText('🧠 ML: LOADING...', -200, 80);
            } else {
                ctx.fillStyle = '#FF0000';
                ctx.fillText('🧠 ML: DISABLED', -200, 80);
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(`Mode: ${this.useML ? 'ML+Rules' : 'Rules Only'}`, -200, 100);

            ctx.restore();
        }
    }

    // Reset do estado lógico (mantém o modelo carregado para evitar latências)
    reset() {
        super.reset();
        // Don't reset ML model - keep it loaded
    }
}

// Expose to window for use in other scripts
window.MLDetector = MLDetector;
