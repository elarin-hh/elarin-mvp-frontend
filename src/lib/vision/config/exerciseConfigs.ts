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
		const response = await restClient.get<ExerciseConfig>(
			`/exercises/by-type/${exerciseType}/config`
		);

		if (!response.success) {
			console.error(`Falha ao carregar configuração do tipo de exercício ${exerciseType}:`, response.error);
			return null;
		}

		if (!response.data) {
			return null;
		}

		const config = response.data;

		const normalizePath = (path?: string | null) => {
			if (!path) return path ?? undefined;
			return path.startsWith('http') ? path : `${base}${path.replace(/^\./, '')}`;
		};

		const rawReferenceVideoUrl =
			(config as { referenceVideoUrl?: string | null }).referenceVideoUrl ??
			(config as { videoUrl?: string | null }).videoUrl ??
			(config as { video_url?: string | null }).video_url ??
			null;

		config.modelPath = normalizePath(config.modelPath);
		config.referenceVideoUrl = normalizePath(rawReferenceVideoUrl) ?? null;

		configCache[exerciseType] = config;
		return config;
	} catch (error) {
		console.error(`Erro ao carregar configuração do tipo de exercício ${exerciseType}:`, error);
		return null;
	}
}

export function getExerciseConfig(exerciseType: string): ExerciseConfig | null {
	return configCache[exerciseType] || null;
}
