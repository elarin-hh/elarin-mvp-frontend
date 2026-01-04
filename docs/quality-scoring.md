# Qualidade em Tempo Real e por Repeticao

Documento para padronizar a metrificacao de precisao (0-100%) e como ela alimenta dois visuais na tela de treino (`src/routes/(app)/train/+page.svelte`):

- **Slider de precisao**: mostra quao correta esta a execucao no instante atual (EMA do score por frame).
- **Barras de repeticao ("tubinhos")**: cada repeticao concluida recebe uma cor conforme a qualidade media daquela repeticao.

## Fontes de sinal

- **ML**: `feedback.ml.details.qualityScore` (0-100) quando disponivel; fallback para `feedback.ml.confidence * 100` e, se nao houver, `feedback.combined.confidence * 100`.
- **Heuristica**: `feedback.heuristic.isValid` e lista de `issues` com severidade (`low`, `medium`, `high`, `critical`).
- **Contagem de rep**: `feedback.heuristic.summary.validReps` quando disponivel; fallback para o contador interno (`$trainingStore.reps`).

## Calculo do score por frame

1) **Pesos**: `w_ml = 0.6`, `w_heur = 0.4` (ajustavel).
2) **score_ml (0-100)**:
   - Se houver `qualityScore` numerico em `feedback.ml.details`, usar direto.
   - Senao, usar `feedback.ml.confidence * 100` (se existir).
   - Senao, usar `feedback.combined.confidence * 100` (se existir).
   - Se ML indisponivel, marcar como `null`.
3) **score_heur (0-100)**:
   - Se `heuristic.isValid === true`: 95.
   - Se invalido: `100 - sum(penalidades)`, clamp 0-100.
   - Penalidades por severidade: `critical=60`, `high=40`, `medium=25`, `low=10`.
   - Se heuristica indisponivel, marcar como `null`.
4) **score_frame**:
   - Se so ML: usar `score_ml`.
   - Se so heuristica: usar `score_heur`.
   - Se ambos: `clamp(w_ml * score_ml + w_heur * score_heur, 0, 100)`.
5) **Suavizacao para o slider**:
   - EMA: `ema = alpha * score_frame + (1 - alpha) * ema_prev`, com `alpha = 0.2` (ajustavel).
   - Se `score_frame` for `null`, a EMA nao e atualizada (mantem o valor anterior).

## Score por repeticao (preencher barras)

1) Manter `currentRepFrames: number[]`.
2) A cada `handleFeedback`, adicionar `score_frame` em `currentRepFrames` quando houver score valido.
3) Quando `validReps` aumentar:
   - `repIndex = min(nextRepCount - 1, maxSlots - 1)`.
   - `rep_score = average(currentRepFrames)` se houver frames; senao usar `frameScore` (ultimo score conhecido) com clamp.
   - Armazenar em `repScores[repIndex]`.
   - Limpar `currentRepFrames`.
4) Enquanto uma repeticao esta em andamento, o slot atual (indice `currentReps`) mostra media parcial de `currentRepFrames` se ainda nao houver score salvo.

### Slots e limite de repeticoes

- `maxSlots` e dinamico:
  - Se houver meta de reps: `maxSlots = min(MAX_REP_SLOTS_CAP, max(1, target))`.
  - Se nao houver meta: `maxSlots = DEFAULT_REP_SLOTS` (30).
- `MAX_REP_SLOTS_CAP` e 60.
- Se o usuario ultrapassar `maxSlots`, o ultimo slot e sobrescrito (repIndex fica travado em `maxSlots - 1`).

## Como detectar repeticao

- Usa `feedback.heuristic.summary.validReps` quando disponivel.
- Se heuristica nao estiver disponivel, `nextRepCount` nao avanca e a repeticao nao e fechada.

## Mapeamento de cores

Slider e barras usam interpolacao linear entre os mesmos `colorStops`:

- 0 -> `#ef4444`
- 50 -> `#f97316`
- 70 -> `#fbbf24`
- 85 -> `#22c55e`
- 100 -> `#22c55e`

Para gradiente visual, usam "bands" (min 85/70/50/0) e misturam 65% da cor vizinha:
`start = mix(base, neighbor, 0.65)` e `end = base`.

Slots sem score usam cor neutra `rgba(255, 255, 255, 0.15)`.

## UI/UX

- Slider: mostra `emaScore` arredondado e cor/gradiente calculados acima.
- Barras: `currentReps / maxSlots` quando `showCount` esta ativo.
- Slots sem score ficam neutros; o slot atual pode mostrar media parcial.

## Fluxo de dados no codigo

1) `handleFeedback(feedback)`:
   - Calcular `score_frame`.
   - Se houver score, atualizar `emaScore` e `currentRepFrames`.
2) `maybeRegisterRep(feedback)`:
   - Comparar `validReps` com `currentReps`.
   - Salvar `rep_score` em `repScores` (com cap de slots).
3) Render:
   - `QualitySlider` usa `emaScore`.
   - `RepBars` usa `repScores`, `currentRepFrames`, `currentReps` e `maxSlots`.

## Edge cases

- ML indisponivel: usar heuristica apenas.
- Heuristica indisponivel: usar ML apenas.
- Ambos indisponiveis: `score_frame` e `null` e a EMA nao muda.
- `qualityScore` ausente/NaN: cair para confidence.
- Se reps excederem `maxSlots`, o ultimo slot e sobrescrito.

## Iteracoes futuras

- Expor pesos e cores em config.
- Mostrar tooltip por barra com score numerico.
- Ajustar severidades especificas por exercicio (ex: lunge).
