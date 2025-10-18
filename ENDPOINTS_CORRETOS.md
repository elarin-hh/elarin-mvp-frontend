# ✅ Endpoints Corretos - Backend NestJS

> Todos os endpoints do backend **NÃO** usam o prefixo `/api/v1`

## 📍 Mapeamento Completo

### 🔐 **Autenticação** (`/auth`)

| Método | Endpoint | Controller | Arquivo Frontend |
|--------|----------|-----------|------------------|
| POST | `/auth/register` | `AuthController:14` | `auth.store.ts:47` |
| POST | `/auth/login` | `AuthController:24` | `auth.store.ts:85` |
| POST | `/auth/logout` | `AuthController:34` | `auth.store.ts:122` |

**Exemplo de request:**
```bash
POST http://localhost:3001/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "123456",
  "full_name": "Usuario Teste"
}
```

---

### 🏋️ **Exercícios** (`/exercises`)

| Método | Endpoint | Controller | Arquivo Frontend |
|--------|----------|-----------|------------------|
| GET | `/exercises` | `ExercisesController:13` | `exercises.api.ts:34` |
| GET | `/exercises/:type` | `ExercisesController:20` | `exercises.api.ts:44` |

**Exemplo de request:**
```bash
GET http://localhost:3001/exercises
Authorization: Bearer {token}
```

**Usado em:**
- `/exercises` - Grid de exercícios (linha 21)

---

### 💪 **Treino** (`/training`)

| Método | Endpoint | Controller | Arquivo Frontend |
|--------|----------|-----------|------------------|
| POST | `/training/sessions` | `TrainingController:15` | `training.api.ts:65` |
| POST | `/training/sessions/complete` | `TrainingController:27` | `training.api.ts:73` |
| GET | `/training/history` | `TrainingController:39` | `training.api.ts:82` |
| GET | `/training/sessions/:id` | `TrainingController:52` | `training.api.ts:91` |

**Exemplo de request - Criar sessão:**
```bash
POST http://localhost:3001/training/sessions
Authorization: Bearer {token}
Content-Type: application/json

{
  "exercise_type": "squat",
  "target_reps": 10,
  "target_sets": 3
}
```

**Exemplo de request - Completar sessão:**
```bash
POST http://localhost:3001/training/sessions/complete
Authorization: Bearer {token}
Content-Type: application/json

{
  "session_id": "uuid-aqui",
  "reps_completed": 15,
  "sets_completed": 3,
  "duration_seconds": 180,
  "avg_confidence": 0.95
}
```

**Usado em:**
- `/train` - Tela de treino (linha 170, 239)

---

## 🔧 Arquivos Corrigidos

✅ **`auth.store.ts`** - Corrigido:
- ❌ `/api/v1/auth/register` → ✅ `/auth/register`
- ❌ `/api/v1/auth/login` → ✅ `/auth/login`
- ❌ `/api/v1/auth/logout` → ✅ `/auth/logout`

✅ **`training.api.ts`** - Já estava correto:
- ✅ `/training/sessions`
- ✅ `/training/sessions/complete`
- ✅ `/training/history`

✅ **`exercises.api.ts`** - Já estava correto:
- ✅ `/exercises`
- ✅ `/exercises/:type`

---

## 🧪 Como Testar

### 1. Iniciar Backend
```bash
cd C:\Users\notebook-guilherme\Documents\elarin-backend-api-main
npm run dev
```

### 2. Testar com Postman/Thunder Client

**Coleção Postman:**
```
C:\Users\notebook-guilherme\Documents\elarin-backend-api-main\Elarin_NestJS_API.postman_collection.json
```

**Environment:**
```json
{
  "baseUrl": "http://localhost:3001"
}
```

### 3. Testar no Frontend
```bash
cd apps/web
npm run dev
```

**Fluxo:**
1. `/register` → Registrar usuário
2. `/login` → Fazer login
3. `/exercises` → Ver exercícios
4. `/train` → Treinar

---

## 📊 Resumo

| Prefixo | Status | Observação |
|---------|--------|-----------|
| `/api/v1/` | ❌ NÃO USAR | Backend NestJS não usa este prefixo |
| `/auth` | ✅ CORRETO | Autenticação |
| `/exercises` | ✅ CORRETO | Exercícios |
| `/training` | ✅ CORRETO | Treino |

**Todos os endpoints agora estão corretos! 🎉**
