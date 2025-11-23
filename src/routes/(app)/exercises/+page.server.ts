import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    // Garante envio de cookies HttpOnly ao endpoint local
    const response = await fetch('/api/exercises');

    if (response.ok) {
      const data = await response.json();
      return { exercises: data };
    }

    if (response.status === 401) {
      return { exercises: [], errorMessage: 'Sessao expirada, faca login novamente.' };
    }

    let message = 'Falha ao carregar exercicios';
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch {
      // ignore parse errors
    }

    return { exercises: [], errorMessage: message };
  } catch (err) {
    const message = (err as Error)?.message || 'Falha ao carregar exercicios';
    return { exercises: [], errorMessage: message };
  }
};
