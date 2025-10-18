// Detector de Agachamento (Squat) baseado em ML + Regras
//
// Propósito:
// - Especialização do MLDetector para o exercício de agachamento.
// - Usa um modelo TF.js para classificar o estágio (up/down) e regras para validar postura (pés/joelhos).
// - Contabiliza repetições somente quando a postura está correta no momento da transição de 'down' para 'up'.
//
// Fluxo:
// 1) getImportantLandmarks(): define landmarks usados como features (ordem precisa bater com o treino).
// 2) predictWithML(): executado pela classe base; updateFromMLPrediction() interpreta a saída.
// 3) detectWithRules(): validações de pés/joelhos em paralelo ao ML para feedback imediato.
// 4) draw*(): overlays de fase, contador, erros e debug.
class SquatDetectorML extends MLDetector {
    constructor(performanceMode = 'performance') {
        super('squat', performanceMode);
        
        // Configurações gerais do ML
        this.useML = true;
        this.mlLoaded = false; // Será carregado automaticamente
        this.mlLoading = false;
        
        // Limiares de visibilidade e confiança (baseados no código Python de referência)
        this.visibilityThreshold = 0.6;
        this.mlConfidenceThreshold = 0.7;
        
        // Posição dos pés: razão entre largura dos pés e largura dos ombros
        // Valores de referência: [1.2, 2.8]
        this.footShoulderRatioMin = 1.2;
        this.footShoulderRatioMax = 2.8;
        
        // Posição dos joelhos: razão entre largura dos joelhos e dos pés (por estágio)
        this.kneeFootRatioUp = [0.5, 1.0];
        this.kneeFootRatioMiddle = [0.7, 1.0];
        this.kneeFootRatioDown = [0.7, 1.1];

        //  Costas, Profundidade, Velocidade, Alinhamento
        this.backAngleThreshold = 160;      // Ângulo mínimo costas (shoulder-hip-knee)
        this.minMovementTime = 500;         // Tempo mínimo entre estágios (ms)
        this.shoulderAlignmentThreshold = 0.05;  // Diferença máxima altura ombros (5% da altura da pessoa)

        // Estado do agachamento
        this.previousStage = 'unknown';
        this.previousFootError = '';
        this.previousKneeError = '';
        this.lastStageChangeTime = null;    // Para controle de velocidade

        // Problemas de calibração (exibidos no overlay)
        this.calibrationIssues = [];
    }

    // Define landmarks importantes (deve bater com o treino do modelo)
    getImportantLandmarks() {
        // 9 landmarks = 36 features (x,y,z,visibility para cada)
        return [
            0,   // NOSE
            11,  // LEFT_SHOULDER
            12,  // RIGHT_SHOULDER
            23,  // LEFT_HIP
            24,  // RIGHT_HIP
            25,  // LEFT_KNEE
            26,  // RIGHT_KNEE
            27,  // LEFT_ANKLE
            28   // RIGHT_ANKLE
        ];
    }

    // Atualiza estado a partir da predição do ML (classe + confiança)
    updateFromMLPrediction(prediction) {
        if (prediction.class === 'down' && prediction.confidence >= this.mlConfidenceThreshold) {
            this.stage = 'down';
        } else if (this.stage === 'down' && prediction.class === 'up' && prediction.confidence >= this.mlConfidenceThreshold) {
            this.stage = 'up';
            
            // Só contabiliza repetição se não houver erro de postura
            if (!this.hasError) {
                this.counter++;
            }
        }
    }

    // Analisa posicionamento de pés e joelhos com base em razões geométricas
    analyzeFootKneePlacement(landmarks, stage) {
        const results = {
            foot_placement: -1,  // -1: unknown, 0: correct, 1: too tight, 2: too wide
            knee_placement: -1
        };

        // Get landmarks (EXACT indices from Python)
        const leftFootIndex = landmarks[31];  // LEFT_FOOT_INDEX
        const rightFootIndex = landmarks[32]; // RIGHT_FOOT_INDEX
        const leftKnee = landmarks[25];      // LEFT_KNEE
        const rightKnee = landmarks[26];      // RIGHT_KNEE
        const leftShoulder = landmarks[11];   // LEFT_SHOULDER
        const rightShoulder = landmarks[12];  // RIGHT_SHOULDER

        // Checagem de visibilidade mínima
            if (!leftFootIndex || !rightFootIndex || !leftKnee || !rightKnee ||
                leftFootIndex.visibility < this.visibilityThreshold ||
                rightFootIndex.visibility < this.visibilityThreshold ||
                leftKnee.visibility < this.visibilityThreshold ||
                rightKnee.visibility < this.visibilityThreshold) {
            return results;
            }
            
            // Distância entre ombros
        const shoulderWidth = this.calculateDistance(
            {x: leftShoulder.x, y: leftShoulder.y},
            {x: rightShoulder.x, y: rightShoulder.y}
        );
            
            // Distância entre os pés
        const footWidth = this.calculateDistance(
            {x: leftFootIndex.x, y: leftFootIndex.y},
            {x: rightFootIndex.x, y: rightFootIndex.y}
        );

        // Razão pés/ombros (arredondada a 0.1)
        const footShoulderRatio = Math.round((footWidth / shoulderWidth) * 10) / 10;

        // DEBUG: Log das medições (remover em produção)
        if (window.debugMode) {
            console.log('📏 Medições de Pés:');
            console.log(`  Largura ombros: ${shoulderWidth.toFixed(3)}`);
            console.log(`  Largura pés: ${footWidth.toFixed(3)}`);
            console.log(`  Ratio pés/ombros: ${footShoulderRatio}`);
            console.log(`  Limites: [${this.footShoulderRatioMin}, ${this.footShoulderRatioMax}]`);
        }

        // Classificação da posição dos pés
        if (this.footShoulderRatioMin <= footShoulderRatio && footShoulderRatio <= this.footShoulderRatioMax) {
            results.foot_placement = 0; // correct
            if (window.debugMode) console.log('  ✅ Pés CORRETOS');
        } else if (footShoulderRatio < this.footShoulderRatioMin) {
            results.foot_placement = 1; // too tight
            if (window.debugMode) console.log('  ❌ Pés MUITO PRÓXIMOS');
        } else if (footShoulderRatio > this.footShoulderRatioMax) {
            results.foot_placement = 2; // too wide
            if (window.debugMode) console.log('  ❌ Pés MUITO AFASTADOS');
        }

        // Distância entre joelhos
        const kneeWidth = this.calculateDistance(
            {x: leftKnee.x, y: leftKnee.y},
            {x: rightKnee.x, y: rightKnee.y}
        );

        // Razão joelhos/pés (arredondada a 0.1)
        const kneeFootRatio = Math.round((kneeWidth / footWidth) * 10) / 10;

        // Classificação da posição dos joelhos por estágio
        let kneeThresholds;
        if (stage === 'up') {
            kneeThresholds = this.kneeFootRatioUp;
        } else if (stage === 'middle') {
            kneeThresholds = this.kneeFootRatioMiddle;
        } else if (stage === 'down') {
            kneeThresholds = this.kneeFootRatioDown;
            } else {
            return results; // Unknown stage
        }

        const [minRatio, maxRatio] = kneeThresholds;
        if (minRatio <= kneeFootRatio && kneeFootRatio <= maxRatio) {
            results.knee_placement = 0; // correct
        } else if (kneeFootRatio < minRatio) {
            results.knee_placement = 1; // too tight
        } else if (kneeFootRatio > maxRatio) {
            results.knee_placement = 2; // too wide
        }

        return results;
    }

    // Calcula distância euclidiana entre dois pontos 2D
    calculateDistance(point1, point2) {
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    //  Calcula ângulo das costas (shoulder-hip-knee)
    calculateBackAngle(landmarks) {
        const leftShoulder = landmarks[11];  // LEFT_SHOULDER
        const leftHip = landmarks[23];       // LEFT_HIP
        const leftKnee = landmarks[25];      // LEFT_KNEE

        // Verifica visibilidade
        if (!leftShoulder || !leftHip || !leftKnee ||
            leftShoulder.visibility < this.visibilityThreshold ||
            leftHip.visibility < this.visibilityThreshold ||
            leftKnee.visibility < this.visibilityThreshold) {
            return null;
        }

        return this.calculateAngle(leftShoulder, leftHip, leftKnee);
    }

    //  Verifica se quadril passou abaixo da linha do joelho (profundidade excessiva)
    checkExcessiveDepth(landmarks) {
        const leftHip = landmarks[23];      // LEFT_HIP
        const rightHip = landmarks[24];     // RIGHT_HIP
        const leftKnee = landmarks[25];     // LEFT_KNEE
        const rightKnee = landmarks[26];    // RIGHT_KNEE

        // Verifica visibilidade
        if (!leftHip || !rightHip || !leftKnee || !rightKnee ||
            leftHip.visibility < this.visibilityThreshold ||
            rightHip.visibility < this.visibilityThreshold ||
            leftKnee.visibility < this.visibilityThreshold ||
            rightKnee.visibility < this.visibilityThreshold) {
            return false;
        }

        // Calcular altura média do quadril e dos joelhos
        const avgHipY = (leftHip.y + rightHip.y) / 2;
        const avgKneeY = (leftKnee.y + rightKnee.y) / 2;

        // Quadril passou abaixo da linha do joelho?
        // Em coordenadas de imagem, Y maior = mais abaixo
        return avgHipY > avgKneeY;
    }

    //  Detecta desalinhamento lateral do tronco (tronco torto)
    checkTorsoAlignment(landmarks) {
        const leftShoulder = landmarks[11];   // LEFT_SHOULDER
        const rightShoulder = landmarks[12];  // RIGHT_SHOULDER
        const leftHip = landmarks[23];        // LEFT_HIP
        const rightHip = landmarks[24];       // RIGHT_HIP
        const nose = landmarks[0];            // NOSE

        // Verifica visibilidade
        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !nose ||
            leftShoulder.visibility < this.visibilityThreshold ||
            rightShoulder.visibility < this.visibilityThreshold ||
            leftHip.visibility < this.visibilityThreshold ||
            rightHip.visibility < this.visibilityThreshold ||
            nose.visibility < this.visibilityThreshold) {
            return { aligned: true, side: null, difference: 0 };
        }

        // Calcular altura da pessoa (do nariz ao quadril médio)
        const midHipY = (leftHip.y + rightHip.y) / 2;
        const bodyHeight = Math.abs(nose.y - midHipY);

        // Calcular diferença de altura entre ombros (normalizada pela altura do corpo)
        const shoulderHeightDiff = Math.abs(leftShoulder.y - rightShoulder.y);
        const normalizedDiff = shoulderHeightDiff / bodyHeight;

        // Determinar qual lado está mais baixo
        let side = null;
        if (leftShoulder.y > rightShoulder.y + (bodyHeight * this.shoulderAlignmentThreshold)) {
            side = 'left'; // Ombro esquerdo está mais baixo = tronco inclinado para esquerda
        } else if (rightShoulder.y > leftShoulder.y + (bodyHeight * this.shoulderAlignmentThreshold)) {
            side = 'right'; // Ombro direito está mais baixo = tronco inclinado para direita
        }

        return {
            aligned: normalizedDiff <= this.shoulderAlignmentThreshold,
            side: side,
            difference: normalizedDiff
        };
    }

    // Regras heurísticas de validação de postura (rodando sempre, em paralelo ao ML)
    detectWithRules(results) {
        const landmarks = results.poseLandmarks;
        this.hasError = false;

        if (!landmarks || landmarks.length === 0) {
            return;
        }

        try {
            // Analyze foot and knee placement (EXACT Python logic)
            const analyzedResults = this.analyzeFootKneePlacement(landmarks, this.stage);
            
            const footPlacement = analyzedResults.foot_placement;
            const kneePlacement = analyzedResults.knee_placement;

            // Convert to string format (EXACT Python logic)
            let feetPlacementStr = "unknown";
            let kneePlacementStr = "unknown";

            if (footPlacement === 0) {
                feetPlacementStr = "correct";
            } else if (footPlacement === 1) {
                feetPlacementStr = "too tight";
            } else if (footPlacement === 2) {
                feetPlacementStr = "too wide";
            }

            if (feetPlacementStr === "correct") {
                if (kneePlacement === 0) {
                    kneePlacementStr = "correct";
                } else if (kneePlacement === 1) {
                    kneePlacementStr = "too tight";
                } else if (kneePlacement === 2) {
                    kneePlacementStr = "too wide";
                }
            } else {
                kneePlacementStr = "unknown";
            }

            // DEBUG: Log das classificações
            if (window.debugMode) {
                console.log('🔍 Classificação:');
                console.log(`  feetPlacementStr: "${feetPlacementStr}"`);
                console.log(`  kneePlacementStr: "${kneePlacementStr}"`);
            }

            // EXACT Python logic: has_error determination
            if (feetPlacementStr === "too tight" || feetPlacementStr === "too wide" ||
                kneePlacementStr === "too tight" || kneePlacementStr === "too wide") {
                this.hasError = true;

                if (feetPlacementStr === "too tight") {
                    this.addError("Pés muito próximos", "Afaste os pés para a largura dos ombros");
                } else if (feetPlacementStr === "too wide") {
                    this.addError("Pés muito afastados", "Aproxime os pés para a largura dos ombros");
                }

                if (kneePlacementStr === "too tight") {
                    this.addError("Joelhos muito próximos", "Mantenha os joelhos alinhados com os pés");
                } else if (kneePlacementStr === "too wide") {
                    this.addError("Joelhos muito afastados", "Mantenha os joelhos alinhados com os pés");
                }
            } else {
                this.hasError = false;
            }

            //  Curvatura das costas 
            // const backAngle = this.calculateBackAngle(landmarks);
            // if (backAngle !== null && backAngle < this.backAngleThreshold) {
            //     this.hasError = true;
            //     this.addError("Costas arqueadas!", "Mantenha as costas retas durante o movimento");
            // }

            // Profundidade excessiva (quadril abaixo da linha do joelho)
            if (this.stage === 'down') {
                const isExcessiveDepth = this.checkExcessiveDepth(landmarks);
                if (isExcessiveDepth) {
                    this.hasError = true;
                    this.addError("Agachamento muito profundo!", "Quadril passou da linha dos joelhos - não desça tanto");
                }
            }

            // Velocidade do movimento
            if (this.stage !== this.previousStage && this.stage !== null) {
                const currentTime = Date.now();

                if (this.lastStageChangeTime !== null) {
                    const elapsedTime = currentTime - this.lastStageChangeTime;

                    if (elapsedTime < this.minMovementTime) {
                        this.hasError = true;
                        this.addError("Movimento muito rápido!", "Controle a velocidade - desça e suba devagar");
                    }
                }

                this.lastStageChangeTime = currentTime;
                this.previousStage = this.stage;
            }

            // ✅ NOVA VALIDAÇÃO: Alinhamento lateral do tronco
            const torsoAlignment = this.checkTorsoAlignment(landmarks);
            if (!torsoAlignment.aligned && torsoAlignment.side !== null) {
                this.hasError = true;
                const sideText = torsoAlignment.side === 'left' ? 'esquerda' : 'direita';
                this.addError("Tronco desalinhado!", `Tronco inclinado para a ${sideText} - mantenha o corpo reto`);
            }

        } catch (error) {
            console.error('Error in rule-based squat detection:', error);
        }
    }

    // Desenha mensagens de feedback no canvas
    drawFeedbackMessages() {
        if (this.errors.length === 0) return;

        const ctx = this.canvasCtx;
        const canvas = this.canvasElement;

        // Salva o estado e desfaz o espelhamento
        ctx.save();
        ctx.scale(-1, 1);

        const centerX = -canvas.width / 2;
        const centerY = canvas.height / 2;

        // Mensagens em destaque (vermelho)
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';

        this.errors.forEach((error, index) => {
            const y = centerY - 20 + (index * 25);
            ctx.fillText(error.message, centerX, y);
        });

        ctx.restore();
    }

    // Overlay principal de estatísticas/estado
    drawStatsOverlay() {
        // Draw main phase indicator (always visible)
        this.drawPhaseIndicator();

        // Draw calibration issues
        this.drawCalibrationIssues();

        if (!window.debugMode) return;

        const ctx = this.canvasCtx;

        // Salva o estado e desfaz o espelhamento para o debug
        ctx.save();
        ctx.scale(-1, 1);

        // Basic debug info (ajustado para canvas espelhado)
        const debugX = -20; // Posição X invertida
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'right'; // Inverte o alinhamento
        ctx.fillText(`Squat Detector - Debug Mode`, debugX, 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.fillText(`Counter: ${this.counter}`, debugX, 40);
        ctx.fillText(`Stage: ${this.stage || 'unknown'}`, debugX, 55);
        ctx.fillText(`Has Error: ${this.hasError}`, debugX, 70);
        ctx.fillText(`Errors: ${this.errors.length}`, debugX, 85);

        ctx.restore();

        // Mensagens de feedback enquanto em debug
        this.drawFeedbackMessages();
    }

    // Indicador de fase (UP/MIDDLE/DOWN) moderno com glass morphism
    drawPhaseIndicator() {
        const ctx = this.canvasCtx;
        const canvas = this.canvasElement;

        // Salva o estado atual do contexto
        ctx.save();

        // Desfaz o espelhamento do canvas para desenhar corretamente
        ctx.scale(-1, 1);

        // Posição X ajustada para canvas espelhado (agora no canto esquerdo real)
        const x = -canvas.width + 80; // Negativo porque o canvas está espelhado
        const y = 80; // Posição Y no topo

        // Determine current phase
        let phaseText = 'MIDDLE';
        let phaseColor = '#FFD700'; // Gold for middle
        let bgGradient;

        if (this.stage === 'up') {
            phaseText = 'UP';
            phaseColor = '#74C611'; // Green for up
        } else if (this.stage === 'down') {
            phaseText = 'DOWN';
            phaseColor = '#FF6B6B'; // Red for down
        }

        // Gradiente de fundo com efeito glass morphism
        const radius = 55;
        bgGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        bgGradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');

        // Sombra externa (glow effect)
        ctx.shadowColor = phaseColor;
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Círculo de fundo com gradiente
        ctx.fillStyle = bgGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();

        // Borda externa grossa com cor da fase
        ctx.shadowBlur = 0; // Remove sombra para borda
        ctx.strokeStyle = phaseColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();

        // Borda interna sutil (efeito de profundidade)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius - 4, 0, 2 * Math.PI);
        ctx.stroke();

        // Texto da fase com sombra
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = phaseColor;
        ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(phaseText, x, y);

        // Pequeno badge com ícone (seta para UP/DOWN)
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 16px Arial';

        if (this.stage === 'up') {
            ctx.fillText('↑', x, y + 22);
        } else if (this.stage === 'down') {
            ctx.fillText('↓', x, y + 22);
        } else {
            ctx.fillText('•', x, y + 22);
        }

        // Restaura o estado do contexto (remove o scale)
        ctx.restore();
    }

    /**
     * Desenhar problemas de calibração
     */
    drawCalibrationIssues() {
        if (!this.calibrationIssues || this.calibrationIssues.length === 0) return;

        const ctx = this.canvasCtx;
        const canvas = this.canvasElement;

        // Salva o estado e desfaz o espelhamento
        ctx.save();
        ctx.scale(-1, 1);

        // Posição no canto superior direito (ajustada para canvas espelhado)
        const x = -300;
        const y = 20;

        // Fundo semi-transparente
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(x - 10, y - 15, 290, this.calibrationIssues.length * 25 + 20);

        // Título
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('⚠️ Problemas de Calibração:', x, y);

        // Lista de problemas
        ctx.font = '12px Arial';
        this.calibrationIssues.forEach((issue, index) => {
            ctx.fillText(`• ${issue}`, x, y + 20 + (index * 20));
        });

        ctx.restore();
    }

    // Reset detector (NÃO limpa histórico de erros!)
    reset() {
        this.hasError = false;
        this.counter = 0;
        this.stage = null;
        this.previousStage = 'unknown';
        this.previousFootError = '';
        this.previousKneeError = '';
        this.lastStageChangeTime = null;
        this.calibrationIssues = [];
    }
}

// Expose to window for use in other scripts
window.SquatDetectorML = SquatDetectorML;