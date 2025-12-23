# Documento: Plano de Treino (sequencia de exercicios)

## Objetivo
Descrever como implementar plano de treino (sequencia de exercicios) criado no painel B2B e vinculado a um usuario B2C, com execucao automatica de um exercicio apos o outro. Este arquivo e somente documentacao (sem mudancas de codigo).

## Estado atual (resumo rapido)
- Backend: `POST /training/save` grava em `app_training_sessions` (`exercise`, `reps`, `sets`, `duration_ms`, `valid_ratio`, `organization_id`).
- B2B: organizacoes atribuem exercicios via `POST /organizations/users/:userId/exercises` (baseado em `app_exercise_templates`).
- B2C: lista de exercicios vem de `GET /exercises` (tabela `app_user_exercises`).
- Config do exercicio: `/train` carrega `static/exercises/<exerciseType>/config.json` (nao usa config do backend no momento).

## Definicao de plano de treino
Plano de treino = lista ordenada de exercicios (templates), executados em sequencia. Ao finalizar um exercicio, o app inicia o proximo ate concluir toda a lista.

---

## Proposta de dados (Supabase)

### Tabelas novas
1) `app_training_plans`
    - `id` (pk)
    - `organization_id` (fk `app_organizations`)
    - `name`, `description`
    - `is_active`
    - `created_at`, `updated_at`
    - opcional: `created_by_auth_uid` (org auth) ou remover (org ja identifica o autor)

2) `app_training_plan_items`
    - `id` (pk)
    - `plan_id` (fk `app_training_plans`)
    - `template_id` (fk `app_exercise_templates`)
    - `exercise_type` (denormalizado de `app_exercise_templates.type`, opcional)
    - `position` (ordem)
    - targets: `target_reps`, `target_sets`, `target_duration_sec`, `rest_seconds`
    - opcional: `metrics_override` (json) para sobrescrever targets por `id`

3) `app_training_plan_assignments`
    - `id` (pk)
    - `plan_id` (fk `app_training_plans`)
    - `user_id` (fk `app_users`)
    - `organization_id` (fk `app_organizations`, opcional para filtros)
    - `assigned_by_org_id` ou `assigned_by_auth_uid` (nao existe org-user)
    - `is_active`
    - `assigned_at`, `ended_at`
    - recomendado: unica atribuicao ativa por usuario (unique parcial)

4) `app_training_plan_sessions`
    - `id` (pk)
    - `plan_id`, `user_id`, `assignment_id`
    - `status` (in_progress | completed | abandoned)
    - `started_at`, `completed_at`
    - progresso pode ser derivado de `app_training_sessions.sequence_index`

### Ajustes em tabela existente
`app_training_sessions` (treino por exercicio):
- adicionar `plan_session_id` (fk `app_training_plan_sessions`)
- adicionar `plan_item_id` (fk `app_training_plan_items`)
- adicionar `sequence_index` (posicao do exercicio na sessao)
- manter `exercise` como tipo do exercicio salvo hoje

### Regras principais
- Plano e sempre da organizacao (B2B).
- Ao atribuir plano: garantir que o usuario tenha `app_user_exercises` para cada template do plano (usar a mesma logica do `assignExerciseToUser`).
- Um usuario pode ter 0 ou 1 plano ativo (simplifica B2C). Se precisar de varios, adicionar `is_primary` e selector no app.
- Validar que o usuario pertence a organizacao antes de atribuir/iniciar.

---

## Backend (NestJS)

### Modulo novo sugerido
`TrainingPlansModule` (para nao conflitar com `PlansModule` de assinatura):
- `src/modules/training-plans/*`

### Endpoints B2B (organizacoes)
Base `@Controller('organizations')` + `@OrganizationRoute()` + `OrganizationAuthGuard`:
- `GET /organizations/training-plans`
  Lista planos da organizacao (com contagem de itens e usuarios ativos).
- `POST /organizations/training-plans`
  Cria plano (name, description).
- `GET /organizations/training-plans/:planId`
  Detalhes + itens ordenados (join com `app_exercise_templates`).
- `PATCH /organizations/training-plans/:planId`
  Atualiza metadata.
- `DELETE /organizations/training-plans/:planId`
  Inativa plano (soft delete).

Itens:
- `POST /organizations/training-plans/:planId/items`
  Body: `{ template_id, position, targets... }`.
- `PATCH /organizations/training-plans/:planId/items/:itemId`
  Edita ordem/targets.
- `DELETE /organizations/training-plans/:planId/items/:itemId`

Atribuicao:
- `POST /organizations/users/:userId/training-plan`
  Body: `{ plan_id }`. Cria/atualiza atribuicao ativa.
- `DELETE /organizations/users/:userId/training-plan`
  Remove atribuicao ativa.

### Endpoints B2C (usuario)
Base `@Controller('training-plans')` (com `JwtAuthGuard`):
- `GET /training-plans/assigned`
  Retorna plano ativo + itens ordenados + `assignment_id`.
- `POST /training-plans/:planId/start`
  Cria `app_training_plan_sessions` (ou retorna sessao em andamento).
- `POST /training-plans/sessions/:sessionId/finish`
  Finaliza sessao do plano.

### Ajuste no treino por exercicio
`POST /training/save` deve aceitar (opcional):
- `plan_session_id`
- `plan_item_id`
- `sequence_index`

Validacoes minimas:
- `plan_session_id` pertence ao usuario autenticado.
- `plan_item_id` pertence ao `plan_id` da sessao.
- `exercise_type` bate com o `type` do template do item.

### Impactos cruzados
- `src/modules/auth/auth.service.ts`: ao deletar usuario, remover atribuicoes e sessoes de plano.
- `src/modules/auth/user-profile.service.ts`: incluir dados de plano no export (atribuicoes e sessoes).
- `src/modules/training/training.service.ts`: validar exercicio ativo por `user_id` + `type` (hoje filtra apenas por `type`).

---

## B2B (painel organizacoes)

### Fluxo
1) Criar plano de treino (name/description).
2) Adicionar exercicios do catalogo (templates) e ordenar.
3) Atribuir plano a um usuario.

### UI sugerida
Rotas novas:
- `src/routes/(app)/training-plans/+page.svelte` (lista/criacao)
- `src/routes/(app)/training-plans/[id]/+page.svelte` (detalhe e ordem)
- Em `src/routes/(app)/users/[id]/+page.svelte`, adicionar secao "Plano de treino" para atribuir/remover.

### API client (B2B)
Adicionar em `src/lib/api/organizations.api.ts`:
- `getTrainingPlans`, `getTrainingPlan`, `createTrainingPlan`, `updateTrainingPlan`, `deleteTrainingPlan`
- `addTrainingPlanItem`, `updateTrainingPlanItem`, `removeTrainingPlanItem`
- `assignTrainingPlanToUser`, `removeTrainingPlanFromUser`

### Validacoes
- Nao permitir plano vazio.
- Nao permitir templates inativos.
- Ao atribuir: garantir criacao/ativacao de `app_user_exercises` para cada item do plano.

---

## B2C (app usuario)

### Descoberta do plano ativo
No boot/`/exercises`, chamar `GET /training-plans/assigned`:
- Se existir plano ativo: mostrar card "Iniciar treino".
- Treino isolado continua disponivel.
  - A tela `/exercises` deve ter uma secao dedicada "Planos de treino":
    - Exibe o plano ativo (nome, descricao curta, total de exercicios).
    - Botao principal: "Iniciar treino" (chama `POST /training-plans/:planId/start`).
    - Estado vazio: "Nenhum plano ativo" + CTA opcional para falar com a organizacao.

### Sessao de plano
Ao clicar "Iniciar treino":
1) `POST /training-plans/:planId/start` -> retorna `session_id` + itens.
2) Iniciar treino no primeiro item.
3) A cada exercicio finalizado, chamar `POST /training/save` com contexto de plano.
4) Avancar para o proximo item ate terminar, depois `POST /training-plans/sessions/:sessionId/finish`.

### Estado local (stores)
Adicionar store novo (ou estender o atual):
- `planId`, `planName`, `assignmentId`, `planSessionId`
- `items[]`, `currentIndex`
- `status` (idle | running | finished)

Possiveis arquivos:
- `src/lib/stores/training-plan.store.ts` (novo)
- Ajustes em `src/lib/stores/training.store.ts` para receber `plan_session_id` no `finish()`.

### Fluxo no `/train` (fases atuais)
O `/train` usa fases: `positioning -> confirmation -> description -> countdown -> training -> summary`.
Para plano:
- Ao concluir um exercicio, se houver proximo item:
  - salvar treino (`POST /training/save`) com contexto de plano
  - atualizar store para o proximo item
  - resetar reps/tempo e reinicializar `ExerciseAnalyzer`
  - voltar para `description` (usa `NextExerciseInfo` com metas do proximo item)
- No fim do plano:
  - salvar ultimo treino
  - finalizar sessao do plano
  - exibir resumo agregado (pode ser overlay/tela nova apos o summary atual)

### Metrics e targets
- O `/train` carrega `static/exercises/<id>/config.json`.
- Aplicar overrides dos targets do plano em memoria antes de `normalizeExerciseMetrics()`.
- Nao gravar esses overrides em `app_user_exercises.config`.

---

## Compatibilidade
- Treino isolado continua funcionando sem plano.
- Planos nao alteram exercicios do usuario (apenas garantem que existam quando atribuimos).

---

## Observabilidade e testes (sugestao)
- Logs no backend ao iniciar/finalizar sessao de plano e ao salvar exercicio com contexto.
- Testes de API para:
  - criar plano + itens
  - atribuir plano a usuario
  - iniciar sessao e salvar exercicios em sequencia
