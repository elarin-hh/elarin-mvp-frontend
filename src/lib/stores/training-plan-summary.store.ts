import { writable } from 'svelte/store';

export interface TrainingPlanSummaryMetric {
  id: string;
  label: string;
  value: string;
  target?: string | null;
}

export interface TrainingPlanSummaryData {
  planName: string;
  metrics: TrainingPlanSummaryMetric[];
  overallScore: number | null;
  planSessionId?: number | null;
}

const trainingPlanSummaryStore = writable<TrainingPlanSummaryData | null>(null);

export const trainingPlanSummaryActions = {
  setSummary(summary: TrainingPlanSummaryData) {
    trainingPlanSummaryStore.set(summary);
  },
  reset() {
    trainingPlanSummaryStore.set(null);
  }
};

export { trainingPlanSummaryStore };
