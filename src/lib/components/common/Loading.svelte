<script lang="ts">
  let { message = 'Carregando...' }: { message?: string } = $props();
</script>

<div class="loading-container">
  <div class="loading-content">
    <div class="cube-loader">
      <div class="cube" style="animation-delay: 0.2s;"></div>
      <div class="cube" style="animation-delay: 0.3s;"></div>
      <div class="cube" style="animation-delay: 0.4s;"></div>

      <div class="cube" style="animation-delay: 0.1s;"></div>
      <div class="cube" style="animation-delay: 0.2s;"></div>
      <div class="cube" style="animation-delay: 0.3s;"></div>

      <div class="cube" style="animation-delay: 0s;"></div>
      <div class="cube" style="animation-delay: 0.1s;"></div>
      <div class="cube" style="animation-delay: 0.2s;"></div>
    </div>
    <!-- <p class="loading-text">{message}</p> -->
  </div>
</div>

<style>
  .loading-container {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(5px);
    z-index: 100;
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }

  .cube-loader {
    display: grid;
    grid-template-columns: repeat(3, 10px);
    grid-template-rows: repeat(3, 10px);
    width: 34px;
    height: 34px;
  }

  .cube {
    width: 10px;
    height: 10px;
    background: var(--color-primary-500);
    animation: fadeInOut 1s ease-in-out infinite;
  }

  @keyframes fadeInOut {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0;
      transform: scale(0.5);
    }
  }

  .loading-text {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    margin: 0;
    font-weight: 500;
  }
</style>
