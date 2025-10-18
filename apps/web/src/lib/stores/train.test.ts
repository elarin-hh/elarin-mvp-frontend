import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { trainStore, trainActions } from './train.store';

describe('Train Store', () => {
  beforeEach(() => {
    trainActions.reset();
  });

  it('should initialize with idle state', () => {
    const state = get(trainStore);
    expect(state.status).toBe('idle');
    expect(state.exerciseType).toBeNull();
    expect(state.reps).toBe(0);
  });

  it('should select an exercise', () => {
    trainActions.selectExercise('squat');
    const state = get(trainStore);
    expect(state.exerciseType).toBe('squat');
    expect(state.status).toBe('ready');
  });

  it('should start training', () => {
    trainActions.selectExercise('squat');
    trainActions.start();
    const state = get(trainStore);
    expect(state.status).toBe('training');
    expect(state.startTime).toBeGreaterThan(0);
  });

  it('should increment reps', () => {
    trainActions.selectExercise('lunge');
    trainActions.start();
    trainActions.incrementReps();
    trainActions.incrementReps();
    const state = get(trainStore);
    expect(state.reps).toBe(2);
  });

  it('should finish training', () => {
    trainActions.selectExercise('plank');
    trainActions.start();
    trainActions.finish();
    const state = get(trainStore);
    expect(state.status).toBe('finished');
    expect(state.endTime).toBeGreaterThan(0);
  });

  it('should reset to initial state', () => {
    trainActions.selectExercise('squat');
    trainActions.start();
    trainActions.incrementReps();
    trainActions.reset();
    const state = get(trainStore);
    expect(state.status).toBe('idle');
    expect(state.reps).toBe(0);
    expect(state.exerciseType).toBeNull();
  });
});

