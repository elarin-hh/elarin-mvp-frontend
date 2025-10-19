/**
 * Feedback System - Integração ML + Heurísticas
 * ==============================================
 *
 * Sistema inteligente que combina:
 * 1. Predições do modelo ML (autoencoder)
 * 2. Validações heurísticas (regras biomecânicas)
 * 3. Geração de feedback contextual e priorizado
 */

class FeedbackSystem {
    constructor(config = {}) {
        this.config = {
            feedbackMode: config.feedbackMode || 'hybrid', // 'ml_only', 'heuristic_only', 'hybrid'
            mlWeight: config.mlWeight || 0.6,              // Peso do ML na decisão final
            heuristicWeight: config.heuristicWeight || 0.4,
            minConfidenceThreshold: config.minConfidenceThreshold || 0.6,
            maxFeedbackItems: config.maxFeedbackItems || 3,
            prioritizeCritical: config.prioritizeCritical !== false,
            ...config
        };

        this.feedbackHistory = [];
        this.maxHistorySize = 50;
        this.currentFeedback = null;
    }

    /**
     * Combina resultados ML + Heurísticas
     */
    integrate(mlResult, heuristicResult) {
        const feedback = {
            timestamp: Date.now(),
            mode: this.config.feedbackMode,
            ml: this.processMLResult(mlResult),
            heuristic: this.processHeuristicResult(heuristicResult),
            combined: null
        };

        // Combina resultados baseado no modo
        switch (this.config.feedbackMode) {
            case 'ml_only':
                feedback.combined = this.mlOnlyDecision(feedback.ml);
                break;

            case 'heuristic_only':
                feedback.combined = this.heuristicOnlyDecision(feedback.heuristic);
                break;

            case 'hybrid':
            default:
                feedback.combined = this.hybridDecision(feedback.ml, feedback.heuristic);
                break;
        }

        // Gera feedback contextual
        feedback.messages = this.generateMessages(feedback);
        feedback.visualization = this.generateVisualization(feedback);

        // Armazena histórico
        this.feedbackHistory.push(feedback);
        if (this.feedbackHistory.length > this.maxHistorySize) {
            this.feedbackHistory.shift();
        }

        this.currentFeedback = feedback;
        return feedback;
    }

    /**
     * Processa resultado do ML
     */
    processMLResult(mlResult) {
        if (!mlResult || mlResult.status === 'waiting' || mlResult.status === 'error') {
            return {
                available: false,
                status: mlResult?.status || 'unavailable',
                message: mlResult?.message
            };
        }

        if (mlResult.status === 'processing') {
            return {
                available: false,
                status: 'processing',
                message: `Processando... (${mlResult.frames} frames)`
            };
        }

        // Garante que confidence é válido
        const confidence = (mlResult.confidence !== undefined && !isNaN(mlResult.confidence))
            ? mlResult.confidence
            : 0.7;

        const processed = {
            available: true,
            isCorrect: mlResult.isCorrect,
            confidence: confidence,
            error: mlResult.reconstructionError,
            threshold: mlResult.threshold,
            status: mlResult.status,
            details: mlResult.details
        };

        return processed;
    }

    /**
     * Processa resultado das heurísticas
     */
    processHeuristicResult(heuristicResult) {
        if (!heuristicResult) {
            return {
                available: false,
                issues: []
            };
        }

        return {
            available: true,
            isValid: heuristicResult.isValid,
            issues: heuristicResult.issues || [],
            summary: heuristicResult.summary,
            details: heuristicResult.details || []
        };
    }

    /**
     * Decisão baseada apenas em ML
     */
    mlOnlyDecision(mlData) {
        if (!mlData.available) {
            return {
                isCorrect: null,
                confidence: 0,
                verdict: 'unknown',
                reason: mlData.message || 'ML não disponível',
                mlContribution: 1.0,
                heuristicContribution: 0.0
            };
        }

        // Garante que confidence é válido
        const confidence = (mlData.confidence !== undefined && !isNaN(mlData.confidence))
            ? Math.max(0, Math.min(1, mlData.confidence))
            : 0.7;

        // Razão específica para One-Class Learning
        let reason;
        if (mlData.isCorrect) {
            reason = 'Padrão de movimento reconhecido (similar ao treino)';
        } else {
            reason = 'Movimento anômalo detectado (diferente do treino)';
        }

        const result = {
            isCorrect: mlData.isCorrect,
            confidence: confidence,
            verdict: mlData.isCorrect ? 'correct' : 'incorrect',
            reason: reason,
            mlContribution: 1.0,
            heuristicContribution: 0.0,
            mlDetails: {
                reconstructionError: mlData.error,
                threshold: mlData.threshold,
                interpretation: mlData.isCorrect
                    ? 'Erro de reconstrução baixo (movimento familiar)'
                    : 'Erro de reconstrução alto (movimento desconhecido)'
            }
        };

        return result;
    }

    /**
     * Decisão baseada apenas em heurísticas
     */
    heuristicOnlyDecision(heuristicData) {
        if (!heuristicData.available) {
            return {
                isCorrect: null,
                confidence: 0,
                verdict: 'unknown',
                reason: 'Heurísticas não disponíveis'
            };
        }

        const criticalIssues = heuristicData.issues.filter(i => i.severity === 'critical').length;
        const highIssues = heuristicData.issues.filter(i => i.severity === 'high').length;

        const isCorrect = heuristicData.isValid;
        const confidence = isCorrect ? 0.9 : (criticalIssues > 0 ? 0.95 : 0.85);

        return {
            isCorrect,
            confidence,
            verdict: isCorrect ? 'correct' : 'incorrect',
            reason: 'Baseado em análise biomecânica',
            mlContribution: 0.0,
            heuristicContribution: 1.0
        };
    }

    /**
     * Decisão híbrida (ML + Heurísticas)
     */
    hybridDecision(mlData, heuristicData) {
        // Se nenhum disponível
        if (!mlData.available && !heuristicData.available) {
            return {
                isCorrect: null,
                confidence: 0,
                verdict: 'unknown',
                reason: 'Aguardando dados suficientes',
                mlContribution: 0,
                heuristicContribution: 0
            };
        }

        // Se apenas ML disponível
        if (mlData.available && !heuristicData.available) {
            return this.mlOnlyDecision(mlData);
        }

        // Se apenas heurísticas disponíveis
        if (!mlData.available && heuristicData.available) {
            return this.heuristicOnlyDecision(heuristicData);
        }

        // Ambos disponíveis - combinar inteligentemente
        // Garante que mlData.confidence é válido
        const mlConfidence = (mlData.confidence !== undefined && !isNaN(mlData.confidence))
            ? mlData.confidence
            : 0.5;

        const mlScore = mlData.isCorrect ? mlConfidence : (1 - mlConfidence);
        const heuristicScore = heuristicData.isValid ? 0.95 : this.calculateHeuristicScore(heuristicData);

        // Combina com pesos
        const combinedScore = (mlScore * this.config.mlWeight) +
                            (heuristicScore * this.config.heuristicWeight);

        // Regras de priorização
        const criticalIssues = heuristicData.issues.filter(i => i.severity === 'critical');
        const hasHeuristicProblems = !heuristicData.isValid || criticalIssues.length > 0;
        const hasMLProblems = !mlData.isCorrect;

        // Se QUALQUER um detectar erro, marca como incorreto
        // Ambos ML e Heurística têm poder de veto igual - primeiro que detectar erro prevalece
        const isCorrect = !hasMLProblems && !hasHeuristicProblems;

        // Calcula confiança final - usa o maior valor entre ML e heurística
        let confidence = Math.max(mlConfidence, heuristicScore);

        // Garante que confidence está no range [0, 1]
        confidence = Math.max(0, Math.min(1, confidence));

        // Determina razão principal - lógica rigorosa (qualquer erro = vermelho)
        let reason;
        if (isCorrect) {
            // Ambos aprovaram
            reason = 'Execução correta confirmada (ML + Biomecânica)';
        } else {
            // Pelo menos um reprovou
            if (criticalIssues.length > 0) {
                reason = 'Erros biomecânicos críticos detectados';
            } else if (!mlData.isCorrect && !heuristicData.isValid) {
                reason = 'Padrão anômalo com erros técnicos detectados';
            } else if (!mlData.isCorrect) {
                reason = 'Padrão de movimento atípico (ML detectou anomalia)';
            } else if (!heuristicData.isValid) {
                reason = 'Erros biomecânicos detectados (Heurística)';
            } else {
                reason = 'Movimento incorreto';
            }
        }

        return {
            isCorrect,
            confidence,
            verdict: isCorrect ? 'correct' : 'incorrect',
            reason,
            combinedScore,
            mlContribution: this.config.mlWeight,
            heuristicContribution: this.config.heuristicWeight,
            agreement: mlData.isCorrect === heuristicData.isValid,
            criticalIssuesFound: criticalIssues.length > 0
        };
    }

    /**
     * Calcula score das heurísticas baseado em severidade
     */
    calculateHeuristicScore(heuristicData) {
        if (heuristicData.isValid) return 0.95;

        const severityWeights = {
            critical: 0.4,
            high: 0.25,
            medium: 0.15,
            low: 0.05
        };

        let totalPenalty = 0;
        heuristicData.issues.forEach(issue => {
            totalPenalty += severityWeights[issue.severity] || 0;
        });

        return Math.max(0, 1.0 - totalPenalty);
    }

    /**
     * Gera mensagens de feedback contextuais
     */
    generateMessages(feedback) {
        const messages = [];

        // Status principal
        if (feedback.combined.verdict === 'correct') {
            messages.push({
                type: 'success',
                priority: 1,
                text: '✅ Execução correta!',
                details: feedback.combined.reason
            });
        } else if (feedback.combined.verdict === 'incorrect') {
            messages.push({
                type: 'error',
                priority: 1,
                text: '⚠️ Movimento incorreto',
                details: feedback.combined.reason
            });
        }

        // Adiciona issues heurísticas (priorizadas)
        if (feedback.heuristic.available && feedback.heuristic.issues.length > 0) {
            const sortedIssues = this.prioritizeIssues(feedback.heuristic.issues);
            const topIssues = sortedIssues.slice(0, this.config.maxFeedbackItems);

            topIssues.forEach((issue, idx) => {
                messages.push({
                    type: 'warning',
                    priority: 2 + idx,
                    severity: issue.severity,
                    text: this.getIssueFeedbackText(issue),
                    details: issue.message,
                    technical: issue.details
                });
            });
        }

        // Adiciona informação de ML se modo ML_ONLY e incorreto
        if (feedback.mode === 'ml_only' && feedback.ml.available && feedback.combined.verdict === 'incorrect') {
            messages.push({
                type: 'info',
                priority: 5,
                text: 'ℹ️ Detalhes técnicos (ML)',
                details: `Movimento anômalo: erro reconstrução ${feedback.ml.error?.toFixed(4)} > limite ${feedback.ml.threshold?.toFixed(4)}. Use modo Híbrido para feedback específico.`
            });
        }

        // Adiciona informação de ML se híbrido e desacordo
        if (feedback.mode === 'hybrid' && feedback.ml.available && feedback.combined.verdict === 'incorrect') {
            if (!feedback.combined.agreement) {
                messages.push({
                    type: 'info',
                    priority: 10,
                    text: 'ℹ️ Padrão de movimento atípico detectado',
                    details: `Erro de reconstrução: ${feedback.ml.error?.toFixed(4)} (limite: ${feedback.ml.threshold?.toFixed(4)})`
                });
            }
        }

        return messages.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Prioriza issues por severidade
     */
    prioritizeIssues(issues) {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return [...issues].sort((a, b) => {
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }

    /**
     * Gera texto de feedback amigável para cada tipo de issue
     */
    getIssueFeedbackText(issue) {
        const icons = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };

        return `${icons[issue.severity]} ${issue.message}`;
    }

    /**
     * Gera dados para visualização
     */
    generateVisualization(feedback) {
        return {
            color: this.getStatusColor(feedback.combined.verdict, feedback.combined.confidence),
            confidence: feedback.combined.confidence,
            showML: feedback.ml.available,
            showHeuristics: feedback.heuristic.available,
            highlightIssues: feedback.heuristic.issues?.map(i => i.type) || [],
            mlMetrics: feedback.ml.details || {}
        };
    }

    /**
     * Determina cor baseado em status e confiança
     */
    getStatusColor(verdict, confidence) {
        if (verdict === 'unknown') return '#888888';

        if (verdict === 'correct') {
            return confidence > 0.8 ? '#00ff88' : '#88ff88';
        } else {
            return confidence > 0.8 ? '#ff4444' : '#ff8844';
        }
    }

    /**
     * Obtém estatísticas do feedback
     */
    getStatistics() {
        if (this.feedbackHistory.length === 0) {
            return null;
        }

        const total = this.feedbackHistory.length;
        const correct = this.feedbackHistory.filter(f => f.combined.verdict === 'correct').length;
        const incorrect = this.feedbackHistory.filter(f => f.combined.verdict === 'incorrect').length;

        const avgConfidence = this.feedbackHistory.reduce((sum, f) =>
            sum + (f.combined.confidence || 0), 0) / total;

        const agreement = this.feedbackHistory.filter(f =>
            f.combined.agreement === true).length;

        return {
            total,
            correct,
            incorrect,
            accuracy: (correct / total) * 100,
            avgConfidence,
            mlHeuristicAgreement: (agreement / total) * 100,
            mode: this.config.feedbackMode
        };
    }

    /**
     * Reset
     */
    reset() {
        this.feedbackHistory = [];
        this.currentFeedback = null;
    }

    /**
     * Atualiza modo de feedback
     */
    setMode(mode) {
        if (['ml_only', 'heuristic_only', 'hybrid'].includes(mode)) {
            this.config.feedbackMode = mode;
        }
    }

    /**
     * Ajusta pesos ML/Heurística
     */
    setWeights(mlWeight, heuristicWeight) {
        const total = mlWeight + heuristicWeight;
        this.config.mlWeight = mlWeight / total;
        this.config.heuristicWeight = heuristicWeight / total;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.FeedbackSystem = FeedbackSystem;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedbackSystem;
}
