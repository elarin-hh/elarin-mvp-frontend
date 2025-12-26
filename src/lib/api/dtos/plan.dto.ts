/**
 * Training Plan DTOs
 * Based on app_training_plans, app_training_plan_items, 
 * app_training_plan_assignments, app_training_plan_sessions tables
 */

/**
 * Training plan from app_training_plans
 */
export interface TrainingPlanDto {
    id: number;
    organization_id: number;
    name: string;
    description?: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

/**
 * Individual item within a training plan from app_training_plan_items
 */
export interface TrainingPlanItemDto {
    id: number;
    plan_id?: number;
    template_id: number;
    exercise_type?: string | null;
    position: number;
    target_reps?: number | null;
    target_duration_sec?: number | null;
    // Joined fields for display
    exercise_name?: string | null;
}

/**
 * Training plan assignment from app_training_plan_assignments
 */
export interface TrainingPlanAssignmentDto {
    id: number;
    plan_id: number;
    user_id: number;
    organization_id?: number | null;
    is_active: boolean;
    assigned_at?: string;
    ended_at?: string | null;
}

/**
 * Training plan assigned to a user (API response with joined data)
 */
export interface AssignedTrainingPlanDto {
    assignment_id: number;
    plan_id: number;
    name: string;
    description?: string | null;
    items: TrainingPlanItemDto[];
}

/**
 * Training plan session from app_training_plan_sessions
 */
export interface TrainingPlanSessionDto {
    id: number;
    plan_id: number;
    user_id: number;
    assignment_id?: number | null;
    status: 'in_progress' | 'completed' | 'abandoned';
    started_at?: string;
    completed_at?: string | null;
    // Joined fields for API response
    plan_name?: string | null;
    plan_description?: string | null;
    items?: TrainingPlanItemDto[];
}

// Alias for API compatibility
export type { TrainingPlanSessionDto as TrainingPlanSession };
