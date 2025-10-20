/**
 * Logger - Sistema de logging para debug
 * Salva logs em arquivo para análise posterior
 */

export class Logger {
	private logs: string[] = [];
	private maxLogs: number = 1000;

	log(category: string, message: string, data?: any) {
		const timestamp = new Date().toISOString();
		const logEntry = {
			timestamp,
			category,
			message,
			data
		};

		const logString = JSON.stringify(logEntry, null, 2);
		this.logs.push(logString);

		// Limita o tamanho do array
		if (this.logs.length > this.maxLogs) {
			this.logs.shift();
		}

		// Também loga no console para debug imediato
		console.log(`[${category}]`, message, data || '');
	}

	getLogs(): string {
		return this.logs.join('\n');
	}

	downloadLogs(filename: string = 'ml-debug.log') {
		const logsText = this.getLogs();
		const blob = new Blob([logsText], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	clear() {
		this.logs = [];
	}
}

// Singleton instance
export const logger = new Logger();

// Expõe globalmente para debug no console
if (typeof window !== 'undefined') {
	(window as any).mlLogger = logger;
}
