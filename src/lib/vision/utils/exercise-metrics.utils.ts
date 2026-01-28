import type {
  DurationDisplayMode,
  ExerciseMetricDefinition,
  ExerciseMetricType,
  MetricDisplayContext
} from '../types/metrics.types';

export interface NormalizedExerciseMetric {
  id: string;
  type: ExerciseMetricType;
  target: number | null;
  label: string;
  unit?: string;
  display?: DurationDisplayMode;
  showIn: MetricDisplayContext[];
}

const DEFAULT_CONTEXTS: MetricDisplayContext[] = ['next', 'training', 'summary'];
const ALLOWED_CONTEXTS = new Set<MetricDisplayContext>(DEFAULT_CONTEXTS);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const normalizeContexts = (value: unknown): MetricDisplayContext[] => {
  if (!Array.isArray(value)) return DEFAULT_CONTEXTS;
  const contexts = value
    .filter((ctx): ctx is MetricDisplayContext => typeof ctx === 'string' && ALLOWED_CONTEXTS.has(ctx as MetricDisplayContext));
  return contexts.length > 0 ? contexts : DEFAULT_CONTEXTS;
};

const defaultsForType = (
  type: string
): Pick<NormalizedExerciseMetric, 'label' | 'unit' | 'display'> => {
  switch (type) {
    case 'duration':
      return { label: 'Tempo', unit: 's', display: 'elapsed' };
    case 'reps':
      return { label: 'Repetições', unit: 'reps' };
    default:
      return { label: type };
  }
};

export function normalizeExerciseMetrics(
  raw: Array<string | ExerciseMetricDefinition> | undefined | null
): NormalizedExerciseMetric[] {
  if (!Array.isArray(raw)) return [];

  const seenIds = new Set<string>();
  const metrics: NormalizedExerciseMetric[] = [];

  for (const entry of raw) {
    const def: Partial<ExerciseMetricDefinition> =
      typeof entry === 'string' ? { id: entry, type: entry } : entry ?? {};

    const type = typeof def.type === 'string' ? def.type.trim() : '';
    const id = typeof def.id === 'string' ? def.id.trim() : type;
    if (!id || !type) continue;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const defaults = defaultsForType(type);
    const label =
      typeof def.label === 'string' && def.label.trim()
        ? def.label.trim()
        : typeof def.name === 'string' && def.name.trim()
          ? def.name.trim()
          : defaults.label;
    const unit = typeof def.unit === 'string' && def.unit.trim() ? def.unit.trim() : defaults.unit;
    const target = isFiniteNumber(def.target) ? def.target : null;

    const displayRaw = def.display;
    const display: DurationDisplayMode | undefined =
      type === 'duration' && (displayRaw === 'elapsed' || displayRaw === 'remaining')
        ? displayRaw
        : defaults.display;

    metrics.push({
      id,
      type: type as ExerciseMetricType,
      target,
      label,
      unit,
      display,
      showIn: normalizeContexts(def.showIn)
    });
  }

  return metrics;
}

export function getMetricByType(
  metrics: NormalizedExerciseMetric[],
  type: string
): NormalizedExerciseMetric | undefined {
  return metrics.find((m) => m.type === type);
}
