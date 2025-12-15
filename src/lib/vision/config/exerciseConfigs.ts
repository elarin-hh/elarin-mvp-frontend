import { base } from '$app/paths';
import type { ExerciseConfig } from '../types/exercise.types';

const configCache: Record<string, ExerciseConfig> = {};

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
		config.exerciseName = config.exerciseName || exerciseId;
		config.modelPath = normalizePath(config.modelPath);
		configCache[exerciseId] = config;
		return config;
	} catch (error) {
		return null;
	}
}

export function getExerciseConfig(exerciseId: string): ExerciseConfig | null {
	return configCache[exerciseId] || null;
}
