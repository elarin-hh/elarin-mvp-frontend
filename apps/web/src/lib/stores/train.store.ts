import { writable, derived } from 'svelte/store';

// Exercise types available in the app
export type ExerciseType = 'squat' | 'lunge' | 'plank';

// Training session states
export type TrainingStatus = 'idle' | 'ready' | 'training' | 'paused' | 'finished';

export interface TrainingSession {
  exerciseType: ExerciseType | null;
  status: TrainingStatus;
  reps: number;
  sets: number;
  duration: number; // in seconds
  startTime: number | null;
  endTime: number | null;
}

// Initial state
const initialState: TrainingSession = {
  exerciseType: null,
  status: 'idle',
  reps: 0,
  sets: 0,
  duration: 0,
  startTime: null,
  endTime: null
};

// Create the store
export const trainStore = writable<TrainingSession>(initialState);

// Derived stores
export const currentExercise = derived(trainStore, ($state) => $state.exerciseType);
export const trainingStatus = derived(trainStore, ($state) => $state.status);
export const isTraining = derived(trainStore, ($state) => $state.status === 'training');

// Actions
export const trainActions = {
  // Select an exercise to start training
  selectExercise: (exercise: ExerciseType) => {
    trainStore.update((state) => ({
      ...state,
      exerciseType: exercise,
      status: 'ready'
    }));
  },

  // Start the training session
  start: () => {
    trainStore.update((state) => ({
      ...state,
      status: 'training',
      startTime: Date.now()
    }));
  },

  // Pause the training session
  pause: () => {
    trainStore.update((state) => ({
      ...state,
      status: 'paused'
    }));
  },

  // Resume the training session
  resume: () => {
    trainStore.update((state) => ({
      ...state,
      status: 'training'
    }));
  },

  // Finish the training session
  finish: () => {
    trainStore.update((state) => ({
      ...state,
      status: 'finished',
      endTime: Date.now()
    }));
  },

  // Increment reps count (mock for now - will be replaced by vision detection)
  // TODO: Replace with actual pose detection logic
  incrementReps: () => {
    trainStore.update((state) => ({
      ...state,
      reps: state.reps + 1
    }));
  },

  // Increment sets count
  incrementSets: () => {
    trainStore.update((state) => ({
      ...state,
      sets: state.sets + 1,
      reps: 0
    }));
  },

  // Update duration (should be called periodically during training)
  updateDuration: (seconds: number) => {
    trainStore.update((state) => ({
      ...state,
      duration: seconds
    }));
  },

  // Reset the training session
  reset: () => {
    trainStore.set(initialState);
  }
};

