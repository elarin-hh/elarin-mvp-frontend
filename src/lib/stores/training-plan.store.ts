import { derived, get, writable } from 'svelte/store';
import type { TrainingPlanItem } from '$lib/api/training-plans.api';

export type TrainingPlanStatus = 'idle' | 'running' | 'finished';

export interface TrainingPlanState {
  planId: number | null;
  planName: string | null;
  planDescription: string | null;
  assignmentId: number | null;
  planSessionId: number | null;
  items: TrainingPlanItem[];
  currentIndex: number;
  status: TrainingPlanStatus;
  error: string | null;
}

const initialState: TrainingPlanState = {
  planId: null,
  planName: null,
  planDescription: null,
  assignmentId: null,
  planSessionId: null,
  items: [],
  currentIndex: 0,
  status: 'idle',
  error: null
};

export const trainingPlanStore = writable<TrainingPlanState>(initialState);

export const currentPlanItem = derived(trainingPlanStore, (state) => {
  if (state.status !== 'running') return null;
  return state.items[state.currentIndex] ?? null;
});

export const hasActivePlan = derived(
  trainingPlanStore,
  (state) => state.status === 'running' && state.items.length > 0
);

export const trainingPlanActions = {
  beginSession(params: {
    planId: number;
    planName?: string | null;
    planDescription?: string | null;
    assignmentId: number;
    planSessionId: number;
    items: TrainingPlanItem[];
  }) {
    trainingPlanStore.set({
      ...initialState,
      planId: params.planId,
      planName: params.planName ?? null,
      planDescription: params.planDescription ?? null,
      assignmentId: params.assignmentId,
      planSessionId: params.planSessionId,
      items: params.items || [],
      currentIndex: 0,
      status: 'running',
      error: null
    });
  },

  advance(): TrainingPlanItem | null {
    const state = get(trainingPlanStore);
    if (state.status !== 'running') return null;
    const nextIndex = state.currentIndex + 1;
    if (nextIndex >= state.items.length) {
      trainingPlanStore.update((current) => ({
        ...current,
        status: 'finished'
      }));
      return null;
    }
    trainingPlanStore.update((current) => ({
      ...current,
      currentIndex: nextIndex
    }));
    return state.items[nextIndex] ?? null;
  },

  finish() {
    trainingPlanStore.update((state) => ({
      ...state,
      status: 'finished'
    }));
  },

  setPlanSessionId(planSessionId: number | null) {
    trainingPlanStore.update((state) => ({
      ...state,
      planSessionId
    }));
  },

  reset() {
    trainingPlanStore.set(initialState);
  },

  setError(error: string | null) {
    trainingPlanStore.update((state) => ({
      ...state,
      error
    }));
  }
};
