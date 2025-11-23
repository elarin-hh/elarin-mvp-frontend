import { json, type RequestHandler } from '@sveltejs/kit';
import { exercisesApi } from '$lib/api/exercises.api';

function createAuthorizedFetch(fetchFn: typeof fetch, cookieHeader: string | null, token: string | null) {
  if (!cookieHeader && !token) {
    return fetchFn;
  }

  return (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const headers = new Headers(init?.headers ?? {});
    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return fetchFn(input, { ...init, headers });
  }) as typeof fetch;
}

export const GET: RequestHandler = async ({ fetch, request, cookies }) => {
  const cookieHeader = request.headers.get('cookie');
  const token = cookies.get('access_token');

  const authorizedFetch = createAuthorizedFetch(fetch, cookieHeader, token);
  const response = await exercisesApi.getAll(authorizedFetch);

  if (response.success && response.data) {
    return json(response.data);
  }

  const status = response.status || 500;
  return json({ message: response.error?.message || 'Falha ao carregar exercicios' }, { status });
};
