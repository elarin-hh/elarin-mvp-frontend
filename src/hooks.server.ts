import { appendFileSync } from 'node:fs';
import type { HandleError } from '@sveltejs/kit';

export const handleError: HandleError = ({ error, event, status }) => {
	const message = `[${new Date().toISOString()}] ${event.request.method} ${event.url.pathname} status=${status} :: ${error?.stack ?? error}`;
	console.error(message);
	try {
		appendFileSync('build-error.log', `${message}\n`);
	} catch {
	}
	return {
		message: 'Erro interno'
	};
};
