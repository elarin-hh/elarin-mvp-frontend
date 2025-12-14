<script lang="ts">
  export let formattedTime: string = "00:00";
  export let className: string = "";
</script>

<div class={`timer-overlay card glass ${className}`.trim()}>
  <span class="timer-value">{formattedTime}</span>
</div>

<style>
  .timer-overlay {
    --timer-size: clamp(120px, 12vw, 150px);
    width: var(--timer-size);
    height: var(--timer-size);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50% !important;
    padding: 0;
    pointer-events: none;
    overflow: hidden;
    border: 1px solid var(--glass-border);
  }

  .timer-value {
    font-size: clamp(1.5rem, 2.4vw, 2.1rem);
    font-weight: 400;
    color: var(--color-text-primary);
    line-height: 1.1;
    text-align: center;
    letter-spacing: 0.08em;
    font-variant-numeric: tabular-nums;
  }
</style>
