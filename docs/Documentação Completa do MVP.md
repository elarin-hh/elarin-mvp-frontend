---
title: Documentação Completa do MVP

---

# Elarin — Documentação Completa do MVP

> Versão 1.0 • Data: 29/09/2025 • Responsável: [preencher]

---

## 1) Visão & Objetivo do MVP

**Visão:** treinos guiados por IA com feedback em tempo real usando visão computacional, acessíveis em qualquer dispositivo com navegador, inclusive como **PWA**.

**Objetivo (2 meses):** entregar um **web app** com **login** (Supabase Auth), **2–3 exercícios** com **feedback visual/sonoro** em tempo real, **histórico básico** e experiência fluida (**alvo 60 FPS**). Beta fechado antes do público.

### Problema

* Usuários iniciantes erram execução de exercícios sem acompanhamento.
* Feedback instantâneo reduz erros, aumenta segurança e engajamento.

### Hipóteses do MVP

* H1: Feedback **visual (overlay + cores)** é compreendido rapidamente.
* H2: **Latência ≤16,7 ms/frame** mantém sensação de tempo real.
* H3: Fluxo **Login → Dashboard → Treinar** é claro e sem fricção.

---

## 2) Escopo do MVP

**Inclui:**

* Login e sessão (Supabase Auth) e proteção de rotas.
* Tela única de **Dashboard** (home) com **botão Treinar**.
* **Seleção de exercício** (modal/sheet) → **Permissão de câmera** → **Treino** (overlay e feedback) → **Resumo**.
* **Exercícios**: Agachamento (squat), Afundo (lunge), Prancha (plank).
* **Histórico básico** (última sessão, reps válidas, duração da prancha).
* **PWA** (instalável) e **i18n** (pt-BR e en-US).

**Fora de escopo (MVP):** planos personalizados, comunidade/social, pagamento, mobile nativo, wearables.

**Critério de pronto:** fluxo fim-a-fim funcional com métricas persistidas (sessions/metrics/events) e experiência estável (≥60 FPS nos dispositivos alvo, com degradação adaptativa quando preciso).

---

## 3) Requisitos Funcionais

1. **Autenticação**: criar conta e login (e‑mail/senha), logout, recuperação de senha.
2. **Permissão de câmera**: solicitar e manter stream (preferir 60 fps), com teste automático de FPS (3 s).
3. **Detecção de pose**: estimativa da postura em tempo real no navegador.
4. **Feedback**: overlay esqueleto, cores (verde/ok, vermelho/ajuste), bip ao completar repetição.
5. **Regras por exercício**:

   * **Agachamento:** 1 rep ao passar por **joelho ≤80°** e retornar a **≥160°**.
   * **Afundo:** 1 rep por perna com **joelho dianteiro ≤90°** e tronco ~vertical.
   * **Prancha:** cronômetro soma quando **ombro‑quadril‑tornozelo** alinhados (quadril 170–190°).
6. **Histórico**: persistir reps, duração da prancha, FPS médio, data/hora.
7. **Internacionalização (i18n)**: pt‑BR padrão e en‑US; seletor de idioma; formatação por `Intl`.

---

## 4) Requisitos Não‑Funcionais

* **Taxa de quadros (UX):** manter UI a **60 FPS**.
* **Budget por frame:** **≤16,7 ms** (inferência + pós-processo + desenho). Se exceder: reduzir resolução e/ou pular frames (manter desenho a 60 Hz).
* **Privacidade:** **processamento local**; sem envio/persistência de frames.
* **Confiabilidade:** lidar com perda de permissão, troca de aba, variação de FPS; watchdog para reinicializar pipeline.
* **Compatibilidade progressiva:** preferir **WebCodecs/VideoFrame**, **OffscreenCanvas**, **WASM SIMD/threads** (com **COOP/COEP** no deploy); fallbacks consistentes.
* **Observabilidade:** eventos mínimos (tela, permissão, FPS, resolução, reps, erros) e SLOs.

---

## 5) Stack Técnica

### Frontend (web)

* **SvelteKit + TypeScript**; Tailwind para UI.
* **Visão computacional:** **MediaPipe Tasks – Pose Landmarker** (WASM SIMD/threads; GPU quando disponível).
* **Pipeline:** `requestVideoFrameCallback` + **Web Worker** (inferência) + **OffscreenCanvas** (overlay) + **WebCodecs/VideoFrame** (zero‑copy quando suportado).
* **Estado/UI:** stores do Svelte; HUD com FPS/resolução/reps/tempo.
* **PWA:** `vite-plugin-pwa` + manifest + cache de assets.
* **i18n:** `svelte-i18n` (namespaces por tela) com fallback `pt-BR`.

### Backend (NestJS + Fastify)

* **Runtime:** Node.js 20 • **NestJS 10+ com FastifyAdapter**.
* **Banco/Auth:** **Supabase Cloud** (Postgres + RLS + Auth).
* **SDK:** `@supabase/supabase-js` no back (service) e no front (público para Auth).
* **Validação:** **Zod** via pipe custom (ou class-validator).
* **Deploy:** Vercel (serverless) ou container (Render/Fly).

---

## 6) Arquitetura (alto nível)

1. **Main thread (leve):** solicita câmera 720p@60; usa rVFC para sincronizar UI; entrega `VideoFrame` ao Worker via WebCodecs (fallback ImageBitmap).
2. **Worker de Visão:** MediaPipe Pose → cálculos de ângulos/KPIs → estados por exercício → desenha overlay em OffscreenCanvas → retorna dados/HUD.
3. **Backend (Nest+Fastify):** APIs `/v1/sessions|metrics|events` (stateless, valida JWT); escreve no Postgres (RLS).
4. **Segurança:** COOP/COEP para WASM threads; JWT Supabase no back; RLS por usuário.

```text
[Webcam] -> [Main: rVFC + entrega VideoFrame]
           -> [Worker: Pose -> KPIs/estados -> Overlay OffscreenCanvas]
                                   |-> [Events]
                                   |-> [Persistência (Supabase via APIs)]
```

### 6.1 Compatibilidade multi‑dispositivo

* **Tiers**:

  * **A**: WebCodecs + OffscreenCanvas + WASM SIMD → 720p@60.
  * **B**: ImageBitmap + (Offscreen limitado) → 540–720p@60/30.
  * **C**: 480p@30 + pulo de frames → UI estável.
* **Ladder:** 720p@60 → 540p → pulo de frames → economia.
* **Mobile:** retrato/paisagem, troca de câmera (frontal/traseira), espelhamento, vibração, indicadores.
* **Energia:** `navigator.getBattery()` (quando disponível) para reduzir efeitos <20%.

---

## 7) User Stories (backlog)

* **Auth:** criar conta, login, logout.
* **Permissão:** pedir câmera, exibir vídeo + overlay.
* **Performance:** experiência fluida a 60 FPS.
* **Treino:** feedback em tempo real; contagem/tempo.
* **Histórico:** ver última sessão após finalizar.

**Critérios de aceite (exemplos)**

* Overlay disponível <2 s após permissão.
* **Desempenho:** UI **≥60 FPS** por ≥90% do tempo na classe alvo, **ou** degradação automática aplicada.
* Regras de ângulo com debounce ≥3 frames.

---

## 8) Métricas do MVP

* **Ativação:** % contas que iniciam 1º treino.
* **Engajamento:** duração média, reps válidas/treino.
* **Qualidade técnica:** FPS médio, **% do tempo ≥60 FPS**, resolução ativa, % com fallback.
* **Retenção curta:** % que voltam em 7 dias.

---

## 9) Plano de Testes

* **Técnico:** latência, FPS, permissão, diferentes iluminações.
* **Funcional:** regras por exercício (iniciante/intermediário/avançado).
* **Usabilidade:** clareza do feedback, fluxo de permissão.
* **Compatibilidade:** matriz navegadores × dispositivos × tiers (orientação, troca de câmera, bateria).
* **Corte:** **≥60 FPS** Tiers A/B; **≥30 FPS** Tier C.

---

## 10) Riscos & Mitigações

* **Baixo FPS** → reduzir resolução; pular frames; simplificar overlay.
* **Iluminação ruim** → onboarding com instruções; aviso em tempo real.
* **Falsos positivos** → filtros temporais (≥3 frames) e suavização de keypoints.

---

## 11) Roadmap & Entregas

* **Semana 1:** stack definida, backlog, wireframes, i18n base.
* **Semana 2:** POC captura + pose + 1 exercício; 60 FPS Tier A; PWA básico.
* **Semanas 3–4:** 3 exercícios, overlay/feedback, histórico, testes integrados.
* **Semanas 5–6:** beta fechado (10–20 usuários), métricas e ajustes.
* **Semanas 7–8:** polimento, acessibilidade, deploy público.

---

## 12) Wireframes (Figma)

1. **Login/Signup** (e‑mail/senha).
2. **Dashboard (Home única)**: KPIs rápidos + **Treinar**.
3. **Seleção de exercício** (modal sobre o Dashboard).
4. **Permissão de câmera** (step) + **teste de FPS (3 s)**.
5. **Treino**: overlay + HUD (FPS, resolução, reps/tempo, status).
6. **Resumo** pós‑treino.
7. **Onboarding 1‑tela** (posição/câmera).
8. **Seletor de idioma** (pt‑BR/en‑US).

### 12.1 Fluxo UX & Rotas (SvelteKit)

* `/login` → `/` (Dashboard) → `/(modal)train/select` → `/(modal)train/permission` → `/train/[exercise]` → `/train/[exercise]/summary`.

**Eventos/analytics:** `login_success`, `view_dashboard`, `click_train`, `select_exercise`, `camera_permission_granted/denied`, `camera_test_result`, `training_start/end`, `rep_counted`, `summary_viewed`.

---

## 13) Especificação Técnica do Loop (pseudocódigo)

**Main (captura & UI):**

```ts
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60, max: 120 } }
});
const track = stream.getVideoTracks()[0];
await track.applyConstraints({ frameRate: { ideal: 60, max: 120 } });

const processor = new MediaStreamTrackProcessor({ track });
const reader = processor.readable.getReader();
const worker = new Worker(new URL('./vision.worker.ts', import.meta.url), { type: 'module' });
(function pump() {
  reader.read().then(({ value: frame }) => {
    if (!frame) return;
    worker.postMessage({ frame }, [frame]); // transfere VideoFrame
    requestVideoFrameCallback(() => {/* atualizar HUD/overlay */});
    pump();
  });
})();
```

**Worker (visão):**

```ts
self.onmessage = async (evt) => {
  const frame = evt.data.frame as VideoFrame;
  // MediaPipe Pose -> KPIs/estados -> desenhar OffscreenCanvas
  frame.close();
  // postMessage({ kpis, feedback, overlayBitmap });
};
```

**Máquinas de estado (resumo):**

* **Squat:** `alto -> baixo -> alto` (knee ≤80° na descida; ≥160° na subida; debounce ≥3 frames).
* **Lunge:** por perna; joelho dianteiro ≤90°, tronco ~vertical.
* **Plank:** válido quando quadril 170–190°; pausa >0,5 s fora da faixa.

---

## 14) Modelagem de Dados (Supabase Postgres)

```sql
-- perfis
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  locale text default 'pt-BR',
  created_at timestamptz not null default now()
);

-- sessões de treino
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  device_class text check (device_class in ('D','M','H')),
  tier text check (tier in ('A','B','C')),
  avg_fps numeric,
  avg_resolution text,
  created_at timestamptz not null default now()
);

-- métricas agregadas por exercício na sessão
create table if not exists metrics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  exercise text not null check (exercise in ('squat','lunge','plank')),
  reps int,
  duration_ms bigint,
  min_fps numeric,
  max_fps numeric,
  mean_fps numeric,
  valid_ratio numeric,
  created_at timestamptz not null default now()
);

-- eventos (telemetria leve)
create table if not exists events (
  id bigserial primary key,
  session_id uuid references sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  ts timestamptz not null default now(),
  props jsonb not null default '{}'
);

-- view de resumo
create or replace view v_session_summary as
select s.id, s.user_id, s.started_at, s.ended_at,
       coalesce(jsonb_agg(jsonb_build_object(
         'exercise', m.exercise,
         'reps', m.reps,
         'duration_ms', m.duration_ms,
         'mean_fps', m.mean_fps
       )) filter (where m.id is not null), '[]'::jsonb) as metrics
from sessions s left join metrics m on m.session_id = s.id
group by s.id;
```

### 14.1 RLS (Row Level Security)

```sql
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table metrics enable row level security;
alter table events enable row level security;

create policy p_profiles_own on profiles
  for select using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy p_sessions_own on sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy p_metrics_session on metrics
  for all using (exists (
    select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()
  )) with check (exists (
    select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()
  ));

create policy p_events_session on events
  for all using (exists (
    select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()
  )) with check (exists (
    select 1 from sessions s where s.id = session_id and s.user_id = auth.uid()
  ));
```

### 14.2 Índices & Retenção

```sql
create index if not exists idx_sessions_user on sessions(user_id, started_at desc);
create index if not exists idx_metrics_session on metrics(session_id);
create index if not exists idx_events_session_ts on events(session_id, ts desc);

-- retenção: manter eventos por 90 dias
create policy p_events_delete_retention on events for delete
  using (ts < now() - interval '90 days');
```

---

## 15) API (NestJS + Fastify)

**Endpoints:**

* `POST /v1/sessions/start` → cria sessão (retorna `session_id`).
* `POST /v1/sessions/end` → finaliza sessão + agrega dados.
* `POST /v1/metrics/upsert` → upsert por `session_id+exercise`.
* `POST /v1/events/batch` → ingest em lote (limites e rate limit).

**Segurança:** JWT Supabase (`Authorization: Bearer`); **AuthGuard**; **RLS** no DB.

**Validação & erros:** Pipe Zod por rota; respostas `{ error: { code, message }, requestId }`.

---

## 16) Engine de Exercícios — Contratos

```ts
export interface ExerciseStateMachine {
  name: 'squat'|'lunge'|'plank';
  init(cfg: ExerciseConfig): void;
  tick(kpis: KPIs, dtMs: number): Feedback; // por frame válido
  reset(): void;
}

export type ExerciseConfig = {
  angles: { squatKneeMin: number; squatHipTop: number };
  debounceFrames: number; // >=3
  minHoldMs?: number; // plank
};
```

---

## 17) Backend — Tecnologias e Arquitetura (NestJS + Fastify)

* **Módulos**: `Auth`, `Sessions`, `Metrics`, `Events`, `Supabase`, `Common`.
* **Camadas**: Controller → Service → Gateway (Supabase).
* **Guard** de JWT (Supabase) injeta `userId`; **Pipe** de validação (Zod ou ValidationPipe).
* **Deploy**: Vercel (serverless) ou container.

**Estrutura (resumo):**

```
src/
  main.ts (FastifyAdapter)
  app.module.ts
  common/guards/auth.guard.ts
  supabase/supabase.service.ts
  sessions/{controller,service,schemas}.ts
  metrics/{controller,service,schemas}.ts
  events/{controller,service,schemas}.ts
```

---

## 18) Performance Budgets & Telemetria

* **Frame budget:** ≤16,7 ms (Tier A), ≤33,3 ms (Tier C).
* **Carga inicial:** JS ≤200 KB (página de treino), CSS ≤30 KB, LCP <2,5 s.
* **Métricas:** média/percentis de FPS por device/tier; taxa de fallback; erros de permissão.
* **SLO:** 95% das sessões sem queda <50 FPS por >2 s em Tier A.

---

## 19) Testes, CI/CD e Rollout

* **Unitários:** máquinas de estado, serviços, pipes/guards.
* **Integrados:** controller → service → Supabase (ambiente de teste).
* **E2E:** Playwright (front); supertest/Pact (back).
* **CI:** lint, typecheck, unit, build; E2E em preview.
* **Rollout:** beta fechado; *feature flags*; dashboards (views SQL) no Supabase.

---

## 20) Segurança & Privacidade

* Processamento local; sem upload de frames.
* JWT Supabase; RLS rigoroso; CORS restrito.
* Retenção de eventos: 90 dias.
* Consentimento para analytics; *opt‑out* disponível.

---

## 21) Passo a Passo de Implementação

1. **S1** — Confirmar stack; criar módulos base (Device Service, Vision Worker, Exercise Engine); tabelas e RLS; i18n base.
2. **S2** — POC 60 FPS (Tier A): WebCodecs + OffscreenCanvas + MediaPipe; overlay básico; PWA inicial.
3. **S3–S4** — 3 exercícios, métricas, eventos, degradação adaptativa; testes integrados.
4. **S5–S6** — Beta fechado; dashboards FPS/erros; hardening de RLS/APIs.
5. **S7–S8** — Polimento, acessibilidade, rollout público.

---

## 22) Especificação do Overlay (apêndice)

* **Layers:** `skeleton`, `jointMarkers`, `zoneGuides`, `alerts`.
* Desenho segue rVFC; quando pular frames de análise, manter UI a 60 Hz.
* Mobile: evitar gradientes pesados; antialias opcional.

---

## 23) PWA (Progressive Web App)

**Objetivo:** instalável, rápido, com cache de assets e pronto para offline básico (fluxo de treino pode operar offline após login).

### 23.1 Manifesto

`static/manifest.json`

```json
{
  "name": "Elarin",
  "short_name": "Elarin",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Adicionar ao `app.html`:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#2563eb" />
```

### 23.2 Service Worker (vite-plugin-pwa)

`vite.config.ts`

```ts
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
export default {
  plugins: [
    SvelteKitPWA({ manifest: true, registerType: 'autoUpdate', workbox: { cleanupOutdatedCaches: true } })
  ]
};
```

### 23.3 Boas práticas PWA

* Testar **instalação** (Android/Chrome, iOS 16.4+).
* Cachear assets estáticos; rotas dinâmicas com estratégia *stale‑while‑revalidate* quando aplicável.

---

## 24) Internacionalização (i18n)

**Objetivo:** pt‑BR (padrão) e en‑US no MVP; base para expansão.

### 24.1 Biblioteca e estrutura

* **Lib:** `svelte-i18n`.
* **Namespaces:** `common`, `auth`, `dashboard`, `train`, `summary`, `errors`.
* **Arquivos:** `src/lib/i18n/{locale}/{namespace}.json`.

### 24.2 Setup

```ts
// src/lib/i18n/index.ts
import { register, init, getLocaleFromNavigator } from 'svelte-i18n';
register('pt-BR', () => import('./pt-BR/common.json'));
register('en-US', () => import('./en-US/common.json'));
export async function setupI18n(pref?: string) {
  await init({ fallbackLocale: 'pt-BR', initialLocale: pref || getLocaleFromNavigator() });
}
```

* Persistir escolha (localStorage) e sincronizar com `profiles.locale` (Supabase):

```sql
alter table profiles add column if not exists locale text default 'pt-BR';
```

* Formatação com `Intl.DateTimeFormat/NumberFormat`.
* Sem hardcode de textos; usar placeholders (ICU) e chaves estáveis.

---

## 25) Checklist de Entrega — Semana 1

* [ ] Stack: **SvelteKit + MediaPipe + Workers + WebCodecs + OffscreenCanvas**; **NestJS + Fastify + Supabase**.
* [ ] Backlog em issues (GitHub) com estimativas.
* [ ] Wireframes no Figma (inclui seletor de idioma, teste de FPS e troca de câmera).
* [ ] Riscos & mitigação documentados.
* [ ] **COOP/COEP** no deploy; matriz de fallbacks por navegador.
* [ ] **PWA** (manifest + SW) e **i18n** (pt‑BR/en‑US) configurados.

---

## 26) Anexos

* Roadmap de 2 meses (resumo exec).
* Coleção de eventos/analytics.

> Esta documentação serve como **guia de implementação**. Mantemos foco em **60 FPS**, **privacidade** (processamento local), **simplicidade de backend** (Nest + Fastify + Supabase) e **portabilidade** (PWA + i18n).
