/**
 * Validator Types
 */

import type { Severity } from './feedback.types';

export interface ValidationIssue {
  type: string;
  message: string;
  severity: Severity;
  details?: Record<string, any>;
  timestamp?: number;
  affectedLandmarks?: number[];
  isValid?: boolean;
}

export interface ValidationSummary {
  totalIssues: number;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  issuesBySeverity?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  validReps?: number;
  currentState?: string;
  framesInState?: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary?: ValidationSummary;
  details?: ValidationIssue[];
  validReps?: number;
  currentState?: string;
  angles?: Record<string, number>;
}

export interface ValidatorConfig {
  [key: string]: number | string | boolean | null | undefined;
}
