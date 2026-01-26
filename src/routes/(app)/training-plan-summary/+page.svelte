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

  const DEBUG_SUMMARY = false;

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
      if (DEBUG_SUMMARY) {
        trainingPlanSummaryActions.setSummary({
          planName: "Plano de teste",
          overallScore: 84,
          planSessionId: 0,
          metrics: [
            { id: "total_duration", label: "Tempo total", value: "18:45" },
            { id: "exercise_count", label: "Exercícios", value: "6" },
          ],
        });
      } else {
        goto(`${base}/exercises`);
        return;
      }
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

<div class="page-background">
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
    <main class="min-h-screen w-full px-4 pt-8 pb-10">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-2xl sm:text-3xl font-bold text-white text-center mb-6">
          Resumo do treino
        </h1>

        <div class="summary-grid">
          <div class="card-secondary p-6 rounded-standard">
            <div class="flex items-start gap-3">
              <div
                class="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center mt-0.5"
              >
                <svg
                  class="w-4 h-4 text-primary-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill-rule="evenodd"
                    d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h2 class="text-white font-semibold mb-1">
                  {$trainingPlanSummaryStore.planName}
                </h2>
                <p class="text-white/70 text-sm">
                  Treino finalizado - {userName}
                </p>
              </div>
            </div>

            <div class="summary-gauge">
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
            <p class="text-white/60 text-sm text-center mt-4">
              Media entre todos os sets concluidos.
            </p>
          </div>

          <div class="card-secondary p-6 rounded-standard">
            <div class="flex items-start gap-3 mb-4">
              <div
                class="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center mt-0.5"
              >
                <svg
                  class="w-4 h-4 text-white/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </div>
              <div>
                <h2 class="text-white font-semibold mb-1">Metricas do treino</h2>
                <p class="text-white/70 text-sm">
                  Tempo total e quantidade de sets.
                </p>
              </div>
            </div>

            <div class="metric-list">
              {#each $trainingPlanSummaryStore.metrics as metric (metric.id)}
                <div class="metric-row">
                  <span class="metric-label">{metric.label}</span>
                  <span class="metric-value">
                    {metric.value}
                    {#if metric.target}
                      <small>/{metric.target}</small>
                    {/if}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </main>
  {/if}
</div>

<style>
  .card-secondary {
    background: var(--color-bg-dark-secondary);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: none;
    box-shadow: none;
  }

  .summary-grid {
    display: grid;
    gap: 1.5rem;
  }

  @media (min-width: 900px) {
    .summary-grid {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      align-items: start;
    }
  }

  .summary-gauge {
    --gauge-size: clamp(220px, 55vw, 260px);
    width: var(--gauge-size);
    height: var(--gauge-size);
    margin: 1.5rem auto 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .summary-gauge :global(.circle) {
    width: 100%;
    height: 100%;
  }

  .metric-list {
    display: flex;
    flex-direction: column;
  }

  .metric-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.6rem 0;
  }

  .metric-row:last-child {
    padding-bottom: 0;
  }

  .metric-label {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  .metric-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .metric-value small {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-left: 0.25rem;
  }
</style>
