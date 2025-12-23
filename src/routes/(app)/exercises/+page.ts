import type { PageLoad } from './$types';
import { exercisesApi } from '$lib/api/exercises.api';
import { trainingPlansApi } from '$lib/api/training-plans.api';

export const ssr = false;
export const prerender = false;

export const load: PageLoad = async () => {
  const [exercisesResponse, planResponse] = await Promise.all([
    exercisesApi.getAll(),
    trainingPlansApi.getAssigned()
  ]);

  let assignedPlan = null;
  let planErrorMessage = '';
  if (planResponse.success) {
    assignedPlan = planResponse.data;
  } else if (planResponse.status !== 404) {
    planErrorMessage =
      planResponse.error?.message || 'Falha ao carregar plano de treino';
  }

  if (!exercisesResponse.success) {
    const errorMessage =
      exercisesResponse.error?.message || 'Falha ao carregar exercicios';
    return { exercises: [], errorMessage, assignedPlan, planErrorMessage };
  }

  return {
    exercises: exercisesResponse.data,
    errorMessage: '',
    assignedPlan,
    planErrorMessage
  };
};
