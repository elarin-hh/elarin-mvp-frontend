import { appendFileSync } from 'node:fs';
import type { HandleError } from '@sveltejs/kit';

// Log server-side errors (useful during prerender/fallback generation)
export const handleError: HandleError = ({ error, event, status }) => {
	const message = `[${new Date().toISOString()}] ${event.request.method} ${event.url.pathname} status=${status} :: ${error?.stack ?? error}`;
	// Write to stdout and to a build-time log to make silent errors visible
	console.error(message);
	try {
		appendFileSync('build-error.log', `${message}\n`);
	} catch {
		// If the filesystem is read-only (e.g. in CI), ignore write failures
	}
	return {
		message: 'Internal error'
	};
};
