// Integrated Training Store - With NestJS Backend API
// Connects to NestJS backend running on port 3337
import { writable, derived, get } from 'svelte/store';
import { trainingApi } from '$lib/api/training.api';

export type ExerciseType = 'squat' | 'plank' | 'push_up';
export type TrainingStatus = 'idle' | 'ready' | 'training' | 'paused' | 'finished';

export interface IntegratedTrainingSession {
  // Local state
  exerciseType: ExerciseType | null;
  status: TrainingStatus;
  reps: number;
  sets: number;
  duration: number;
  startTime: number | null;
  endTime: number | null;

  // UI state
  isLoading: boolean;
  error: string | null;
}

const initialState: IntegratedTrainingSession = {
  exerciseType: null,
  status: 'idle',
  reps: 0,
  sets: 1,
  duration: 0,
  startTime: null,
  endTime: null,
  isLoading: false,
  error: null
};

// Create the store
export const integratedTrainStore = writable<IntegratedTrainingSession>(initialState);

// Derived stores
export const currentExercise = derived(integratedTrainStore, ($state) => $state.exerciseType);
export const trainingStatus = derived(integratedTrainStore, ($state) => $state.status);
export const isTraining = derived(integratedTrainStore, ($state) => $state.status === 'training');
export const trainingError = derived(integratedTrainStore, ($state) => $state.error);

// Actions
export const integratedTrainActions = {
  /**
   * Select exercise
   */
  async selectExercise(exercise: ExerciseType) {
    integratedTrainStore.update((state) => ({
      ...state,
      exerciseType: exercise,
      status: 'ready',
      error: null
    }));
  },

  /**
   * Start training
   */
  start() {
    integratedTrainStore.update((state) => ({
      ...state,
      status: 'training',
      startTime: Date.now()
    }));
  },

  /**
   * Pause training
   */
  pause() {
    integratedTrainStore.update((state) => ({
      ...state,
      status: 'paused'
    }));
  },

  /**
   * Resume training
   */
  resume() {
    integratedTrainStore.update((state) => ({
      ...state,
      status: 'training'
    }));
  },

  /**
   * Finish training and send to backend
   */
  async finish() {
    const state = get(integratedTrainStore);

    if (!state.exerciseType) {
      return;
    }

    // Update local state
    integratedTrainStore.update((s) => ({
      ...s,
      status: 'finished',
      endTime: Date.now(),
      isLoading: true
    }));

    // Calculate duration
    const duration = state.startTime
      ? Math.floor((Date.now() - state.startTime) / 1000)
      : state.duration;

    // Send to backend
    const response = await trainingApi.saveTraining({
      exercise_type: state.exerciseType,
      reps_completed: state.reps,
      sets_completed: state.sets,
      duration_seconds: duration,
      avg_confidence: 0.85 // TODO: Calculate from ML detector
    });

    if (response.success) {
      integratedTrainStore.update((s) => ({
        ...s,
        isLoading: false,
        duration
      }));
    } else {
      integratedTrainStore.update((s) => ({
        ...s,
        error: response.error?.message || 'Failed to save training',
        isLoading: false
      }));
    }
  },

  /**
   * Increment reps (called by ML detector)
   */
  incrementReps() {
    integratedTrainStore.update((state) => ({
      ...state,
      reps: state.reps + 1
    }));
  },

  /**
   * Increment sets
   */
  incrementSets() {
    integratedTrainStore.update((state) => ({
      ...state,
      sets: state.sets + 1,
      reps: 0
    }));
  },

  /**
   * Update duration (call periodically during training)
   */
  updateDuration(seconds: number) {
    integratedTrainStore.update((state) => ({
      ...state,
      duration: seconds
    }));
  },

  /**
   * Reset the training session
   */
  reset() {
    integratedTrainStore.set(initialState);
  },

  /**
   * Clear error
   */
  clearError() {
    integratedTrainStore.update((state) => ({
      ...state,
      error: null
    }));
  }
};
