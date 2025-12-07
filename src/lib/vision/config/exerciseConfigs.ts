/**
 * Exercise Configurations Loader
 * ===============================
 *
 * Carrega configurações de exercícios de arquivos JSON em static/exercises/
 */

import { base } from '$app/paths';
import type { ExerciseConfig } from '../types/exercise.types';

const DEFAULT_EXERCISES = [
	'bodyweight_squat',
	'standing_hip_abduction',
	'glute_bridge',
	'seated_thoracic_extension',
	'dead_bug_alternating',
	'standing_v_raise'
];

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
		const response = await fetch(`${base}/exercises/${exerciseId}/config.json`);
		if (!response.ok) {
			return null;
		}

		const config: ExerciseConfig = await response.json();
		const normalizePath = (path?: string | null) => {
			if (!path) return path ?? undefined;
			return path.startsWith('http') ? path : `${base}${path.replace(/^\./, '')}`;
		};
		config.modelPath = normalizePath(
			config.modelPath || (config.modelFile ? `./exercises/${exerciseId}/${config.modelFile}` : undefined)
		);
		config.exercisePath = normalizePath(config.exercisePath);
		config.validatorPath = normalizePath(config.validatorPath || undefined);
		config.metadataFile = config.metadataFile || null;
		configCache[exerciseId] = config;
		return config;
	} catch (error) {
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
		const response = await fetch(`${base}/exercises.json`);
		if (!response.ok) {
			return DEFAULT_EXERCISES;
		}
		const data: { exercises?: string[] } = await response.json();
		return data.exercises || DEFAULT_EXERCISES;
	} catch {
		return DEFAULT_EXERCISES;
	}
}

/**
 * Verifica se exercício existe
 */
export async function isExerciseAvailable(exerciseId: string): Promise<boolean> {
	const exercises = await getAvailableExercises();
	return exercises.includes(exerciseId);
}
