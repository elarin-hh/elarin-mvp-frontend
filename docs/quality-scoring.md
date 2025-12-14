# Qualidade em Tempo Real e por Repeticao

Documento para padronizar a metrificacao de precisao (0-100%) e como ela alimenta dois visuais na tela de treino (`src/routes/(app)/train/+page.svelte`):

- **Slider de precisao**: mostra quao correta esta a execucao no instante atual.
- **Barras de repeticao ("tubinhos")**: cada repeticao concluida recebe uma cor conforme a qualidade media daquela repeticao.

## Fontes de sinal

- **ML**: `feedback.ml.details.qualityScore` (0-100) quando disponivel; fallback `feedback.combined.confidence * 100`.
- **Heuristica**: `feedback.heuristic.isValid` e lista de `issues` com severidade (`low`, `medium`, `high`, `critical`).
- **Contagem de rep**: `valid_repetition` em `feedback.heuristic.details` (Squat validator) e `validReps`.
- **Estado geral**: `feedback.combined.verdict` (`correct`, `incorrect`, `unknown`).

## Calculo do score por frame

1) **Pesos**: `w_ml = 0.6`, `w_heur = 0.4` (pode ser ajustado).
2) **score_ml (0-100)**:
   - Se houver `qualityScore` numerico em `feedback.ml.details`, usar direto.
   - Senao, usar `feedback.combined.confidence * 100`.
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
   - Opcional: pausar a atualizacao se `verdict === "unknown"` ou camera emulada.

## Score por repeticao (preencher barras)

1) Manter `currentRepFrames: number[]`.
2) A cada `handleFeedback`, push do `score_frame` em `currentRepFrames` (quando houver score valido).
3) Quando detectar repeticao valida:
   - Fechar a repeticao atual: `rep_score = average(currentRepFrames)` (fallback 0 se vazio).
   - Armazenar em `repScores[repIndex]` (max 30).
   - Limpar `currentRepFrames`.
4) Enquanto uma repeticao esta em andamento, pode-se mostrar barra parcial com a media atual.

### Como detectar repeticao

- Usar o issue `valid_repetition` em `feedback.heuristic.details` ou comparar `validReps` acumulado.
- Condicional: so fechar repeticao se heuristica estiver disponivel e o evento for valido.

## Mapeamento de cores

Usar faixas simples (podemos interpolar depois):

- 0-49: vermelho `#ef4444`
- 50-69: laranja `#f97316`
- 70-84: ambar `#fbbf24`
- 85-100: verde `#22c55e`

Aplicar tanto no slider quanto nas barras. Reps futuras ficam cinza translucid (`#334155` ou equivalente em tema dark).

## UI/UX

- Slider: mostra `ema` arredondado e cor dinamica. Legenda curta:
  - `>= 85`: "Execucao correta"
  - `70-84`: "Quase la"
  - `< 70`: "Ajustar tecnica"
- Barras: 30 slots. Cada repeticao concluida pinta a barra com a cor da sua qualidade. Barra da repeticao em andamento pode usar cor parcial (media atual). Futuras ficam cinza.
- Se ML indisponivel e heuristica indisponivel, congelar em neutro.

## Fluxo de dados no codigo

1) `handleFeedback(feedback)`:
   - Calcular `score_frame` seguindo as regras.
   - Atualizar `emaScore`.
   - Atualizar `currentRepFrames`.
   - Se vier `valid_repetition`, fechar repeticao e salvar em `repScores`.
   - Atualizar `reconstructionError` se existir.
2) `handleMetricsUpdate(metrics)`:
   - Pode continuar exibindo mActbricas gerais, mas `accuracy` do slider passa a ser `emaScore`.
3) Render:
   - Slider vertical usa `emaScore`.
   - Contador "Reps." usa `repScores` para pintar cada barra.

## Edge cases

- ML indisponivel: usar heuristica apenas.
- Heuristica indisponivel: usar ML apenas.
- `qualityScore` ausente ou NaN: cair para confidence*100.
- Evitar spam: se camera emulada e sem feedback, manter neutro.

## Iteracoes futuras

- Expor pesos e cores em config.
- Mostrar tooltip por barra com score numerico.
- Ajustar severidades especificas por exercicio (por ex., lunge).

