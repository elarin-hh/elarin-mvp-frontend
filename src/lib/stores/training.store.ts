import { writable, derived, get } from 'svelte/store';
import { trainingApi } from '$lib/api/training.api';

export type ExerciseType = string;

export type TrainingStatus = 'idle' | 'ready' | 'training' | 'paused' | 'finished';

export interface TrainingState {
  exerciseType: ExerciseType | null;
  exerciseName: string | null;
  status: TrainingStatus;
  reps: number;
  sets: number;
  duration: number;
  startTime: number | null;
  endTime: number | null;
  isLoading: boolean;
  error: string | null;
  backendSessionId: string | null;
  avgConfidence?: number | null;
}

const initialState: TrainingState = {
  exerciseType: null,
  exerciseName: null,
  status: 'idle',
  reps: 0,
  sets: 1,
  duration: 0,
  startTime: null,
  endTime: null,
  isLoading: false,
  error: null,
  backendSessionId: null,
  avgConfidence: null
};

export const trainingStore = writable<TrainingState>(initialState);

export const currentExercise = derived(trainingStore, ($state) => $state.exerciseType);
export const trainingStatus = derived(trainingStore, ($state) => $state.status);
export const isTraining = derived(trainingStore, ($state) => $state.status === 'training');
export const trainingError = derived(trainingStore, ($state) => $state.error);

export const trainingActions = {
  selectExercise(exercise: ExerciseType, name?: string | null) {
    trainingStore.update((state) => ({
      ...state,
      exerciseType: exercise,
      exerciseName: name ?? null,
      status: 'ready',
      error: null
    }));
  },

  start() {
    trainingStore.update((state) => ({
      ...state,
      status: 'training',
      startTime: Date.now()
    }));
  },

  pause() {
    trainingStore.update((state) => ({
      ...state,
      status: 'paused'
    }));
  },

  resume() {
    trainingStore.update((state) => ({
      ...state,
      status: 'training'
    }));
  },

  incrementReps() {
    trainingStore.update((state) => ({
      ...state,
      reps: state.reps + 1
    }));
  },

  incrementSets() {
    trainingStore.update((state) => ({
      ...state,
      sets: state.sets + 1,
      reps: 0
    }));
  },

  updateDuration(seconds: number) {
    trainingStore.update((state) => ({
      ...state,
      duration: seconds
    }));
  },

  setAvgConfidence(avgConfidence: number | null) {
    trainingStore.update((state) => ({ ...state, avgConfidence }));
  },

  async finish() {
    const state = get(trainingStore);
    if (!state.exerciseType) {
      return { success: false, error: 'No exercise selected' };
    }

    trainingStore.update((s) => ({
      ...s,
      status: 'finished',
      endTime: Date.now(),
      isLoading: true
    }));

    const durationSeconds = state.startTime
      ? Math.floor((Date.now() - state.startTime) / 1000)
      : state.duration;

    const response = await trainingApi.saveTraining({
      exercise_type: state.exerciseType,
      reps_completed: state.reps,
      sets_completed: state.sets,
      duration_seconds: durationSeconds,
      avg_confidence: state.avgConfidence ?? undefined
    });

    if (response.success) {
      trainingStore.update((s) => ({
        ...s,
        isLoading: false,
        duration: durationSeconds
      }));
      return { success: true };
    }

    trainingStore.update((s) => ({
      ...s,
      isLoading: false,
      error: response.error?.message || 'Failed to save training'
    }));
    return { success: false, error: response.error?.message };
  },

  reset() {
    trainingStore.set(initialState);
  },

  clearError() {
    trainingStore.update((state) => ({ ...state, error: null }));
  }
};
