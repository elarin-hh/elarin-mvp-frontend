# 🔌 Integração Backend NestJS - Documentação Completa

> Integração do frontend SvelteKit com o backend NestJS + Fastify

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Endpoints Integrados](#endpoints-integrados)
3. [Arquivos Modificados](#arquivos-modificados)
4. [Como Testar](#como-testar)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O frontend agora está **100% integrado** com o backend NestJS localizado em:
```
C:\Users\notebook-guilherme\Documents\elarin-backend-api-main
```

**Stack:**
- **Backend:** NestJS + Fastify (porta 3001)
- **Frontend:** SvelteKit (porta 5173)
- **Database:** Supabase PostgreSQL
- **Auth:** JWT via Supabase Auth

---

## 🔗 Endpoints Integrados

### 1️⃣ **Autenticação** (`/auth`)

| Método | Endpoint | Função | Arquivo Frontend |
|--------|----------|--------|------------------|
| POST | `/auth/register` | Registrar usuário | `auth.store.ts:46` |
| POST | `/auth/login` | Login | `auth.store.ts:84` |
| POST | `/auth/logout` | Logout | `auth.store.ts:122` |

**Páginas que usam:**
- `/login` - Tela de login
- `/register` - Tela de registro

---

### 2️⃣ **Exercícios** (`/exercises`)

| Método | Endpoint | Função | Arquivo Frontend |
|--------|----------|--------|------------------|
| GET | `/exercises` | Listar exercícios | `exercises.api.ts:34` |
| GET | `/exercises/:type` | Buscar por tipo | `exercises.api.ts:43` |

**Páginas que usam:**
- `/exercises` - Grid de exercícios (carrega do backend dinamicamente)

**Recursos:**
- ✅ Carregamento dinâmico de exercícios
- ✅ Loading state
- ✅ Error handling
- ✅ Badge "Em breve" para exercícios sem ML
- ✅ Apenas exercícios com `ml_model_path` são clicáveis

---

### 3️⃣ **Treino** (`/training`)

| Método | Endpoint | Função | Arquivo Frontend |
|--------|----------|--------|------------------|
| POST | `/training/sessions` | Criar sessão | `training.api.ts:64` |
| POST | `/training/sessions/complete` | Finalizar sessão | `training.api.ts:72` |
| GET | `/training/history` | Histórico | `training.api.ts:80` |
| GET | `/training/sessions/:id` | Detalhes | `training.api.ts:90` |

**Páginas que usam:**
- `/train` - Tela de treino com câmera e ML

**Fluxo de Treino:**
```
1. Usuário clica em exercício → /exercises
2. Redireciona para /train
3. Clica "Iniciar Treino"
   → POST /training/sessions (cria sessão no backend)
   → Retorna session_id
4. ML detector roda localmente
   → Conta reps em tempo real
   → Acumula erros
5. Clica "Finalizar Treino"
   → POST /training/sessions/complete
   → Envia reps, sets, duration, avg_confidence
   → Backend salva no Supabase
```

---

## 📂 Arquivos Modificados

### ✅ **Novos Arquivos Criados**

1. **`apps/web/src/lib/api/exercises.api.ts`** ⭐ NOVO
   - Cliente dedicado para endpoints de exercícios
   - Métodos: `getAll()`, `getByType()`

### ✅ **Arquivos Modificados**

1. **`apps/web/src/lib/api/rest.client.ts`**
   - ✅ URL base configurada: `http://localhost:3001`
   - ✅ Comentários atualizados

2. **`apps/web/src/lib/api/training.api.ts`**
   - ✅ Endpoints atualizados:
     - `/api/v1/train/session` → `/training/sessions`
     - `/api/v1/train/complete` → `/training/sessions/complete`
     - `/api/v1/train/history` → `/training/history`
   - ✅ Métodos de exercícios marcados como `@deprecated`

3. **`apps/web/src/lib/stores/integrated-train.store.ts`**
   - ✅ Comentários atualizados para referenciar NestJS

4. **`apps/web/src/routes/exercises/+page.svelte`** ⭐ MAJOR UPDATE
   - ✅ **Carregamento dinâmico** de exercícios do backend
   - ✅ Loading state com spinner
   - ✅ Error handling com retry
   - ✅ Badge "Em breve" para exercícios sem ML
   - ✅ Apenas exercícios com `ml_model_path` são clicáveis
   - ✅ Redireciona para `/train` (squat/push_up) ou `/train/intro` (outros)

5. **`apps/web/.env`**
   - ✅ Comentários explicativos sobre integração NestJS
   - ✅ URL do backend documentada

6. **`apps/web/.env.example`**
   - ✅ Template atualizado com endpoints documentados

---

## 🧪 Como Testar

### 1️⃣ **Iniciar Backend**

```bash
cd C:\Users\notebook-guilherme\Documents\elarin-backend-api-main
npm run dev
```

✅ Deve abrir em: `http://localhost:3001`
✅ Swagger docs: `http://localhost:3001/docs`

---

### 2️⃣ **Iniciar Frontend**

```bash
cd C:\Users\notebook-guilherme\Documents\elarin-mvp-full\apps\web
npm run dev
```

✅ Deve abrir em: `http://localhost:5173`

---

### 3️⃣ **Fluxo de Teste Completo**

#### **A. Autenticação**

1. Abra `http://localhost:5173/register`
2. Registre novo usuário
3. Verifique console do navegador:
   ```
   ✅ Token saved
   ```
4. Faça logout
5. Abra `http://localhost:5173/login`
6. Faça login com mesmo usuário
7. Verifique console:
   ```
   ✅ Login successful
   ```

#### **B. Exercícios**

1. Abra `http://localhost:5173/exercises`
2. Verifique loading spinner
3. Após carregar, deve mostrar exercícios:
   - ✅ **Squat** (clicável, tem ML)
   - ✅ **Push_up** (clicável, tem ML)
   - 🔒 **Plank** (desabilitado, badge "Em breve")
4. Verifique console:
   ```
   ✅ Exercises loaded from backend: 3
   ```

#### **C. Treino Completo**

1. Na página `/exercises`, clique em **Squat**
2. Será redirecionado para `/train`
3. Clique "Iniciar Treino"
4. Verifique console:
   ```
   ✅ Sessão criada no backend: <uuid>
   📡 Sessão Backend: <session_id>
   ```
5. Permita câmera
6. Faça alguns agachamentos (ML detecta reps)
7. Clique "Finalizar Treino"
8. Verifique console:
   ```
   ✅ Treino finalizado e enviado ao backend!
   ```

#### **D. Network Requests (DevTools)**

Abra DevTools → Network → Filtro: `localhost:3001`

**Requests esperados:**

1. `POST /auth/login` → Status 200
2. `GET /exercises` → Status 200
3. `POST /training/sessions` → Status 201
4. `POST /training/sessions/complete` → Status 200

---

## 🔧 Troubleshooting

### ❌ **Erro: "Failed to fetch"**

**Causa:** Backend não está rodando

**Solução:**
```bash
cd C:\Users\notebook-guilherme\Documents\elarin-backend-api-main
npm run dev
```

---

### ❌ **Erro: "Unauthorized" (401)**

**Causa:** Token inválido ou expirado

**Solução:**
1. Faça logout
2. Faça login novamente
3. Token será renovado

---

### ❌ **Erro: "Exercise not found" (404)**

**Causa:** Exercício não existe no banco Supabase

**Solução:**
1. Abra Supabase: `https://pyhfqaamznfuogxkvzeb.supabase.co`
2. Vá para SQL Editor
3. Execute seed:
```sql
INSERT INTO public.exercises (type, name_en, name_pt, category, difficulty, ml_model_path, is_active)
VALUES
  ('squat', 'Squat', 'Agachamento', 'lower_body', 1, '/models_tfjs/squat/', TRUE),
  ('push_up', 'Push-up', 'Flexão', 'upper_body', 2, '/models_tfjs/push_up/', TRUE),
  ('plank', 'Plank', 'Prancha', 'core', 2, NULL, TRUE)
ON CONFLICT (type) DO NOTHING;
```

---

### ❌ **Página /exercises não carrega exercícios**

**Debug:**
1. Abra DevTools → Console
2. Verifique erros
3. Abra Network → Filtro `exercises`
4. Verifique status do request `GET /exercises`

**Possíveis causas:**
- Backend offline → Status: `Failed to fetch`
- Sem token → Status: `401 Unauthorized`
- Erro no backend → Status: `500 Internal Server Error`

---

### ❌ **ML Detector não inicia**

**Causa:** Scripts externos não carregados

**Solução:**
1. Verifique console:
   ```
   ✅ Todas as dependências carregadas com sucesso!
   ```
2. Se não aparecer, recarregue a página

---

## 📊 Resumo de Integração

| Tela | Endpoints Usados | Status |
|------|------------------|--------|
| `/login` | `POST /auth/login` | ✅ Integrado |
| `/register` | `POST /auth/register` | ✅ Integrado |
| `/exercises` | `GET /exercises` | ✅ Integrado |
| `/train` | `POST /training/sessions`<br>`POST /training/sessions/complete` | ✅ Integrado |

---

## 🎉 Conclusão

✅ **100% dos endpoints do backend estão integrados**
✅ **Todas as telas mantiveram suas funcionalidades**
✅ **Carregamento dinâmico de exercícios**
✅ **Error handling em todas as requests**
✅ **Loading states implementados**

**Próximos passos:**
1. Implementar página de histórico (`GET /training/history`)
2. Adicionar mais exercícios com ML
3. Implementar página de perfil
4. Deploy em produção

---

**Documentação atualizada em:** 16 de Outubro de 2025
**Por:** Claude Code Assistant
