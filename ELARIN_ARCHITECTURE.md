# Elarin - Arquitetura Full-Stack Moderna

> Arquitetura completa Next.js + Fastify + Supabase para o Elarin AI Fitness Trainer

**Stack Tecnológica:**
- 🎨 **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- ⚡ **Backend:** Fastify 5 (REST API) + TypeScript
- 🗄️ **Database & Auth:** Supabase (PostgreSQL + Auth + Storage)
- 🤖 **ML/CV:** MediaPipe Pose + TensorFlow.js
- 📦 **Monorepo:** Turborepo (apps: web, api)

---

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Modelo de Dados (Supabase)](#3-modelo-de-dados-supabase)
4. [API Backend (Fastify)](#4-api-backend-fastify)
5. [Autenticação e Segurança](#5-autenticação-e-segurança)
6. [Frontend (Next.js)](#6-frontend-nextjs)
7. [Fluxo de Integração](#7-fluxo-de-integração)
8. [Boas Práticas e Padrões](#8-boas-práticas-e-padrões)
9. [Escalabilidade e Performance](#9-escalabilidade-e-performance)
10. [Guia de Implementação Passo a Passo](#10-guia-de-implementação-passo-a-passo)

---

## 1. Visão Geral da Arquitetura

### 1.1 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js)                         │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  App Router  │  │  Components  │  │  ML Detection (TF.js)   │  │
│  │  (RSC/SSR)   │  │  (Tailwind)  │  │  (MediaPipe Pose)       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────┘  │
│         │                 │                      │                 │
│         └─────────────────┴──────────────────────┘                 │
│                           │                                         │
│                    ┌──────▼──────────┐                             │
│                    │  API Client     │                             │
│                    │  (fetch + auth) │                             │
│                    └──────┬──────────┘                             │
└───────────────────────────┼──────────────────────────────────────────┘
                            │
                    ════════╪════════ HTTPS (REST)
                            │
┌───────────────────────────▼──────────────────────────────────────────┐
│                      BACKEND API (Fastify)                           │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      API Gateway Layer                         │ │
│  │  • CORS Middleware                                             │ │
│  │  • Rate Limiting                                               │ │
│  │  • JWT Verification                                            │ │
│  │  • Request Validation (Zod)                                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Routes (/api/v1/)                         │ │
│  │  • /auth      → Authentication endpoints                       │ │
│  │  • /users     → User profile management                        │ │
│  │  • /workouts  → Training sessions CRUD                         │ │
│  │  • /exercises → Exercise catalog                               │ │
│  │  • /uploads   → Video/data upload                              │ │
│  │  • /analytics → Statistics & reports                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Services Layer                            │ │
│  │  • AuthService      → Supabase Auth integration                │ │
│  │  • WorkoutService   → Business logic for workouts              │ │
│  │  • AnalyticsService → Stats aggregation                        │ │
│  │  • StorageService   → File upload to Supabase Storage          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Database Client                             │ │
│  │  • Supabase Client (with service role key)                     │ │
│  │  • Query builders and helpers                                  │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                    ════════╪════════ PostgreSQL Wire Protocol
                            │
┌───────────────────────────▼──────────────────────────────────────────┐
│                        SUPABASE CLOUD                                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Supabase Auth                               │ │
│  │  • JWT Token Generation                                        │ │
│  │  • OAuth Providers (Google, GitHub)                            │ │
│  │  • Session Management                                          │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                  PostgreSQL Database                           │ │
│  │  • Tables (users, workouts, exercises, etc.)                   │ │
│  │  • Row Level Security (RLS)                                    │ │
│  │  • Triggers & Functions                                        │ │
│  │  • Real-time Subscriptions                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Supabase Storage                            │ │
│  │  • User avatars (bucket: avatars)                              │ │
│  │  • Exercise videos (bucket: exercise-videos)                   │ │
│  │  • Workout recordings (bucket: workout-recordings)             │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 Fluxo de Requisição

```
User Action → Next.js → API Client → Fastify API → Supabase → Response
                                          ↓
                                    Validation
                                    Auth Check
                                    Business Logic
```

### 1.3 Responsabilidades

| Camada | Responsabilidade |
|--------|------------------|
| **Next.js** | UI/UX, SSR/SSG, State management, ML inference client-side |
| **Fastify** | REST API, Business logic, Validation, Auth verification, File uploads |
| **Supabase** | Data persistence, Authentication, Storage, Real-time updates |

---

## 2. Estrutura de Pastas

### 2.1 Estrutura Completa do Monorepo

```
elarin-mvp-full/
├── apps/
│   ├── web/                          # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/                  # App Router
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── register/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── train/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── history/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── analytics/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── api/              # Next.js API Routes (opcional)
│   │   │   │   │   └── webhook/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/               # Componentes base (shadcn/ui)
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── card.tsx
│   │   │   │   │   └── input.tsx
│   │   │   │   ├── features/         # Componentes de features
│   │   │   │   │   ├── camera/
│   │   │   │   │   │   ├── CameraView.tsx
│   │   │   │   │   │   └── PoseCanvas.tsx
│   │   │   │   │   ├── workout/
│   │   │   │   │   │   ├── WorkoutCard.tsx
│   │   │   │   │   │   └── WorkoutStats.tsx
│   │   │   │   │   └── auth/
│   │   │   │   │       ├── LoginForm.tsx
│   │   │   │   │       └── RegisterForm.tsx
│   │   │   │   └── layout/
│   │   │   │       ├── Header.tsx
│   │   │   │       ├── Sidebar.tsx
│   │   │   │       └── Footer.tsx
│   │   │   ├── lib/
│   │   │   │   ├── api/              # API Client
│   │   │   │   │   ├── client.ts     # Fetch wrapper com auth
│   │   │   │   │   ├── auth.ts       # Auth endpoints
│   │   │   │   │   ├── workouts.ts   # Workout endpoints
│   │   │   │   │   ├── users.ts      # User endpoints
│   │   │   │   │   └── analytics.ts  # Analytics endpoints
│   │   │   │   ├── ml/               # Machine Learning
│   │   │   │   │   ├── pose-detector.ts
│   │   │   │   │   ├── squat-detector.ts
│   │   │   │   │   └── models/
│   │   │   │   ├── stores/           # Zustand stores
│   │   │   │   │   ├── auth-store.ts
│   │   │   │   │   ├── workout-store.ts
│   │   │   │   │   └── ui-store.ts
│   │   │   │   ├── hooks/            # Custom React hooks
│   │   │   │   │   ├── use-auth.ts
│   │   │   │   │   ├── use-camera.ts
│   │   │   │   │   └── use-workout.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── cn.ts
│   │   │   │   │   ├── date.ts
│   │   │   │   │   └── format.ts
│   │   │   │   └── types/
│   │   │   │       ├── api.ts
│   │   │   │       ├── workout.ts
│   │   │   │       └── user.ts
│   │   │   ├── middleware.ts         # Next.js middleware (auth check)
│   │   │   └── instrumentation.ts
│   │   ├── public/
│   │   │   ├── models_tfjs/          # TensorFlow.js models
│   │   │   │   └── squat/
│   │   │   └── images/
│   │   ├── .env.local
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── api/                          # Fastify Backend
│       ├── src/
│       │   ├── server.ts             # Entry point
│       │   ├── app.ts                # Fastify app instance
│       │   ├── config/
│       │   │   ├── env.ts            # Environment variables (Zod validation)
│       │   │   ├── supabase.ts       # Supabase client config
│       │   │   └── constants.ts
│       │   ├── routes/
│       │   │   ├── v1/
│       │   │   │   ├── index.ts      # Route aggregator
│       │   │   │   ├── auth.routes.ts
│       │   │   │   ├── users.routes.ts
│       │   │   │   ├── workouts.routes.ts
│       │   │   │   ├── exercises.routes.ts
│       │   │   │   ├── uploads.routes.ts
│       │   │   │   └── analytics.routes.ts
│       │   │   └── health.routes.ts
│       │   ├── controllers/
│       │   │   ├── auth.controller.ts
│       │   │   ├── users.controller.ts
│       │   │   ├── workouts.controller.ts
│       │   │   ├── exercises.controller.ts
│       │   │   ├── uploads.controller.ts
│       │   │   └── analytics.controller.ts
│       │   ├── services/
│       │   │   ├── auth.service.ts
│       │   │   ├── users.service.ts
│       │   │   ├── workouts.service.ts
│       │   │   ├── exercises.service.ts
│       │   │   ├── storage.service.ts
│       │   │   ├── analytics.service.ts
│       │   │   └── email.service.ts  # Future: email notifications
│       │   ├── repositories/
│       │   │   ├── base.repository.ts
│       │   │   ├── users.repository.ts
│       │   │   ├── workouts.repository.ts
│       │   │   ├── exercises.repository.ts
│       │   │   └── errors.repository.ts
│       │   ├── middleware/
│       │   │   ├── auth.middleware.ts      # JWT verification
│       │   │   ├── error-handler.ts        # Global error handler
│       │   │   ├── rate-limit.ts           # Rate limiting
│       │   │   ├── cors.ts                 # CORS configuration
│       │   │   └── validation.ts           # Request validation
│       │   ├── schemas/                    # Zod schemas for validation
│       │   │   ├── auth.schema.ts
│       │   │   ├── user.schema.ts
│       │   │   ├── workout.schema.ts
│       │   │   ├── exercise.schema.ts
│       │   │   └── common.schema.ts
│       │   ├── plugins/
│       │   │   ├── supabase.plugin.ts
│       │   │   ├── swagger.plugin.ts
│       │   │   └── sensible.plugin.ts
│       │   ├── utils/
│       │   │   ├── logger.ts               # Pino logger
│       │   │   ├── jwt.ts                  # JWT helpers
│       │   │   ├── errors.ts               # Custom error classes
│       │   │   └── response.ts             # Response formatters
│       │   └── types/
│       │       ├── fastify.d.ts            # Fastify type extensions
│       │       ├── supabase.ts
│       │       └── index.ts
│       ├── tests/
│       │   ├── unit/
│       │   ├── integration/
│       │   └── e2e/
│       ├── .env
│       ├── .env.example
│       ├── tsconfig.json
│       └── package.json
│
├── packages/                         # Shared packages (opcional)
│   ├── shared-types/                 # Tipos compartilhados
│   │   ├── src/
│   │   │   ├── workout.ts
│   │   │   ├── user.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── ui/                           # Componentes compartilhados (futuro)
│
├── supabase/                         # Supabase configuration
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   ├── seed.sql
│   └── config.toml
│
├── docs/
│   ├── API.md                        # API documentation
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── turbo.json                        # Turborepo configuration
├── package.json                      # Root package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 3. Modelo de Dados (Supabase)

### 3.1 Diagrama de Entidades e Relacionamentos (DER)

```
┌─────────────────────┐
│   auth.users        │ (Supabase Auth - gerenciado automaticamente)
│─────────────────────│
│ id (UUID) PK        │
│ email               │
│ encrypted_password  │
│ email_confirmed_at  │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │
           │ 1:1
           ▼
┌─────────────────────────────┐
│   public.profiles           │
│─────────────────────────────│
│ id (UUID) PK, FK            │◄────┐
│ email TEXT                  │     │
│ full_name TEXT              │     │
│ avatar_url TEXT             │     │
│ subscription_plan ENUM      │     │
│ locale TEXT                 │     │ 1:N
│ timezone TEXT               │     │
│ weight_kg NUMERIC           │     │
│ height_cm NUMERIC           │     │
│ birth_date DATE             │     │
│ gender TEXT                 │     │
│ fitness_level ENUM          │     │
│ streak_days INTEGER         │     │
│ last_active_at TIMESTAMPTZ  │     │
│ created_at TIMESTAMPTZ      │     │
│ updated_at TIMESTAMPTZ      │     │
└─────────────────────────────┘     │
           │                         │
           │ 1:N                     │
           ▼                         │
┌─────────────────────────────┐     │
│   public.workout_sessions   │     │
│─────────────────────────────│     │
│ id (UUID) PK                │     │
│ user_id (UUID) FK           │─────┘
│ exercise_id (INT) FK        │─────┐
│ status ENUM                 │     │
│ target_reps INTEGER         │     │
│ target_sets INTEGER         │     │
│ completed_reps INTEGER      │     │
│ completed_sets INTEGER      │     │
│ duration_seconds INTEGER    │     │
│ calories_burned NUMERIC     │     │
│ avg_form_score NUMERIC      │     │
│ notes TEXT                  │     │
│ video_url TEXT              │     │
│ started_at TIMESTAMPTZ      │     │
│ finished_at TIMESTAMPTZ     │     │
│ created_at TIMESTAMPTZ      │     │
│ updated_at TIMESTAMPTZ      │     │
└──────────┬──────────────────┘     │
           │                         │
           │ 1:N                     │
           ▼                         │
┌─────────────────────────────┐     │
│   public.workout_errors     │     │
│─────────────────────────────│     │
│ id (BIGSERIAL) PK           │     │
│ session_id (UUID) FK        │     │
│ rep_number INTEGER          │     │
│ error_type TEXT             │     │
│ error_code TEXT             │     │
│ severity ENUM               │     │
│ confidence NUMERIC          │     │
│ description TEXT            │     │
│ correction_hint TEXT        │     │
│ body_part TEXT              │     │
│ stage TEXT                  │     │
│ detected_at TIMESTAMPTZ     │     │
└─────────────────────────────┘     │
           │                         │
           │ (same session_id)       │
           ▼                         │
┌─────────────────────────────┐     │
│   public.rep_history        │     │
│─────────────────────────────│     │
│ id (BIGSERIAL) PK           │     │
│ session_id (UUID) FK        │     │
│ rep_number INTEGER          │     │
│ set_number INTEGER          │     │
│ duration_ms INTEGER         │     │
│ form_score NUMERIC          │     │
│ rom_percentage NUMERIC      │     │ (Range of Motion)
│ tempo TEXT                  │     │ (e.g., "2-1-2")
│ had_errors BOOLEAN          │     │
│ error_count INTEGER         │     │
│ peak_angle_knee NUMERIC     │     │
│ peak_angle_hip NUMERIC      │     │
│ completed_at TIMESTAMPTZ    │     │
└─────────────────────────────┘     │
                                     │
┌─────────────────────────────┐     │
│   public.exercises          │◄────┘
│─────────────────────────────│
│ id SERIAL PK                │
│ slug TEXT UNIQUE            │
│ name_en TEXT                │
│ name_pt TEXT                │
│ description_en TEXT         │
│ description_pt TEXT         │
│ instructions_en JSONB       │
│ instructions_pt JSONB       │
│ category ENUM               │
│ muscle_groups TEXT[]        │
│ difficulty_level ENUM       │
│ equipment_required TEXT[]   │
│ thumbnail_url TEXT          │
│ video_demo_url TEXT         │
│ ml_model_path TEXT          │
│ default_reps INTEGER        │
│ default_sets INTEGER        │
│ calories_per_rep NUMERIC    │
│ is_available BOOLEAN        │
│ sort_order INTEGER          │
│ created_at TIMESTAMPTZ      │
│ updated_at TIMESTAMPTZ      │
└─────────────────────────────┘

┌─────────────────────────────┐
│   public.user_stats         │
│─────────────────────────────│
│ user_id (UUID) PK, FK       │
│ total_workouts INTEGER      │
│ total_reps INTEGER          │
│ total_duration_seconds BIGINT│
│ total_calories_burned NUMERIC│
│ unique_exercises_count INT  │
│ avg_form_score NUMERIC      │
│ error_rate NUMERIC          │
│ favorite_exercise_id INT FK │
│ last_workout_at TIMESTAMPTZ │
│ current_streak INTEGER      │
│ best_streak INTEGER         │
│ total_distance_km NUMERIC   │
│ updated_at TIMESTAMPTZ      │
└─────────────────────────────┘

┌─────────────────────────────┐
│   public.user_goals         │
│─────────────────────────────│
│ id SERIAL PK                │
│ user_id (UUID) FK           │
│ goal_type ENUM              │ (weight_loss, muscle_gain, endurance)
│ target_value NUMERIC        │
│ current_value NUMERIC       │
│ target_date DATE            │
│ status ENUM                 │ (active, completed, abandoned)
│ created_at TIMESTAMPTZ      │
│ updated_at TIMESTAMPTZ      │
└─────────────────────────────┘

┌─────────────────────────────┐
│   public.user_achievements  │
│─────────────────────────────│
│ id SERIAL PK                │
│ user_id (UUID) FK           │
│ achievement_type TEXT       │
│ title TEXT                  │
│ description TEXT            │
│ icon_url TEXT               │
│ achieved_at TIMESTAMPTZ     │
└─────────────────────────────┘
```

### 3.2 Schema SQL Completo

```sql
-- ============================================
-- ELARIN FITNESS TRACKER - DATABASE SCHEMA V2
-- ============================================
-- Platform: Supabase (PostgreSQL 15+)
-- Architecture: Next.js + Fastify + Supabase
-- Version: 2.0.0
-- ============================================

-- ============================================
-- 1. EXTENSÕES
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para full-text search

-- ============================================
-- 2. ENUMS E TIPOS CUSTOMIZADOS
-- ============================================

CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'premium', 'enterprise');
CREATE TYPE fitness_level AS ENUM ('beginner', 'intermediate', 'advanced', 'elite');
CREATE TYPE workout_status AS ENUM ('idle', 'ready', 'in_progress', 'paused', 'completed', 'cancelled');
CREATE TYPE exercise_category AS ENUM ('upper_body', 'lower_body', 'core', 'cardio', 'full_body', 'flexibility');
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE movement_stage AS ENUM ('up', 'down', 'middle', 'hold', 'transition', 'unknown');
CREATE TYPE error_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE goal_type AS ENUM ('weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'strength', 'custom');
CREATE TYPE goal_status AS ENUM ('active', 'completed', 'paused', 'abandoned');

-- ============================================
-- 3. TABELAS PRINCIPAIS
-- ============================================

-- ------------------------------
-- 3.1 PROFILES (Perfis de Usuário)
-- ------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  subscription_plan subscription_plan NOT NULL DEFAULT 'free',
  locale TEXT NOT NULL DEFAULT 'pt-BR' CHECK (locale IN ('pt-BR', 'en-US', 'es-ES')),
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',

  -- Informações físicas
  weight_kg NUMERIC(5,2) CHECK (weight_kg > 0 AND weight_kg < 500),
  height_cm NUMERIC(5,2) CHECK (height_cm > 0 AND height_cm < 300),
  birth_date DATE CHECK (birth_date < CURRENT_DATE),
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  fitness_level fitness_level DEFAULT 'beginner',

  -- Gamificação
  streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
  experience_points INTEGER NOT NULL DEFAULT 0 CHECK (experience_points >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level > 0),

  -- Timestamps
  last_active_at TIMESTAMPTZ,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_subscription ON public.profiles(subscription_plan);
CREATE INDEX idx_profiles_last_active ON public.profiles(last_active_at DESC);
CREATE INDEX idx_profiles_level ON public.profiles(level DESC);
CREATE INDEX idx_profiles_email ON public.profiles USING gin(email gin_trgm_ops);

COMMENT ON TABLE public.profiles IS 'Perfis de usuários com informações pessoais e gamificação';

-- ------------------------------
-- 3.2 EXERCISES (Catálogo de Exercícios)
-- ------------------------------
CREATE TABLE public.exercises (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,

  -- Nomes e descrições (i18n)
  name_en TEXT NOT NULL,
  name_pt TEXT NOT NULL,
  description_en TEXT,
  description_pt TEXT,
  instructions_en JSONB, -- Array de steps
  instructions_pt JSONB,

  -- Categorização
  category exercise_category NOT NULL,
  muscle_groups TEXT[] NOT NULL DEFAULT '{}',
  difficulty_level difficulty_level NOT NULL DEFAULT 'beginner',
  equipment_required TEXT[] DEFAULT '{}',

  -- Mídia
  thumbnail_url TEXT,
  video_demo_url TEXT,

  -- ML Config
  ml_model_path TEXT,
  ml_config JSONB, -- Configurações específicas do modelo

  -- Defaults
  default_reps INTEGER DEFAULT 10 CHECK (default_reps > 0),
  default_sets INTEGER DEFAULT 3 CHECK (default_sets > 0),
  calories_per_rep NUMERIC(5,2) DEFAULT 0.5 CHECK (calories_per_rep >= 0),

  -- Disponibilidade
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  requires_premium BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercises_category ON public.exercises(category);
CREATE INDEX idx_exercises_difficulty ON public.exercises(difficulty_level);
CREATE INDEX idx_exercises_available ON public.exercises(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_exercises_slug ON public.exercises(slug);
CREATE INDEX idx_exercises_muscle_groups ON public.exercises USING gin(muscle_groups);

-- ------------------------------
-- 3.3 WORKOUT_SESSIONS (Sessões de Treino)
-- ------------------------------
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,

  -- Status do treino
  status workout_status NOT NULL DEFAULT 'idle',

  -- Planejamento
  target_reps INTEGER CHECK (target_reps > 0),
  target_sets INTEGER CHECK (target_sets > 0),

  -- Execução
  completed_reps INTEGER NOT NULL DEFAULT 0 CHECK (completed_reps >= 0),
  completed_sets INTEGER NOT NULL DEFAULT 0 CHECK (completed_sets >= 0),
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),

  -- Métricas
  calories_burned NUMERIC(7,2) DEFAULT 0 CHECK (calories_burned >= 0),
  avg_form_score NUMERIC(3,1) CHECK (avg_form_score >= 0 AND avg_form_score <= 10),
  max_form_score NUMERIC(3,1) CHECK (max_form_score >= 0 AND max_form_score <= 10),
  min_form_score NUMERIC(3,1) CHECK (min_form_score >= 0 AND min_form_score <= 10),

  -- Mídia
  video_url TEXT,
  thumbnail_url TEXT,

  -- Notas
  notes TEXT,
  user_rating SMALLINT CHECK (user_rating >= 1 AND user_rating <= 5),

  -- Timestamps
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_session_times CHECK (
    (started_at IS NULL AND finished_at IS NULL) OR
    (started_at IS NOT NULL AND (finished_at IS NULL OR finished_at >= started_at))
  ),
  CONSTRAINT valid_duration CHECK (duration_seconds <= 14400) -- Max 4h
);

CREATE INDEX idx_workout_sessions_user ON public.workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_exercise ON public.workout_sessions(exercise_id);
CREATE INDEX idx_workout_sessions_status ON public.workout_sessions(status);
CREATE INDEX idx_workout_sessions_started ON public.workout_sessions(started_at DESC);
CREATE INDEX idx_workout_sessions_user_started ON public.workout_sessions(user_id, started_at DESC);
CREATE INDEX idx_workout_sessions_user_exercise ON public.workout_sessions(user_id, exercise_id, started_at DESC);

-- ------------------------------
-- 3.4 WORKOUT_ERRORS (Erros de Postura)
-- ------------------------------
CREATE TABLE public.workout_errors (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,

  -- Identificação do erro
  rep_number INTEGER CHECK (rep_number > 0),
  set_number INTEGER CHECK (set_number > 0),
  error_type TEXT NOT NULL,
  error_code TEXT NOT NULL,

  -- Severidade e confiança
  severity error_severity NOT NULL DEFAULT 'medium',
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),

  -- Detalhes
  description TEXT,
  correction_hint TEXT,
  body_part TEXT, -- Ex: 'left_knee', 'right_shoulder'
  stage movement_stage,

  -- Dados técnicos (para análise)
  metadata JSONB, -- Ângulos, coordenadas, etc.

  -- Timestamp
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workout_errors_session ON public.workout_errors(session_id);
CREATE INDEX idx_workout_errors_type ON public.workout_errors(error_type);
CREATE INDEX idx_workout_errors_severity ON public.workout_errors(severity);
CREATE INDEX idx_workout_errors_detected ON public.workout_errors(detected_at DESC);
CREATE INDEX idx_workout_errors_session_rep ON public.workout_errors(session_id, rep_number);

-- ------------------------------
-- 3.5 REP_HISTORY (Histórico de Repetições)
-- ------------------------------
CREATE TABLE public.rep_history (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,

  -- Identificação
  rep_number INTEGER NOT NULL CHECK (rep_number > 0),
  set_number INTEGER NOT NULL CHECK (set_number > 0),

  -- Tempo
  duration_ms INTEGER CHECK (duration_ms >= 0),
  tempo TEXT, -- Ex: "2-0-2-0" (eccentric-bottom-concentric-top)

  -- Qualidade do movimento
  form_score NUMERIC(3,1) CHECK (form_score >= 0 AND form_score <= 10),
  rom_percentage NUMERIC(5,2) CHECK (rom_percentage >= 0 AND rom_percentage <= 100), -- Range of Motion

  -- Ângulos (biomecânica)
  peak_angle_knee NUMERIC(5,2),
  peak_angle_hip NUMERIC(5,2),
  peak_angle_elbow NUMERIC(5,2),
  peak_angle_shoulder NUMERIC(5,2),

  -- Erros
  had_errors BOOLEAN NOT NULL DEFAULT FALSE,
  error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),

  -- Dados adicionais
  metadata JSONB,

  -- Timestamp
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(session_id, rep_number)
);

CREATE INDEX idx_rep_history_session ON public.rep_history(session_id);
CREATE INDEX idx_rep_history_completed ON public.rep_history(completed_at DESC);
CREATE INDEX idx_rep_history_form_score ON public.rep_history(form_score DESC);

-- ------------------------------
-- 3.6 USER_STATS (Estatísticas Agregadas)
-- ------------------------------
CREATE TABLE public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Totais
  total_workouts INTEGER NOT NULL DEFAULT 0 CHECK (total_workouts >= 0),
  total_reps INTEGER NOT NULL DEFAULT 0 CHECK (total_reps >= 0),
  total_sets INTEGER NOT NULL DEFAULT 0 CHECK (total_sets >= 0),
  total_duration_seconds BIGINT NOT NULL DEFAULT 0 CHECK (total_duration_seconds >= 0),
  total_calories_burned NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_calories_burned >= 0),

  -- Diversidade
  unique_exercises_count INTEGER NOT NULL DEFAULT 0 CHECK (unique_exercises_count >= 0),
  favorite_exercise_id INTEGER REFERENCES public.exercises(id) ON DELETE SET NULL,

  -- Qualidade
  avg_form_score NUMERIC(3,1) CHECK (avg_form_score >= 0 AND avg_form_score <= 10),
  error_rate NUMERIC(5,2) DEFAULT 0.00 CHECK (error_rate >= 0 AND error_rate <= 100),

  -- Streaks
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  best_streak INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),

  -- Datas importantes
  last_workout_at TIMESTAMPTZ,
  first_workout_at TIMESTAMPTZ,

  -- Outras métricas
  total_distance_km NUMERIC(10,2) DEFAULT 0 CHECK (total_distance_km >= 0),

  -- Timestamp
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_stats_workouts ON public.user_stats(total_workouts DESC);
CREATE INDEX idx_user_stats_last_workout ON public.user_stats(last_workout_at DESC);
CREATE INDEX idx_user_stats_streak ON public.user_stats(current_streak DESC);

-- ------------------------------
-- 3.7 USER_GOALS (Metas do Usuário)
-- ------------------------------
CREATE TABLE public.user_goals (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Tipo e valores
  goal_type goal_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  target_value NUMERIC(10,2) NOT NULL CHECK (target_value > 0),
  current_value NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  unit TEXT NOT NULL, -- 'kg', 'reps', 'minutes', etc.

  -- Datas
  target_date DATE,

  -- Status
  status goal_status NOT NULL DEFAULT 'active',
  progress_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
    LEAST((current_value / NULLIF(target_value, 0)) * 100, 100)
  ) STORED,

  -- Timestamps
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_goals_user ON public.user_goals(user_id);
CREATE INDEX idx_user_goals_status ON public.user_goals(status);
CREATE INDEX idx_user_goals_type ON public.user_goals(goal_type);

-- ------------------------------
-- 3.8 USER_ACHIEVEMENTS (Conquistas)
-- ------------------------------
CREATE TABLE public.user_achievements (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,

  -- Metadata
  metadata JSONB,

  -- Timestamp
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, achievement_type)
);

CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_achieved ON public.user_achievements(achieved_at DESC);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rep_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- WORKOUT_SESSIONS
CREATE POLICY "Users can view own sessions" ON public.workout_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.workout_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.workout_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.workout_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- WORKOUT_ERRORS
CREATE POLICY "Users can view own errors" ON public.workout_errors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions
      WHERE workout_sessions.id = workout_errors.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own errors" ON public.workout_errors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions
      WHERE workout_sessions.id = session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- REP_HISTORY
CREATE POLICY "Users can view own rep history" ON public.rep_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions
      WHERE workout_sessions.id = rep_history.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own rep history" ON public.rep_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions
      WHERE workout_sessions.id = session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- USER_STATS
CREATE POLICY "Users can view own stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);

-- USER_GOALS
CREATE POLICY "Users can manage own goals" ON public.user_goals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- USER_ACHIEVEMENTS
CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- EXERCISES (Public read for authenticated users)
CREATE POLICY "Authenticated users can view available exercises" ON public.exercises
  FOR SELECT TO authenticated USING (is_available = TRUE);

-- ============================================
-- 5. FUNCTIONS E TRIGGERS
-- ============================================

-- ------------------------------
-- 5.1 Auto-update updated_at
-- ------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_exercises
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_workout_sessions
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_user_stats
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_user_goals
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------
-- 5.2 Auto-create profile on signup
-- ------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------
-- 5.3 Update user stats on session finish
-- ------------------------------
CREATE OR REPLACE FUNCTION public.update_user_stats_on_session_finish()
RETURNS TRIGGER AS $$
DECLARE
  v_unique_exercises INTEGER;
  v_total_reps_with_errors INTEGER;
  v_error_rate NUMERIC;
  v_avg_form_score NUMERIC;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Contar exercícios únicos
    SELECT COUNT(DISTINCT exercise_id)
    INTO v_unique_exercises
    FROM public.workout_sessions
    WHERE user_id = NEW.user_id AND status = 'completed';

    -- Calcular taxa de erro
    SELECT COALESCE(
      (SELECT COUNT(*) FROM public.rep_history rh
       INNER JOIN public.workout_sessions ws ON rh.session_id = ws.id
       WHERE ws.user_id = NEW.user_id AND rh.had_errors = TRUE),
      0
    ) INTO v_total_reps_with_errors;

    -- Calcular média de form score
    SELECT AVG(form_score)
    INTO v_avg_form_score
    FROM public.rep_history rh
    INNER JOIN public.workout_sessions ws ON rh.session_id = ws.id
    WHERE ws.user_id = NEW.user_id AND ws.status = 'completed';

    -- Calcular error rate
    IF (SELECT SUM(completed_reps) FROM public.workout_sessions WHERE user_id = NEW.user_id) > 0 THEN
      v_error_rate := (v_total_reps_with_errors::NUMERIC /
        (SELECT SUM(completed_reps) FROM public.workout_sessions WHERE user_id = NEW.user_id)::NUMERIC) * 100;
    ELSE
      v_error_rate := 0;
    END IF;

    -- Atualizar stats
    UPDATE public.user_stats
    SET
      total_workouts = (
        SELECT COUNT(*) FROM public.workout_sessions
        WHERE user_id = NEW.user_id AND status = 'completed'
      ),
      total_reps = (
        SELECT COALESCE(SUM(completed_reps), 0) FROM public.workout_sessions
        WHERE user_id = NEW.user_id AND status = 'completed'
      ),
      total_sets = (
        SELECT COALESCE(SUM(completed_sets), 0) FROM public.workout_sessions
        WHERE user_id = NEW.user_id AND status = 'completed'
      ),
      total_duration_seconds = (
        SELECT COALESCE(SUM(duration_seconds), 0) FROM public.workout_sessions
        WHERE user_id = NEW.user_id AND status = 'completed'
      ),
      total_calories_burned = (
        SELECT COALESCE(SUM(calories_burned), 0) FROM public.workout_sessions
        WHERE user_id = NEW.user_id AND status = 'completed'
      ),
      unique_exercises_count = v_unique_exercises,
      error_rate = ROUND(v_error_rate, 2),
      avg_form_score = ROUND(v_avg_form_score, 1),
      last_workout_at = NEW.finished_at,
      first_workout_at = COALESCE(first_workout_at, NEW.started_at)
    WHERE user_id = NEW.user_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_stats_after_session
  AFTER UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_user_stats_on_session_finish();

-- ------------------------------
-- 5.4 Calculate streak (otimizado)
-- ------------------------------
CREATE OR REPLACE FUNCTION public.calculate_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_current_streak INTEGER := 0;
BEGIN
  WITH RECURSIVE workout_dates AS (
    SELECT DISTINCT DATE(started_at) as workout_date
    FROM public.workout_sessions
    WHERE user_id = p_user_id AND status = 'completed'
    ORDER BY DATE(started_at) DESC
  ),
  streak_calc AS (
    SELECT
      workout_date,
      workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::integer AS streak_group,
      ROW_NUMBER() OVER (ORDER BY workout_date DESC) as row_num
    FROM workout_dates
  )
  SELECT COUNT(*)
  INTO v_current_streak
  FROM streak_calc
  WHERE streak_group = (SELECT streak_group FROM streak_calc WHERE row_num = 1);

  -- Atualizar perfil
  UPDATE public.profiles
  SET streak_days = v_current_streak
  WHERE id = p_user_id;

  -- Atualizar stats
  UPDATE public.user_stats
  SET
    current_streak = v_current_streak,
    best_streak = GREATEST(best_streak, v_current_streak)
  WHERE user_id = p_user_id;

  RETURN v_current_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.trigger_calculate_streak()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM public.calculate_streak(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER calculate_streak_on_finish
  AFTER UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_calculate_streak();

-- ------------------------------
-- 5.5 Query helpers
-- ------------------------------

-- Get workout history with details
CREATE OR REPLACE FUNCTION public.get_workout_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  exercise_id INTEGER,
  exercise_name TEXT,
  exercise_slug TEXT,
  completed_reps INTEGER,
  completed_sets INTEGER,
  duration_seconds INTEGER,
  calories_burned NUMERIC,
  avg_form_score NUMERIC,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ws.id,
    ws.exercise_id,
    e.name_pt as exercise_name,
    e.slug as exercise_slug,
    ws.completed_reps,
    ws.completed_sets,
    ws.duration_seconds,
    ws.calories_burned,
    ws.avg_form_score,
    ws.started_at,
    ws.finished_at,
    COUNT(we.id) AS error_count
  FROM public.workout_sessions ws
  INNER JOIN public.exercises e ON e.id = ws.exercise_id
  LEFT JOIN public.workout_errors we ON we.session_id = ws.id
  WHERE ws.user_id = p_user_id AND ws.status = 'completed'
  GROUP BY ws.id, e.id
  ORDER BY ws.started_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get exercise statistics
CREATE OR REPLACE FUNCTION public.get_exercise_stats(
  p_user_id UUID,
  p_exercise_id INTEGER
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_sessions', COUNT(*),
    'total_reps', SUM(completed_reps),
    'total_sets', SUM(completed_sets),
    'total_duration', SUM(duration_seconds),
    'total_calories', SUM(calories_burned),
    'avg_reps_per_session', ROUND(AVG(completed_reps), 1),
    'avg_form_score', ROUND(AVG(avg_form_score), 1),
    'best_session_reps', MAX(completed_reps),
    'last_workout', MAX(started_at)
  )
  INTO result
  FROM public.workout_sessions
  WHERE user_id = p_user_id
    AND exercise_id = p_exercise_id
    AND status = 'completed';

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 6. SEED DATA
-- ============================================

INSERT INTO public.exercises (
  slug, name_en, name_pt, description_en, description_pt,
  category, muscle_groups, difficulty_level, equipment_required,
  ml_model_path, default_reps, default_sets, calories_per_rep,
  is_available, requires_premium
) VALUES
  -- LOWER BODY
  ('squat', 'Squat', 'Agachamento',
   'Basic squat exercise with ML-powered form detection',
   'Exercício de agachamento com detecção de forma via ML',
   'lower_body', ARRAY['quadriceps', 'glutes', 'hamstrings'], 'beginner', ARRAY[]::TEXT[],
   '/models_tfjs/squat/', 12, 3, 0.8, TRUE, FALSE),

  ('lunges', 'Lunges', 'Afundo',
   'Unilateral leg exercise for strength and balance',
   'Exercício unilateral de pernas para força e equilíbrio',
   'lower_body', ARRAY['quadriceps', 'glutes'], 'beginner', ARRAY[]::TEXT[],
   NULL, 10, 3, 0.7, FALSE, FALSE),

  ('leg-press', 'Leg Press', 'Leg Press',
   'Compound leg exercise using machine',
   'Exercício composto de pernas usando máquina',
   'lower_body', ARRAY['quadriceps', 'glutes'], 'intermediate', ARRAY['leg_press_machine'],
   NULL, 12, 4, 0.9, FALSE, TRUE),

  -- UPPER BODY
  ('push-up', 'Push-up', 'Flexão',
   'Bodyweight chest and triceps exercise',
   'Exercício de peito e tríceps com peso corporal',
   'upper_body', ARRAY['chest', 'triceps', 'shoulders'], 'beginner', ARRAY[]::TEXT[],
   NULL, 15, 3, 0.6, FALSE, FALSE),

  ('bench-press', 'Bench Press', 'Supino',
   'Compound chest exercise with barbell',
   'Exercício composto de peito com barra',
   'upper_body', ARRAY['chest', 'triceps', 'shoulders'], 'intermediate', ARRAY['barbell', 'bench'],
   NULL, 10, 4, 1.0, FALSE, TRUE),

  ('pull-up', 'Pull-up', 'Barra Fixa',
   'Bodyweight back and biceps exercise',
   'Exercício de costas e bíceps com peso corporal',
   'upper_body', ARRAY['lats', 'biceps'], 'advanced', ARRAY['pull_up_bar'],
   NULL, 8, 3, 0.9, FALSE, FALSE),

  -- CORE
  ('plank', 'Plank', 'Prancha',
   'Isometric core strengthening exercise',
   'Exercício isométrico de fortalecimento do core',
   'core', ARRAY['abs', 'obliques'], 'beginner', ARRAY[]::TEXT[],
   NULL, 1, 3, 0.5, FALSE, FALSE),

  ('crunch', 'Crunch', 'Abdominal',
   'Basic abdominal exercise',
   'Exercício básico de abdominal',
   'core', ARRAY['abs'], 'beginner', ARRAY[]::TEXT[],
   NULL, 20, 3, 0.4, FALSE, FALSE)

ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- FIM DO SCHEMA
-- ============================================
```

---

## 4. API Backend (Fastify)

### 4.1 Estrutura de Endpoints

#### Base URL
```
Production:  https://api.elarin.com
Development: http://localhost:3001
```

#### Versionamento
```
/api/v1/*  - Current stable version
/api/v2/*  - Future versions
```

### 4.2 Endpoints Completos

```typescript
// ============================================
// AUTHENTICATION & AUTHORIZATION
// ============================================

POST   /api/v1/auth/register              // Registrar novo usuário
POST   /api/v1/auth/login                 // Login
POST   /api/v1/auth/logout                // Logout
POST   /api/v1/auth/refresh               // Refresh token
POST   /api/v1/auth/forgot-password       // Solicitar reset de senha
POST   /api/v1/auth/reset-password        // Reset senha com token
POST   /api/v1/auth/verify-email          // Verificar email
POST   /api/v1/auth/resend-verification   // Reenviar email de verificação

// OAuth
GET    /api/v1/auth/google                // Iniciar OAuth Google
GET    /api/v1/auth/google/callback       // Callback OAuth Google
GET    /api/v1/auth/github                // Iniciar OAuth GitHub
GET    /api/v1/auth/github/callback       // Callback OAuth GitHub

// ============================================
// USERS & PROFILES
// ============================================

GET    /api/v1/users/me                   // Obter perfil do usuário autenticado
PUT    /api/v1/users/me                   // Atualizar perfil
PATCH  /api/v1/users/me/avatar            // Upload de avatar
DELETE /api/v1/users/me                   // Deletar conta
GET    /api/v1/users/me/stats             // Estatísticas do usuário
GET    /api/v1/users/me/achievements      // Conquistas do usuário
GET    /api/v1/users/me/goals             // Metas do usuário
POST   /api/v1/users/me/goals             // Criar nova meta
PUT    /api/v1/users/me/goals/:id         // Atualizar meta
DELETE /api/v1/users/me/goals/:id         // Deletar meta

// ============================================
// EXERCISES
// ============================================

GET    /api/v1/exercises                  // Listar exercícios (com filtros)
GET    /api/v1/exercises/:slug            // Obter detalhes de um exercício
GET    /api/v1/exercises/:slug/stats      // Estatísticas do usuário para exercício

// Query params para GET /exercises:
// ?category=lower_body
// ?difficulty=beginner
// ?muscle_group=quadriceps
// ?available=true
// ?search=squat

// ============================================
// WORKOUTS
// ============================================

POST   /api/v1/workouts                   // Criar nova sessão de treino
GET    /api/v1/workouts                   // Listar workouts do usuário (histórico)
GET    /api/v1/workouts/:id               // Obter detalhes de um workout
PUT    /api/v1/workouts/:id               // Atualizar workout
DELETE /api/v1/workouts/:id               // Deletar workout
PATCH  /api/v1/workouts/:id/status        // Atualizar status do workout
POST   /api/v1/workouts/:id/complete      // Finalizar workout

// Erros de postura
GET    /api/v1/workouts/:id/errors        // Listar erros do workout
POST   /api/v1/workouts/:id/errors        // Adicionar erros (bulk)
GET    /api/v1/workouts/:id/errors/summary // Resumo de erros

// Histórico de repetições
GET    /api/v1/workouts/:id/reps          // Listar reps do workout
POST   /api/v1/workouts/:id/reps          // Adicionar reps (bulk)
GET    /api/v1/workouts/:id/reps/:repNumber // Detalhes de uma rep

// ============================================
// UPLOADS
// ============================================

POST   /api/v1/uploads/avatar             // Upload de avatar
POST   /api/v1/uploads/workout-video      // Upload de vídeo de treino
POST   /api/v1/uploads/exercise-demo      // Upload de demo de exercício (admin)
DELETE /api/v1/uploads/:id                // Deletar arquivo

// ============================================
// ANALYTICS & REPORTS
// ============================================

GET    /api/v1/analytics/dashboard        // Dashboard overview
GET    /api/v1/analytics/progress         // Gráficos de progresso
GET    /api/v1/analytics/exercises        // Analytics por exercício
GET    /api/v1/analytics/errors           // Análise de erros comuns
GET    /api/v1/analytics/streaks          // Histórico de streaks
GET    /api/v1/analytics/leaderboard      // Ranking (futuro)

// ============================================
// HEALTH & MONITORING
// ============================================

GET    /health                            // Health check
GET    /health/db                         // Database health
GET    /metrics                           // Prometheus metrics (futuro)
```

### 4.3 Implementação Fastify

#### 4.3.1 Server Setup (`apps/api/src/server.ts`)

```typescript
import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const start = async () => {
  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST
    });

    logger.info(`🚀 Server running on http://${env.HOST}:${env.PORT}`);
    logger.info(`📚 API Docs: http://${env.HOST}:${env.PORT}/docs`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, closing server...`);
    await app.close();
    process.exit(0);
  });
});

start();
```

#### 4.3.2 App Instance (`apps/api/src/app.ts`)

```typescript
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth.middleware';

// Plugins
import { supabasePlugin } from './plugins/supabase.plugin';

// Routes
import { healthRoutes } from './routes/health.routes';
import v1Routes from './routes/v1';

export const app = Fastify({
  logger: env.NODE_ENV === 'development' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  } : true,
  requestIdLogLabel: 'reqId',
  disableRequestLogging: false,
  trustProxy: true
});

// ============================================
// PLUGINS
// ============================================

// Security
app.register(fastifyHelmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  }
});

// CORS
app.register(fastifyCors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});

// Rate limiting
app.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
  cache: 10000,
  allowList: ['127.0.0.1'],
  redis: env.REDIS_URL ? env.REDIS_URL : undefined,
  skipOnError: true
});

// Multipart (file uploads)
app.register(fastifyMultipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1
  }
});

// Swagger documentation
app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Elarin API',
      description: 'AI-powered fitness trainer API',
      version: '1.0.0'
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  }
});

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  }
});

// Custom plugins
app.register(supabasePlugin);

// ============================================
// HOOKS
// ============================================

// Request logging
app.addHook('onRequest', async (request, reply) => {
  request.log.info({ url: request.url, method: request.method }, 'incoming request');
});

// Response time
app.addHook('onSend', async (request, reply) => {
  const responseTime = reply.getResponseTime();
  reply.header('X-Response-Time', `${responseTime}ms`);
});

// ============================================
// ROUTES
// ============================================

app.register(healthRoutes);
app.register(v1Routes, { prefix: '/api/v1' });

// 404 handler
app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method}:${request.url} not found`
    }
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.setErrorHandler(errorHandler);

export default app;
```

#### 4.3.3 Environment Config (`apps/api/src/config/env.ts`)

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // JWT
  JWT_SECRET: z.string().min(32),

  // CORS
  CORS_ORIGIN: z.string().transform((val) => val.split(',')),

  // Optional
  REDIS_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
```

#### 4.3.4 Supabase Plugin (`apps/api/src/plugins/supabase.plugin.ts`)

```typescript
import fp from 'fastify-plugin';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import type { Database } from '../types/supabase';

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient<Database>;
  }
  interface FastifyRequest {
    supabase: SupabaseClient<Database>;
  }
}

export const supabasePlugin = fp(async (fastify) => {
  // Service role client (admin access)
  const supabaseAdmin = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Decorate instance
  fastify.decorate('supabase', supabaseAdmin);

  // Decorate request (will be set per-request with user context)
  fastify.decorateRequest('supabase', null);

  // Hook to create user-specific client
  fastify.addHook('onRequest', async (request) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      // Create client with user's token
      request.supabase = createClient<Database>(
        env.SUPABASE_URL,
        env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );
    } else {
      // Use admin client as fallback
      request.supabase = supabaseAdmin;
    }
  });
});
```

#### 4.3.5 Auth Middleware (`apps/api/src/middleware/auth.middleware.ts`)

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../utils/errors';

export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid authorization header', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.replace('Bearer ', '');

    // Verificar token com Supabase
    const { data: { user }, error } = await request.supabase.auth.getUser(token);

    if (error || !user) {
      throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }

    // Adicionar user ao request
    (request as any).user = user;

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Authentication failed', 401, 'AUTH_FAILED');
  }
};

// Decorator para tipos
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      [key: string]: any;
    };
  }
}
```

#### 4.3.6 Example Route (`apps/api/src/routes/v1/workouts.routes.ts`)

```typescript
import { FastifyPluginAsync } from 'fastify';
import { authMiddleware } from '../../middleware/auth.middleware';
import { workoutController } from '../../controllers/workouts.controller';
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  workoutIdSchema
} from '../../schemas/workout.schema';

const workoutsRoutes: FastifyPluginAsync = async (fastify) => {
  // Aplicar auth middleware em todas as rotas
  fastify.addHook('onRequest', authMiddleware);

  // Create workout
  fastify.post('/', {
    schema: {
      body: createWorkoutSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' }
          }
        }
      }
    },
    handler: workoutController.create
  });

  // List workouts
  fastify.get('/', {
    handler: workoutController.list
  });

  // Get workout by ID
  fastify.get('/:id', {
    schema: {
      params: workoutIdSchema
    },
    handler: workoutController.getById
  });

  // Update workout
  fastify.put('/:id', {
    schema: {
      params: workoutIdSchema,
      body: updateWorkoutSchema
    },
    handler: workoutController.update
  });

  // Delete workout
  fastify.delete('/:id', {
    schema: {
      params: workoutIdSchema
    },
    handler: workoutController.delete
  });

  // Complete workout
  fastify.post('/:id/complete', {
    schema: {
      params: workoutIdSchema
    },
    handler: workoutController.complete
  });
};

export default workoutsRoutes;
```

#### 4.3.7 Controller Example (`apps/api/src/controllers/workouts.controller.ts`)

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { workoutService } from '../services/workouts.service';
import { successResponse } from '../utils/response';

export const workoutController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const body = request.body as any;

    const workout = await workoutService.createWorkout(userId, body);

    return reply.status(201).send(successResponse(workout, 'Workout created successfully'));
  },

  async list(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const { limit = 20, offset = 0 } = request.query as any;

    const workouts = await workoutService.getWorkoutHistory(userId, limit, offset);

    return reply.send(successResponse(workouts));
  },

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    const workout = await workoutService.getWorkoutById(userId, id);

    return reply.send(successResponse(workout));
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const workout = await workoutService.updateWorkout(userId, id, body);

    return reply.send(successResponse(workout, 'Workout updated successfully'));
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    await workoutService.deleteWorkout(userId, id);

    return reply.send(successResponse(null, 'Workout deleted successfully'));
  },

  async complete(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const { id } = request.params as { id: string };

    const workout = await workoutService.completeWorkout(userId, id);

    return reply.send(successResponse(workout, 'Workout completed successfully'));
  }
};
```

#### 4.3.8 Service Example (`apps/api/src/services/workouts.service.ts`)

```typescript
import { workoutRepository } from '../repositories/workouts.repository';
import { AppError } from '../utils/errors';

export const workoutService = {
  async createWorkout(userId: string, data: any) {
    // Validar exercício existe
    const exercise = await workoutRepository.getExercise(data.exercise_id);
    if (!exercise) {
      throw new AppError('Exercise not found', 404, 'EXERCISE_NOT_FOUND');
    }

    // Criar workout
    const workout = await workoutRepository.createWorkout({
      user_id: userId,
      exercise_id: data.exercise_id,
      target_reps: data.target_reps || exercise.default_reps,
      target_sets: data.target_sets || exercise.default_sets,
      status: 'ready'
    });

    return workout;
  },

  async getWorkoutHistory(userId: string, limit: number, offset: number) {
    return workoutRepository.getWorkoutHistory(userId, limit, offset);
  },

  async getWorkoutById(userId: string, workoutId: string) {
    const workout = await workoutRepository.getWorkoutById(workoutId);

    if (!workout) {
      throw new AppError('Workout not found', 404, 'WORKOUT_NOT_FOUND');
    }

    // Verificar ownership
    if (workout.user_id !== userId) {
      throw new AppError('Unauthorized', 403, 'FORBIDDEN');
    }

    return workout;
  },

  async updateWorkout(userId: string, workoutId: string, data: any) {
    // Verificar ownership
    await this.getWorkoutById(userId, workoutId);

    return workoutRepository.updateWorkout(workoutId, data);
  },

  async deleteWorkout(userId: string, workoutId: string) {
    // Verificar ownership
    await this.getWorkoutById(userId, workoutId);

    return workoutRepository.deleteWorkout(workoutId);
  },

  async completeWorkout(userId: string, workoutId: string) {
    const workout = await this.getWorkoutById(userId, workoutId);

    if (workout.status === 'completed') {
      throw new AppError('Workout already completed', 400, 'ALREADY_COMPLETED');
    }

    return workoutRepository.updateWorkout(workoutId, {
      status: 'completed',
      finished_at: new Date().toISOString()
    });
  }
};
```

---

## 5. Autenticação e Segurança

### 5.1 Fluxo de Autenticação

#### Diagrama de Fluxo Completo

```
┌──────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                          │
└──────────────────────────────────────────────────────────────────────┘

REGISTRO:
User → Next.js → Fastify API → Supabase Auth
  │       │          │              │
  │       │          │              ├─ Create auth.users
  │       │          │              ├─ Trigger: create profile
  │       │          │              ├─ Trigger: create user_stats
  │       │          │              └─ Send verification email
  │       │          │
  │       │          ├─ Return JWT token
  │       │          │
  │       ├─ Store token (localStorage/cookie)
  │       └─ Redirect to dashboard
  │

LOGIN:
User → Next.js → Fastify API → Supabase Auth
  │       │          │              │
  │       │          │              ├─ Verify credentials
  │       │          │              └─ Generate JWT token
  │       │          │
  │       │          ├─ Return { access_token, refresh_token, user }
  │       │          │
  │       ├─ Store tokens
  │       └─ Redirect to dashboard
  │

REQUISIÇÃO AUTENTICADA:
User → Next.js → Fastify API
  │       │          │
  │       │          ├─ Auth Middleware
  │       │          │   ├─ Extract Bearer token
  │       │          │   ├─ Verify with Supabase
  │       │          │   └─ Attach user to request
  │       │          │
  │       │          ├─ Execute business logic
  │       │          └─ Return response
  │       │
  │       └─ Update UI
  │

TOKEN REFRESH:
Next.js (Interceptor) → Fastify API → Supabase Auth
    │                       │              │
    │                       │              ├─ Verify refresh_token
    │                       │              └─ Issue new access_token
    │                       │
    │                       └─ Return new tokens
    │
    └─ Update stored tokens
    └─ Retry original request
```

### 5.2 Implementação de Autenticação no Fastify

#### 5.2.1 Auth Routes (`apps/api/src/routes/v1/auth.routes.ts`)

```typescript
import { FastifyPluginAsync } from 'fastify';
import { authController } from '../../controllers/auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../../schemas/auth.schema';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Rotas públicas
  fastify.post('/register', {
    schema: {
      body: registerSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                session: { type: 'object' }
              }
            }
          }
        }
      }
    },
    handler: authController.register
  });

  fastify.post('/login', {
    schema: {
      body: loginSchema
    },
    handler: authController.login
  });

  fastify.post('/refresh', {
    schema: {
      body: refreshTokenSchema
    },
    handler: authController.refreshToken
  });

  fastify.post('/forgot-password', {
    schema: {
      body: forgotPasswordSchema
    },
    handler: authController.forgotPassword
  });

  fastify.post('/reset-password', {
    schema: {
      body: resetPasswordSchema
    },
    handler: authController.resetPassword
  });

  // Rotas autenticadas
  fastify.post('/logout', {
    onRequest: authMiddleware,
    handler: authController.logout
  });

  fastify.post('/verify-email', {
    handler: authController.verifyEmail
  });

  fastify.post('/resend-verification', {
    handler: authController.resendVerification
  });
};

export default authRoutes;
```

#### 5.2.2 Auth Controller (`apps/api/src/controllers/auth.controller.ts`)

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service';
import { successResponse, errorResponse } from '../utils/response';
import { AppError } from '../utils/errors';

interface RegisterBody {
  email: string;
  password: string;
  full_name?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshTokenBody {
  refresh_token: string;
}

export const authController = {
  async register(request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) {
    try {
      const { email, password, full_name } = request.body;

      const result = await authService.register({
        email,
        password,
        full_name
      });

      return reply.status(201).send(
        successResponse(result, 'User registered successfully')
      );
    } catch (error: any) {
      throw new AppError(error.message, 400, 'REGISTRATION_FAILED');
    }
  },

  async login(request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
    try {
      const { email, password } = request.body;

      const result = await authService.login(email, password);

      return reply.send(
        successResponse(result, 'Login successful')
      );
    } catch (error: any) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
  },

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authHeader = request.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');

      if (token) {
        await authService.logout(token);
      }

      return reply.send(
        successResponse(null, 'Logout successful')
      );
    } catch (error: any) {
      throw new AppError('Logout failed', 400, 'LOGOUT_FAILED');
    }
  },

  async refreshToken(request: FastifyRequest<{ Body: RefreshTokenBody }>, reply: FastifyReply) {
    try {
      const { refresh_token } = request.body;

      const result = await authService.refreshToken(refresh_token);

      return reply.send(
        successResponse(result, 'Token refreshed successfully')
      );
    } catch (error: any) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
  },

  async forgotPassword(request: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) {
    try {
      const { email } = request.body;

      await authService.forgotPassword(email);

      return reply.send(
        successResponse(null, 'Password reset email sent')
      );
    } catch (error: any) {
      // Sempre retornar sucesso por segurança (não revelar se email existe)
      return reply.send(
        successResponse(null, 'If the email exists, a password reset link has been sent')
      );
    }
  },

  async resetPassword(request: FastifyRequest<{ Body: { token: string; password: string } }>, reply: FastifyReply) {
    try {
      const { token, password } = request.body;

      await authService.resetPassword(token, password);

      return reply.send(
        successResponse(null, 'Password reset successful')
      );
    } catch (error: any) {
      throw new AppError('Invalid or expired token', 400, 'INVALID_RESET_TOKEN');
    }
  },

  async verifyEmail(request: FastifyRequest<{ Body: { token: string } }>, reply: FastifyReply) {
    try {
      const { token } = request.body;

      await authService.verifyEmail(token);

      return reply.send(
        successResponse(null, 'Email verified successfully')
      );
    } catch (error: any) {
      throw new AppError('Invalid verification token', 400, 'INVALID_VERIFICATION_TOKEN');
    }
  },

  async resendVerification(request: FastifyRequest<{ Body: { email: string } }>, reply: FastifyReply) {
    try {
      const { email } = request.body;

      await authService.resendVerification(email);

      return reply.send(
        successResponse(null, 'Verification email sent')
      );
    } catch (error: any) {
      return reply.send(
        successResponse(null, 'If the email exists, a verification link has been sent')
      );
    }
  }
};
```

#### 5.2.3 Auth Service (`apps/api/src/services/auth.service.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

export const authService = {
  async register(data: RegisterData) {
    const { email, password, full_name } = data;

    // Validar força da senha
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
    }

    // Criar usuário no Supabase Auth
    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || null
        },
        emailRedirectTo: `${env.FRONTEND_URL}/auth/callback`
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
      }
      throw new AppError(error.message, 400, 'REGISTRATION_ERROR');
    }

    if (!authData.user) {
      throw new AppError('Failed to create user', 500, 'USER_CREATION_FAILED');
    }

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: authData.user.user_metadata.full_name
      },
      session: authData.session
    };
  },

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Atualizar last_active_at
    await supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', data.user.id);

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata.full_name
      },
      session: data.session
    };
  },

  async logout(token: string) {
    const { error } = await supabase.auth.admin.signOut(token);

    if (error) {
      throw new AppError('Logout failed', 400, 'LOGOUT_ERROR');
    }
  },

  async refreshToken(refreshToken: string) {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    return {
      session: data.session
    };
  },

  async forgotPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.FRONTEND_URL}/auth/reset-password`
    });

    if (error) {
      throw new AppError('Failed to send reset email', 400, 'RESET_EMAIL_ERROR');
    }
  },

  async resetPassword(token: string, newPassword: string) {
    if (newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw new AppError('Failed to reset password', 400, 'PASSWORD_RESET_ERROR');
    }
  },

  async verifyEmail(token: string) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    });

    if (error) {
      throw new AppError('Invalid verification token', 400, 'VERIFICATION_ERROR');
    }
  },

  async resendVerification(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    });

    if (error) {
      throw new AppError('Failed to resend verification', 400, 'RESEND_ERROR');
    }
  }
};
```

#### 5.2.4 Validation Schemas (`apps/api/src/schemas/auth.schema.ts`)

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2).max(100).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
```

### 5.3 Segurança e Boas Práticas

#### 5.3.1 Rate Limiting por Endpoint

```typescript
// apps/api/src/middleware/rate-limit.ts
import { FastifyRequest } from 'fastify';

export const rateLimitConfig = {
  // Auth endpoints (mais restritivo)
  auth: {
    max: 5,
    timeWindow: '15 minutes',
    cache: 10000,
    keyGenerator: (request: FastifyRequest) => {
      return request.ip; // Limitar por IP
    },
    errorResponseBuilder: () => {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many attempts. Please try again later.'
        }
      };
    }
  },

  // API geral
  general: {
    max: 100,
    timeWindow: '1 minute'
  },

  // Uploads (muito restritivo)
  upload: {
    max: 10,
    timeWindow: '1 hour'
  }
};

// Aplicar no app.ts
import { rateLimitConfig } from './middleware/rate-limit';

// Auth routes com rate limit especial
fastify.register(authRoutes, {
  prefix: '/api/v1/auth',
  config: {
    rateLimit: rateLimitConfig.auth
  }
});
```

#### 5.3.2 Password Hashing (handled by Supabase)

Supabase gerencia automaticamente:
- Bcrypt hashing
- Salt generation
- Password comparison

#### 5.3.3 JWT Token Security

```typescript
// apps/api/src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const jwtUtils = {
  // Verify Supabase JWT
  verifySupabaseToken(token: string) {
    try {
      const decoded = jwt.decode(token, { complete: true });
      return decoded;
    } catch (error) {
      return null;
    }
  },

  // Check if token is expired
  isTokenExpired(token: string): boolean {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) return true;

    return Date.now() >= decoded.exp * 1000;
  }
};
```

#### 5.3.4 CSRF Protection

```typescript
// apps/api/src/middleware/csrf.ts
import fastifyCsrf from '@fastify/csrf-protection';

app.register(fastifyCsrf, {
  sessionPlugin: '@fastify/session',
  cookieOpts: {
    signed: true,
    httpOnly: true,
    sameSite: 'strict',
    secure: env.NODE_ENV === 'production'
  }
});
```

#### 5.3.5 Error Handler com Segurança

```typescript
// apps/api/src/middleware/error-handler.ts
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Log do erro
  request.log.error(error);

  // AppError (erros customizados)
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
  }

  // Validation errors (Zod)
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.validation
      }
    });
  }

  // Erros genéricos (não expor detalhes em produção)
  const message = env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message;

  return reply.status(error.statusCode || 500).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message
    }
  });
};

// Custom error class
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

### 5.4 Environment Variables

```bash
# apps/api/.env.example

# Server
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT (if using custom JWT)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# CORS
CORS_ORIGIN=http://localhost:3000,https://elarin.com

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000

# Optional
REDIS_URL=redis://localhost:6379
SENTRY_DSN=https://your-sentry-dsn
```

---

## 6. Frontend (Next.js)

### 6.1 API Client Setup

#### 6.1.1 Base API Client (`apps/web/src/lib/api/client.ts`)

```typescript
import { env } from '@/config/env';

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class APIClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadTokens();
  }

  private loadTokens() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  private saveTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { params, ...fetchConfig } = config;

    // Build URL with query params
    const url = new URL(`${this.baseURL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    // Headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchConfig.headers
    };

    // Add auth token if available
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Make request
    let response = await fetch(url.toString(), {
      ...fetchConfig,
      headers
    });

    // Handle 401 (token expired) - try refresh
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();

      if (refreshed) {
        // Retry request with new token
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(url.toString(), {
          ...fetchConfig,
          headers
        });
      } else {
        // Refresh failed, clear tokens and redirect to login
        this.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Session expired');
      }
    }

    // Parse response
    const data = await response.json();

    if (!response.ok) {
      throw new APIError(
        data.error?.message || 'Request failed',
        response.status,
        data.error?.code
      );
    }

    return data.data as T;
  }

  private async refreshAccessToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: this.refreshToken
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.saveTokens(
          data.data.session.access_token,
          data.data.session.refresh_token
        );
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // Public methods
  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patch<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  // Auth helper methods
  setTokens(accessToken: string, refreshToken: string) {
    this.saveTokens(accessToken, refreshToken);
  }

  logout() {
    this.clearTokens();
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const apiClient = new APIClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
);
```

#### 6.1.2 Auth API (`apps/web/src/lib/api/auth.ts`)

```typescript
import { apiClient } from './client';

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

export const authAPI = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/register', data);

    // Save tokens
    apiClient.setTokens(
      response.session.access_token,
      response.session.refresh_token
    );

    return response;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', data);

    // Save tokens
    apiClient.setTokens(
      response.session.access_token,
      response.session.refresh_token
    );

    return response;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/v1/auth/logout');
    } finally {
      apiClient.logout();
    }
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/api/v1/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/api/v1/auth/reset-password', { token, password });
  }
};
```

### 6.2 Auth Store (Zustand)

```typescript
// apps/web/src/lib/stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, type AuthResponse } from '../api/auth';

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login({ email, password });
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error: any) {
          set({
            error: error.message,
            isLoading: false
          });
          throw error;
        }
      },

      register: async (email, password, full_name) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.register({ email, password, full_name });
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error: any) {
          set({
            error: error.message,
            isLoading: false
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authAPI.logout();
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
```

### 6.3 Login Page Example

```typescript
// apps/web/src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (error) {
      // Error is handled by store
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="text-center text-sm">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
```

### 6.4 Protected Routes Middleware

```typescript
// apps/web/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/register');

  // Redirect to login if not authenticated
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if already authenticated
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/train/:path*',
    '/history/:path*',
    '/login',
    '/register'
  ]
};
```

---

## 7. Guia de Implementação Passo a Passo

### FASE 1: Setup Inicial (Dia 1)

#### 1.1 Criar Projeto Supabase
```bash
# 1. Acesse https://supabase.com
# 2. Criar novo projeto: elarin-fitness
# 3. Região: South America (São Paulo)
# 4. Copiar credenciais:
#    - URL do projeto
#    - anon key
#    - service_role key
```

#### 1.2 Executar Schema SQL
```bash
# No Dashboard do Supabase:
# 1. Ir em SQL Editor
# 2. Colar todo o schema SQL (Seção 3.2)
# 3. Executar
# 4. Verificar que todas as tabelas foram criadas
```

### FASE 2: Setup Backend Fastify (Dia 1-2)

#### 2.1 Inicializar Projeto
```bash
mkdir -p apps/api
cd apps/api
pnpm init
pnpm add fastify @fastify/cors @fastify/helmet @fastify/rate-limit \
         @fastify/multipart @fastify/swagger @fastify/swagger-ui \
         @supabase/supabase-js zod pino pino-pretty dotenv

pnpm add -D typescript @types/node tsx nodemon
```

#### 2.2 Configurar TypeScript
```json
// apps/api/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 2.3 Criar .env
```bash
# apps/api/.env
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

#### 2.4 Implementar Código
Usar os exemplos das seções 4 e 5 para criar:
- `src/server.ts`
- `src/app.ts`
- `src/config/env.ts`
- `src/plugins/supabase.plugin.ts`
- `src/middleware/auth.middleware.ts`
- `src/routes/v1/auth.routes.ts`
- `src/controllers/auth.controller.ts`
- `src/services/auth.service.ts`

#### 2.5 Testar API
```bash
# Iniciar servidor
pnpm dev

# Testar health check
curl http://localhost:3001/health

# Testar registro
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","full_name":"Test User"}'
```

### FASE 3: Setup Frontend Next.js (Dia 2-3)

#### 3.1 Inicializar Projeto
```bash
mkdir -p apps/web
cd apps/web
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir

pnpm add zustand @tanstack/react-query
pnpm add -D @types/node
```

#### 3.2 Configurar .env
```bash
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### 3.3 Implementar Auth
Criar estrutura de pastas e arquivos da seção 6:
- `lib/api/client.ts`
- `lib/api/auth.ts`
- `lib/stores/auth-store.ts`
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `middleware.ts`

#### 3.4 Testar Integração
```bash
# Iniciar Next.js
pnpm dev

# Acessar http://localhost:3000/login
# Testar registro e login
```

### FASE 4: Implementar Workouts (Dia 3-5)

#### 4.1 Backend - Workout Routes
Criar arquivos:
- `routes/v1/workouts.routes.ts`
- `controllers/workouts.controller.ts`
- `services/workouts.service.ts`
- `repositories/workouts.repository.ts`

#### 4.2 Frontend - Workout Pages
- `app/(dashboard)/train/page.tsx`
- `app/(dashboard)/history/page.tsx`
- `lib/api/workouts.ts`
- `lib/stores/workout-store.ts`

### FASE 5: Testes e Deploy (Dia 5-7)

#### 5.1 Testes
- Testar todos os endpoints
- Validar autenticação
- Testar fluxo completo

#### 5.2 Deploy
```bash
# Backend: Deploy no Railway/Render
# Frontend: Deploy no Vercel

vercel --prod
```

---

**Documentação Completa! 🎉**

Quer que eu implemente alguma parte específica primeiro? Recomendo começar com a autenticação.