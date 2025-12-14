# Sistema de Metrícas Modular (Treino /train)

## O que foi implementado

- **Componentes dinâmicos por exercício**: cada exercício pode declarar a lista de componentes de métricas a exibir (ex.: `quality_slider`, `rep_bars`). Se não declarar nada, nenhum componente é exibido.
- **Leitura via config do exercício**: o campo `components` foi adicionado em `ExerciseConfig` e lido em `loadExerciseConfig`. O valor é carregado no `/train` ao iniciar o exercício.
- **Render condicional no `/train`**: o código passou a verificar `hasComponent(...)` antes de renderizar:
  - Slider vertical de qualidade (usa `quality_slider`)
  - Barras/contador de repetições (usa `rep_bars`)
  - A contagem de reps só é atualizada se `rep_bars` estiver ativo.
- **Defaults aplicados**: se um exercício não especificar `components`, nenhum componente de métrica é renderizado.

## Arquivos tocados

- `src/lib/vision/types/exercise.types.ts`  
  - Adicionados campos opcionais `components` e `metrics` ao `ExerciseConfig`.

- `src/lib/vision/config/exerciseConfigs.ts`  
  - Carrega `components` do JSON do exercício e, se ausente, aplica o default `["quality_slider", "rep_bars"]`.

- `static/exercises/bodyweight_squat/config.json`  
  - Inclui `components: ["quality_slider", "rep_bars"]` como exemplo/base.

- `src/routes/(app)/train/+page.svelte`  
  - Novo estado `activeComponents` e helper `hasComponent`.
  - Ao iniciar a câmera, ativa os componentes declarados no config.
  - Renderiza slider e barras apenas se o componente correspondente estiver ativo; contagem de reps só roda se `rep_bars` estiver ativo.
  - Bolinha do slider ganhou miolo branco novamente (ajuste visual).

## Como usar nos próximos exercícios

1) No `config.json` do exercício, declare:
   ```json
   {
     "exerciseName": "single_leg_balance",
     "components": ["quality_slider", "stability_chart"],
     "metrics": ["stability_score", "hold_time"]
   }
   ```
2) No validador do exercício, exponha no `summary` as métricas esperadas pelo(s) componente(s) (ex.: `validReps`, `stability_score`, `holdTimeMs` etc.).
3) No `/train`, crie/renderize novos componentes UI apenas se estiverem listados em `components`.

## Observações

- O pipeline de feedback ML + heurística permanece igual; apenas a camada de exibição foi modularizada.
- Para exercícios sem reps, basta omitir `rep_bars` em `components`; o contador e a lógica de reps serão ignorados.***
