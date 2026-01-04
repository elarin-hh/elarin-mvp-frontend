<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import AppHeader from '$lib/components/common/AppHeader.svelte';

  let isScrolled = $state(false);
  let showAvatarMenu = $state(false);

  function toggleAvatarMenu() {
    showAvatarMenu = !showAvatarMenu;
  }

  function handleSettings() {
    showAvatarMenu = false;
    goto(`${base}/settings`);
  }

  async function handleLogout() {
    showAvatarMenu = false;
    goto(`${base}/login`);
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

  <main class="min-h-screen w-full px-4 pt-8 pb-10">
    <section class="dashboard-hero">
      <div class="card-secondary dashboard-card p-6 sm:p-8 rounded-standard">
        <div class="pill">
          <span class="dot"></span>
          Em breve
        </div>
        <div class="headline">
          <h1>Dashboard em desenvolvimento</h1>
          <p>Assim que o time da Elarin finalizar esta tela, seus insights e mActricas aparecerao aqui.</p>
        </div>
      </div>
    </section>
  </main>
</div>

<style>
  .dashboard-hero {
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dashboard-card {
    width: 100%;
    text-align: center;
  }

  .card-secondary {
    background: var(--color-bg-dark-secondary);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: none;
    box-shadow: none;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid var(--color-border-light);
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    letter-spacing: 0.2px;
  }

  .pill .dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
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

  .dashboard-card h1 {
    font-size: 1.6rem;
    margin-bottom: 0.5rem;
    color: var(--color-text-primary);
  }

  .dashboard-card p {
    color: var(--color-text-secondary);
    font-size: 1.05rem;
    margin: 0;
    line-height: 1.6;
  }
</style>
