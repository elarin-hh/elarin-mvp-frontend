import { restClient, type ApiResponse } from './rest.client';
import type {
  ExerciseDto,
  TrainingMetricDto,
  SaveTrainingRequestDto,
} from './dtos';

// Re-export for backwards compatibility
export type Exercise = ExerciseDto;
export type TrainingMetric = TrainingMetricDto;
export type SaveTrainingRequest = SaveTrainingRequestDto;

export const trainingApi = {
  async getExercises(): Promise<ApiResponse<ExerciseDto[]>> {
    return restClient.get<ExerciseDto[]>('/exercises');
  },

  async getExerciseByType(type: string): Promise<ApiResponse<ExerciseDto>> {
    return restClient.get<ExerciseDto>(`/exercises/${type}`);
  },

  async saveTraining(data: SaveTrainingRequestDto): Promise<ApiResponse<TrainingMetricDto>> {
    return restClient.post<TrainingMetricDto>('/training/save', data);
  },

  async getHistory(limit = 20, offset = 0): Promise<ApiResponse<TrainingMetricDto[]>> {
    return restClient.get<TrainingMetricDto[]>(
      `/training/history?limit=${limit}&offset=${offset}`
    );
  },

  async getTrainingDetails(metricId: number): Promise<ApiResponse<TrainingMetricDto>> {
    return restClient.get<TrainingMetricDto>(`/training/${metricId}`);
  }
};
