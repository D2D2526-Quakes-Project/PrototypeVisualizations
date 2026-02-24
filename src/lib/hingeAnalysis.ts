import type { BeamDataAccessor, HingeDataAccessor } from "@/lib/types";

export type HingeMetricKey =
  | "criticalDcr"
  | "maxPosDeformDCRatio"
  | "maxNegDeformDCRatio"
  | "r3Abs"
  | "m3Abs"
  | "r3"
  | "m3";

export interface HingeFilters {
  stepType?: string | "All";
  performanceLevel?: number | "All";
}

export interface HingeEnrichedRow {
  beamIndex: number;
  elementId: number;
  groupId: number;
  nodeIndex: number;
  end: "I" | "J";
  stepType: "Max" | "Min";
  performanceLevel: 1;
  m3: number;
  r3: number;
  maxPosDeformDCRatio: number;
  maxNegDeformDCRatio: number;
  criticalDcr: number;
}

export interface HingeHistogramBin {
  x0: number;
  x1: number;
  count: number;
}

export interface HingeHistogramResult {
  bins: HingeHistogramBin[];
  count: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
}

export const HINGE_METRIC_LABELS: Record<HingeMetricKey, string> = {
  criticalDcr: "Critical D/C Ratio",
  maxPosDeformDCRatio: "Max Positive D/C Ratio",
  maxNegDeformDCRatio: "Max Negative D/C Ratio",
  r3Abs: "|R3| Rotation Demand",
  m3Abs: "|M3| Moment Demand",
  r3: "R3 Rotation Demand",
  m3: "M3 Moment Demand",
};

export const HINGE_METRIC_UNITS: Partial<Record<HingeMetricKey, string>> = {
  criticalDcr: "",
  maxPosDeformDCRatio: "",
  maxNegDeformDCRatio: "",
  r3Abs: "rad",
  r3: "rad",
  m3Abs: "source moment units",
  m3: "source moment units",
};

export function getAvailableHingeStepTypes(hingeData?: HingeDataAccessor): string[] {
  if (!hingeData) return [];
  return hingeData.metadata.step_types?.length ? hingeData.metadata.step_types : ["Max", "Min"];
}

export function getAvailableHingePerformanceLevels(hingeData?: HingeDataAccessor): number[] {
  return hingeData ? [1] : [];
}

export function matchesHingeFilters(row: HingeEnrichedRow, filters: HingeFilters): boolean {
  if (filters.stepType && filters.stepType !== "All" && row.stepType !== filters.stepType) {
    return false;
  }
  if (
    filters.performanceLevel !== undefined &&
    filters.performanceLevel !== "All" &&
    row.performanceLevel !== filters.performanceLevel
  ) {
    return false;
  }
  return true;
}

export function getHingeMetricValue(row: HingeEnrichedRow, metric: HingeMetricKey): number {
  switch (metric) {
    case "criticalDcr":
      return row.criticalDcr;
    case "maxPosDeformDCRatio":
      return row.maxPosDeformDCRatio;
    case "maxNegDeformDCRatio":
      return row.maxNegDeformDCRatio;
    case "r3Abs":
      return Math.abs(row.r3);
    case "m3Abs":
      return Math.abs(row.m3);
    case "r3":
      return row.r3;
    case "m3":
      return row.m3;
    default:
      return 0;
  }
}

export function buildHingeEnrichedRows(hingeData?: HingeDataAccessor, beamData?: BeamDataAccessor): HingeEnrichedRow[] {
  if (!hingeData) return [];

  const rows: HingeEnrichedRow[] = [];

  const pushEndpointRows = (
    beamIndex: number,
    endMask: number,
    side: "I" | "J",
    maxValues: { m3: number; r3: number; pos: number; neg: number },
    minValues: { m3: number; r3: number; pos: number; neg: number },
  ) => {
    const sideBit = side === "I" ? 0b01 : 0b10;
    if ((endMask & sideBit) === 0) return;

    const beamRow = beamData && beamIndex >= 0 && beamIndex < beamData.count ? beamData.getRow(beamIndex) : undefined;
    const nodeIndex = beamRow ? (side === "I" ? beamRow.iNodeIndex : beamRow.jNodeIndex) : -1;
    const elementId = beamRow?.elementId ?? -1;
    const groupId = beamRow?.groupId ?? -1;

    const steps = [
      { stepType: "Max" as const, values: maxValues },
      { stepType: "Min" as const, values: minValues },
    ];

    for (const step of steps) {
      const { m3, r3, pos, neg } = step.values;
      if (![m3, r3, pos, neg].every((value) => Number.isFinite(value))) continue;
      rows.push({
        beamIndex,
        elementId,
        groupId,
        nodeIndex,
        end: side,
        stepType: step.stepType,
        performanceLevel: 1,
        m3,
        r3,
        maxPosDeformDCRatio: pos,
        maxNegDeformDCRatio: neg,
        criticalDcr: Math.max(pos, neg),
      });
    }
  };

  for (let i = 0; i < hingeData.count; i++) {
    const row = hingeData.getRow(i);
    pushEndpointRows(
      row.beamIndex,
      row.endMask,
      "I",
      { m3: row.iM3Max, r3: row.iR3Max, pos: row.iMaxPosDcrMax, neg: row.iMaxNegDcrMax },
      { m3: row.iM3Min, r3: row.iR3Min, pos: row.iMaxPosDcrMin, neg: row.iMaxNegDcrMin },
    );
    pushEndpointRows(
      row.beamIndex,
      row.endMask,
      "J",
      { m3: row.jM3Max, r3: row.jR3Max, pos: row.jMaxPosDcrMax, neg: row.jMaxNegDcrMax },
      { m3: row.jM3Min, r3: row.jR3Min, pos: row.jMaxPosDcrMin, neg: row.jMaxNegDcrMin },
    );
  }

  return rows;
}

export function computeHingeHistogram(
  rows: HingeEnrichedRow[],
  metric: HingeMetricKey,
  filters: HingeFilters,
  binCount = 24,
): HingeHistogramResult | null {
  const values: number[] = [];

  for (const row of rows) {
    if (!matchesHingeFilters(row, filters)) continue;
    const value = getHingeMetricValue(row, metric);
    if (!Number.isFinite(value)) continue;
    values.push(value);
  }

  if (values.length === 0) {
    return null;
  }

  values.sort((a, b) => a - b);

  const count = values.length;
  const min = values[0] ?? 0;
  const max = values[count - 1] ?? 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / count;

  const percentile = (p: number) => {
    const idx = Math.min(count - 1, Math.max(0, Math.floor((count - 1) * p)));
    return values[idx] ?? 0;
  };

  if (Math.abs(max - min) < 1e-12) {
    return {
      bins: [{ x0: min - 0.5, x1: max + 0.5, count }],
      count,
      min,
      max,
      mean,
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
    };
  }

  const bins = Math.max(4, binCount);
  const width = (max - min) / bins;
  const counts = new Array<number>(bins).fill(0);

  for (const value of values) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((value - min) / width)));
    counts[idx] += 1;
  }

  return {
    bins: counts.map((binValue, idx) => ({
      x0: min + idx * width,
      x1: min + (idx + 1) * width,
      count: binValue,
    })),
    count,
    min,
    max,
    mean,
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
  };
}

export function getTopHingeHotspots(
  rows: HingeEnrichedRow[],
  filters: HingeFilters,
  limit = 12,
): HingeEnrichedRow[] {
  return rows
    .filter((row) => matchesHingeFilters(row, filters))
    .slice()
    .sort((a, b) => b.criticalDcr - a.criticalDcr)
    .slice(0, limit);
}

export function getHingePerformanceBreakdown(
  rows: HingeEnrichedRow[],
  filters: Omit<HingeFilters, "performanceLevel">,
): {
  levels: number[];
  totals: number[];
  exceeding1: number[];
  exceeding2: number[];
  exceeding4: number[];
} {
  let total = 0;
  let exceeding1 = 0;
  let exceeding2 = 0;
  let exceeding4 = 0;

  for (const row of rows) {
    if (filters.stepType && filters.stepType !== "All" && row.stepType !== filters.stepType) continue;
    total += 1;
    if (row.criticalDcr >= 1) exceeding1 += 1;
    if (row.criticalDcr >= 2) exceeding2 += 1;
    if (row.criticalDcr >= 4) exceeding4 += 1;
  }

  return {
    levels: [1],
    totals: [total],
    exceeding1: [exceeding1],
    exceeding2: [exceeding2],
    exceeding4: [exceeding4],
  };
}
