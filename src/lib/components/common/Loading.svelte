<script lang="ts">
  let { message = 'Carregando...' }: { message?: string } = $props();
</script>

<div class="loading-container">
  <div class="loading-content">
    <div class="spinner"></div>
    <p class="loading-text">{message}</p>
  </div>
</div>

<style>
  .loading-container {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(10px);
    z-index: 100;
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .spinner {
    width: 4rem;
    height: 4rem;
    border: 2px solid transparent;
    border-bottom-color: var(--color-primary-500);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-text {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    margin: 0;
  }
</style>
