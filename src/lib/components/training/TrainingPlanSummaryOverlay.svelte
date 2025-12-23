<script lang="ts">
  import CircleGauge from "./CircleGauge.svelte";

  interface Props {
    planName?: string;
    metrics?: Array<{
      id: string;
      label: string;
      value: string;
      target?: string | null;
    }>;
    overallScore?: number | null;
    badge?: string;
    full?: boolean;
    gaugeSize?: string;
    message?: string;
  }

  let {
    planName = "Plano de treino",
    metrics = [],
    overallScore = 0,
    badge = "Plano finalizado",
    full = false,
    gaugeSize = "clamp(250px, 28vw, 250px)",
    message = "Plano concluido",
  }: Props = $props();

  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  const gaugeProgress = $derived(clamp(overallScore ?? 0));

  const colorStops = [
    { value: 0, color: "#ef4444" },
    { value: 50, color: "#f97316" },
    { value: 70, color: "#fbbf24" },
    { value: 85, color: "#22c55e" },
    { value: 100, color: "#22c55e" },
  ] as const;

  const bands = [
    { min: 85, color: "#22c55e" },
    { min: 70, color: "#fbbf24" },
    { min: 50, color: "#f97316" },
    { min: 0, color: "#ef4444" },
  ] as const;

  const hexToRgb = (hex: string) => {
    const normalized = hex.replace("#", "").trim();
    if (normalized.length !== 6) return null;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    return { r, g, b };
  };

  const toHex = (value: number) =>
    Math.round(value).toString(16).padStart(2, "0");

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const colorForScore = (value: number): string => {
    const clamped = clamp(value);
    for (let i = 0; i < colorStops.length - 1; i += 1) {
      const lower = colorStops[i];
      const upper = colorStops[i + 1];
      if (clamped < lower.value || clamped > upper.value) continue;

      const lowerRgb = hexToRgb(lower.color);
      const upperRgb = hexToRgb(upper.color);
      if (!lowerRgb || !upperRgb) return lower.color;

      const span = upper.value - lower.value;
      const t = span === 0 ? 0 : (clamped - lower.value) / span;
      const r = lerp(lowerRgb.r, upperRgb.r, t);
      const g = lerp(lowerRgb.g, upperRgb.g, t);
      const b = lerp(lowerRgb.b, upperRgb.b, t);
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    return colorStops[colorStops.length - 1].color;
  };

  const mixHex = (a: string, b: string, bWeight: number): string => {
    const aRgb = hexToRgb(a);
    const bRgb = hexToRgb(b);
    if (!aRgb || !bRgb) return a;
    const t = Math.max(0, Math.min(1, bWeight));
    const r = lerp(aRgb.r, bRgb.r, t);
    const g = lerp(aRgb.g, bRgb.g, t);
    const bCh = lerp(aRgb.b, bRgb.b, t);
    return `#${toHex(r)}${toHex(g)}${toHex(bCh)}`;
  };

  const bandIndexForScore = (value: number): number => {
    const clamped = clamp(value);
    const idx = bands.findIndex((b) => clamped >= b.min);
    return idx === -1 ? bands.length - 1 : idx;
  };

  const gradientForScore = (value: number): { start: string; end: string } => {
    const idx = bandIndexForScore(value);
    const base = bands[idx]?.color ?? bands[bands.length - 1].color;
    const neighborIdx = idx < bands.length - 1 ? idx + 1 : idx - 1;
    const neighbor =
      bands[Math.max(0, Math.min(bands.length - 1, neighborIdx))]?.color ??
      base;

    return {
      start: mixHex(base, neighbor, 0.65),
      end: base,
    };
  };

  const scoreGradient = $derived(gradientForScore(gaugeProgress));
  const scoreColor = $derived(colorForScore(gaugeProgress));
</script>

<div class="summary-overlay" class:full={full}>
  <div class="summary-card">
    <div class="badge">{badge}</div>
    <h3 class="title">{planName}</h3>
    <div class="subtitle">{message}</div>

    <div class="row">
      <div class="gauge" style={`--gauge-size: ${gaugeSize}`}>
        <CircleGauge
          value={gaugeProgress}
          thickness="7%"
          trackColor="rgba(255, 255, 255, 0.15)"
          info="SCORE GERAL"
          gradientStart={scoreGradient.start}
          gradientEnd={scoreGradient.end}
          knobColor={scoreColor}
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
    border-radius: var(--radius-sm);
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
    margin: 0 0 0.35rem 0;
    font-size: clamp(2rem, 4vw, 2.6rem);
    font-weight: 300;
    letter-spacing: -0.01em;
  }

  .subtitle {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.75);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 1.5rem;
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
    width: 280px;
    height: 280px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.65rem;
    position: relative;
  }
</style>
