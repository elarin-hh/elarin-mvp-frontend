/**
 * Exercise DTOs
 * Based on app_exercise_templates and app_user_exercises tables
 */

/**
 * Exercise template from app_exercise_templates
 */
export interface ExerciseTemplateDto {
    id: number;
    type: string;
    name: string;
    description?: string | null;
    image_url?: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    config?: Record<string, unknown>;
    editable_fields?: string[];
}

/**
 * User-specific exercise from app_user_exercises
 */
export interface UserExerciseDto {
    id: number;
    user_id: number;
    template_id: number;
    config?: Record<string, unknown> | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

/**
 * Combined exercise data (template + user config)
 * Used in API responses
 */
export interface ExerciseDto {
    id: number;
    user_id?: number;
    type: string;
    name: string;
    description?: string | null;
    image_url?: string | null;
    is_active: boolean;
    config?: Record<string, unknown> | null;
    created_at?: string;
}
