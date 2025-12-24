import { base } from '$app/paths';
import type { ExerciseConfig } from '../types/exercise.types';
import { restClient } from '../../api/rest.client';

const configCache: Record<string, ExerciseConfig> = {};

/**
 * Load exercise configuration from backend API (database-driven)
 * @param exerciseType - The exercise template type (e.g. "bodyweight_squat")
 */
export async function loadExerciseConfig(exerciseType: string): Promise<ExerciseConfig | null> {
	if (configCache[exerciseType]) {
		return configCache[exerciseType];
	}

	try {
		// Use restClient which handles JWT authentication automatically
		const response = await restClient.get<ExerciseConfig>(
			`/exercises/by-type/${exerciseType}/config`
		);

		if (!response.success) {
			console.error(`Failed to load config for exercise type ${exerciseType}:`, response.error);
			return null;
		}

		if (!response.data) {
			return null;
		}

		const config = response.data;

		// Normalize paths
		const normalizePath = (path?: string | null) => {
			if (!path) return path ?? undefined;
			return path.startsWith('http') ? path : `${base}${path.replace(/^\./, '')}`;
		};

		config.exerciseName = config.exerciseName || exerciseType;
		config.modelPath = normalizePath(config.modelPath);

		configCache[exerciseType] = config;
		return config;
	} catch (error) {
		console.error(`Error loading config for exercise type ${exerciseType}:`, error);
		return null;
	}
}

export function getExerciseConfig(exerciseType: string): ExerciseConfig | null {
	return configCache[exerciseType] || null;
}
