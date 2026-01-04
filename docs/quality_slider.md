# QualitySlider - Documentacao tecnica completa

Este documento descreve, de forma detalhada, como o score e calculado, quais funcoes participam, como cada modo se comporta, e como o slider e os "tubinhos" (reps) usam esses valores. Ele consolida tudo o que foi discutido no chat.

## Arquivos principais

- Slider: `elarin-mvp-frontend/src/lib/components/training/QualitySlider.svelte`
- Reps: `elarin-mvp-frontend/src/lib/components/training/RepBars.svelte`
- Logica principal: `elarin-mvp-frontend/src/routes/(app)/train/+page.svelte`
- Feedback/modes: `elarin-mvp-frontend/src/lib/vision/core/FeedbackSystem.ts`
- Analyzer (cadencia): `elarin-mvp-frontend/src/lib/vision/core/ExerciseAnalyzer.ts`
- ML (autoencoder): `elarin-mvp-frontend/src/lib/vision/ml/GenericClassifier.ts`
- Constantes: `elarin-mvp-frontend/src/lib/constants/training.constants.ts`
- Timing: `elarin-mvp-frontend/src/lib/constants/timing.constants.ts`

## Pipeline geral (alto nivel)

1) Camera/MediaPipe gera landmarks por frame.
2) `onPoseResults()` chama `analyzer.analyzeFrame(landmarks)` (com throttling).
3) `ExerciseAnalyzer` chama:
   - ML: `GenericExerciseClassifier.analyzeFrame()`
   - Heuristica: `validator.validate()`
4) `FeedbackSystem.integrate()` combina ML/heuristica e gera `FeedbackRecord`.
5) `handleFeedback()` calcula `score_frame`, atualiza `emaScore`, e alimenta a logica das reps.
6) UI:
   - `QualitySlider` usa `emaScore`.
   - `RepBars` usa `repScores`, `currentRepFrames`, `currentReps` e `maxSlots`.

## Cadencia de analise (quando o FeedbackRecord nasce)

### Throttle na entrada (UI)
- Em `onPoseResults`, existe `FRAME_THROTTLE_MS`.
- Se `FRAME_THROTTLE_MS = 0` (valor atual), **nao ha throttle** aqui.
- Se for > 0, limita a taxa de chamada por tempo (ms).
- Arquivo: `elarin-mvp-frontend/src/lib/constants/timing.constants.ts`

### Throttle real (Analyzer)
Mesmo sem throttle na UI, o Analyzer limita por tempo:
- `analysisInterval` (default 100ms) em `ExerciseAnalyzer`.
- Se `now - lastAnalysisTime < analysisInterval`, retorna `null` (nao gera feedback).
- Arquivo: `elarin-mvp-frontend/src/lib/vision/core/ExerciseAnalyzer.ts`

Na pratica: com 30 FPS e `analysisInterval=100ms`, o sistema analisa ~1 a cada 3 frames.

## ML (autoencoder) - como o qualityScore nasce

### Buffer e inferencia
O ML nao roda em todo frame:
- Ele acumula frames em `frameBuffer`.
- So faz inferencia quando:
  - `frameBuffer.length >= minFrames`
  - `frameBuffer.length % predictionInterval == 0`

Enquanto isso:
- `waiting` = nao tem `minFrames` suficientes.
- `processing` = tem frames, mas nao chegou no `predictionInterval`.

### Erro de reconstrucao
O autoencoder reconstrui o movimento e calcula erro medio:
```
reconstructionError = MSE medio por frame
```

### QualityScore
Com `ratio = reconstructionError / threshold`:
- se `ratio <= 1.0` -> `qualityScore = 1.0`
- se `ratio <= 1.1` -> decai linearmente ate 0
- se `ratio > 1.1` -> `qualityScore = 0`

`confidence` e o mesmo valor em 0..1:
```
confidence = clamp(qualityScore, 0, 1)
```

Valores expostos:
- `details.qualityScore` (string 0..100)
- `confidence` (numero 0..1)

Arquivo: `elarin-mvp-frontend/src/lib/vision/ml/GenericClassifier.ts`

## Heuristica - como o score heuristico nasce

No slider, a heuristica e convertida em score assim:
- Se `heuristic.available` for falso -> `null`
- Se `heuristic.isValid` -> **95**
- Se invalido -> `100 - soma(penalidades)`

Penalidades:
- `critical: 60`
- `high: 40`
- `medium: 25`
- `low: 10`

Por que 95 e nao 100:
- Heuristica e rule-based; 95 deixa margem para ML confirmar.
- Evita saturar o score em 100 com facilidade.

Arquivo: `elarin-mvp-frontend/src/routes/(app)/train/+page.svelte`

## FeedbackSystem e modos (ml_only / heuristic_only / hybrid)

O `FeedbackSystem` define o **veredito** e a **confianca combinada**:

### ml_only
- Veredito baseado apenas no ML.
- `combined.confidence` usa `ml.confidence` (clamp 0..1).

### heuristic_only
- Veredito baseado apenas na heuristica.
- `combined.confidence` e fixo (0.9 / 0.95 / 0.85 dependendo do caso).

### hybrid
- Se ML e heuristica disponiveis, calcula:
  - `mlScore` baseado em `ml.confidence` e `ml.isCorrect`
  - `heuristicScore` baseado em `isValid` e penalidades
  - `combinedScore = mlScore * mlWeight + heuristicScore * heuristicWeight`
  - `combined.confidence = max(mlConfidence, heuristicScore)`

Importante:
- O **slider nao respeita o modo**. Ele sempre tenta ML + heuristica.
- O modo afeta mensagens, veredito e `combined.confidence`.

Arquivo: `elarin-mvp-frontend/src/lib/vision/core/FeedbackSystem.ts`

## Calculo do score do slider

### 1) ML score (getMlScore)
Ordem de prioridade:
1. `feedback.ml.details.qualityScore`
2. `feedback.ml.confidence * 100`
3. `feedback.combined.confidence * 100`

Motivo do fallback:
- `qualityScore` pode nao existir (waiting/processing ou details ausente).
- `confidence` e o mesmo sinal, mas em formato diferente.
- `combined.confidence` pode existir via heuristica.

### 2) Heuristica
Usa regra dos 95 / penalidades.

### 3) Combinacao
```
score_frame = clamp(mlScore * ML_WEIGHT + heuristicScore * HEUR_WEIGHT)
```
Pesos atuais:
- `ML_WEIGHT = 0.6`
- `HEUR_WEIGHT = 0.4`

### 4) EMA (suavizacao)
```
ema = alpha * score_frame + (1 - alpha) * ema_anterior
```
Com:
- `SCORE_ALPHA = 0.2`

Se `score_frame` e `null`, o EMA nao e atualizado.

## Score por repeticao (tubinhos)

### Como e calculado
1) `currentRepFrames` acumula `score_frame` durante a repeticao.
2) Quando `validReps` aumenta:
   - `rep_score = media(currentRepFrames)`
   - se `currentRepFrames` vazio -> fallback para `frameScore`
3) Salva em `repScores[repIndex]` e limpa o buffer.

### Por que nao usar o slider?
- O slider usa EMA global e mistura frames de varias reps.
- O tubinho precisa refletir so aquela repeticao.

### Slots dinamicos
```
maxSlots = min(MAX_REP_SLOTS_CAP, max(1, target))
```
Sem target -> `DEFAULT_REP_SLOTS`.

Se reps excedem o limite, o ultimo slot e sobrescrito.

## Score final da sessao

Prioridade de calculo:
1) Media de `repScores` (reps concluIdas)
2) Media de `currentRepFrames` (rep em andamento)
3) Fallback: `emaScore || confidence || frameScore`

Nota:
- O uso de `||` faz o valor 0 cair para o proximo fallback.

## Visual do slider e das reps

### Slider
- Preenchimento = `score` clamped (0..100)
- Handle e bubble usam a mesma porcentagem
- Cor do fill = interpolacao RGB entre:
  - 0 `#ef4444`, 50 `#f97316`, 70 `#fbbf24`, 85 `#22c55e`, 100 `#22c55e`
- Gradiente usa "bands" (min 85/70/50/0) e mistura 65% da cor vizinha.

### Reps
Mesmo esquema de cores e gradiente.
Slots sem score: `rgba(255, 255, 255, 0.15)`.

## Configuracoes relevantes

### `training.constants.ts`
- `SCORE_ALPHA = 0.2`
- `ML_WEIGHT = 0.6`
- `HEUR_WEIGHT = 0.4`
- `SEVERITY_PENALTIES`
- `DEFAULT_REP_SLOTS`, `MAX_REP_SLOTS_CAP`

### `timing.constants.ts`
- `FRAME_THROTTLE_MS = 0`

### `ExerciseConfig`
- `analysisInterval` (default 100ms)
- `mlConfig`:
  - `maxFrames`, `minFrames`, `predictionInterval`, `threshold`

## Observacoes importantes

- `qualityScore` e `confidence` sao o mesmo sinal do ML, em formatos diferentes.
- `combined.confidence` e a confianca do veredito final (nao e o qualityScore).
- O slider nao muda com o modo; o modo muda mensagens e veredito.
- O fallback existe para evitar valor vazio quando ML/heuristica nao entregam score.

## Referencias diretas no codigo

- `elarin-mvp-frontend/src/routes/(app)/train/+page.svelte`
- `elarin-mvp-frontend/src/lib/vision/core/FeedbackSystem.ts`
- `elarin-mvp-frontend/src/lib/vision/core/ExerciseAnalyzer.ts`
- `elarin-mvp-frontend/src/lib/vision/ml/GenericClassifier.ts`
- `elarin-mvp-frontend/src/lib/components/training/QualitySlider.svelte`
- `elarin-mvp-frontend/src/lib/components/training/RepBars.svelte`
