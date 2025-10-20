/**
 * Exercise Configurations Loader
 * ===============================
 *
 * Carrega configurações de exercícios de arquivos JSON em static/exercises/
 */

import type { ExerciseConfig } from '../types/exercise.types';

// Cache de configurações
const configCache: Record<string, ExerciseConfig> = {};

/**
 * Carrega configuração de um exercício
 */
export async function loadExerciseConfig(exerciseId: string): Promise<ExerciseConfig | null> {
	if (configCache[exerciseId]) {
		return configCache[exerciseId];
	}

	try {
		const response = await fetch(`/exercises/${exerciseId}/config.json`);
		if (!response.ok) {
			console.error(`Config not found for exercise: ${exerciseId}`);
			return null;
		}

		const config: ExerciseConfig = await response.json();
		configCache[exerciseId] = config;
		return config;
	} catch (error) {
		console.error(`Failed to load config for ${exerciseId}:`, error);
		return null;
	}
}

/**
 * Obtém config do cache (síncrono)
 */
export function getExerciseConfig(exerciseId: string): ExerciseConfig | null {
	return configCache[exerciseId] || null;
}

/**
 * Lista exercícios disponíveis
 */
export async function getAvailableExercises(): Promise<string[]> {
	try {
		const response = await fetch('/exercises.json');
		if (!response.ok) {
			return ['squat']; // fallback
		}
		const data: { exercises?: string[] } = await response.json();
		return data.exercises || ['squat'];
	} catch {
		return ['squat']; // fallback
	}
}

/**
 * Verifica se exercício existe
 */
export async function isExerciseAvailable(exerciseId: string): Promise<boolean> {
	const exercises = await getAvailableExercises();
	return exercises.includes(exerciseId);
}
