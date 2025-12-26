<script lang="ts">
  import { asset } from "$lib/utils/assets";
  import { isDeveloper } from "$lib/config/env.config";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount, onDestroy } from "svelte";
  import type { ComponentType } from "svelte";
  import { Home, User as UserIcon, LayoutDashboard } from "lucide-svelte";

  interface Props {
    isScrolled?: boolean;
    showAvatarMenu?: boolean;
    hasDropdownMenu?: boolean;
    onToggleAvatarMenu?: () => void;
    onSettings?: () => void;
    onLogout?: () => void;
    onClickOutside?: (e: MouseEvent) => void;
  }

  let {
    isScrolled = $bindable(false),
    showAvatarMenu = $bindable(false),
    hasDropdownMenu = true,
    onToggleAvatarMenu = () => {},
    onSettings = () => {},
    onLogout = () => {},
    onClickOutside = () => {},
  }: Props = $props();

  type FooterNavItem = {
    id: string;
    label: string;
    icon: ComponentType;
    href?: string;
    action?: () => void;
  };

  let isDevMode = $state(false);
  let headerElement: HTMLElement;
  let mobileFooterElement: HTMLElement;

  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.style.setProperty("--app-header-offset", "72px");
    root.style.setProperty("--app-footer-offset", "72px");
  }

  $effect(() => {
    isDevMode = isDeveloper();
  });

  function handleLogoClick() {
    goto("/exercises");
  }

  const footerNavItems: FooterNavItem[] = [
    { id: "home", label: "Home", icon: Home, href: "/exercises" },
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
  ];

  function handleFooterNav(item: FooterNavItem) {
    if (item.action) {
      item.action();
      return;
    }
    if (item.href) {
      goto(item.href);
    }
  }

  function isActiveRoute(path: string) {
    const currentPath = $page.url.pathname;
    if (path === "/") {
      return (
        currentPath === "/" ||
        currentPath === "/app" ||
        currentPath.startsWith("/home")
      );
    }
    return currentPath.startsWith(path);
  }

  function updateLayoutOffsets() {
    if (typeof document === "undefined") return;
    const headerHeight = headerElement?.getBoundingClientRect().height ?? 0;
    let footerHeight = 0;
    if (mobileFooterElement) {
      const footerDisplay = getComputedStyle(mobileFooterElement).display;
      if (footerDisplay !== "none") {
        footerHeight = mobileFooterElement.getBoundingClientRect().height;
      }
    }
    const root = document.documentElement;
    root.style.setProperty("--app-header-offset", `${headerHeight}px`);
    root.style.setProperty("--app-footer-offset", `${footerHeight}px`);
  }

  onMount(() => {
    if (typeof ResizeObserver === "undefined") {
      updateLayoutOffsets();
      window.addEventListener("resize", updateLayoutOffsets);
      return () => {
        window.removeEventListener("resize", updateLayoutOffsets);
      };
    }

    const headerObserver = new ResizeObserver(updateLayoutOffsets);
    const footerObserver = new ResizeObserver(updateLayoutOffsets);

    if (headerElement) {
      headerObserver.observe(headerElement);
    }
    if (mobileFooterElement) {
      footerObserver.observe(mobileFooterElement);
    }

    updateLayoutOffsets();
    window.addEventListener("resize", updateLayoutOffsets);

    return () => {
      headerObserver.disconnect();
      footerObserver.disconnect();
      window.removeEventListener("resize", updateLayoutOffsets);
    };
  });

  onDestroy(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.style.setProperty("--app-header-offset", "0px");
      root.style.setProperty("--app-footer-offset", "0px");
    }
  });
</script>

<svelte:window onclick={onClickOutside} />

<header class="fixed top-0 left-0 right-0 z-[10000]" bind:this={headerElement}>
  <div class="header-container px-3 sm:px-4" class:scrolled={isScrolled}>
    <div class="header-glass mx-auto py-2" class:scrolled={isScrolled}>
      <div class="header-content px-4">
        <div class="desktop-header flex items-center justify-between">
          <button
            type="button"
            class="flex items-center logo-button"
            onclick={handleLogoClick}
          >
            <img
              src={asset("/logo-elarin-white.png")}
              alt="Elarin"
              class="h-10 sm:h-12"
            />
          </button>

          <div class="flex items-center gap-2 sm:gap-4">
            {#if isDevMode}
              <div class="dev-badge">
                <svg
                  class="w-3 h-3 sm:w-4 sm:h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                <span>DEV</span>
              </div>
            {/if}

            <button
              type="button"
              class="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center p-0"
              aria-label="Ir para o dashboard"
              onclick={() => goto("/dashboard")}
            >
              <LayoutDashboard class="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </button>

            <!--           <div
              class="glass w-16 h-6 sm:w-18 sm:h-8 flex items-center justify-center"
              style="border-radius: var(--radius-sm);"
            >
              <span class="text-white text-xs font-semibold whitespace-nowrap">PARTNER</span>
            </div> -->

            <div class="avatar-menu-container desktop-avatar">
              <button
                type="button"
                class="profile-btn glass-hover w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center overflow-hidden p-0 rounded-full"
                aria-label="Perfil do usuário"
                onclick={onToggleAvatarMenu}
              >
                <svg
                  class="w-4 h-4 sm:w-6 sm:h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                  />
                </svg>
              </button>

              {#if hasDropdownMenu}
                <div class="dropdown-menu" class:show={showAvatarMenu}>
                  <button
                    type="button"
                    class="menu-item menu-item-settings w-full text-left"
                    onclick={onSettings}
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Configurações
                  </button>
                  <button
                    type="button"
                    class="menu-item menu-item-logout w-full text-left"
                    onclick={onLogout}
                  >
                    <svg
                      class="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Sair
                  </button>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <div class="mobile-header">
          <div class="mobile-header-inner">
            <button
              type="button"
              class="flex items-center logo-button mobile-logo"
              onclick={handleLogoClick}
            >
              <img
                src={asset("/logo-elarin-white.png")}
                alt="Elarin"
                class="h-12"
              />
            </button>
            {#if isDevMode}
              <div class="dev-badge mobile">
                <svg
                  class="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                <span>DEV</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</header>

<footer class="mobile-footer" bind:this={mobileFooterElement}>
  <nav class="mobile-footer-nav">
    {#each footerNavItems as item}
      <button
        type="button"
        class="mobile-nav-button"
        aria-label={item.label}
        class:active={item.href ? isActiveRoute(item.href) : false}
        onclick={() => handleFooterNav(item)}
      >
        <svelte:component this={item.icon} class="mobile-nav-icon" />
      </button>
    {/each}

    <div class="avatar-menu-container mobile-profile">
      <button
        type="button"
        class="mobile-nav-button profile-button"
        aria-label="Abrir menu do usuário"
        onclick={onToggleAvatarMenu}
      >
        <UserIcon class="mobile-nav-icon" />
      </button>

      {#if hasDropdownMenu}
        <div class="dropdown-menu mobile" class:show={showAvatarMenu}>
          <button
            type="button"
            class="menu-item menu-item-settings w-full text-left"
            onclick={onSettings}
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Configurações
          </button>
          <button
            type="button"
            class="menu-item menu-item-logout w-full text-left"
            onclick={onLogout}
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sair
          </button>
        </div>
      {/if}
    </div>
  </nav>
</footer>

<style>
  .header-container {
    transition: all 0.3s ease;
    padding: 0;
  }

  .header-container.scrolled {
    padding: 0;
  }

  .header-glass {
    transition: all 0.3s ease;
    width: 100%;
  }

  .header-glass.scrolled {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-backdrop);
    -webkit-backdrop-filter: var(--glass-backdrop);

    box-shadow: var(--glass-shadow);
  }

  .header-content {
    width: 100%;
  }

  .desktop-header {
    width: 100%;
  }

  .mobile-header {
    width: 100%;
    display: none;
  }

  .mobile-footer {
    display: none;
  }

  .avatar-menu-container {
    position: relative;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 180px;
    background: var(--color-bg-dark-secondary);
    border-radius: var(--radius-standard);
    padding: 8px;
    box-shadow: var(--glass-shadow);
    z-index: 9999;
    opacity: 0;
    transform: translateY(-10px);
    pointer-events: none;
    transition: var(--transition-base);
  }

  .dropdown-menu.show {
    opacity: 1;
    transform: translateY(0);
    pointer-events: all;
  }

  .profile-btn {
    background: var(--color-bg-dark-secondary);
    box-shadow: var(--glass-shadow);
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    color: var(--color-text-primary);
    border-radius: var(--radius-sm);
    transition: var(--transition-base);
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .menu-item:hover {
    background: var(--color-border-light);
  }

  .menu-item-settings {
    color: var(--color-text-primary);
  }

  .menu-item-settings:hover {
    background: rgba(142, 180, 40, 0.1);
    color: var(--color-primary-500);
  }

  .menu-item-logout {
    color: var(--color-error);
  }

  .menu-item-logout:hover {
    background: rgba(255, 68, 68, 0.1);
  }

  .logo-button {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: opacity 0.2s ease;
  }

  .logo-button:hover {
    opacity: 0.8;
  }

  .dev-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    background: rgba(255, 152, 0, 0.05);
    border: 1px solid rgba(255, 152, 0, 0.2);
    border-radius: var(--radius-sm);
    color: var(--color-warning);
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  :global(body) {
    padding-bottom: 0;
    min-height: 100vh;
  }

  @media (max-width: 768px) {
    .desktop-header {
      display: none;
    }

    .mobile-header {
      display: block;
      width: 100%;
    }

    .header-container {
      padding: 0;
    }

    .header-container.scrolled {
      padding: 0;
    }

    .header-glass {
      background: transparent;
      border-radius: 0;
      padding: 0;
    }

    .header-glass.scrolled {
      background: transparent;
      border-radius: 0;
      box-shadow: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }

    .header-content {
      padding: 0;
    }

    .mobile-logo img {
      filter: brightness(0) invert(1);
      opacity: 0.8;
    }

    .mobile-header-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: var(--color-bg-dark-secondary);
      padding: 0 20px;
      height: 72px;
    }

    .mobile-footer {
      display: flex;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9000;
      background: var(--color-bg-dark-secondary);
      padding: 0 20px;
      height: 72px;
    }

    .mobile-footer-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      height: 100%;
    }

    .mobile-nav-button {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      background: transparent;
      color: var(--color-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition-base);
    }

    .mobile-nav-button:hover,
    .mobile-nav-button.active {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--color-border-light);
      color: #ffffff;
    }

    .mobile-nav-icon {
      width: 12px;
      height: 12px;
    }

    .mobile-profile {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .mobile-footer .dropdown-menu {
      top: auto;
      bottom: calc(100% + 12px);
      left: auto;
      right: 0;
      transform: translateY(12px);
    }

    .mobile-footer .dropdown-menu.show {
      transform: translateY(0);
    }
  }

  @media (max-width: 640px) {
    .dev-badge {
      padding: 3px 8px;
      font-size: 0.65rem;
      gap: 4px;
    }
  }
</style>
