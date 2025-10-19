/**
 * Base Validator - Validações Heurísticas Base
 * =============================================
 *
 * Classe base para validações heurísticas específicas de cada exercício.
 * Fornece métodos auxiliares e interface comum.
 */

class BaseValidator {
    constructor(config = {}) {
        this.config = {
            minConfidence: config.minConfidence || 0.7,
            warningSeverity: config.warningSeverity || 'medium',
            ...config
        };

        this.validationResults = [];
        this.currentIssues = [];
    }

    /**
     * Método abstrato - deve ser implementado por subclasses
     */
    validate(landmarks, frameCount) {
        throw new Error('validate() must be implemented by subclass');
    }

    /**
     * Calcula ângulo entre três pontos (em graus)
     */
    calculateAngle(point1, point2, point3) {
        const radians = Math.atan2(point3.y - point2.y, point3.x - point2.x) -
                       Math.atan2(point1.y - point2.y, point1.x - point2.x);
        let angle = Math.abs(radians * 180.0 / Math.PI);

        if (angle > 180.0) {
            angle = 360 - angle;
        }

        return angle;
    }

    /**
     * Calcula distância euclidiana entre dois pontos
     */
    calculateDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const dz = (point2.z || 0) - (point1.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Verifica se um ponto está visível (confiança suficiente)
     */
    isVisible(landmark) {
        return landmark.visibility !== undefined
            ? landmark.visibility > this.config.minConfidence
            : true;
    }

    /**
     * Verifica alinhamento vertical entre pontos
     */
    checkVerticalAlignment(point1, point2, tolerance = 0.05) {
        return Math.abs(point1.x - point2.x) < tolerance;
    }

    /**
     * Verifica alinhamento horizontal entre pontos
     */
    checkHorizontalAlignment(point1, point2, tolerance = 0.05) {
        return Math.abs(point1.y - point2.y) < tolerance;
    }

    /**
     * Cria um resultado de validação
     */
    createValidationResult(isValid, type, message, severity = 'medium', details = {}) {
        return {
            isValid,
            type,
            message,
            severity, // 'low', 'medium', 'high', 'critical'
            details,
            timestamp: Date.now()
        };
    }

    /**
     * Reseta histórico de validações
     */
    reset() {
        this.validationResults = [];
        this.currentIssues = [];
    }

    /**
     * Obtém estatísticas das validações
     */
    getStatistics() {
        const total = this.validationResults.length;
        const valid = this.validationResults.filter(r => r.isValid).length;
        const invalid = total - valid;

        const severityCounts = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
        };

        this.validationResults.forEach(r => {
            if (!r.isValid && severityCounts[r.severity] !== undefined) {
                severityCounts[r.severity]++;
            }
        });

        return {
            total,
            valid,
            invalid,
            accuracy: total > 0 ? (valid / total) * 100 : 0,
            severityCounts
        };
    }
}

// Export
if (typeof window !== 'undefined') {
    window.BaseValidator = BaseValidator;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseValidator;
}
