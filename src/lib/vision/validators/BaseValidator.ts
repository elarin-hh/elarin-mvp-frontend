/**
 * Base Validator - Validações Heurísticas Base
 * =============================================
 *
 * Classe base para validações heurísticas específicas de cada exercício.
 * Fornece métodos auxiliares e interface comum.
 */

import type { Landmark, PoseLandmarks, ValidationResult, ValidationIssue, ValidatorConfig, Severity } from '../types';
import { calculateAngle } from '../utils/angles.utils';
import { calculateDistance } from '../utils/distances.utils';
import { isVisible } from '../utils/landmarks.utils';

export interface ValidationStatistics {
  total: number;
  valid: number;
  invalid: number;
  accuracy: number;
  severityCounts: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export abstract class BaseValidator {
  protected config: Record<string, any>;
  protected validationResults: ValidationIssue[];
  protected currentIssues: ValidationIssue[];

  constructor(config: Record<string, any> = {}) {
    this.config = {
      minConfidence: 0.7,
      warningSeverity: 'medium',
      ...config
    };

    this.validationResults = [];
    this.currentIssues = [];
  }

  /**
   * Valida os landmarks (método abstrato)
   */
  abstract validate(landmarks: PoseLandmarks, frameCount: number): ValidationResult;

  /**
   * Calcula ângulo entre três pontos
   */
  protected calculateAngle(point1: Landmark, point2: Landmark, point3: Landmark): number {
    return calculateAngle(point1, point2, point3);
  }

  /**
   * Calcula distância euclidiana entre dois pontos
   */
  protected calculateDistance(point1: Landmark, point2: Landmark): number {
    return calculateDistance(point1, point2);
  }

  /**
   * Verifica se um ponto está visível (confiança suficiente)
   */
  protected isVisible(landmark: Landmark): boolean {
    return isVisible(landmark, this.config.minConfidence || 0.7);
  }

  /**
   * Verifica alinhamento vertical entre pontos
   */
  protected checkVerticalAlignment(point1: Landmark, point2: Landmark, tolerance: number = 0.05): boolean {
    return Math.abs(point1.x - point2.x) < tolerance;
  }

  /**
   * Verifica alinhamento horizontal entre pontos
   */
  protected checkHorizontalAlignment(point1: Landmark, point2: Landmark, tolerance: number = 0.05): boolean {
    return Math.abs(point1.y - point2.y) < tolerance;
  }

  /**
   * Cria um resultado de validação padronizado
   */
  protected createValidationResult(
    isValid: boolean,
    type: string,
    message: string,
    severity: Severity | 'success' = 'low',
    details: Record<string, any> = {}
  ): ValidationIssue {
    return {
      type,
      message,
      severity: severity === 'success' ? 'low' : severity,
      details,
      timestamp: Date.now(),
      isValid
    } as ValidationIssue & { isValid: boolean };
  }

  /**
   * Reseta histórico de validações
   */
  public reset(): void {
    this.validationResults = [];
    this.currentIssues = [];
  }

  /**
   * Obtém estatísticas das validações
   */
  public getStatistics(): ValidationStatistics {
    const total = this.validationResults.length;
    const valid = this.validationResults.filter(r => 'isValid' in r ? (r as any).isValid : false).length;
    const invalid = total - valid;

    const severityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    this.validationResults.forEach(r => {
      if (r.severity in severityCounts) {
        severityCounts[r.severity as Severity]++;
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
