export type FeedbackMode = 'hybrid' | 'ml_only' | 'heuristic_only';
export type MessageType = 'success' | 'warning' | 'error' | 'info';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface FeedbackMessage {
  type: MessageType;
  text: string;
  priority: number;
  severity?: Severity;
}

export interface Feedback {
  isCorrect: boolean;
  confidence: number;
  messages: FeedbackMessage[];
  visualization: {
    color: string;
    opacity: number;
  };
}

export interface FeedbackConfig {
  feedbackMode?: FeedbackMode;
  mlWeight?: number;
  heuristicWeight?: number;
  maxFeedbackItems?: number;
  [key: string]: unknown;
}
