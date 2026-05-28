import type {
  BeamDataAccessor,
  BeamHingeIndexEntry,
  HingeDataAccessor,
  HingeNodeMetrics,
  NodeHingeIndexEntry,
} from "@/lib/types";

export type HingeHistogramResult = {
  bins: {
    x0: number;
    x1: number;
    count: number;
  }[];
  count: number;
  min: number;
  max: number;
  mean: number;
};

export function computeHingeHistogram(values: number[], binCount = 24): HingeHistogramResult | null {
  if (values.length === 0) return null;
  values = values.filter((value) => Number.isFinite(value));
  values.sort((a, b) => a - b);

  const count = values.length;

  const min = values[0];
  const max = values[count - 1];
  const mean = values.reduce((sum, value) => sum + value, 0) / count;

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
  };
}

export function summarizeHingeNodes(nodeIds: number[], hingeNodeMetrics: HingeNodeMetrics) {
  const maxHistogram: number[] = [];
  const minHistogram: number[] = [];
  let maxAbsRotation = 0;

  for (const nodeId of nodeIds) {
    const maxRotation = hingeNodeMetrics.maxRotationByNode[nodeId];
    const minRotation = hingeNodeMetrics.minRotationByNode[nodeId];
    if (isFinite(maxRotation)) {
      maxAbsRotation = Math.max(maxAbsRotation, Math.abs(maxRotation));
      maxHistogram.push(maxRotation);
    }
    if (isFinite(minRotation)) {
      maxAbsRotation = Math.max(maxAbsRotation, Math.abs(minRotation));
      minHistogram.push(minRotation);
    }
  }
  return {
    maxAbsRotation,
    maxHistogram: computeHingeHistogram(maxHistogram, 12),
    minHistogram: computeHingeHistogram(minHistogram, 12),
  };
}

// Precomputed helpers

export function buildNodeToHingeIndexMap(
  hingeData: HingeDataAccessor | undefined,
  beamData: BeamDataAccessor | undefined,
  nodeCount: number
): NodeHingeIndexEntry[][] | undefined {
  if (!hingeData || !beamData || nodeCount <= 0) {
    return undefined;
  }

  const map: NodeHingeIndexEntry[][] = Array.from({ length: nodeCount }, () => []);

  for (let hingeIdx = 0; hingeIdx < hingeData.count; hingeIdx++) {
    const row = hingeData.getRow(hingeIdx);
    const beamRow = beamData.getRow(row.beamIndex);

    if (row.endMask & 0b01) {
      map[beamRow.iNodeIndex].push({ hingeIdx, endCap: 1 });
    }
    if (row.endMask & 0b10) {
      map[beamRow.jNodeIndex].push({ hingeIdx, endCap: 2 });
    }
  }

  return map;
}

export function buildBeamToHingeIndexMap(
  hingeData: HingeDataAccessor | undefined,
  beamData: BeamDataAccessor | undefined
): BeamHingeIndexEntry[][] | undefined {
  if (!hingeData || !beamData) {
    return undefined;
  }

  const map: BeamHingeIndexEntry[][] = Array.from({ length: beamData.count }, () => []);

  for (let hingeIdx = 0; hingeIdx < hingeData.count; hingeIdx++) {
    const row = hingeData.getRow(hingeIdx);
    const beamIdx = row.beamIndex;

    if (row.endMask & 0b01) {
      map[beamIdx].push({ hingeIdx, endCap: 1 });
    }
    if (row.endMask & 0b10) {
      map[beamIdx].push({ hingeIdx, endCap: 2 });
    }
  }

  return map;
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

    if (Math.abs(maxRotation) > Math.abs(maxRotationByNode[nodeIndex]) || !isFinite(maxRotationByNode[nodeIndex])) {
      maxRotationByNode[nodeIndex] = maxRotation;
    }
    if (Math.abs(minRotation) > Math.abs(minRotationByNode[nodeIndex]) || !isFinite(minRotationByNode[nodeIndex])) {
      minRotationByNode[nodeIndex] = minRotation;
    }
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
