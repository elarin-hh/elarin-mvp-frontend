<script lang="ts">
  import CircleGauge from "./CircleGauge.svelte";

  interface Props {
    exerciseName?: string;
    metrics?: Array<{
      id: string;
      label: string;
      value: string;
      target?: string | null;
    }>;
    effectiveness?: number | null;
    badge?: string;
    full?: boolean;
    gaugeSize?: string;
    messageOnly?: boolean;
    message?: string;
  }

  let {
    exerciseName = "Exercício",
    metrics = [],
    effectiveness = 0,
    badge = "Toning",
    full = false,
    gaugeSize = "clamp(250px, 28vw, 250px)",
    messageOnly = false,
    message = "Exercício Finalizado",
  }: Props = $props();

  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  const gaugeProgress = $derived(clamp(effectiveness ?? 0));
</script>

<div class="summary-overlay" class:full={full} class:message-only={messageOnly}>
  <div class="summary-card" class:message-only={messageOnly}>
    {#if messageOnly}
      <div class="final-message">{message}</div>
    {:else}
      <div class="badge">{badge}</div>
      <h3 class="title">{exerciseName}</h3>

      <div class="row">
        <div class="gauge" style={`--gauge-size: ${gaugeSize}`}>
          <CircleGauge
            value={gaugeProgress}
            thickness="7%"
            trackColor="rgba(255, 255, 255, 0.15)"
            info="SCORE"
          />
        </div>

        {#if metrics.length > 0}
          <div class="metrics">
            {#each metrics as metric (metric.id)}
              <div class="metric">
                <span class="value">
                  {metric.value}
                  {#if metric.target}
                    <small>/{metric.target}</small>
                  {/if}
                </span>
                <span class="label">{metric.label}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .summary-overlay {
    position: absolute;
    inset: 0;
    z-index: 220;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--glass-bg, rgba(0, 0, 0, 0.55));
    backdrop-filter: var(--glass-backdrop, blur(14px));
    -webkit-backdrop-filter: var(--glass-backdrop, blur(14px));
    pointer-events: none;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    overflow: hidden;
  }

  .summary-overlay.full {
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .summary-card {
    width: 100%;
    height: 100%;
    padding: clamp(1.8rem, 3vw, 2.5rem);
    border-radius: 0;
    background: var(--glass-bg, rgba(0, 0, 0, 0.5));
    border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
    text-align: center;
    position: relative;
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.3rem 0.9rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    margin-bottom: 0.75rem;
  }

  .title {
    margin: 0 0 1.5rem 0;
    font-size: clamp(2rem, 4vw, 2.6rem);
    font-weight: 300;
    letter-spacing: -0.01em;
  }

  .final-message {
    font-size: clamp(2rem, 4vw, 2.8rem);
    font-weight: 300;
    letter-spacing: -0.01em;
  }

  .row {
    display: flex;
    flex-direction: column;
    gap: clamp(1.5rem, 3vw, 2.5rem);
    align-items: center;
  }

  .metrics {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: clamp(1.25rem, 2.5vw, 2.25rem);
  }

  .metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
  }

  .metric .value {
    font-size: clamp(3.6rem, 5vw, 4.2rem);
    font-weight: 300;
    line-height: 1;
  }

  .metric .value small {
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.75);
    margin-left: 0.2rem;
  }

  .label {
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.75);
  }

  .gauge {
    width: var(--gauge-size, clamp(250px, 28vw, 340px));
    height: var(--gauge-size, clamp(250px, 28vw, 340px));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.65rem;
    position: relative;
  }

</style>
