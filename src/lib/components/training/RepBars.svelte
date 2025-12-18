<script lang="ts">
  export let repScores: (number | null)[] = [];
  export let currentRepFrames: number[] = [];
  export let currentReps: number = 0;
  export let maxSlots: number = 30;
  export let showCount: boolean = true;
  export let className: string = "";

  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const average = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((sum, n) => sum + n, 0) / arr.length;

  const colorStops = [
    { value: 0, color: "#ef4444" },
    { value: 50, color: "#f97316" },
    { value: 70, color: "#fbbf24" },
    { value: 85, color: "#22c55e" },
    { value: 100, color: "#22c55e" },
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

  const colorForScore = (score: number | null | undefined): string => {
    if (score === null || score === undefined || Number.isNaN(score)) {
      return "rgba(255, 255, 255, 0.15)";
    }
    const clamped = clamp(score);
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

  $: displaySlots = Array.from({ length: maxSlots }, (_, i) => {
    const stored = repScores[i] ?? null;
    const partial =
      stored === null && i === currentReps && currentRepFrames.length
        ? clamp(average(currentRepFrames))
        : stored;
    const fill = partial === null ? 0 : clamp(partial);
    const glowColor = colorForScore(partial);
    return { fill, glowColor };
  });
</script>

<div class={`rep-counter-bar rep-counter-bar-overlay ${className}`}>
  <div class="rep-info">
    <span class="rep-label">Reps.</span>
    {#if showCount}
      <span class="rep-count">{currentReps} /{maxSlots}</span>
    {/if}
  </div>
  <div class="rep-progress">
    {#each displaySlots as slot}
      <div
        class="rep-line"
        style={`--rep-fill-height:${slot.fill}%; --rep-glow-color:${slot.glowColor};`}
      ></div>
    {/each}
  </div>
</div>

<style>
  .rep-counter-bar {
    position: relative;
    width: 100%;
    margin: 0;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.06),
      rgba(255, 255, 255, 0.02)
    );
    backdrop-filter: blur(14px) saturate(120%);
    -webkit-backdrop-filter: blur(14px) saturate(120%);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow:
      0 -10px 30px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    font-size: clamp(9px, 1.35vh, 17px);
    padding: 1em 1.5em;
    display: flex;
    align-items: center;
    gap: 1.5em;
    z-index: 20;
    pointer-events: none;
  }

  .rep-info {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    min-width: 6em;
  }

  .rep-label {
    font-size: 1.2em;
    color: var(--color-text-secondary, #888);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .rep-count {
    font-size: 5em;
    font-weight: 300;
    color: var(--color-text-primary, #fff);
    line-height: 1;
  }

  .rep-progress {
    flex: 1;
    display: flex;
    align-items: flex-end;
    gap: 1em;
    height: 7em;
    padding-bottom: 0.25em;
  }

  .rep-line {
    width: 1em;
    flex-shrink: 0;
    height: 100%;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 99em;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    --rep-fill-height: 0%;
    --rep-glow-color: rgba(255, 255, 255, 0.15);
    --quality-gradient: linear-gradient(
      to top,
      #ef4444 0%,
      #f97316 50%,
      #fbbf24 70%,
      #22c55e 85%,
      #22c55e 100%
    );
  }

  .rep-line::before {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: var(--rep-fill-height);
    background: var(--quality-gradient);
    border-radius: 99em;
    box-shadow: 0 0 10px
      color-mix(in srgb, var(--rep-glow-color) 40%, transparent);
    transition: height 0.3s ease;
  }

  @supports (clip-path: inset(0 round 1px)) {
    .rep-line::before {
      inset: 0;
      height: 100%;
      clip-path: inset(calc(100% - var(--rep-fill-height)) 0 0 0 round 99em);
      transition: clip-path 0.3s ease;
    }
  }

  /* Overlay positioning helper (used no /train) */
  .rep-counter-bar-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.55),
      rgba(0, 0, 0, 0.35)
    );
    backdrop-filter: blur(14px) saturate(120%);
    -webkit-backdrop-filter: blur(14px) saturate(120%);
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    border-inline: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 -10px 30px rgba(0, 0, 0, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
    z-index: 20;
    pointer-events: none;
  }

  .rep-counter-bar-overlay * {
    pointer-events: auto;
  }

  @keyframes pulse-tube {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }
</style>
