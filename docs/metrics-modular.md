# Sistema Modular de Métricas (Treino `/train`)

Este documento explica como funciona o sistema de **métricas configuráveis por exercício** (tempo, reps, etc.) e como a UI e o fluxo de treino usam essas métricas de forma **genérica e desacoplada**.

## Visão geral

Cada exercício define, via `static/exercises/<exerciseId>/config.json`:

- `components`: quais componentes de UI podem aparecer (ex.: `timer`, `rep_bars`, `quality_slider`).
- `metrics`: quais métricas existem para o exercício (ex.: `duration`, `reps`, ou futuras métricas como `hold_time`, `stability_score`).
- `completion`: regra de término automático do treino (manual / any / all).

O `/train` carrega esse config no início da sessão, normaliza as métricas e:

- Renderiza as UIs apenas quando fizer sentido para o exercício (ex.: não mostrar reps em equilíbrio).
- Controla timer (elapsed/remaining) e reps dinamicamente.
- Pode finalizar automaticamente quando a regra de `completion` for atingida.

## Schema do `config.json`

Exemplo real (agachamento): `static/exercises/bodyweight_squat/config.json`.

### `components`

Lista de strings. Exemplos usados hoje:

- `timer`: habilita a UI de timer.
- `rep_bars`: habilita a UI de reps em barras.
- `quality_slider`: habilita a UI do slider de qualidade.

### `metrics`

`metrics` aceita **strings** (forma curta) ou **objetos** (forma completa):

Forma curta:

```json
{ "metrics": ["duration", "reps"] }
```

Forma completa:

```json
{
  "metrics": [
    {
      "id": "duration",
      "type": "duration",
      "target": 60,
      "name": "Tempo",
      "unit": "s",
      "display": "remaining",
      "showIn": ["next", "training", "summary"]
    },
    {
      "id": "reps",
      "type": "reps",
      "target": 30,
      "name": "Repetições",
      "unit": "reps",
      "showIn": ["next", "training", "summary"]
    }
  ]
}
```

Campos principais:

- `id`: identificador único (string).
- `type`: tipo (hoje o sistema entende `duration` e `reps` “de verdade”; outros tipos são aceitos e podem ser exibidos/estendidos).
- `target`: meta (ex.: 60 segundos, 30 reps). Pode ser `null`/omitido.
- `name`: nome exibido na UI.
- `unit`: unidade (informativo).
- `display`: apenas para `duration` (`elapsed` ou `remaining`).
- `showIn`: onde essa métrica deve aparecer: `next` | `training` | `summary`.

### `completion`

Controla quando o treino pode finalizar automaticamente:

```json
{ "completion": { "mode": "manual" } }
```

```json
{ "completion": { "mode": "any" } }
```

```json
{ "completion": { "mode": "all", "metrics": ["duration"] } }
```

- `mode`:
  - `manual`: nunca finaliza automaticamente.
  - `any`: finaliza quando **qualquer** métrica de conclusão for atingida.
  - `all`: finaliza quando **todas** as métricas de conclusão forem atingidas.
- `metrics` (opcional): lista de `id`s que entram no cálculo de conclusão. Se omitido, entram as métricas reconhecidas (`duration`/`reps`) que tenham `target`.

## Normalização das métricas

Arquivo: `src/lib/vision/utils/exercise-metrics.utils.ts`.

A função `normalizeExerciseMetrics()`:

- Aceita `metrics` como `string[]` ou objetos.
- Aplica defaults por tipo:
  - `duration`: label padrão “Tempo”, unit “s”, display padrão `elapsed`.
  - `reps`: label padrão “Repetições”, unit “reps”.
- Deduplica por `id` e ignora entradas inválidas.
- Normaliza `showIn` para um conjunto válido (`next`, `training`, `summary`).

## Como o `/train` usa as métricas

Arquivo: `src/routes/(app)/train/+page.svelte`.

Ao iniciar a câmera e carregar o exercício, o `/train`:

1. Carrega o config (`loadExerciseConfig()`).
2. Define `activeComponents` (UI) e `exerciseMetrics` (métricas normalizadas).
3. Define regras de conclusão (`completionMode` e `completionMetricIds`).
4. Ajusta coisas derivadas automaticamente:
   - Timer é habilitado **somente** se existir `components.includes("timer")`.
   - Reps são “rastreadas” se existir métrica `reps` (mesmo se `rep_bars` não estiver na UI).
   - `repMaxSlots` (quantidade de barras) é derivado de `metrics.reps.target` (com limite) ou cai no default.

5. As atualizacoes de metricas (timer/reps/qualidade) só iniciam depois da contagem regressiva (3s): `metricsActive = sessionActive && hasCompletedCountdown && trainingPhase === "training" && !isPaused`.

### Timer (elapsed/remaining)

- O timer roda via `elapsedTime` (incrementa 1x por segundo quando a sessão está ativa).
- A UI do timer é `TimerOverlay` e recebe `seconds`, `targetSeconds` e `mode`.
  - `mode="elapsed"` mostra tempo decorrido.
  - `mode="remaining"` mostra `targetSeconds - seconds` (até 0).
- A cada tick, o `/train` também faz `trainingActions.updateDuration(elapsedTime)` para manter `trainingStore.duration` atualizado (importante para salvar no backend respeitando pausas).

### Repetições (reps)

- A contagem de reps depende da métrica `reps` existir no config (não depende do componente `rep_bars` estar visível).
- O contador usa `feedback.heuristic.summary.validReps` quando disponível e incrementa `trainingActions.incrementReps()`.
- Se `rep_bars` estiver ativo, as barras são renderizadas e recebem `maxSlots={repMaxSlots}`.

### Tela “A seguir” (pré-treino)

`NextExerciseInfo` recebe uma lista `metrics` (texto pronto). O `/train` monta `nextGoalMetrics` com base em:

- métricas com `target`, `showIn` contendo `next` **e** habilitadas via `components` (ex.: `duration` só aparece se `timer` estiver em `components`; `reps` só aparece se `rep_bars` estiver em `components`).
- `duration` é formatado como `mm:ss`.

### Summary (pós-treino)

`ExerciseSummaryOverlay` recebe uma lista `metrics`. O `/train` monta `summaryMetrics` usando os valores atuais (também respeitando `components`):

- `duration`: valor = tempo decorrido; target = meta, se houver.
- `reps`: valor = reps atuais; target = meta, se houver.

## Conclusão automática

O `/train` tem um `$effect` que, durante a fase `training`, verifica:

- `duration`: `elapsedTime >= target`
- `reps`: `$trainingStore.reps >= target`

E chama `finishTraining()` conforme:

- `completion.mode = "any"`: basta 1 métrica atingir a meta.
- `completion.mode = "all"`: todas precisam atingir a meta.

## Integração com backend (salvar treino)

No frontend, `trainingActions.finish()` envia para o backend:

- `exercise_type`
- `reps_completed`
- `sets_completed`
- `duration_seconds` (prioriza `trainingStore.duration`, que vem do timer ativo)
- `avg_confidence` (quando disponível)

Arquivo: `src/lib/stores/training.store.ts`.

Se futuramente você quiser salvar novas métricas (ex.: `hold_time`, `stability_score`) no backend, a ideia é:

1. Definir a métrica no `metrics[]` do config.
2. Calcular/atualizar o valor no `/train` (ou via analyzer/validator).
3. Estender o payload do `trainingApi.saveTraining(...)` para enviar esses campos.

## Como criar um exercício novo (ex.: equilíbrio)

1) Criar `static/exercises/single_leg_balance/config.json`:

```json
{
  "exerciseName": "single_leg_balance",
  "components": ["timer", "quality_slider"],
  "metrics": [
    {
      "id": "duration",
      "type": "duration",
      "target": 45,
      "display": "remaining",
      "name": "Tempo",
      "showIn": ["next", "training", "summary"]
    }
  ],
  "completion": { "mode": "all" }
}
```

2) Não adicionar `reps` em `metrics` e não adicionar `rep_bars` em `components`.

Resultado: treino com timer/qualidade, sem UI nem contagem de reps.

## Arquivos principais

- `static/exercises/<id>/config.json` (fonte de verdade por exercício)
- `src/lib/vision/types/metrics.types.ts` (tipos)
- `src/lib/vision/utils/exercise-metrics.utils.ts` (normalização)
- `src/routes/(app)/train/+page.svelte` (orquestração da UI + lógica)
- `src/lib/components/training/TimerOverlay.svelte`
- `src/lib/components/training/NextExerciseInfo.svelte`
- `src/lib/components/training/ExerciseSummaryOverlay.svelte`
