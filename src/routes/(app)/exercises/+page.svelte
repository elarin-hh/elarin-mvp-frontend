<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { base } from "$app/paths";
  import type { PageData } from "./$types";
  import {
    trainingActions,
    type ExerciseType,
  } from "$lib/stores/training.store";
  import { trainingPlanActions } from "$lib/stores/training-plan.store";
  import { onMount } from "svelte";
  import { asset } from "$lib/utils/assets";
  import type { Exercise } from "$lib/api/exercises.api";
  import type { AssignedTrainingPlan } from "$lib/api/training-plans.api";
  import { trainingPlansApi } from "$lib/api/training-plans.api";
  import { authActions } from "$lib/services/auth.facade";
  import AppHeader from "$lib/components/common/AppHeader.svelte";
  import Loading from "$lib/components/common/Loading.svelte";
  import ErrorState from "$lib/components/common/ErrorState.svelte";
  import EmptyState from "$lib/components/common/EmptyState.svelte";

  let { data }: { data: PageData } = $props();

  let isScrolled = $state(false);
  let exercises = $state<Exercise[]>(data.exercises ?? []);
  let errorMessage = $state(data.errorMessage ?? "");
  let assignedPlan = $state<AssignedTrainingPlan | null>(
    data.assignedPlan ?? null,
  );
  let planErrorMessage = $state(data.planErrorMessage ?? "");
  let planStartError = $state("");
  let isStartingPlan = $state(false);
  let showAvatarMenu = $state(false);
  let isRefreshing = $state(false);

  const fallbackImage =
    "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=600&fit=crop";

  $effect(() => {
    exercises = data.exercises ?? [];
    errorMessage = data.errorMessage ?? "";
    assignedPlan = data.assignedPlan ?? null;
    planErrorMessage = data.planErrorMessage ?? "";
  });

  onMount(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      isScrolled = target.scrollTop > 50;
    };

    const viewport = document.querySelector(".sa-viewport");

    if (viewport) {
      viewport.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        viewport.removeEventListener("scroll", handleScroll);
      };
    }

    const handleWindowScroll = () => {
      isScrolled = window.scrollY > 50;
    };
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
    };
  });

  async function handleRefresh() {
    isRefreshing = true;
    try {
      await invalidateAll();
    } catch (err) {
      errorMessage =
        (err as Error)?.message || "Falha ao recarregar exercicios";
    } finally {
      isRefreshing = false;
    }
  }

  async function handleExerciseSelect(exercise: Exercise) {
    if (!exercise.is_active) {
      return;
    }

    trainingPlanActions.reset();
    trainingActions.selectExercise(
      exercise.type as ExerciseType,
      exercise.name_pt || exercise.name,
    );
    goto(`${base}/framer`);
  }

  async function handleStartPlan() {
    if (!assignedPlan || isStartingPlan) {
      return;
    }

    planStartError = "";
    isStartingPlan = true;

    const response = await trainingPlansApi.startSession(assignedPlan.plan_id);
    if (!response.success) {
      planStartError =
        response.error?.message || "Falha ao iniciar plano de treino";
      isStartingPlan = false;
      return;
    }

    const session = response.data;
    const firstItem = session.items[0];
    const firstExerciseType = firstItem?.exercise_type || "";

    if (!firstItem || !firstExerciseType) {
      planStartError = "Plano sem exercicios disponiveis";
      isStartingPlan = false;
      return;
    }

    trainingPlanActions.beginSession({
      planId: session.plan_id,
      planName: session.plan_name ?? assignedPlan.name,
      planDescription:
        session.plan_description ?? assignedPlan.description ?? null,
      assignmentId: session.assignment_id,
      planSessionId: session.session_id,
      items: session.items,
    });

    trainingActions.prepareForNextExercise(
      firstExerciseType as ExerciseType,
      firstItem.exercise_name ?? undefined,
    );

    goto(`${base}/framer`);
    isStartingPlan = false;
  }

  function getExerciseImage(exercise: Exercise): string {
    if (exercise.image_url) return exercise.image_url;
    return fallbackImage;
  }

  function toggleAvatarMenu() {
    showAvatarMenu = !showAvatarMenu;
  }

  function handleSettings() {
    showAvatarMenu = false;
    goto(`${base}/settings`);
  }

  async function handleLogout() {
    showAvatarMenu = false;
    await authActions.logout();
    goto(`${base}/login`);
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".avatar-menu-container")) {
      showAvatarMenu = false;
    }
  }

</script>

<div class="page-background">
  <AppHeader
    bind:isScrolled
    bind:showAvatarMenu
    hasDropdownMenu={true}
    onToggleAvatarMenu={toggleAvatarMenu}
    onSettings={handleSettings}
    onLogout={handleLogout}
    onClickOutside={handleClickOutside}
  />

  <main class="w-full px-4 pb-4 pt-4">
    <section class="training-plan-section">
      <div class="training-plan-card" class:empty={!assignedPlan}>
        <div class="plan-header">
          <div class="plan-heading">
            <span class="plan-label">Plano de treino</span>
            <h2 class="plan-title">
              {assignedPlan?.name || "Nenhum plano ativo"}
            </h2>
            <p class="plan-description">
              {assignedPlan?.description ||
                "Assim que um plano estiver ativo, ele aparecera aqui."}
            </p>
          </div>
          <div class="plan-meta">
            <div class="plan-meta-item">
              <span class="meta-value">
                {assignedPlan?.items?.length ?? 0}
              </span>
              <span class="meta-label">exercicios</span>
            </div>
          </div>
        </div>

        {#if assignedPlan}
          <div class="plan-items">
            {#each assignedPlan.items.slice(0, 3) as item}
              <span class="plan-chip">
                {item.exercise_name || item.exercise_type || "exercicio"}
              </span>
            {/each}
            {#if assignedPlan.items.length > 3}
              <span class="plan-chip muted">
                +{assignedPlan.items.length - 3}
              </span>
            {/if}
          </div>

          <div class="plan-actions">
            <button
              type="button"
              class="button-primary plan-start-button"
              onclick={handleStartPlan}
              disabled={isStartingPlan || assignedPlan.items.length === 0}
            >
              {isStartingPlan ? "Iniciando..." : "Iniciar treino"}
            </button>
            {#if planStartError}
              <p class="plan-error">{planStartError}</p>
            {/if}
          </div>
        {:else}
          <div class="plan-empty">
            <p class="plan-empty-text">Nenhum plano ativo no momento.</p>
            <p class="plan-empty-note">
              Fale com sua organizacao para liberar um plano.
            </p>
          </div>
        {/if}

        {#if planErrorMessage}
          <p class="plan-error">{planErrorMessage}</p>
        {/if}
      </div>
    </section>

    {#if errorMessage}
      <ErrorState
        fullHeight={true}
        title="Erro ao carregar exercicios"
        description={errorMessage}
        actionLabel="Tentar novamente"
        onAction={handleRefresh}
      />
    {:else if exercises.length === 0}
      <EmptyState
        fullHeight={true}
        title="Nenhum exercicio disponivel"
        description="Entre em contato com o suporte."
      />
    {:else}
      <div
        class="grid grid-cols-2 max-[420px]:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 w-full"
      >
        {#each exercises as exercise}
          <div
            class="flex flex-col cursor-pointer group {!exercise.is_active
              ? 'exercise-inactive'
              : ''}"
            onclick={() => handleExerciseSelect(exercise)}
            onkeypress={(e) =>
              e.key === "Enter" && handleExerciseSelect(exercise)}
            role="button"
            tabindex={exercise.is_active ? 0 : -1}
            aria-label={exercise.is_active
              ? `Selecionar ${exercise.name}`
              : `${exercise.name} - Em Breve`}
          >
            <div
              class="relative h-36 sm:h-44 rounded overflow-hidden w-full z-10"
            >
              <img
                src={getExerciseImage(exercise)}
                class="absolute inset-0 w-full h-full object-cover"
              />

              <div class="glass-overlay absolute inset-0"></div>

              <div
                class="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
              >
                <div
                  class="button-primary px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3"
                >
                  <svg
                    class="w-4 h-4 sm:w-5 sm:h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span class="text-white text-sm sm:text-base font-medium"
                    >{exercise.name}</span
                  >
                </div>
              </div>

              {#if !exercise.is_active}
                <div class="absolute top-2 right-2 badge-inactive">
                  Em Breve
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </main>

  {#if isRefreshing}
    <Loading message="Recarregando exercicios..." />
  {/if}

</div>

<style>
  .button-primary {
    background: var(--color-primary-500);
    border-radius: var(--radius-sm);
    transition: var(--transition-base);
  }

  .button-primary:hover {
    background: var(--color-primary-600);
  }

  .training-plan-section {
    margin-bottom: 1.5rem;
  }

  .training-plan-card {
    background: var(--color-bg-dark-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-light);
    padding: clamp(1rem, 3vw, 1.5rem);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .training-plan-card.empty {
    background: rgba(255, 255, 255, 0.02);
    border-style: dashed;
  }

  .plan-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
    justify-content: space-between;
  }

  .plan-label {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.6rem;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.08);
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .plan-title {
    margin: 0.5rem 0 0.2rem;
    font-size: 1.35rem;
    color: var(--color-text-primary);
    font-weight: 700;
  }

  .plan-description {
    margin: 0;
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    max-width: 520px;
  }

  .plan-meta {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .plan-meta-item {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
  }

  .meta-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-primary-400);
  }

  .meta-label {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .plan-items {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .plan-chip {
    padding: 0.3rem 0.75rem;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    font-size: 0.8rem;
    color: var(--color-text-primary);
  }

  .plan-chip.muted {
    color: var(--color-text-secondary);
  }

  .plan-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .plan-start-button {
    padding: 0.6rem 1.5rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .plan-start-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .plan-error {
    margin: 0;
    color: var(--color-error);
    font-size: 0.85rem;
  }

  .plan-empty-text {
    margin: 0;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .plan-empty-note {
    margin: 0.35rem 0 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .glass-overlay {
    background: rgba(70, 70, 70, 0.25);
    backdrop-filter: blur(2px);
  }

  .exercise-inactive {
    opacity: 0.6;
    cursor: not-allowed !important;
    pointer-events: none;
  }

  .exercise-inactive img {
    filter: grayscale(100%);
  }

  .exercise-inactive .glass-overlay {
    background: rgba(0, 0, 0, 0.7);
  }

  .exercise-inactive .button-primary {
    background: #6c757d !important;
  }

  .badge-inactive {
    background: rgba(220, 53, 69, 0.9);
    backdrop-filter: blur(var(--blur-md));
    -webkit-backdrop-filter: blur(var(--blur-md));
    color: var(--color-text-primary);
    padding: 4px 12px;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
</style>
