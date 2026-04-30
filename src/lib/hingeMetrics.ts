import type { BeamDataAccessor, BuildingAnimationData, HingeDataAccessor, HingeNodeMetrics } from "@/lib/types";

export type HingeNodeMetricKey = "hingeRotationMax" | "hingeRotationMin";

export interface HingeHistogramBin {
  x0: number;
  x1: number;
  count: number;
}

export interface HingeHistogramResult {
  bins: HingeHistogramBin[];
  min: number;
  max: number;
  count: number;
}

export interface HingeNodeSummaryRow {
  nodeId: number;
  hingeEndCount: number;
  maxRotation?: number;
  minRotation?: number;
  controllingAbsRotation: number;
}

export interface HingeLocalizedSummary {
  totalNodes: number;
  hingeNodes: number;
  totalHingeEnds: number;
  coveragePct: number;
  meanMaxRotation: number | null;
  meanMinRotation: number | null;
  governingMaxNode: HingeNodeSummaryRow | null;
  governingMinNode: HingeNodeSummaryRow | null;
  topNodes: HingeNodeSummaryRow[];
  maxHistogram: HingeHistogramResult | null;
  minHistogram: HingeHistogramResult | null;
}

function updateGoverningValue(buffer: Float32Array, index: number, candidate: number) {
  if (!Number.isFinite(candidate)) return;
  const existing = buffer[index];
  if (!Number.isFinite(existing) || Math.abs(candidate) > Math.abs(existing)) {
    buffer[index] = candidate;
  }
}

export function buildHingeNodeMetrics(
  hingeData: HingeDataAccessor | undefined,
  beamData: BeamDataAccessor | undefined,
  nodeCount: number
): HingeNodeMetrics | null {
  if (!hingeData || !beamData || nodeCount <= 0) {
    return null;
  }

  const maxRotationByNode = new Float32Array(nodeCount).fill(Number.NaN);
  const minRotationByNode = new Float32Array(nodeCount).fill(Number.NaN);
  const hingeEndCountByNode = new Uint32Array(nodeCount);

  const registerNodeValue = (beamIndex: number, side: "I" | "J", maxRotation: number, minRotation: number) => {
    if (beamIndex < 0 || beamIndex >= beamData.count) return;

    const beamRow = beamData.getRow(beamIndex);
    const nodeIndex = side === "I" ? beamRow.iNodeIndex : beamRow.jNodeIndex;
    if (nodeIndex < 0 || nodeIndex >= nodeCount) return;

    updateGoverningValue(maxRotationByNode, nodeIndex, maxRotation);
    updateGoverningValue(minRotationByNode, nodeIndex, minRotation);
    hingeEndCountByNode[nodeIndex] += 1;
  };

  for (let i = 0; i < hingeData.count; i++) {
    const row = hingeData.getRow(i);

    if (row.endMask & 0b01) {
      registerNodeValue(row.beamIndex, "I", row.iR3Max, row.iR3Min);
    }
    if (row.endMask & 0b10) {
      registerNodeValue(row.beamIndex, "J", row.jR3Max, row.jR3Min);
    }
  }

  let nodesWithHinges = 0;
  let maxRotationAbsMax = 0;
  let minRotationAbsMax = 0;

  for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex++) {
    const maxRotation = maxRotationByNode[nodeIndex];
    const minRotation = minRotationByNode[nodeIndex];
    const hasMax = Number.isFinite(maxRotation);
    const hasMin = Number.isFinite(minRotation);
    if (!hasMax && !hasMin) continue;

    nodesWithHinges += 1;
    if (hasMax) {
      maxRotationAbsMax = Math.max(maxRotationAbsMax, Math.abs(maxRotation));
    }
    if (hasMin) {
      minRotationAbsMax = Math.max(minRotationAbsMax, Math.abs(minRotation));
    }
  }

  return {
    maxRotationByNode,
    minRotationByNode,
    hingeEndCountByNode,
    nodesWithHinges,
    maxRotationAbsMax,
    minRotationAbsMax,
  };
}

export function getHingeNodeMetricValue(
  hingeNodeMetrics: HingeNodeMetrics | undefined,
  nodeId: number,
  metric: HingeNodeMetricKey
): number | undefined {
  if (!hingeNodeMetrics || nodeId < 0 || nodeId >= hingeNodeMetrics.hingeEndCountByNode.length) {
    return undefined;
  }

  const value =
    metric === "hingeRotationMax"
      ? hingeNodeMetrics.maxRotationByNode[nodeId]
      : hingeNodeMetrics.minRotationByNode[nodeId];
  return Number.isFinite(value) ? value : undefined;
}

export function buildHingeNodeSummaryRows(
  nodeIds: number[],
  hingeNodeMetrics: HingeNodeMetrics | undefined
): HingeNodeSummaryRow[] {
  if (!hingeNodeMetrics) return [];

  const rows: HingeNodeSummaryRow[] = [];

  nodeIds.forEach((nodeId) => {
    const maxRotation = getHingeNodeMetricValue(hingeNodeMetrics, nodeId, "hingeRotationMax");
    const minRotation = getHingeNodeMetricValue(hingeNodeMetrics, nodeId, "hingeRotationMin");
    if (maxRotation === undefined && minRotation === undefined) {
      return;
    }

    const controllingAbsRotation = Math.max(Math.abs(maxRotation ?? 0), Math.abs(minRotation ?? 0));
    rows.push({
      nodeId,
      hingeEndCount: hingeNodeMetrics.hingeEndCountByNode[nodeId] ?? 0,
      maxRotation,
      minRotation,
      controllingAbsRotation,
    });
  });

  return rows.sort((a, b) => b.controllingAbsRotation - a.controllingAbsRotation);
}

export function computeHingeHistogram(values: number[], binCount = 12): HingeHistogramResult | null {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (finiteValues.length === 0) return null;

  finiteValues.sort((a, b) => a - b);
  const min = finiteValues[0] ?? 0;
  const max = finiteValues[finiteValues.length - 1] ?? 0;

  if (Math.abs(max - min) < 1e-12) {
    return {
      bins: [{ x0: min - 0.5, x1: max + 0.5, count: finiteValues.length }],
      min,
      max,
      count: finiteValues.length,
    };
  }

  const bins = Math.max(4, binCount);
  const width = (max - min) / bins;
  const counts = new Array<number>(bins).fill(0);

  for (const value of finiteValues) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((value - min) / width)));
    counts[idx] += 1;
  }

  return {
    bins: counts.map((count, idx) => ({
      x0: min + idx * width,
      x1: min + (idx + 1) * width,
      count,
    })),
    min,
    max,
    count: finiteValues.length,
  };
}

export function summarizeHingeNodes(
  nodeIds: number[],
  hingeNodeMetrics: HingeNodeMetrics | undefined,
  topCount = 5
): HingeLocalizedSummary | null {
  const rows = buildHingeNodeSummaryRows(nodeIds, hingeNodeMetrics);
  if (rows.length === 0) return null;

  let sumMax = 0;
  let countMax = 0;
  let sumMin = 0;
  let countMin = 0;
  let governingMaxNode: HingeNodeSummaryRow | null = null;
  let governingMinNode: HingeNodeSummaryRow | null = null;

  for (const row of rows) {
    if (row.maxRotation !== undefined) {
      sumMax += row.maxRotation;
      countMax += 1;
      if (!governingMaxNode || Math.abs(row.maxRotation) > Math.abs(governingMaxNode.maxRotation ?? 0)) {
        governingMaxNode = row;
      }
    }
    if (row.minRotation !== undefined) {
      sumMin += row.minRotation;
      countMin += 1;
      if (!governingMinNode || Math.abs(row.minRotation) > Math.abs(governingMinNode.minRotation ?? 0)) {
        governingMinNode = row;
      }
    }
  }

  return {
    totalNodes: nodeIds.length,
    hingeNodes: rows.length,
    totalHingeEnds: rows.reduce((sum, row) => sum + row.hingeEndCount, 0),
    coveragePct: nodeIds.length > 0 ? (rows.length / nodeIds.length) * 100 : 0,
    meanMaxRotation: countMax > 0 ? sumMax / countMax : null,
    meanMinRotation: countMin > 0 ? sumMin / countMin : null,
    governingMaxNode,
    governingMinNode,
    topNodes: rows.slice(0, topCount),
    maxHistogram: computeHingeHistogram(
      rows.map((row) => row.maxRotation).filter((value): value is number => value !== undefined)
    ),
    minHistogram: computeHingeHistogram(
      rows.map((row) => row.minRotation).filter((value): value is number => value !== undefined)
    ),
  };
}

export function getGlobalHingeSummary(animationData: BuildingAnimationData): HingeLocalizedSummary | null {
  const allNodeIds = Array.from({ length: animationData.metadata.nodeCount }, (_, nodeId) => nodeId);
  return summarizeHingeNodes(allNodeIds, animationData.precomputed.hingeNodeMetrics);
}
