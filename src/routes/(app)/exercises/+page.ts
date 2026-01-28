import type { PageLoad } from './$types';
import { exercisesApi } from '$lib/api/exercises.api';
import { trainingPlansApi } from '$lib/api/training-plans.api';

export const ssr = false;
export const prerender = false;

export const load: PageLoad = async ({ fetch }) => {
  const [exercisesResponse, planResponse] = await Promise.all([
    exercisesApi.getAll(fetch),
    trainingPlansApi.getAssigned(fetch)
  ]);

  let assignedPlans: import('$lib/api/training-plans.api').AssignedTrainingPlan[] = [];
  let planErrorMessage = '';
  if (planResponse.success) {
    assignedPlans = planResponse.data || [];
  } else if (planResponse.status !== 404) {
    planErrorMessage = planResponse.error?.message;
  }

  if (!exercisesResponse.success) {
    const errorMessage = exercisesResponse.error?.message;
    return { exercises: [], errorMessage, assignedPlans, planErrorMessage };
  }

  return {
    exercises: exercisesResponse.data,
    errorMessage: '',
    assignedPlans,
    planErrorMessage
  };
};
