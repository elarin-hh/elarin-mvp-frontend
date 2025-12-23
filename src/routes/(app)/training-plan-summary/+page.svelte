<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { base } from "$app/paths";
  import { get } from "svelte/store";
  import AppHeader from "$lib/components/common/AppHeader.svelte";
  import { authActions } from "$lib/services/auth.facade";
  import CircleGauge from "$lib/components/training/CircleGauge.svelte";
  import {
    trainingPlanSummaryActions,
    trainingPlanSummaryStore,
  } from "$lib/stores/training-plan-summary.store";
  import { currentUser } from "$lib/stores/auth.store";
  import type { User } from "$lib/stores/auth.store";

  const formatSummaryBadge = (user: User | null) => {
    const fullName = user?.full_name?.trim();
    const fallback = user?.email?.trim();
    return fullName || fallback || "[Nome do Usuario]";
  };

  let userName = $state(formatSummaryBadge(null));
  let isScrolled = $state(false);
  let showAvatarMenu = $state(false);

  const unsubscribeCurrentUser = currentUser.subscribe((user) => {
    userName = formatSummaryBadge(user);
  });

  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  const scoreValue = $derived(
    clamp($trainingPlanSummaryStore?.overallScore ?? 0),
  );

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

  const scoreGradient = $derived(gradientForScore(scoreValue));
  const scoreColor = $derived(colorForScore(scoreValue));

  function toggleAvatarMenu() {
    showAvatarMenu = !showAvatarMenu;
  }

  function handleSettings() {
    showAvatarMenu = false;
    goto(`${base}/settings`);
  }

  async function handleLogout() {
    showAvatarMenu = false;
    await authActions.logout();
    goto(`${base}/login`);
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".avatar-menu-container")) {
      showAvatarMenu = false;
    }
  }

  onMount(() => {
    const summary = get(trainingPlanSummaryStore);
    if (!summary) {
      goto(`${base}/exercises`);
      return;
    }

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      isScrolled = target.scrollTop > 50;
    };

    const viewport = document.querySelector(".sa-viewport");
    if (viewport) {
      viewport.addEventListener("scroll", handleScroll, { passive: true });
      isScrolled = (viewport as HTMLElement).scrollTop > 50;
      return () => {
        viewport.removeEventListener("scroll", handleScroll);
      };
    }

    const handleWindowScroll = () => {
      isScrolled = window.scrollY > 50;
    };
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    handleWindowScroll();
    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
    };
  });

  onDestroy(() => {
    unsubscribeCurrentUser();
    trainingPlanSummaryActions.reset();
  });
</script>

<svelte:head>
  <title>Resumo do Plano - Elarin</title>
</svelte:head>

<main class="plan-summary-page">
  <AppHeader
    bind:isScrolled
    bind:showAvatarMenu
    hasDropdownMenu={true}
    onToggleAvatarMenu={toggleAvatarMenu}
    onSettings={handleSettings}
    onLogout={handleLogout}
    onClickOutside={handleClickOutside}
  />

  {#if $trainingPlanSummaryStore}
    <section class="summary-shell">
      <div class="summary-grid">
        <div class="score-card">
          <div class="score-top">
            <div class="score-title-group">
              <span class="score-label">Score geral</span>
              <h1 class="score-plan">{$trainingPlanSummaryStore.planName}</h1>
              <p class="score-subtitle">
                Resumo geral do seu plano de treino.
              </p>
            </div>
            <div class="score-meta">
              <span class="summary-status">
                <span class="status-dot"></span>
                Plano finalizado
              </span>
              <span class="summary-badge">{userName}</span>
            </div>
          </div>
          <div class="score-gauge">
            <CircleGauge
              value={scoreValue}
              thickness="7%"
              trackColor="var(--color-bg-dark-quaternary)"
              info="SCORE GERAL"
              gradientStart={scoreGradient.start}
              gradientEnd={scoreGradient.end}
              knobColor={scoreColor}
            />
          </div>
          <div class="score-footer">
            Media entre todos os exercicios concluidos.
          </div>
        </div>

        <div class="metrics-card">
          <div class="metrics-header">
            <h2>Metricas do plano</h2>
            <p>Tempo total e quantidade de exercicios.</p>
          </div>
          <div class="metrics-grid">
            {#each $trainingPlanSummaryStore.metrics as metric (metric.id)}
              <div class="metric-tile">
                <div class="metric-value">
                  {metric.value}
                  {#if metric.target}
                    <small>/{metric.target}</small>
                  {/if}
                </div>
                <div class="metric-label">{metric.label}</div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>
  {/if}
</main>

<style>
  .plan-summary-page {
    position: relative;
    min-height: 100vh;
    background: var(--color-bg-dark);
    color: var(--color-text-primary);
    overflow-x: hidden;
  }

  .plan-summary-page::before {
    content: "";
    position: absolute;
    inset: -20% 0 auto;
    height: 60%;
    background:
      radial-gradient(
        60% 60% at 50% 0%,
        rgba(116, 198, 17, 0.18),
        transparent 70%
      ),
      radial-gradient(
        35% 35% at 85% 20%,
        rgba(0, 180, 255, 0.12),
        transparent 60%
      );
    pointer-events: none;
    z-index: 0;
  }

  .summary-shell {
    position: relative;
    z-index: 1;
    max-width: 1100px;
    margin: 0 auto;
    padding: calc(var(--app-header-offset) + 2rem) 1.5rem 3.5rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .summary-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem 0.9rem;
    border-radius: 999px;
    background: var(--color-bg-dark-quaternary);
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .summary-status {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0.9rem;
    border-radius: 999px;
    background: rgba(116, 198, 17, 0.12);
    color: var(--color-primary-400);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--color-primary-500);
  }

  .summary-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: 1.5rem;
    align-items: stretch;
  }

  .score-card,
  .metrics-card {
    background: var(--color-bg-dark-secondary);
    border-radius: 24px;
    padding: 1.5rem;
  }

  .score-card {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    align-items: center;
    text-align: center;
  }

  .score-top {
    width: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  .score-label {
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-secondary);
  }

  .score-title-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    text-align: left;
  }

  .score-plan {
    margin: 0;
    font-size: clamp(1.8rem, 3.5vw, 2.6rem);
    font-weight: 500;
    letter-spacing: -0.02em;
  }

  .score-subtitle {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.95rem;
    text-align: left;
  }

  .score-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.6rem;
  }

  .score-gauge {
    width: clamp(220px, 30vw, 300px);
    height: clamp(220px, 30vw, 300px);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .score-footer {
    color: var(--color-text-muted);
    font-size: 0.95rem;
    max-width: 260px;
  }

  .metrics-card {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    height: 100%;
    min-height: clamp(220px, 38vh, 360px);
  }

  .metrics-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 500;
  }

  .metrics-header p {
    margin: 0.35rem 0 0;
    color: var(--color-text-muted);
    font-size: 0.95rem;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    grid-auto-rows: minmax(90px, 1fr);
    gap: 1rem;
    flex: 1;
    align-content: stretch;
  }

  .metric-tile {
    padding: 1rem;
    border-radius: 18px;
    background: var(--color-bg-dark-quaternary);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-height: 90px;
  }

  .metric-value {
    font-size: 1.6rem;
    font-weight: 500;
  }

  .metric-value small {
    font-size: 0.9rem;
    color: var(--color-text-muted);
    margin-left: 0.25rem;
  }

  .metric-label {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  @media (max-width: 900px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }

    .metrics-card {
      min-height: auto;
    }
  }

  @media (max-width: 600px) {
    .summary-shell {
      padding: calc(var(--app-header-offset) + 1.5rem) 1rem 3rem;
    }

    .score-top {
      flex-direction: column;
      align-items: flex-start;
    }

    .score-meta {
      align-items: flex-start;
    }
  }
</style>
