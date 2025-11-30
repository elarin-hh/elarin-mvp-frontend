import type { PageLoad } from './$types';
import { exercisesApi } from '$lib/api/exercises.api';

export const ssr = false;
export const prerender = false;

export const load: PageLoad = async () => {
  const response = await exercisesApi.getAll();

  if (!response.success) {
    const errorMessage = response.error?.message || 'Falha ao carregar exercicios';
    return { exercises: [], errorMessage };
  }

  return { exercises: response.data, errorMessage: '' };
};
