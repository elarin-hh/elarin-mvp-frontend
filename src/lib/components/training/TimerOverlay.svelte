<script lang="ts">
  export let seconds: number = 0;
  export let targetSeconds: number | null = null;
  export let mode: "elapsed" | "remaining" = "elapsed";
  export let className: string = "";

  const formatTime = (totalSeconds: number): string => {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  $: baseSeconds = Math.max(0, Math.floor(seconds));
  $: safeTargetSeconds =
    typeof targetSeconds === "number" && Number.isFinite(targetSeconds)
      ? Math.max(0, Math.floor(targetSeconds))
      : null;
  $: displaySeconds =
    mode === "remaining" && safeTargetSeconds !== null
      ? Math.max(0, safeTargetSeconds - baseSeconds)
      : baseSeconds;
  $: formattedTime = formatTime(displaySeconds);
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
