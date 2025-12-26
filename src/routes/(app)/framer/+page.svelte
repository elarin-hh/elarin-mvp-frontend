<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import AppHeader from "$lib/components/common/AppHeader.svelte";
  import { authActions } from "$lib/services/auth.facade";
  import { trainingPlanStore } from "$lib/stores/training-plan.store";

  let isScrolled = $state(false);
  let showAvatarMenu = $state(false);
  const hasPlan = $derived(
    $trainingPlanStore.status === "running" &&
      $trainingPlanStore.items.length > 0,
  );
  const planName = $derived($trainingPlanStore.planName);
  const planDescription = $derived($trainingPlanStore.planDescription);
  const planItems = $derived($trainingPlanStore.items);

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
    } else {
      const handleWindowScroll = () => {
        isScrolled = window.scrollY > 50;
      };
      window.addEventListener("scroll", handleWindowScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", handleWindowScroll);
      };
    }
  });
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

  <main class="min-h-screen w-full px-4 pt-8">
    <div class="max-w-2xl mx-auto">
      <div class="flex justify-center mb-8">
        <div
          class="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center"
        >
          <svg
            class="w-10 h-10 text-primary-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
      </div>

      <h1 class="text-2xl sm:text-3xl font-bold text-white text-center mb-8">
        Antes de Começar
      </h1>

      <div
        class="card-secondary mb-4 p-6 rounded-standard border border-blue-500/20"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5"
          >
            <svg
              class="w-4 h-4 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-white font-semibold mb-2">Aviso</h2>
            <p class="text-white/70 text-sm">
              Nosso app demonstra o fluxo da interface. A captura de câmera e
              detecção de exercícios em tempo real serão habilitadas na próxima
              fase.
            </p>
          </div>
        </div>
      </div>

      <div
        class="card-secondary p-6 rounded-standard border border-green-500/20"
        class:mb-4={hasPlan}
        class:mb-8={!hasPlan}
      >
        <div class="flex items-start gap-3">
          <div
            class="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5"
          >
            <svg
              class="w-4 h-4 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-white font-semibold mb-2">Privacidade</h2>
            <p class="text-white/70 text-sm">
              Sua privacidade é importante. Todo o processamento acontecerá
              localmente no seu dispositivo.
            </p>
          </div>
        </div>
      </div>

      {#if hasPlan}
        <div
          class="card-secondary mb-8 p-6 rounded-standard border border-warning/30"
        >
          <div class="flex items-start gap-3">
            <div
              class="flex-shrink-0 w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center mt-0.5"
            >
              <svg
                class="w-4 h-4 text-warning"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v2h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM18 10H2v6a2 2 0 002 2h12a2 2 0 002-2v-6z"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-white font-semibold mb-2">Plano de treino</h2>
              <div class="text-white/70 text-sm space-y-1">
                <p>Nome: {planName}</p>
                <p>Descricao: {planDescription}</p>
                <p>Exercícios: {planItems.length}</p>
              </div>
            </div>
          </div>

          <div
            class="flex items-start gap-3 mt-4 pt-4 border-t border-white/10"
          >
            <div
              class="flex-shrink-0 w-6 h-6 rounded-full bg-warning/20 flex items-center justify-center mt-0.5"
            >
              <svg
                class="w-4 h-4 text-warning"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M4 5h2v2H4V5zm4 0h8v2H8V5zm-4 4h2v2H4V9zm4 0h8v2H8V9zm-4 4h2v2H4v-2zm4 0h8v2H8v-2z"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-white font-semibold mb-2">Exercícios do plano</h2>
              {#if planItems.length > 0}
                <div class="plan-exercise-tags">
                  {#each planItems as item}
                    <span class="plan-exercise-tag">
                      {item.exercise_name}
                    </span>
                  {/each}
                </div>
              {:else}
                <p class="text-white/70 text-sm">Sem exercicios cadastrados.</p>
              {/if}
            </div>
          </div>
        </div>
      {/if}

      <div class="flex justify-center">
        <button
          type="button"
          class="button-primary px-8 py-3 text-white font-semibold text-lg"
          onclick={() => goto(`${base}/train`)}
        >
          Começar
        </button>
      </div>
    </div>
  </main>
</div>

<style>
  .glass-card {
    background: var(--color-glass-light);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .card-secondary {
    background: var(--color-bg-dark-secondary);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .button-primary {
    background: var(--color-primary-500);
    border-radius: var(--radius-sm);
    transition: var(--transition-base);
  }

  .button-primary:hover {
    background: var(--color-primary-600);
  }

  .plan-exercise-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .plan-exercise-tag {
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: var(--color-text-primary);
    font-size: 0.8rem;
  }
</style>
