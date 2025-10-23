<script lang="ts">
  import { onMount } from 'svelte';
  export let className = '';
  export let autoHide = true;
  export let showX: boolean = true;
  export let showY: boolean = true;
  let rootEl: HTMLDivElement;
  let viewportEl: HTMLDivElement;
  let trackYEl: HTMLDivElement;
  let trackXEl: HTMLDivElement;
  let contentScrollableY = false;
  let contentScrollableX = false;
  let thumbYSize = 0;
  let thumbYOffset = 0;
  let thumbXSize = 0;
  let thumbXOffset = 0;
  let isDraggingY = false;
  let dragStartY = 0;
  let scrollStartTop = 0;
  let isDraggingX = false;
  let dragStartX = 0;
  let scrollStartLeft = 0;
  const MIN_THUMB = 24;
  function updateMetrics() {
    const vh = viewportEl.clientHeight;
    const sh = viewportEl.scrollHeight;
    const vw = viewportEl.clientWidth;
    const sw = viewportEl.scrollWidth;
    contentScrollableY = sh > vh + 1 && showY;
    contentScrollableX = sw > vw + 1 && showX;
    if (contentScrollableY && trackYEl) {
      const trackLen = trackYEl.clientHeight;
      const ratio = vh / sh;
      thumbYSize = Math.max(MIN_THUMB, Math.round(trackLen * ratio));
      const maxThumbOffset = trackLen - thumbYSize;
      const maxScroll = sh - vh;
      thumbYOffset = maxScroll > 0 ? Math.round((viewportEl.scrollTop / maxScroll) * maxThumbOffset) : 0;
    } else {
      thumbYSize = 0;
      thumbYOffset = 0;
    }
    if (contentScrollableX && trackXEl) {
      const trackLen = trackXEl.clientWidth;
      const ratio = vw / sw;
      thumbXSize = Math.max(MIN_THUMB, Math.round(trackLen * ratio));
      const maxThumbOffset = trackLen - thumbXSize;
      const maxScroll = sw - vw;
      thumbXOffset = maxScroll > 0 ? Math.round((viewportEl.scrollLeft / maxScroll) * maxThumbOffset) : 0;
    } else {
      thumbXSize = 0;
      thumbXOffset = 0;
    }
  }
  function onScroll() { updateMetrics(); }
  function onResize() { updateMetrics(); }
  function onThumbYPointerDown(event: PointerEvent) {
    if (!contentScrollableY) return;
    isDraggingY = true;
    dragStartY = event.clientY;
    scrollStartTop = viewportEl.scrollTop;
    (event.target as Element).setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function onThumbXPointerDown(event: PointerEvent) {
    if (!contentScrollableX) return;
    isDraggingX = true;
    dragStartX = event.clientX;
    scrollStartLeft = viewportEl.scrollLeft;
    (event.target as Element).setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function onRootPointerMove(event: PointerEvent) {
    if (isDraggingY && contentScrollableY) {
      const trackLen = trackYEl.clientHeight;
      const maxThumbOffset = trackLen - thumbYSize;
      const maxScroll = viewportEl.scrollHeight - viewportEl.clientHeight;
      const delta = event.clientY - dragStartY;
      const scrollPerPixel = maxScroll / maxThumbOffset;
      viewportEl.scrollTop = scrollStartTop + delta * scrollPerPixel;
    }
    if (isDraggingX && contentScrollableX) {
      const trackLen = trackXEl.clientWidth;
      const maxThumbOffset = trackLen - thumbXSize;
      const maxScroll = viewportEl.scrollWidth - viewportEl.clientWidth;
      const delta = event.clientX - dragStartX;
      const scrollPerPixel = maxScroll / maxThumbOffset;
      viewportEl.scrollLeft = scrollStartLeft + delta * scrollPerPixel;
    }
  }
  function onRootPointerUp(event: PointerEvent) {
    if (isDraggingY) {
      isDraggingY = false;
      (event.target as Element).releasePointerCapture?.(event.pointerId);
    }
    if (isDraggingX) {
      isDraggingX = false;
      (event.target as Element).releasePointerCapture?.(event.pointerId);
    }
  }
  onMount(() => {
    updateMetrics();
    const ro = new ResizeObserver(updateMetrics);
    ro.observe(viewportEl);
    window.addEventListener('resize', onResize);
    const interval = setInterval(updateMetrics, 400);
    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      clearInterval(interval);
    };
  });
</script>

<div class={`sa-root ${className}`} data-autohide={autoHide} bind:this={rootEl} on:pointermove={onRootPointerMove} on:pointerup={onRootPointerUp} on:pointercancel={onRootPointerUp} {...$$restProps}>
  <div class="sa-viewport" bind:this={viewportEl} on:scroll={onScroll}>
    <slot />
  </div>
  {#if contentScrollableY}
    <div class="sa-scrollbar sa-scrollbar-y" bind:this={trackYEl} aria-hidden="true">
      <div class="sa-thumb" on:pointerdown={onThumbYPointerDown} style:height={`${thumbYSize}px`} style:transform={`translateY(${thumbYOffset}px)`}></div>
    </div>
  {/if}
  {#if contentScrollableX}
    <div class="sa-scrollbar sa-scrollbar-x" bind:this={trackXEl} aria-hidden="true">
      <div class="sa-thumb" on:pointerdown={onThumbXPointerDown} style:width={`${thumbXSize}px`} style:transform={`translateX(${thumbXOffset}px)`}></div>
    </div>
  {/if}
</div>

<style>
  :global(.sa-root) {
    position: relative;
    width: 100%;
    height: 100%;
  }

  :global(.sa-viewport) {
    width: 100%;
    height: 100%;
    overflow: auto;
    scrollbar-width: none;
  }

  :global(.sa-viewport::-webkit-scrollbar) { width: 0; height: 0; }
  :global(.sa-viewport::-webkit-scrollbar-button) { display: none; width: 0; height: 0; }

  :global(.sa-scrollbar) {
    position: absolute;
    background: transparent;
    transition: opacity 0.2s ease;
    pointer-events: none;
    opacity: 0;
  }

  :global(.sa-root:hover) .sa-scrollbar { opacity: 1; }

  :global(.sa-scrollbar-y) {
    top: 2px;
    bottom: 2px;
    right: 2px;
    width: 4px;
  }

  :global(.sa-scrollbar-x) {
    left: 2px;
    right: 2px;
    bottom: 2px;
    height: 8px;
  }

  :global(.sa-thumb) {
    position: absolute;
    background: var(--sa-thumb, #3D3F42);
    border-radius: 6px;
    cursor: pointer;
    pointer-events: auto;
  }

  :global(.sa-thumb:hover) { background: var(--sa-thumb, #3D3F42); }
  :global(.sa-thumb:active) { background: var(--sa-thumb, #3D3F42); }

  :global(.sa-viewport) { scrollbar-gutter: stable both-edges; }
  :global(.sa-scrollbar-y .sa-thumb) { top: 0; right: 0; width: 100%; }
  :global(.sa-scrollbar-x .sa-thumb) { left: 0; bottom: 0; height: 100%; }

  :global(.sa-root[data-autohide="true"]) .sa-scrollbar-y { display: none; }
  :global(.sa-root[data-autohide="true"]) .sa-scrollbar-x { display: none; }
  :global(.sa-root:hover) .sa-scrollbar-y,
  :global(.sa-root:hover) .sa-scrollbar-x { display: block; pointer-events: auto; }
</style>

