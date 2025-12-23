<script lang="ts">
  export let progressPercent: number = 0;
  export let positionLabel: string = "";
  export let exerciseLabel: string = "";
  export let remainingLabel: string = "--:--";
  export let className: string = "";

  const clamp = (value: number) =>
    Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

  $: safePercent = clamp(progressPercent);
  $: progressStyle = `--plan-progress:${safePercent}%`;
  $: hasPosition = positionLabel.trim().length > 0;
  $: hasExercise = exerciseLabel.trim().length > 0;
  $: subtitleParts = [
    hasPosition ? positionLabel.trim() : "",
    hasExercise ? exerciseLabel.trim() : ""
  ].filter(Boolean);
  $: subtitle = subtitleParts.join(" | ");
</script>

<div class={`plan-progress-shell ${className}`.trim()}>
  <div class="plan-progress-row">
    <span class="plan-progress-label">
      {subtitle || "Plano de treino"}
    </span>
    <span class="plan-progress-time">{remainingLabel}</span>
  </div>
  <div class="plan-progress-track" style={progressStyle}>
    <div class="plan-progress-fill"></div>
  </div>
</div>

<style>
  .plan-progress-shell {
    width: 100%;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(10px) saturate(130%);
    -webkit-backdrop-filter: blur(10px) saturate(130%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
    padding: 0 0.85rem 0.55rem;
    display: grid;
    gap: 0.35rem;
    pointer-events: none;
    --plan-progress: 0%;
  }

  .plan-progress-shell.stacked {
    border: 0;
    margin-top: 0;
    box-shadow: none;
    border-radius: 0;
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .plan-progress-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    position: relative;
    z-index: 2;
  }

  .plan-progress-label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.95);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .plan-progress-time {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.85);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
  }

  .plan-progress-track {
    width: 100%;
    height: 7px;
    margin: 0 auto;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    position: relative;
    overflow: hidden;
  }

  .plan-progress-fill {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--plan-progress);
    background: #22c55e;
    transition: width 0.3s ease;
    z-index: 1;
    border-radius: inherit;
  }

  @media (max-width: 720px) {
    .plan-progress-shell {
      padding: 0.35rem 0.7rem 0.5rem;
    }

    .plan-progress-track {
      height: 16px;
    }
  }
</style>
