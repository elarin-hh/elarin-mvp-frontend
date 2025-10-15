# Elarin Backend - Guia Completo de Implementação

> Guia de arquitetura e implementação para o backend Fastify + Supabase do Elarin AI Fitness Trainer

**Stack:**
- 🎨 **Frontend:** SvelteKit (já implementado)
- ⚡ **Backend:** Fastify + TypeScript (a implementar)
- 🗄️ **Database & Auth:** Supabase
- 🤖 **ML:** TensorFlow.js + MediaPipe (já implementado)

---

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Estrutura de Pastas Completa](#2-estrutura-de-pastas-completa)
3. [Modelo de Dados Supabase](#3-modelo-de-dados-supabase)
4. [Backend Fastify - Setup](#4-backend-fastify-setup)
5. [Autenticação com Supabase](#5-autenticação-com-supabase)
6. [Endpoints de Treino](#6-endpoints-de-treino)
7. [Integração SvelteKit → Fastify](#7-integração-sveltekit-fastify)
8. [Integração com ML Detectors](#8-integração-com-ml-detectors)
9. [Boas Práticas e Segurança](#9-boas-práticas-e-segurança)
10. [Deploy e Produção](#10-deploy-e-produção)

---

## 1. Visão Geral da Arquitetura

### 1.1 Diagrama de Arquitetura

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (SvelteKit)                          │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │   Routes    │  │  Components  │  │  ML Detectors       │   │
│  │  (pages)    │  │              │  │  (TensorFlow.js)    │   │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘   │
│         │                │                      │               │
│         └────────────────┴──────────────────────┘               │
│                          │                                      │
│                   ┌──────▼─────────┐                           │
│                   │  API Service   │                           │
│                   │  (fetch calls) │                           │
│                   └──────┬─────────┘                           │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                   ════════╪════════ HTTPS
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   BACKEND API (Fastify)                         │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Middleware Layer                          │   │
│  │  • CORS                                                │   │
│  │  • Auth verification (JWT)                             │   │
│  │  • Rate limiting                                       │   │
│  │  • Request validation (Zod)                            │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Routes (/api/v1/)                         │   │
│  │  • /auth      → Authentication                         │   │
│  │  • /exercises → Exercise catalog                       │   │
│  │  • /train     → Training sessions                      │   │
│  │  • /user      → User profile & stats                   │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Services Layer                            │   │
│  │  • AuthService    → Supabase integration               │   │
│  │  • TrainingService → Business logic                    │   │
│  │  • MLDataService   → Process ML results               │   │
│  └────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                   ════════╪════════ PostgreSQL
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     SUPABASE                                    │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              Auth (JWT)                                │   │
│  │  • User management                                     │   │
│  │  • Email/Password auth                                 │   │
│  │  • Session management                                  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                       │   │
│  │  • profiles                                            │   │
│  │  • exercises                                           │   │
│  │  • training_sessions                                   │   │
│  │  • performance_metrics                                 │   │
│  └────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Fluxo de Dados

#### Fluxo de Treino Completo
```
1. User inicia treino → SvelteKit /train page
2. ML Detector (TF.js) detecta pose em tempo real
3. Erros detectados → acumulados no frontend
4. User finaliza treino → POST /api/v1/train/session
5. Backend salva → Supabase (session + feedback)
6. Response → atualiza UI com stats
```

---

## 2. Estrutura de Pastas Completa

```
elarin-mvp-full/
├── apps/
│   ├── web/                           # SvelteKit (já existe)
│   │   └── ... (estrutura atual)
│   │
│   └── api/                           # Fastify Backend (CRIAR)
│       ├── src/
│       │   ├── server.ts              # Entry point
│       │   ├── app.ts                 # Fastify instance
│       │   │
│       │   ├── config/
│       │   │   ├── env.ts             # Environment vars (Zod)
│       │   │   └── supabase.ts        # Supabase client config
│       │   │
│       │   ├── routes/
│       │   │   ├── v1/
│       │   │   │   ├── index.ts       # Route aggregator
│       │   │   │   ├── auth.routes.ts
│       │   │   │   ├── exercises.routes.ts
│       │   │   │   ├── train.routes.ts
│       │   │   │   └── user.routes.ts
│       │   │   └── health.routes.ts
│       │   │
│       │   ├── controllers/
│       │   │   ├── auth.controller.ts
│       │   │   ├── exercises.controller.ts
│       │   │   ├── train.controller.ts
│       │   │   └── user.controller.ts
│       │   │
│       │   ├── services/
│       │   │   ├── auth.service.ts
│       │   │   ├── training.service.ts
│       │   │   ├── ml-data.service.ts
│       │   │   └── exercises.service.ts
│       │   │
│       │   ├── repositories/
│       │   │   ├── user.repository.ts
│       │   │   ├── training.repository.ts
│       │   │   └── exercises.repository.ts
│       │   │
│       │   ├── middleware/
│       │   │   ├── auth.middleware.ts
│       │   │   ├── error-handler.ts
│       │   │   └── validation.ts
│       │   │
│       │   ├── schemas/               # Zod schemas
│       │   │   ├── auth.schema.ts
│       │   │   ├── training.schema.ts
│       │   │   ├── ml-data.schema.ts
│       │   │   └── user.schema.ts
│       │   │
│       │   ├── plugins/
│       │   │   └── supabase.plugin.ts
│       │   │
│       │   ├── utils/
│       │   │   ├── logger.ts
│       │   │   ├── errors.ts
│       │   │   └── response.ts
│       │   │
│       │   └── types/
│       │       ├── fastify.d.ts
│       │       └── supabase.ts
│       │
│       ├── tests/
│       │   ├── integration/
│       │   └── unit/
│       │
│       ├── .env.example
│       ├── .env
│       ├── tsconfig.json
│       └── package.json
│
├── supabase/                          # Supabase config (CRIAR)
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
│
└── docs/
    └── API.md
```

---

## 3. Modelo de Dados Supabase

### 3.1 Diagrama ER

```
┌─────────────────────┐
│   auth.users        │ (Gerenciado pelo Supabase Auth)
│─────────────────────│
│ id (UUID) PK        │
│ email               │
│ created_at          │
└──────────┬──────────┘
           │
           │ 1:1
           ▼
┌─────────────────────────────┐
│   public.profiles           │
│─────────────────────────────│
│ id (UUID) PK, FK            │◄─────┐
│ email TEXT                  │      │
│ full_name TEXT              │      │
│ avatar_url TEXT             │      │
│ height_cm NUMERIC           │      │ 1:N
│ weight_kg NUMERIC           │      │
│ locale TEXT (pt-BR/en-US)   │      │
│ created_at TIMESTAMPTZ      │      │
│ updated_at TIMESTAMPTZ      │      │
└─────────────────────────────┘      │
           │                          │
           │ 1:N                      │
           ▼                          │
┌─────────────────────────────┐      │
│   public.training_sessions  │      │
│─────────────────────────────│      │
│ id (UUID) PK                │      │
│ user_id (UUID) FK           │──────┘
│ exercise_type TEXT          │──────┐
│ status ENUM                 │      │
│ reps_completed INTEGER      │      │
│ sets_completed INTEGER      │      │
│ duration_seconds INTEGER    │      │
│ avg_confidence NUMERIC      │      │
│ started_at TIMESTAMPTZ      │      │
│ finished_at TIMESTAMPTZ     │      │
│ created_at TIMESTAMPTZ      │      │
└─────────────────────────────┘      │
                                      │
┌─────────────────────────────┐      │
│   public.exercises          │◄─────┘
│─────────────────────────────│
│ id SERIAL PK                │
│ type TEXT UNIQUE            │ (squat, plank, etc)
│ name_en TEXT                │
│ name_pt TEXT                │
│ description_en TEXT         │
│ description_pt TEXT         │
│ category TEXT               │ (lower_body, upper_body, core)
│ difficulty INTEGER          │ (1-5)
│ ml_model_path TEXT          │
│ is_active BOOLEAN           │
│ created_at TIMESTAMPTZ      │
└─────────────────────────────┘

```

### 3.2 Schema SQL Completo

```sql
-- ============================================
-- ELARIN FITNESS TRACKER - DATABASE SCHEMA
-- ============================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE training_status AS ENUM (
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE feedback_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- ============================================
-- TABELAS
-- ============================================

-- Profiles (1:1 com auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  height_cm NUMERIC(5,2),
  weight_kg NUMERIC(5,2),
  locale TEXT NOT NULL DEFAULT 'pt-BR' CHECK (locale IN ('pt-BR', 'en-US')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Exercises (catálogo)
CREATE TABLE public.exercises (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_pt TEXT NOT NULL,
  description_en TEXT,
  description_pt TEXT,
  category TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
  ml_model_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercises_type ON public.exercises(type);
CREATE INDEX idx_exercises_category ON public.exercises(category);

-- Training Sessions
CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL REFERENCES public.exercises(type),
  status training_status NOT NULL DEFAULT 'in_progress',
  reps_completed INTEGER NOT NULL DEFAULT 0,
  sets_completed INTEGER NOT NULL DEFAULT 1,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  avg_confidence NUMERIC(3,2) CHECK (avg_confidence >= 0 AND avg_confidence <= 1),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_training_sessions_user ON public.training_sessions(user_id);
CREATE INDEX idx_training_sessions_exercise ON public.training_sessions(exercise_type);
CREATE INDEX idx_training_sessions_started ON public.training_sessions(started_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Policies para PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policies para TRAINING_SESSIONS
CREATE POLICY "Users can view own sessions"
  ON public.training_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.training_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.training_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Exercises são públicos
CREATE POLICY "Anyone can view active exercises"
  ON public.exercises FOR SELECT
  USING (is_active = TRUE);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_exercises
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_training_sessions
  BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on new user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO public.exercises (type, name_en, name_pt, description_en, description_pt, category, difficulty, ml_model_path, is_active)
VALUES
  ('squat', 'Squat', 'Agachamento', 'Basic squat exercise', 'Exercício de agachamento', 'lower_body', 1, '/models_tfjs/squat/', TRUE),
  ('plank', 'Plank', 'Prancha', 'Core stability exercise', 'Exercício de estabilidade core', 'core', 2, NULL, FALSE),
  ('push_up', 'Push-up', 'Flexão', 'Upper body push exercise', 'Exercício de empurrar', 'upper_body', 2, NULL, FALSE)
ON CONFLICT (type) DO NOTHING;
```

---

## 4. Backend Fastify - Setup

### 4.1 package.json

```json
{
  "name": "@elarin/api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "fastify": "^4.28.1",
    "@fastify/cors": "^9.0.1",
    "@fastify/helmet": "^11.1.1",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/swagger": "^8.15.0",
    "@fastify/swagger-ui": "^4.1.0",
    "@supabase/supabase-js": "^2.45.4",
    "zod": "^3.23.8",
    "pino": "^9.4.0",
    "pino-pretty": "^11.2.2",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/node": "^22.7.5",
    "typescript": "^5.6.3",
    "tsx": "^4.19.1"
  }
}
```

### 4.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4.3 .env.example

```bash
# Server
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# CORS
CORS_ORIGIN=http://localhost:5173

# Optional
LOG_LEVEL=info
```

### 4.4 src/config/env.ts

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.string().default('info')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

### 4.5 src/server.ts

```typescript
import { app } from './app.js';
import { env } from './config/env.js';

const start = async () => {
  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST
    });

    app.log.info(`🚀 Server running at http://${env.HOST}:${env.PORT}`);
    app.log.info(`📚 API Docs: http://${env.HOST}:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, closing server...`);
    await app.close();
    process.exit(0);
  });
});

start();
```

### 4.6 src/app.ts

```typescript
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { supabasePlugin } from './plugins/supabase.plugin.js';

// Routes
import { healthRoutes } from './routes/health.routes.js';
import v1Routes from './routes/v1/index.js';

export const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport: env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  }
});

// ============================================
// PLUGINS
// ============================================

// Security
app.register(fastifyHelmet);

// CORS
app.register(fastifyCors, {
  origin: env.CORS_ORIGIN,
  credentials: true
});

// Rate limiting
app.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// Swagger
app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Elarin API',
      description: 'AI-powered fitness trainer API',
      version: '1.0.0'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  }
});

app.register(fastifySwaggerUi, {
  routePrefix: '/docs'
});

// Custom plugins
app.register(supabasePlugin);

// ============================================
// ROUTES
// ============================================

app.register(healthRoutes);
app.register(v1Routes, { prefix: '/api/v1' });

// 404
app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.setErrorHandler(errorHandler);

export default app;
```

### 4.7 src/plugins/supabase.plugin.ts

```typescript
import fp from 'fastify-plugin';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient;
  }
  interface FastifyRequest {
    supabase: SupabaseClient;
  }
}

export const supabasePlugin = fp(async (fastify) => {
  // Admin client
  const supabaseAdmin = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  fastify.decorate('supabase', supabaseAdmin);
  fastify.decorateRequest('supabase', null);

  // Per-request client with user context
  fastify.addHook('onRequest', async (request) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      request.supabase = createClient(
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
      request.supabase = supabaseAdmin;
    }
  });
});
```

### 4.8 src/middleware/error-handler.ts

```typescript
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  request.log.error(error);

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
  }

  // Validation errors
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

  // Generic errors
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
```

### 4.9 src/utils/response.ts

```typescript
export const successResponse = <T>(data: T, message?: string) => ({
  success: true,
  data,
  ...(message && { message })
});

export const errorResponse = (message: string, code: string) => ({
  success: false,
  error: {
    code,
    message
  }
});
```

---

## 5. Autenticação com Supabase

### 5.1 src/schemas/auth.schema.ts

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

### 5.2 src/services/auth.service.ts

```typescript
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error-handler.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema.js';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export const authService = {
  async register(data: RegisterInput) {
    const { email, password, full_name } = data;

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name }
      }
    });

    if (error) {
      throw new AppError(error.message, 400, 'REGISTRATION_FAILED');
    }

    return {
      user: authData.user,
      session: authData.session
    };
  },

  async login(data: LoginInput) {
    const { email, password } = data;

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !authData.user) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    return {
      user: authData.user,
      session: authData.session
    };
  },

  async logout(token: string) {
    const { error } = await supabase.auth.admin.signOut(token);
    if (error) {
      throw new AppError('Logout failed', 400, 'LOGOUT_ERROR');
    }
  },

  async verifyToken(token: string) {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
    }

    return user;
  }
};
```

### 5.3 src/controllers/auth.controller.ts

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service.js';
import { successResponse } from '../utils/response.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema.js';

export const authController = {
  async register(
    request: FastifyRequest<{ Body: RegisterInput }>,
    reply: FastifyReply
  ) {
    const result = await authService.register(request.body);
    return reply.status(201).send(successResponse(result, 'User registered'));
  },

  async login(
    request: FastifyRequest<{ Body: LoginInput }>,
    reply: FastifyReply
  ) {
    const result = await authService.login(request.body);
    return reply.send(successResponse(result, 'Login successful'));
  },

  async logout(request: FastifyRequest, reply: FastifyReply) {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await authService.logout(token);
    }
    return reply.send(successResponse(null, 'Logout successful'));
  }
};
```

### 5.4 src/middleware/auth.middleware.ts

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from './error-handler.js';

export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Missing authorization header', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error } = await request.supabase.auth.getUser(token);

  if (error || !user) {
    throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
  }

  // Attach user to request
  (request as any).user = user;
};

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

### 5.5 src/routes/v1/auth.routes.ts

```typescript
import { FastifyPluginAsync } from 'fastify';
import { authController } from '../../controllers/auth.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { registerSchema, loginSchema } from '../../schemas/auth.schema.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/register', {
    schema: {
      body: registerSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' }
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

  fastify.post('/logout', {
    onRequest: authMiddleware,
    handler: authController.logout
  });
};

export default authRoutes;
```

---

## 6. Endpoints de Treino

### 6.1 src/schemas/training.schema.ts

```typescript
import { z } from 'zod';

export const createSessionSchema = z.object({
  exercise_type: z.string(),
  target_reps: z.number().int().positive().optional(),
  target_sets: z.number().int().positive().optional()
});

export const completeSessionSchema = z.object({
  session_id: z.string().uuid(),
  reps_completed: z.number().int().min(0),
  sets_completed: z.number().int().min(1),
  duration_seconds: z.number().int().min(0),
  avg_confidence: z.number().min(0).max(1).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;
```

### 6.2 src/services/training.service.ts

```typescript
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error-handler.js';
import type { CreateSessionInput, CompleteSessionInput } from '../schemas/training.schema.js';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export const trainingService = {
  async createSession(userId: string, data: CreateSessionInput) {
    // Verificar se exercício existe
    const { data: exercise, error: exerciseError } = await supabase
      .from('exercises')
      .select('*')
      .eq('type', data.exercise_type)
      .single();

    if (exerciseError || !exercise) {
      throw new AppError('Exercise not found', 404, 'EXERCISE_NOT_FOUND');
    }

    // Criar sessão
    const { data: session, error } = await supabase
      .from('training_sessions')
      .insert({
        user_id: userId,
        exercise_type: data.exercise_type,
        status: 'in_progress'
      })
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to create session', 500, 'SESSION_CREATE_ERROR');
    }

    return session;
  },

  async completeSession(userId: string, data: CompleteSessionInput) {
    const { session_id, ...sessionData } = data;

    // Verificar ownership
    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    // Atualizar sessão
    const { error: updateError } = await supabase
      .from('training_sessions')
      .update({
        ...sessionData,
        status: 'completed',
        finished_at: new Date().toISOString()
      })
      .eq('id', session_id);

    if (updateError) {
      throw new AppError('Failed to update session', 500, 'SESSION_UPDATE_ERROR');
    }

    return { session_id };
  },

  async getHistory(userId: string, limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('training_sessions')
      .select(`
        *,
        exercises:exercise_type (name_pt, name_en, category)
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('finished_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new AppError('Failed to fetch history', 500, 'HISTORY_FETCH_ERROR');
    }

    return data;
  },

  async getSessionDetails(userId: string, sessionId: string) {
    const { data, error } = await supabase
      .from('training_sessions')
      .select(`
        *,
        exercises:exercise_type (*)
      `)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }

    return data;
  }
};
```

### 6.3 src/controllers/train.controller.ts

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { trainingService } from '../services/training.service.js';
import { successResponse } from '../utils/response.js';
import type { CreateSessionInput, CompleteSessionInput } from '../schemas/training.schema.js';

export const trainController = {
  async createSession(
    request: FastifyRequest<{ Body: CreateSessionInput }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.id;
    const session = await trainingService.createSession(userId, request.body);
    return reply.status(201).send(successResponse(session));
  },

  async completeSession(
    request: FastifyRequest<{ Body: CompleteSessionInput }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.id;
    const result = await trainingService.completeSession(userId, request.body);
    return reply.send(successResponse(result, 'Session completed'));
  },

  async getHistory(
    request: FastifyRequest<{ Querystring: { limit?: number; offset?: number } }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.id;
    const { limit, offset } = request.query;
    const history = await trainingService.getHistory(userId, limit, offset);
    return reply.send(successResponse(history));
  },

  async getSessionDetails(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const userId = request.user!.id;
    const session = await trainingService.getSessionDetails(userId, request.params.id);
    return reply.send(successResponse(session));
  }
};
```

### 6.4 src/routes/v1/train.routes.ts

```typescript
import { FastifyPluginAsync } from 'fastify';
import { trainController } from '../../controllers/train.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { createSessionSchema, completeSessionSchema } from '../../schemas/training.schema.js';

const trainRoutes: FastifyPluginAsync = async (fastify) => {
  // Todas as rotas requerem autenticação
  fastify.addHook('onRequest', authMiddleware);

  // POST /api/v1/train/session - Criar nova sessão
  fastify.post('/session', {
    schema: { body: createSessionSchema },
    handler: trainController.createSession
  });

  // POST /api/v1/train/complete - Completar sessão
  fastify.post('/complete', {
    schema: { body: completeSessionSchema },
    handler: trainController.completeSession
  });

  // GET /api/v1/train/history - Histórico de treinos
  fastify.get('/history', {
    handler: trainController.getHistory
  });

  // GET /api/v1/train/session/:id - Detalhes de uma sessão
  fastify.get('/session/:id', {
    handler: trainController.getSessionDetails
  });
};

export default trainRoutes;
```

### 6.5 src/routes/v1/index.ts

```typescript
import { FastifyPluginAsync } from 'fastify';
import authRoutes from './auth.routes.js';
import trainRoutes from './train.routes.js';
import exercisesRoutes from './exercises.routes.js';
import userRoutes from './user.routes.js';

const v1Routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(authRoutes, { prefix: '/auth' });
  fastify.register(trainRoutes, { prefix: '/train' });
  fastify.register(exercisesRoutes, { prefix: '/exercises' });
  fastify.register(userRoutes, { prefix: '/user' });
};

export default v1Routes;
```

---

## 7. Integração SvelteKit → Fastify

### 7.1 Substituir Mock do Supabase

**Arquivo:** `apps/web/src/lib/services/api.client.ts` (CRIAR NOVO)

```typescript
// API Client para comunicação com Fastify backend

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number>;
}

class APIClient {
  private accessToken: string | null = null;

  constructor(private baseURL: string) {
    // Carregar token do localStorage
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
    }
  }

  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { params, ...fetchConfig } = config;

    // Build URL
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

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Request
    const response = await fetch(url.toString(), {
      ...fetchConfig,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIError(data.error?.message || 'Request failed', response.status);
    }

    return data.data;
  }

  // Auth methods
  async register(email: string, password: string, full_name?: string) {
    const response = await this.request<any>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name })
    });

    // Salvar token
    if (response.session?.access_token) {
      this.setToken(response.session.access_token);
    }

    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request<any>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.session?.access_token) {
      this.setToken(response.session.access_token);
    }

    return response;
  }

  async logout() {
    await this.request('/api/v1/auth/logout', { method: 'POST' });
    this.clearToken();
  }

  // Training methods
  async createSession(exercise_type: string) {
    return this.request<any>('/api/v1/train/session', {
      method: 'POST',
      body: JSON.stringify({ exercise_type })
    });
  }

  async completeSession(data: {
    session_id: string;
    reps_completed: number;
    sets_completed: number;
    duration_seconds: number;
    avg_confidence?: number;
  }) {
    return this.request<any>('/api/v1/train/complete', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getHistory(limit = 20, offset = 0) {
    return this.request<any>('/api/v1/train/history', {
      params: { limit, offset }
    });
  }

  // Exercises
  async getExercises() {
    return this.request<any>('/api/v1/exercises');
  }

  // Token management
  setToken(token: string) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  clearToken() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
  }

  isAuthenticated() {
    return !!this.accessToken;
  }
}

class APIError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'APIError';
  }
}

export const apiClient = new APIClient(API_URL);
```

### 7.2 Atualizar supabase.client.ts

**Arquivo:** `apps/web/src/lib/services/supabase.client.ts`

```typescript
// SUBSTITUIR O MOCK ANTIGO

import { apiClient } from './api.client';

// Manter compatibilidade com código existente
export const authService = {
  async signIn(email: string, password: string) {
    return apiClient.login(email, password);
  },

  async signUp(email: string, password: string, full_name?: string) {
    return apiClient.register(email, password, full_name);
  },

  async signOut() {
    return apiClient.logout();
  },

  async getSession() {
    // Verificar se tem token
    return {
      data: {
        session: apiClient.isAuthenticated() ? { access_token: 'exists' } : null
      },
      error: null
    };
  }
};
```

### 7.3 Exemplo de Integração na Página de Treino

**Arquivo:** `apps/web/src/routes/train/+page.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { apiClient } from '$lib/services/api.client';

  let currentSession: any = null;
  let repsCompleted = 0;
  let startTime: number;

  async function startTraining() {
    // Criar sessão no backend
    currentSession = await apiClient.createSession('squat');
    startTime = Date.now();

    // Iniciar ML detector...
  }

  // Quando completa uma rep
  function onRepComplete() {
    repsCompleted++;
  }

  // Finalizar treino
  async function finishTraining() {
    const duration = Math.floor((Date.now() - startTime) / 1000);

    await apiClient.completeSession({
      session_id: currentSession.id,
      reps_completed: repsCompleted,
      sets_completed: 1,
      duration_seconds: duration
    });

    // Redirecionar para histórico...
  }
</script>

<!-- UI components -->
```

### 7.4 Configurar variáveis de ambiente

**Arquivo:** `apps/web/.env` (ATUALIZAR)

```bash
# Adicionar URL do backend
VITE_API_URL=http://localhost:3001

# Remover ou comentar variáveis antigas do Supabase se não forem mais necessárias
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

---

## 8. Integração com ML Detectors

### 8.1 Fluxo de Dados ML → Backend

```
┌─────────────────────────────────────────────────────────────┐
│  1. User inicia treino                                      │
│     → POST /api/v1/train/session                            │
│     → Recebe session_id                                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ML Detector (TF.js) roda no frontend                    │
│     → Detecta pose frame-by-frame                           │
│     → Identifica erros (ângulo joelho, costas, etc)         │
│     → Acumula feedback em array local                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  3. User finaliza treino                                    │
│     → POST /api/v1/train/complete                           │
│     → Envia:                                                │
│       - session_id                                          │
│       - reps_completed                                      │
│       - duration_seconds                                    │
│       - ml_feedback[] (todos os erros detectados)           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Backend salva no Supabase                               │
│     → UPDATE training_sessions (status='completed')         │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Formato de Dados do ML Detector

**Exemplo de payload enviado ao backend:**

```typescript
{
  session_id: "uuid-here",
  reps_completed: 15,
  sets_completed: 1,
  duration_seconds: 180,
  avg_confidence: 0.92,
}
```

### 8.3 Adaptar ML Detectors Existentes

**Arquivo:** `apps/web/static/js/SquatDetectorML.js` (MODIFICAR)

```javascript
// Adicionar método para coletar feedback
class SquatDetectorML {
  constructor() {
    this.feedbackBuffer = [];
    this.currentRep = 0;
    // ... resto do código existente
  }

  // Quando detecta erro
  detectError(errorType, severity, confidence, message) {
    this.feedbackBuffer.push({
      rep_number: this.currentRep,
      feedback_type: errorType,
      severity: severity,
      confidence: confidence,
      corrected: false,
      message: message
    });
  }

  // Obter todos os feedbacks coletados
  getFeedback() {
    return this.feedbackBuffer;
  }

  // Resetar para nova sessão
  reset() {
    this.feedbackBuffer = [];
    this.currentRep = 0;
  }
}
```

---

## 9. Boas Práticas e Segurança

### 9.1 Validação de Dados

✅ **Sempre usar Zod** para validar entrada de dados:

```typescript
// Exemplo: validar antes de processar
import { createSessionSchema } from '../schemas/training.schema';

const result = createSessionSchema.safeParse(request.body);
if (!result.success) {
  throw new AppError('Invalid input', 400, 'VALIDATION_ERROR');
}
```

### 9.2 Rate Limiting por Endpoint

```typescript
// Configurar limites específicos
fastify.register(authRoutes, {
  prefix: '/auth',
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '15 minutes' // Mais restritivo para auth
    }
  }
});

fastify.register(trainRoutes, {
  prefix: '/train',
  config: {
    rateLimit: {
      max: 50,
      timeWindow: '1 minute'
    }
  }
});
```

### 9.3 Logs Estruturados

```typescript
// Use o logger do Fastify
fastify.log.info({ userId, sessionId }, 'Training session started');
fastify.log.error({ error, userId }, 'Failed to complete session');
```

### 9.4 Sanitização de Erros

```typescript
// Nunca expor stack traces ou dados sensíveis em produção
if (env.NODE_ENV === 'production') {
  return reply.status(500).send({
    success: false,
    error: 'Internal server error'
  });
}
```

### 9.5 HTTPS em Produção

```typescript
// Força HTTPS em produção
if (env.NODE_ENV === 'production') {
  fastify.addHook('onRequest', (request, reply, done) => {
    if (!request.headers['x-forwarded-proto']?.includes('https')) {
      return reply.redirect(`https://${request.hostname}${request.url}`);
    }
    done();
  });
}
```

### 9.6 Secrets Management

```bash
# NUNCA commitar .env
# Usar variáveis de ambiente em produção (Railway, Render, etc)

# .gitignore
.env
.env.local
.env.*.local
```

---

## 10. Deploy e Produção

### 10.1 Checklist Pré-Deploy

- [ ] Executar schema SQL no Supabase de produção
- [ ] Configurar variáveis de ambiente no serviço de hosting
- [ ] Testar autenticação end-to-end
- [ ] Configurar CORS para domínio de produção
- [ ] Ativar HTTPS
- [ ] Configurar logs (ex: Sentry)
- [ ] Testar rate limiting
- [ ] Backup do banco de dados

### 10.2 Deploy Backend (Railway/Render)

**Railway:**

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Criar projeto
railway init

# Adicionar variáveis de ambiente no dashboard

# Deploy
railway up
```

**Render:**

1. Conectar repositório GitHub
2. Criar Web Service
3. Build Command: `cd apps/api && npm install && npm run build`
4. Start Command: `cd apps/api && npm start`
5. Adicionar variáveis de ambiente

### 10.3 Deploy Frontend (Vercel/Netlify)

**Vercel:**

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
cd apps/web
vercel --prod

# Configurar variáveis:
# VITE_API_URL=https://seu-backend.railway.app
```

### 10.4 Configuração Supabase Produção

1. Criar projeto de produção no Supabase
2. Executar migrations do arquivo `supabase/migrations/001_initial_schema.sql`
3. Configurar Auth providers (se usar OAuth)
4. Copiar credenciais de produção
5. Atualizar variáveis de ambiente no backend

### 10.5 Monitoramento

**Logs:**
```typescript
// Integrar Sentry
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

**Health Checks:**
```typescript
// src/routes/health.routes.ts
export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    // Verificar conexão com DB
    const { error } = await fastify.supabase
      .from('exercises')
      .select('count')
      .limit(1);

    return {
      status: 'ok',
      database: error ? 'error' : 'connected',
      timestamp: new Date().toISOString()
    };
  });
};
```

---

## Resumo de Próximos Passos

### 1. Setup Supabase
```bash
1. Criar projeto no Supabase
2. Copiar schema SQL (seção 3.2)
3. Executar no SQL Editor
4. Copiar credenciais (URL, anon key, service role key)
```

### 2. Criar Backend
```bash
cd apps/api
npm init -y
npm install <dependências da seção 4.1>

# Criar arquivos seguindo estrutura da seção 2
# Copiar código das seções 4, 5 e 6
```

### 3. Atualizar Frontend
```bash
cd apps/web

# Criar api.client.ts (seção 7.1)
# Atualizar supabase.client.ts (seção 7.2)
# Atualizar .env com VITE_API_URL
```

### 4. Testar Localmente
```bash
# Terminal 1 - Backend
cd apps/api
npm run dev

# Terminal 2 - Frontend
cd apps/web
npm run dev

# Testar:
# - Registro de usuário
# - Login
# - Criar sessão de treino
# - Completar treino com ML feedback
```

### 5. Deploy
```bash
# Backend → Railway/Render
# Frontend → Vercel/Netlify
# Configurar variáveis de ambiente
```

---

**Documentação Completa! 🎉**

Este guia contém tudo que você precisa para implementar o backend do Elarin. Todos os exemplos de código estão prontos para uso. Basta seguir a ordem das seções e adaptar conforme necessário.

**Dúvidas?** Consulte a seção específica ou abra uma issue no repositório.
