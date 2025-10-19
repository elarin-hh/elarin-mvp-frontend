/**
 * Lunge Validator - Validações Heurísticas para Afundo
 * =====================================================
 *
 * Valida a técnica do afundo baseado em regras biomecânicas:
 * - Joelho frontal não ultrapassa o pé
 * - Ângulo adequado dos joelhos
 * - Tronco ereto
 * - Estabilidade lateral
 * - Profundidade adequada
 */

class LungeValidator extends BaseValidator {
    constructor(config = {}) {
        super(config);

        this.config = {
            ...this.config,
            minKneeAngle: config.minKneeAngle || 80,    // Ângulo mínimo joelho frontal
            maxKneeAngle: config.maxKneeAngle || 110,
            maxKneeOverToe: config.maxKneeOverToe || 0.05,
            minTorsoAngle: config.minTorsoAngle || 75,  // Tronco deve estar ereto
            maxTorsoAngle: config.maxTorsoAngle || 95,
            maxLateralDeviation: config.maxLateralDeviation || 0.08,
            ...config
        };

        // Usa constantes compartilhadas do MediaPipe
        this.landmarks = window.MEDIAPIPE_LANDMARKS || {
            LEFT_SHOULDER: 11,
            RIGHT_SHOULDER: 12,
            LEFT_HIP: 23,
            RIGHT_HIP: 24,
            LEFT_KNEE: 25,
            RIGHT_KNEE: 26,
            LEFT_ANKLE: 27,
            RIGHT_ANKLE: 28,
            LEFT_HEEL: 29,
            RIGHT_HEEL: 30,
            LEFT_FOOT_INDEX: 31,
            RIGHT_FOOT_INDEX: 32
        };

        // Detecta qual perna está à frente
        this.frontLeg = null; // 'left' ou 'right'
    }

    /**
     * Detecta automaticamente qual perna está à frente
     */
    detectFrontLeg(landmarks) {
        const leftKnee = landmarks[this.landmarks.LEFT_KNEE];
        const rightKnee = landmarks[this.landmarks.RIGHT_KNEE];

        if (!this.isVisible(leftKnee) || !this.isVisible(rightKnee)) {
            return this.frontLeg; // mantém detecção anterior
        }

        // A perna com menor valor Y (mais alta na tela) geralmente é a frontal
        // E também tem menor valor X (mais à frente) em visão lateral
        const leftScore = leftKnee.y + leftKnee.x;
        const rightScore = rightKnee.y + rightKnee.x;

        this.frontLeg = leftScore < rightScore ? 'left' : 'right';
        return this.frontLeg;
    }

    /**
     * Obtém landmarks baseado na perna frontal detectada
     */
    getFrontLandmarks(landmarks) {
        const isLeft = this.frontLeg === 'left';

        return {
            shoulder: landmarks[isLeft ? this.landmarks.LEFT_SHOULDER : this.landmarks.RIGHT_SHOULDER],
            hip: landmarks[isLeft ? this.landmarks.LEFT_HIP : this.landmarks.RIGHT_HIP],
            knee: landmarks[isLeft ? this.landmarks.LEFT_KNEE : this.landmarks.RIGHT_KNEE],
            ankle: landmarks[isLeft ? this.landmarks.LEFT_ANKLE : this.landmarks.RIGHT_ANKLE],
            heel: landmarks[isLeft ? this.landmarks.LEFT_HEEL : this.landmarks.RIGHT_HEEL],
            footIndex: landmarks[isLeft ? this.landmarks.LEFT_FOOT_INDEX : this.landmarks.RIGHT_FOOT_INDEX]
        };
    }

    /**
     * Obtém landmarks da perna traseira
     */
    getBackLandmarks(landmarks) {
        const isLeft = this.frontLeg === 'right'; // invertido

        return {
            hip: landmarks[isLeft ? this.landmarks.LEFT_HIP : this.landmarks.RIGHT_HIP],
            knee: landmarks[isLeft ? this.landmarks.LEFT_KNEE : this.landmarks.RIGHT_KNEE],
            ankle: landmarks[isLeft ? this.landmarks.LEFT_ANKLE : this.landmarks.RIGHT_ANKLE]
        };
    }

    /**
     * Valida a execução do lunge
     */
    validate(landmarks, frameCount = 0) {
        this.currentIssues = [];
        const results = [];

        // Detecta perna frontal
        this.detectFrontLeg(landmarks);

        if (!this.frontLeg) {
            return {
                isValid: false,
                issues: [],
                summary: { message: 'Aguardando detecção de posição...' },
                details: []
            };
        }

        // 1. Validação joelho frontal não ultrapassar o pé
        results.push(this.validateFrontKneePosition(landmarks));

        // 2. Validação ângulo do joelho frontal (profundidade)
        results.push(this.validateFrontKneeAngle(landmarks));

        // 3. Validação postura do tronco
        results.push(this.validateTorsoPosture(landmarks));

        // 4. Validação ângulo do joelho traseiro
        results.push(this.validateBackKneeAngle(landmarks));

        // 5. Validação estabilidade lateral
        results.push(this.validateLateralStability(landmarks));

        // Armazena resultados
        results.forEach(r => {
            if (r) {
                this.validationResults.push(r);
                if (!r.isValid) {
                    this.currentIssues.push(r);
                }
            }
        });

        return {
            isValid: results.every(r => !r || r.isValid),
            issues: this.currentIssues,
            summary: this.getSummary(),
            details: results.filter(r => r !== null),
            frontLeg: this.frontLeg
        };
    }

    /**
     * 1. Valida posição do joelho frontal (não ultrapassar pé)
     */
    validateFrontKneePosition(landmarks) {
        const front = this.getFrontLandmarks(landmarks);

        if (!this.isVisible(front.knee) || !this.isVisible(front.footIndex)) {
            return null;
        }

        const kneeToToeDistance = front.knee.x - front.footIndex.x;

        if (kneeToToeDistance > this.config.maxKneeOverToe) {
            return this.createValidationResult(
                false,
                'knee_over_toe',
                'Joelho frontal ultrapassando o pé - dê um passo maior',
                'high',
                { distance: kneeToToeDistance.toFixed(3), maxAllowed: this.config.maxKneeOverToe }
            );
        }

        return this.createValidationResult(
            true,
            'knee_over_toe',
            'Posição do joelho frontal correta',
            'low',
            { distance: kneeToToeDistance.toFixed(3) }
        );
    }

    /**
     * 2. Valida ângulo do joelho frontal
     */
    validateFrontKneeAngle(landmarks) {
        const front = this.getFrontLandmarks(landmarks);

        if (!this.isVisible(front.hip) || !this.isVisible(front.knee) || !this.isVisible(front.ankle)) {
            return null;
        }

        const kneeAngle = this.calculateAngle(front.hip, front.knee, front.ankle);

        if (kneeAngle < this.config.minKneeAngle) {
            return this.createValidationResult(
                false,
                'front_knee_depth',
                'Afundo muito profundo - suba um pouco',
                'medium',
                { kneeAngle: kneeAngle.toFixed(1), expected: `>${this.config.minKneeAngle}°` }
            );
        }

        if (kneeAngle > this.config.maxKneeAngle) {
            return this.createValidationResult(
                false,
                'front_knee_depth',
                'Profundidade insuficiente - desça mais',
                'high',
                { kneeAngle: kneeAngle.toFixed(1), expected: `<${this.config.maxKneeAngle}°` }
            );
        }

        return this.createValidationResult(
            true,
            'front_knee_depth',
            'Profundidade do afundo adequada',
            'low',
            { kneeAngle: kneeAngle.toFixed(1) }
        );
    }

    /**
     * 3. Valida postura do tronco
     */
    validateTorsoPosture(landmarks) {
        const front = this.getFrontLandmarks(landmarks);

        if (!this.isVisible(front.shoulder) || !this.isVisible(front.hip) || !this.isVisible(front.knee)) {
            return null;
        }

        const torsoAngle = this.calculateAngle(front.knee, front.hip, front.shoulder);

        if (torsoAngle < this.config.minTorsoAngle) {
            return this.createValidationResult(
                false,
                'torso_posture',
                'Tronco muito inclinado para frente - mantenha-se ereto',
                'critical',
                { torsoAngle: torsoAngle.toFixed(1), minRequired: this.config.minTorsoAngle }
            );
        }

        if (torsoAngle > this.config.maxTorsoAngle) {
            return this.createValidationResult(
                false,
                'torso_posture',
                'Tronco inclinando para trás - mantenha postura neutra',
                'medium',
                { torsoAngle: torsoAngle.toFixed(1), maxAllowed: this.config.maxTorsoAngle }
            );
        }

        return this.createValidationResult(
            true,
            'torso_posture',
            'Postura do tronco correta',
            'low',
            { torsoAngle: torsoAngle.toFixed(1) }
        );
    }

    /**
     * 4. Valida ângulo do joelho traseiro
     */
    validateBackKneeAngle(landmarks) {
        const back = this.getBackLandmarks(landmarks);

        if (!this.isVisible(back.hip) || !this.isVisible(back.knee) || !this.isVisible(back.ankle)) {
            return null;
        }

        const backKneeAngle = this.calculateAngle(back.hip, back.knee, back.ankle);

        // Joelho traseiro deve estar em ~90 graus
        if (backKneeAngle < 70 || backKneeAngle > 110) {
            return this.createValidationResult(
                false,
                'back_knee_angle',
                'Ângulo do joelho traseiro inadequado - ajuste profundidade',
                'medium',
                { backKneeAngle: backKneeAngle.toFixed(1), optimal: '80-110°' }
            );
        }

        return this.createValidationResult(
            true,
            'back_knee_angle',
            'Ângulo do joelho traseiro adequado',
            'low',
            { backKneeAngle: backKneeAngle.toFixed(1) }
        );
    }

    /**
     * 5. Valida estabilidade lateral
     */
    validateLateralStability(landmarks) {
        const leftShoulder = landmarks[this.landmarks.LEFT_SHOULDER];
        const rightShoulder = landmarks[this.landmarks.RIGHT_SHOULDER];
        const leftHip = landmarks[this.landmarks.LEFT_HIP];
        const rightHip = landmarks[this.landmarks.RIGHT_HIP];

        if (!this.isVisible(leftShoulder) || !this.isVisible(rightShoulder) ||
            !this.isVisible(leftHip) || !this.isVisible(rightHip)) {
            return null;
        }

        // Verifica se ombros e quadris estão alinhados lateralmente
        const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
        const hipMidX = (leftHip.x + rightHip.x) / 2;

        const lateralDeviation = Math.abs(shoulderMidX - hipMidX);

        if (lateralDeviation > this.config.maxLateralDeviation) {
            return this.createValidationResult(
                false,
                'lateral_stability',
                'Instabilidade lateral detectada - mantenha corpo alinhado',
                'high',
                { deviation: lateralDeviation.toFixed(3), maxAllowed: this.config.maxLateralDeviation }
            );
        }

        return this.createValidationResult(
            true,
            'lateral_stability',
            'Estabilidade lateral adequada',
            'low',
            { deviation: lateralDeviation.toFixed(3) }
        );
    }

    /**
     * Gera resumo das validações
     */
    getSummary() {
        const issuesBySeverity = {
            critical: this.currentIssues.filter(i => i.severity === 'critical').length,
            high: this.currentIssues.filter(i => i.severity === 'high').length,
            medium: this.currentIssues.filter(i => i.severity === 'medium').length,
            low: this.currentIssues.filter(i => i.severity === 'low').length
        };

        const totalIssues = this.currentIssues.length;
        const hasCritical = issuesBySeverity.critical > 0;

        return {
            isValid: totalIssues === 0,
            totalIssues,
            issuesBySeverity,
            priority: hasCritical ? 'critical' : (issuesBySeverity.high > 0 ? 'high' : 'medium'),
            message: totalIssues === 0
                ? 'Execução tecnicamente correta!'
                : `${totalIssues} problema(s) detectado(s)`
        };
    }

    /**
     * Reset incluindo detecção de perna
     */
    reset() {
        super.reset();
        this.frontLeg = null;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.LungeValidator = LungeValidator;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LungeValidator;
}
