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

// Training Session DTOs
export const trainingSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  exerciseType: z.enum(['squat', 'lunge', 'plank']),
  reps: z.number().int().nonnegative(),
  sets: z.number().int().nonnegative(),
  duration: z.number().nonnegative(),
  startTime: z.number(),
  endTime: z.number().nullable(),
  createdAt: z.string().datetime()
});

export type TrainingSessionDto = z.infer<typeof trainingSessionSchema>;

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

