<script lang="ts">
  import { goto } from '$app/navigation';
  import AppHeader from '$lib/components/common/AppHeader.svelte';

  let isScrolled = $state(false);
  let showAvatarMenu = $state(false);

  function toggleAvatarMenu() {
    showAvatarMenu = !showAvatarMenu;
  }

  function handleSettings() {
    showAvatarMenu = false;
    goto('/settings');
  }

  async function handleLogout() {
    showAvatarMenu = false;
    goto('/login');
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.avatar-menu-container')) {
      showAvatarMenu = false;
    }
  }
</script>

<svelte:head>
  <title>Dashboard - Elarin</title>
</svelte:head>

<main class="dashboard-page">
  <AppHeader
    bind:isScrolled
    bind:showAvatarMenu
    hasDropdownMenu={true}
    onToggleAvatarMenu={toggleAvatarMenu}
    onSettings={handleSettings}
    onLogout={handleLogout}
    onClickOutside={handleClickOutside}
  />

  <section class="dashboard-hero">
    <div class="card">
      <div class="pill">
        <span class="dot"></span>
        Em breve
      </div>
      <div class="headline">
        <h1>Dashboard em desenvolvimento</h1>
        <p>Assim que o time da Elarin finalizar esta tela, seus insights e métricas aparecerão aqui.</p>
      </div>
    </div>
  </section>
</main>

<style>
  .dashboard-page {
    min-height: 100vh;
    background: var(--color-bg-dark);
    color: var(--color-text-primary);
    padding: 5rem 1rem 6rem;
  }

  .dashboard-hero {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
  }

  .card {
    width: 100%;
    max-width: 720px;
    padding: clamp(1.5rem, 4vw, 2rem);
    background: var(--color-bg-dark-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-light);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    text-align: center;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--color-border-light);
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    letter-spacing: 0.2px;
  }

  .pill .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-warning);
    box-shadow: 0 0 8px rgba(255, 165, 0, 0.8);
  }

  .headline {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    text-align: center;
  }

  .card h1 {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
    color: var(--color-primary-400);
  }

  .card p {
    color: var(--color-text-secondary);
    font-size: 1.05rem;
    margin: 0;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .dashboard-page {
      padding-top: 4.5rem;
      padding-bottom: 7rem;
    }
  }
</style>
