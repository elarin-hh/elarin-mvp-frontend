<script lang="ts">
  export let score: number = 0;
  export let className: string = "";

  const clamp = (v: number) => Math.max(0, Math.min(100, v));
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
      bands[Math.max(0, Math.min(bands.length - 1, neighborIdx))]?.color ?? base;

    return {
      start: mixHex(base, neighbor, 0.65),
      end: base,
    };
  };

  let gradientStart = bands[bands.length - 1].color;
  let gradientEnd = bands[bands.length - 1].color;

  $: sliderFill = clamp(score);
  $: sliderColor = colorForScore(sliderFill);
  $: ({ start: gradientStart, end: gradientEnd } = gradientForScore(sliderFill));
</script>

<div class={`vertical-rep-slide ${className}`}>
  <div
    class="v-slide-track"
    style={`--slider-fill-color:${sliderColor}; --slider-fill:${sliderFill}%; --quality-gradient-start:${gradientStart}; --quality-gradient-end:${gradientEnd};`}
  >
    <div class="v-slide-inner">
      <div class="v-slide-fill"></div>
    </div>

    <div
      class="v-slide-handle"
      style:bottom={`${sliderFill}`}
    ></div>

    <div
      class="v-slide-bubble"
      style:top={`${100 - sliderFill}`}
    >
      {Math.round(sliderFill)}%
    </div>
  </div>
</div>

<style>
  .vertical-rep-slide {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    height: 50%;
    width: 22px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    pointer-events: none;
  }

  .vertical-rep-slide.left-aligned {
    left: 2rem;
    right: auto;
    transform: translateY(-50%);
  }

  .v-slide-track {
    width: 100%;
    height: 100%;
    background: var(--glass-bg, rgba(0, 0, 0, 0.6));
    backdrop-filter: var(--glass-backdrop, blur(4px));
    -webkit-backdrop-filter: var(--glass-backdrop, blur(4px));
    border-radius: 999px;
    position: relative;
    overflow: visible;
    border: 3px solid var(--glass-border, rgba(255, 255, 255, 0.1));
    --slider-fill: 0%;
    --quality-gradient-start: #f97316;
    --quality-gradient-end: #ef4444;
  }

  .v-slide-inner {
    width: 100%;
    height: 100%;
    border-radius: 999px;
    overflow: hidden;
    position: relative;
  }

  .v-slide-fill {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: var(--slider-fill);
    background: linear-gradient(
      to top,
      var(--quality-gradient-start) 0%,
      var(--quality-gradient-end) 100%
    );
    box-shadow: 0 0 15px
      color-mix(in srgb, var(--slider-fill-color, #22c55e) 45%, transparent);
    transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 28px 28px 0 0;
  }

  .v-slide-handle {
    position: absolute;
    left: 50%;
    transform: translate(-50%, 50%);
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10;
    transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .v-slide-handle::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 28px;
    height: 28px;
    background: linear-gradient(
      135deg,
      var(--quality-gradient-start) 0%,
      var(--quality-gradient-end) 100%
    );
    border-radius: 50%;
    z-index: 1;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.35),
      0 0 10px color-mix(in srgb, var(--slider-fill-color, #22c55e) 45%, transparent);
  }

  .v-slide-bubble {
    position: absolute;
    right: -95px;
    top: 0;
    transform: translateY(-50%);
    background: var(--glass-bg);
    backdrop-filter: var(--glass-backdrop);
    -webkit-backdrop-filter: var(--glass-backdrop);
    color: var(--slider-fill-color, var(--color-text-primary));
    padding: 8px 22px;
    border-radius: var(--radius-sm);
    font-size: 1.5rem;
    font-weight: 400;
    font-family: "Inter", sans-serif;
    white-space: nowrap;
    transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .v-slide-bubble::before {
    content: "";
    position: absolute;
    left: -6px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 6px solid var(--glass-bg);
  }
</style>
