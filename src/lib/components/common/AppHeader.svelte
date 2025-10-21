<script lang="ts">
  import { asset } from '$lib/utils/assets';
  import { isDeveloper } from '$lib/config/env.config';

  interface Props {
    isScrolled?: boolean;
    showAvatarMenu?: boolean;
    hasDropdownMenu?: boolean;
    onToggleAvatarMenu?: () => void;
    onLogout?: () => void;
    onClickOutside?: (e: MouseEvent) => void;
  }

  let {
    isScrolled = $bindable(false),
    showAvatarMenu = $bindable(false),
    hasDropdownMenu = true,
    onToggleAvatarMenu = () => {},
    onLogout = () => {},
    onClickOutside = () => {}
  }: Props = $props();

  let isDevMode = $state(false);

  $effect(() => {
    isDevMode = isDeveloper();
  });
</script>

<svelte:window onclick={onClickOutside} />

<header class="fixed top-0 left-0 right-0 z-50">
  <div class="header-container px-3 sm:px-4" class:scrolled={isScrolled}>
    <div class="header-glass mx-auto py-2" class:scrolled={isScrolled}>
      <div class="flex items-center justify-between px-4">
        <div class="flex items-center">
          <img src={asset('/logo-elarin.png')} alt="Elarin" class="h-12 sm:h-14" />
        </div>

        <div class="flex items-center gap-2 sm:gap-4">
          {#if isDevMode}
            <div class="dev-badge">
              <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          <div
            class="glass-button w-10 h-6 sm:w-12 sm:h-8 flex items-center justify-center rounded-full"
          >
            <span class="text-white text-xs font-semibold whitespace-nowrap">PRO</span>
          </div>

          <div class="avatar-menu-container">
            <button
              type="button"
              class="glass-button-round w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center overflow-hidden p-0"
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
                <button type="button" class="menu-item w-full text-left" onclick={onLogout}>
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </div>
  </div>
</header>

<style>
  .glass-button {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border-radius: 8px;
    position: relative;
    overflow: hidden;
  }

  .glass-button-round {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border-radius: 50%;
    position: relative;
    overflow: hidden;
  }

  .glass-button-round:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .header-container {
    transition: all 0.3s ease;
    padding: 0;
  }

  .header-container.scrolled {
    padding: 8px;
  }

  .header-glass {
    transition: all 0.3s ease;
    width: 100%;
  }

  .header-glass.scrolled {
    background: rgba(18, 18, 18, 0.55);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 16px;
  }

  .avatar-menu-container {
    position: relative;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 180px;
    background: rgba(18, 18, 18, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    opacity: 0;
    transform: translateY(-10px);
    pointer-events: none;
    transition: all 0.2s ease;
  }

  .dropdown-menu.show {
    opacity: 1;
    transform: translateY(0);
    pointer-events: all;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    color: #ef4444;
    border-radius: 8px;
    transition: all 0.2s ease;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .menu-item:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  .dev-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: linear-gradient(135deg, rgba(255, 152, 0, 0.2), rgba(255, 87, 34, 0.2));
    border: 1px solid rgba(255, 152, 0, 0.4);
    border-radius: 20px;
    color: #ff9800;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    animation: pulse-dev 2s ease-in-out infinite;
  }

  @keyframes pulse-dev {
    0%,
    100% {
      box-shadow: 0 0 8px rgba(255, 152, 0, 0.3);
    }
    50% {
      box-shadow: 0 0 16px rgba(255, 152, 0, 0.5);
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
