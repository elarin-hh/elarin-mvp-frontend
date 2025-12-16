<script lang="ts">
  interface Props {
    exerciseName?: string;
    durationSec?: number | null;
    reps?: number | null;
  }

  let {
    exerciseName = "Exercício",
    durationSec = 60,
    reps = 10,
  }: Props = $props();
</script>

<div class="next-info">
  <p class="eyebrow">A seguir</p>
  <h3 class="title">{exerciseName}</h3>
  <div class="metrics">
    <div class="metric">
      <span class="value">{durationSec ?? "—"}</span>
      <span class="label">Sec.</span>
    </div>
    <div class="metric">
      <span class="value">{reps ?? "—"}</span>
      <span class="label">Reps.</span>
    </div>
  </div>
</div>

<style>
  .next-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-text-primary, #fff);
  }

  .title {
    margin: 0;
    font-size: clamp(1.9rem, 3vw, 2.4rem);
    color: var(--color-text-primary, #fff);
    font-weight: 300;
  }

  .metrics {
    display: flex;
    align-items: center;
    gap: clamp(1.5rem, 3vw, 2.5rem);
  }

  .metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
  }

  .value {
    font-size: clamp(2.4rem, 4vw, 3rem);
    font-weight: 700;
    color: var(--color-text-primary, #fff);
    line-height: 1;
  }

  .label {
    font-size: 0.95rem;
    color: var(--color-text-muted, #cbd5e1);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
