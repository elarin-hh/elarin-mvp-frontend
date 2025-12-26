/**
 * Training DTOs
 * Based on app_training_sessions table
 */

/**
 * Training session record from app_training_sessions
 */
export interface TrainingMetricDto {
    id: number;
    user_id?: number | null;
    organization_id?: number | null;
    exercise: string;
    reps: number;
    sets: number;
    duration_ms: number;
    valid_ratio: number;
    created_at: string;
    plan_session_id?: number | null;
    plan_item_id?: number | null;
    sequence_index?: number | null;
}

/**
 * Request payload for saving a training session
 */
export interface SaveTrainingRequestDto {
    exercise_type: string;
    reps_completed: number;
    sets_completed: number;
    duration_seconds: number;
    avg_confidence?: number;
    plan_session_id?: number;
    plan_item_id?: number;
    sequence_index?: number;
}
