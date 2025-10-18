# SUPER PROMPT — Cursor IDE

> **Projeto:** Elarin — MVP
>
> **Objetivo deste prompt:** Gerar **somente o esqueleto do frontend** do MVP, **sem implementar nada** relacionado à **captura de câmera, MediaPipe, Web Workers, WebCodecs, OffscreenCanvas ou APIs de mídia**. Prepare apenas a **arquitetura de UI/rotas, PWA, i18n, stores** e componentes **placeholders**. Marcar pontos de extensão com `// TODO:` para futura implementação.

---

## Contexto (resumo)

Aplicativo web com **SvelteKit + TypeScript + Tailwind**, PWA e i18n (pt‑BR/en‑US). Fluxo principal: **Login → Dashboard → Seleção de exercício (modal) → Permissão/Introdução (somente texto) → Tela de treino (UI estática/placeholder) → Resumo**. **Sem** câmera ou visão computacional nesta fase.

---

## Restrições obrigatórias

1. **Não instalar** pacotes de visão (ex.: `@mediapipe/tasks-vision`).
2. **Não usar** APIs de mídia (ex.: `navigator.mediaDevices.getUserMedia`).
3. **Não criar** Web Workers, OffscreenCanvas, WebCodecs ou headers COOP/COEP.
4. **Não** escrever lógica de exercícios (contagem, ângulos, feedback). Apenas **UI + tipos**.
5. **Nada de backend** funcional: apenas stubs/clients vazios (Supabase/REST).

---

## Tarefas (alto nível)

* Inicializar projeto SvelteKit + TS + Tailwind.
* Adicionar **PWA** e **i18n**.
* Definir **arquitetura de pastas** e **rotas** do fluxo.
* Criar **componentes placeholders** para as telas de treino (sem vídeo), seleção de exercício e resumo.
* Criar **stores** (estado global de app e sessão de treino — apenas mocks).
* Criar **stubs** de cliente Supabase e REST (sem chamadas reais).
* Configurar **ESLint/Prettier**, **Vitest** e **Playwright** (navegação básica), **Husky + lint‑staged**, **CI** (GitHub Actions).
* Documentar no **README** escopo e próximos passos.

---

## Dependências

**Prod:**

* `@sveltejs/kit`, `svelte`, `typescript`
* `@vite-pwa/sveltekit`
* `tailwindcss`, `postcss`, `autoprefixer`
* `svelte-i18n`
* `@supabase/supabase-js`
* `zod`

**Dev:**

* `vitest`, `@vitest/coverage-v8`, `@testing-library/svelte`, `jsdom`
* `playwright`
* `eslint`, `eslint-plugin-svelte`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `prettier`, `eslint-config-prettier`, `prettier-plugin-svelte`
* `husky`, `lint-staged`

> **Importante:** **não** adicionar nenhuma dependência de visão/câmera nesta fase.

---

## Estrutura de pastas

```
src/
  lib/
    components/
      common/                 # botões, modal, cabeçalho, etc.
      train/
        StagePane.svelte      # container estático (sem vídeo), mostra arte/placeholder
        ExerciseSelect.svelte # UI de seleção
        PermissionIntro.svelte# apenas texto orientativo; sem pedir permissão real
        HUD.svelte            # KPIs mock (fps/resolução apenas texto estático)
    stores/
      app.store.ts            # idioma, tema, preferências
      train.store.ts          # exercício selecionado, estados mock
    services/
      supabase.client.ts      # init stub (sem uso real)
      telemetry.service.ts    # console.debug stub
    api/
      rest.client.ts          # fetch stub
      dtos.ts                 # zod schemas
    config/
      i18n.ts                 # setup i18n
      feature-flags.ts        # flags p/ habilitar captura no futuro (false)
  routes/
    +layout.svelte
    +layout.ts
    +page.svelte              # Dashboard
    login/+page.svelte
    (modal)train/
      select/+page.svelte
      intro/+page.svelte      # substitui permissão real por explicação
    train/[exercise]/+page.svelte
    train/[exercise]/summary/+page.svelte
app.d.ts
app.html

static/
  icons/icon-192.png
  icons/icon-512.png
  manifest.json

.vscode/
  settings.json

tests/
  unit/ ...
  e2e/  ...
```

> **Removido nesta fase:** `vision/`, `device.service.ts`, `vision.worker.ts`, `overlay.renderer.ts`, `feature-detect.ts`, headers COOP/COEP.

---

## Configurações principais

* **`svelte.config.js`**: `adapter-auto` e preprocess padrão.
* **`vite.config.ts`**: registrar `SvelteKitPWA`. **Não** definir headers especiais. Scripts padrão.
* **`app.html`**: link para `manifest.json` e `meta theme-color`.
* **`tailwind.config`/`postcss.config`**: padrão SvelteKit.
* **`tsconfig.json`**: `strict: true`; paths `@/*` → `src/*`.

---

## PWA

* `static/manifest.json` com nome, ícones e `start_url`.
* Plugin configurado com `registerType: 'autoUpdate'` e Workbox default.

---

## i18n

* Biblioteca `svelte-i18n`.
* Namespaces: `common`, `auth`, `dashboard`, `train`, `summary`, `errors`.
* `src/lib/i18n/{locale}/{namespace}.json` com textos mínimos.
* Seletor de idioma no Header; persistir no `localStorage`.

---

## Fluxo de rotas

* `/login` → `/` (Dashboard) → `/(modal)train/select` → `/(modal)train/intro` → `/train/[exercise]` → `/train/[exercise]/summary`.
* **Sem** solicitações de permissão de câmera. A página `intro` apenas **explica** que a captura será habilitada futuramente.

---

## Componentes (placeholders)

* **StagePane.svelte**: renderiza card com imagem/ilustração estática (em `static/placeholder.png`, se quiser gerar), título do exercício e área onde o vídeo **aparecerá no futuro** (div com borda tracejada + label “Vídeo indisponível neste MVP”).
* **ExerciseSelect.svelte**: lista simples (Squat, Lunge, Plank) — apenas UI.
* **PermissionIntro.svelte**: texto curto de onboarding explicando privacidade e requisitos, **sem** chamadas de permissão.
* **HUD.svelte**: KPIs **mock** (por exemplo, “FPS: —”, “Resolução: —”, “Status: Em preparação”).

---

## Stores (Svelte)

* `app.store.ts`: idioma, tema, flags. **Sem** estado de dispositivos.
* `train.store.ts`: exercício atual e estados `idle/ready/training/paused/finished` (somente navegação/UI; sem contagens reais).

---

## Stubs de serviços

* `supabase.client.ts`: inicialização com variáveis `.env` **sem uso real**.
* `rest.client.ts`: estrutura básica de fetch com base URL e interceptor vazio.
* `telemetry.service.ts`: `emit(event, props)` → `console.debug`.

---

## Testes

* **Unit (Vitest)**: stores e componentes renderizam sem erros.
* **E2E (Playwright)**: fluxo de navegação feliz entre rotas (login fake → dashboard → select → intro → treino → summary).

---

## CI (GitHub Actions)

* Node 20 + pnpm cache.
* Jobs: `pnpm i`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`.

---

## README (conteúdo mínimo)

* Escopo: **Frontend somente; sem câmera/Mediapipe nesta fase**.
* Como rodar (`pnpm i && pnpm dev`).
* Estrutura de pastas e fluxo de rotas.
* Roadmap: habilitar captura e visão na próxima etapa.

---

## Critérios de aceite desta entrega

1. App compila e roda em dev; Dashboard acessível.
2. Rotas e modais navegáveis conforme fluxo descrito.
3. i18n alternando entre pt‑BR / en‑US.
4. PWA registrando service worker e manifesto válido.
5. Treino exibe **StagePane estático** sem qualquer acesso à câmera.
6. Lint/format/testes básicos passando; CI verde.

---

## Próximos passos (fora de escopo agora)

* Introduzir captura: `getUserMedia`, seleção de câmera e teste de FPS.
* Desenho/overlay e pipeline de visão (MediaPipe Tasks) com Worker e OffscreenCanvas.
* Regras de exercícios, contagem e feedback em tempo real.

> **Agora, gere os arquivos listados acima com conteúdos mínimos e `// TODO:` onde indicado, garantindo que não exista nenhuma referência funcional à câmera, MediaPipe, Workers, WebCodecs ou OffscreenCanvas.**
