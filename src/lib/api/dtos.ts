import { z } from 'zod';

// Auth DTOs
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string().min(6)
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;

// Training Metric DTOs
export const trainingMetricSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  organizationId: z.number().int().positive().nullable(),
  exercise: z.enum(['squat', 'lunge', 'plank', 'push_up']),
  reps: z.number().int().nonnegative(),
  sets: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative(),
  validRatio: z.number().min(0).max(1),
  createdAt: z.string().datetime()
});

export type TrainingMetricDto = z.infer<typeof trainingMetricSchema>;

// User DTOs
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type UserDto = z.infer<typeof userSchema>;

// Stats DTOs
export const userStatsSchema = z.object({
  totalWorkouts: z.number().int().nonnegative(),
  currentStreak: z.number().int().nonnegative(),
  personalBest: z.number().int().nonnegative()
});

export type UserStatsDto = z.infer<typeof userStatsSchema>;

