<script lang="ts">
  import { asset } from '$lib/utils/assets';

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
          <button
            type="button"
            class="text-white hover:text-white/80 transition-colors p-1"
            aria-label="Menu"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>

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
</style>
