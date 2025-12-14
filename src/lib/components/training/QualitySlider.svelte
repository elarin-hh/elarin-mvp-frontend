<script lang="ts">
  export let score: number = 0;
  export let className: string = "";

  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const bands = [
    { min: 85, color: "#22c55e" },
    { min: 70, color: "#fbbf24" },
    { min: 50, color: "#f97316" },
    { min: 0, color: "#ef4444" }
  ];

  $: sliderFill = clamp(score);
  $: sliderColor =
    bands.find((b) => sliderFill >= b.min)?.color ?? bands[bands.length - 1].color;
</script>

<div class={`vertical-rep-slide ${className}`}>
  <div
    class="v-slide-track"
    style={`--slider-fill-color:${sliderColor}; --slider-fill-height:${sliderFill}%;`}
  >
    <div class="v-slide-inner">
      <div
        class="v-slide-fill"
        style:height={`${sliderFill}%`}
        style:background={sliderColor}
        style:box-shadow={`0 0 15px ${sliderColor}66`}
      ></div>
    </div>

    <div
      class="v-slide-handle"
      style:bottom={`${sliderFill}%`}
      style:background={sliderColor}
      style:box-shadow={`0 4px 12px ${sliderColor}55`}
    ></div>

    <div
      class="v-slide-bubble"
      style:top={`${100 - sliderFill}%`}
      style:color={sliderColor}
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
    background: var(--slider-fill-color, #22c55e);
    transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 15px
      color-mix(
        in srgb,
        var(--slider-fill-color, #22c55e) 45%,
        transparent
      );
    border-radius: 28px 28px 0 0;
  }

  .v-slide-handle {
    position: absolute;
    left: 50%;
    transform: translate(-50%, 50%);
    width: 40px;
    height: 40px;
    background: var(--slider-fill-color, rgba(255, 255, 255, 1));
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10;
    transition: bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .v-slide-handle::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    background: #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.5);
    z-index: 2;
  }

  .v-slide-handle::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 28px;
    height: 28px;
    background: var(--slider-fill-color, #22c55e);
    border-radius: 50%;
    z-index: 1;
  }

  .v-slide-bubble {
    position: absolute;
    right: -95px;
    top: 0;
    transform: translateY(-50%);
    background: var(--glass-bg);
    backdrop-filter: var(--glass-backdrop);
    -webkit-backdrop-filter: var(--glass-backdrop);
    color: var(--color-text-primary);
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
