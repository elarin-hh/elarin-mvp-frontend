/**
 * Barrel export for all DTOs
 */

export * from './exercise.dto';
export * from './training.dto';
export * from './plan.dto';
export * from './organization.dto';
export * from './user.dto';

// Re-export Zod schemas from legacy dtos.ts for form validation
export {
    loginSchema,
    registerSchema,
} from '../dtos';
