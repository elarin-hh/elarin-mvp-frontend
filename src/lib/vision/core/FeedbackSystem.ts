/**
 * Feedback System - Integração ML + Heurísticas
 * ==============================================
 *
 * Sistema inteligente que combina:
 * 1. Predições do modelo ML (autoencoder)
 * 2. Validações heurísticas (regras biomecânicas)
 * 3. Geração de feedback contextual e priorizado
 */

import type { FeedbackMode, FeedbackMessage, Severity } from '../types';
import type { ValidationResult } from '../types/validator.types';

export interface MLResult {
  status: 'waiting' | 'processing' | 'error' | 'correct' | 'incorrect' | 'unavailable';
  message?: string;
  frames?: number;
  isCorrect?: boolean;
  confidence?: number;
  reconstructionError?: number;
  threshold?: number;
  details?: Record<string, unknown>;
}

export interface ProcessedMLResult {
  available: boolean;
  status?: string;
  message?: string;
  isCorrect?: boolean;
  confidence?: number;
  error?: number;
  threshold?: number;
  details?: Record<string, unknown>;
}

export interface ProcessedHeuristicResult {
  available: boolean;
  isValid?: boolean;
  issues?: Array<{
    severity: Severity;
    message: string;
    type?: string;
    details?: Record<string, unknown>;
  }>;
  summary?: Record<string, unknown>;
  details?: unknown[];
}

export interface CombinedDecision {
  isCorrect: boolean | null;
  confidence: number;
  verdict: 'correct' | 'incorrect' | 'unknown';
  reason: string;
  mlContribution: number;
  heuristicContribution: number;
  combinedScore?: number;
  agreement?: boolean;
  criticalIssuesFound?: boolean;
  mlDetails?: Record<string, unknown>;
}

export interface FeedbackSystemConfig {
  feedbackMode?: FeedbackMode;
  mlWeight?: number;
  heuristicWeight?: number;
  minConfidenceThreshold?: number;
  maxFeedbackItems?: number;
  prioritizeCritical?: boolean;
  [key: string]: unknown;
}

export interface FeedbackRecord {
  timestamp: number;
  mode: FeedbackMode;
  ml: ProcessedMLResult;
  heuristic: ProcessedHeuristicResult;
  combined: CombinedDecision;
  messages: FeedbackMessage[];
  visualization: {
    color: string;
    confidence: number;
    showML: boolean;
    showHeuristics: boolean;
    highlightIssues: string[];
    mlMetrics: Record<string, unknown>;
  };
}

export interface FeedbackStatistics {
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  avgConfidence: number;
  mlHeuristicAgreement: number;
  mode: FeedbackMode;
}

export class FeedbackSystem {
  private config: Required<FeedbackSystemConfig>;
  private feedbackHistory: FeedbackRecord[];
  private maxHistorySize: number;
  private currentFeedback: FeedbackRecord | null;

  constructor(config: FeedbackSystemConfig = {}) {
    this.config = {
      feedbackMode: config.feedbackMode || 'hybrid',
      mlWeight: config.mlWeight || 0.6,
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
  integrate(mlResult: MLResult | null, heuristicResult: ValidationResult | null): FeedbackRecord {
    const feedback: FeedbackRecord = {
      timestamp: Date.now(),
      mode: this.config.feedbackMode,
      ml: this.processMLResult(mlResult),
      heuristic: this.processHeuristicResult(heuristicResult),
      combined: {
        isCorrect: null,
        confidence: 0,
        verdict: 'unknown',
        reason: '',
        mlContribution: 0,
        heuristicContribution: 0
      },
      messages: [],
      visualization: {
        color: '#888888',
        confidence: 0,
        showML: false,
        showHeuristics: false,
        highlightIssues: [],
        mlMetrics: {}
      }
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
  private processMLResult(mlResult: MLResult | null): ProcessedMLResult {
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
    const confidence =
      mlResult.confidence !== undefined && !isNaN(mlResult.confidence) ? mlResult.confidence : 0.7;

    return {
      available: true,
      isCorrect: mlResult.isCorrect,
      confidence: confidence,
      error: mlResult.reconstructionError,
      threshold: mlResult.threshold,
      status: mlResult.status,
      details: mlResult.details
    };
  }

  /**
   * Processa resultado das heurísticas
   */
  private processHeuristicResult(
    heuristicResult: ValidationResult | null
  ): ProcessedHeuristicResult {
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
      summary: heuristicResult as unknown as Record<string, unknown>,
      details: (heuristicResult as unknown as { details?: unknown[] }).details || []
    };
  }

  /**
   * Decisão baseada apenas em ML
   */
  private mlOnlyDecision(mlData: ProcessedMLResult): CombinedDecision {
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
    const confidence =
      mlData.confidence !== undefined && !isNaN(mlData.confidence)
        ? Math.max(0, Math.min(1, mlData.confidence))
        : 0.7;

    // Razão específica para One-Class Learning
    let reason: string;
    if (mlData.isCorrect) {
      reason = 'Padrão de movimento reconhecido (similar ao treino)';
    } else {
      reason = 'Movimento anômalo detectado (diferente do treino)';
    }

    return {
      isCorrect: mlData.isCorrect || false,
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
  }

  /**
   * Decisão baseada apenas em heurísticas
   */
  private heuristicOnlyDecision(heuristicData: ProcessedHeuristicResult): CombinedDecision {
    if (!heuristicData.available) {
      return {
        isCorrect: null,
        confidence: 0,
        verdict: 'unknown',
        reason: 'Heurísticas não disponíveis',
        mlContribution: 0.0,
        heuristicContribution: 1.0
      };
    }

    const criticalIssues =
      heuristicData.issues?.filter((i) => i.severity === 'critical').length || 0;

    const isCorrect = heuristicData.isValid || false;
    const confidence = isCorrect ? 0.9 : criticalIssues > 0 ? 0.95 : 0.85;

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
  private hybridDecision(
    mlData: ProcessedMLResult,
    heuristicData: ProcessedHeuristicResult
  ): CombinedDecision {
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
    const mlConfidence =
      mlData.confidence !== undefined && !isNaN(mlData.confidence) ? mlData.confidence : 0.5;

    const mlScore = mlData.isCorrect ? mlConfidence : 1 - mlConfidence;
    const heuristicScore = heuristicData.isValid
      ? 0.95
      : this.calculateHeuristicScore(heuristicData);

    // Combina com pesos
    const combinedScore =
      mlScore * this.config.mlWeight + heuristicScore * this.config.heuristicWeight;

    // Regras de priorização
    const criticalIssues = heuristicData.issues?.filter((i) => i.severity === 'critical') || [];
    const hasHeuristicProblems = !heuristicData.isValid || criticalIssues.length > 0;
    const hasMLProblems = !mlData.isCorrect;

    // Se QUALQUER um detectar erro, marca como incorreto
    const isCorrect = !hasMLProblems && !hasHeuristicProblems;

    // Calcula confiança final - usa o maior valor entre ML e heurística
    let confidence = Math.max(mlConfidence, heuristicScore);

    // Garante que confidence está no range [0, 1]
    confidence = Math.max(0, Math.min(1, confidence));

    // Determina razão principal
    let reason: string;
    if (isCorrect) {
      reason = 'Execução correta confirmada (ML + Biomecânica)';
    } else {
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
  private calculateHeuristicScore(heuristicData: ProcessedHeuristicResult): number {
    if (heuristicData.isValid) return 0.95;

    const severityWeights: Record<Severity, number> = {
      critical: 0.4,
      high: 0.25,
      medium: 0.15,
      low: 0.05
    };

    let totalPenalty = 0;
    heuristicData.issues?.forEach((issue) => {
      totalPenalty += severityWeights[issue.severity] || 0;
    });

    return Math.max(0, 1.0 - totalPenalty);
  }

  /**
   * Gera mensagens de feedback contextuais
   */
  private generateMessages(feedback: FeedbackRecord): FeedbackMessage[] {
    const messages: FeedbackMessage[] = [];

    // ML ONLY: Apenas status binário (correto/incorreto)
    // One-Class Learning não fornece feedback detalhado
    if (feedback.mode === 'ml_only') {
      if (feedback.combined.verdict === 'correct') {
        messages.push({
          type: 'success',
          priority: 1,
          text: 'Movimento correto (padrão reconhecido)',
          severity: 'low'
        });
      } else if (feedback.combined.verdict === 'incorrect') {
        messages.push({
          type: 'error',
          priority: 1,
          text: 'Anomalia detectada (padrão desconhecido)',
          severity: 'high'
        });
        // Informação técnica genérica do ML
        if (feedback.ml.available && feedback.ml.error !== undefined) {
          messages.push({
            type: 'info',
            priority: 2,
            text: `Erro de reconstrução: ${feedback.ml.error.toFixed(4)}`,
            severity: 'low'
          });
        }
      } else {
        messages.push({
          type: 'info',
          priority: 1,
          text: '⏳ Aguardando análise ML...',
          severity: 'low'
        });
      }
      return messages;
    }

    // HEURISTIC ONLY ou HYBRID: Status + feedback detalhado
    if (feedback.combined.verdict === 'correct') {
      messages.push({
        type: 'success',
        priority: 1,
        text: 'Execução correta!',
        severity: 'low'
      });
    } else if (feedback.combined.verdict === 'incorrect') {
      messages.push({
        type: 'error',
        priority: 1,
        text: 'Movimento incorreto',
        severity: 'high'
      });
    }

    // Adiciona issues heurísticas detalhadas (apenas em heuristic_only ou hybrid)
    if (
      feedback.heuristic.available &&
      feedback.heuristic.issues &&
      feedback.heuristic.issues.length > 0
    ) {
      const sortedIssues = this.prioritizeIssues(feedback.heuristic.issues);
      const topIssues = sortedIssues.slice(0, this.config.maxFeedbackItems);

      topIssues.forEach((issue, idx) => {
        messages.push({
          type: 'warning',
          priority: 2 + idx,
          severity: issue.severity,
          text: this.getIssueFeedbackText(issue)
        });
      });
    }

    // Adiciona informação de ML se híbrido e desacordo
    if (
      feedback.mode === 'hybrid' &&
      feedback.ml.available &&
      feedback.combined.verdict === 'incorrect'
    ) {
      if (!feedback.combined.agreement) {
        messages.push({
          type: 'info',
          priority: 10,
          text: 'Padrão atípico detectado pelo ML',
          severity: 'low'
        });
      }
    }

    return messages.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Prioriza issues por severidade
   */
  private prioritizeIssues(
    issues: ProcessedHeuristicResult['issues']
  ): NonNullable<ProcessedHeuristicResult['issues']> {
    if (!issues) return [];

    const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...issues].sort((a, b) => {
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Gera texto de feedback amigável para cada tipo de issue
   */
  private getIssueFeedbackText(
    issue: NonNullable<ProcessedHeuristicResult['issues']>[number]
  ): string {
    const icons: Record<Severity, string> = {
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
  private generateVisualization(feedback: FeedbackRecord) {
    return {
      color: this.getStatusColor(feedback.combined.verdict, feedback.combined.confidence),
      confidence: feedback.combined.confidence,
      showML: feedback.ml.available,
      showHeuristics: feedback.heuristic.available,
      highlightIssues: feedback.heuristic.issues?.map((i) => i.type || '') || [],
      mlMetrics: (feedback.ml.details as Record<string, unknown>) || {}
    };
  }

  /**
   * Determina cor baseado em status e confiança
   */
  private getStatusColor(verdict: CombinedDecision['verdict'], confidence: number): string {
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
  getStatistics(): FeedbackStatistics | null {
    if (this.feedbackHistory.length === 0) {
      return null;
    }

    const total = this.feedbackHistory.length;
    const correct = this.feedbackHistory.filter((f) => f.combined.verdict === 'correct').length;
    const incorrect = this.feedbackHistory.filter((f) => f.combined.verdict === 'incorrect').length;

    const avgConfidence =
      this.feedbackHistory.reduce((sum, f) => sum + (f.combined.confidence || 0), 0) / total;

    const agreement = this.feedbackHistory.filter((f) => f.combined.agreement === true).length;

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
  reset(): void {
    this.feedbackHistory = [];
    this.currentFeedback = null;
  }

  /**
   * Atualiza modo de feedback
   */
  setMode(mode: FeedbackMode): void {
    if (['ml_only', 'heuristic_only', 'hybrid'].includes(mode)) {
      this.config.feedbackMode = mode;
    }
  }

  /**
   * Ajusta pesos ML/Heurística
   */
  setWeights(mlWeight: number, heuristicWeight: number): void {
    const total = mlWeight + heuristicWeight;
    this.config.mlWeight = mlWeight / total;
    this.config.heuristicWeight = heuristicWeight / total;
  }
}
