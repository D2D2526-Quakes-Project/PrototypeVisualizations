import Delaunay from "delaunator";
import type { AnimationMetadata, BrbMetadata, ShearMetadata } from "@/lib/types";
import type { OptionalDatasetKey } from "./loadingTypes";
import type { OptionalStatsDelta, SerializedBoundingGeometry, SerializedBoundingGeometries, SerializedComputedStatsCore } from "./serializedTypes";

export function computeBoundingGeometry(positions: Float32Array, axis: "x" | "y" | "z"): SerializedBoundingGeometry {
  const nodeCount = positions.length / 3;
  const points2D: [number, number][] = [];

  for (let i = 0; i < nodeCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    if (axis === "z") {
      points2D.push([x, y]);
    } else if (axis === "y") {
      points2D.push([x, z]);
    } else {
      points2D.push([y, z]);
    }
  }

  if (points2D.length < 3) {
    return { vertices: new Float32Array(0), triangleIndices: new Uint32Array(0) };
  }

  const delaunay = Delaunay.from(points2D);
  const triangles = delaunay.triangles;

  const edgeCount = new Map<string, number>();
  const addEdge = (a: number, b: number) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
  };

  for (let i = 0; i < triangles.length; i += 3) {
    const t0 = triangles[i];
    const t1 = triangles[i + 1];
    const t2 = triangles[i + 2];
    addEdge(t0, t1);
    addEdge(t1, t2);
    addEdge(t2, t0);
  }

  const boundaryEdges: [number, number][] = [];
  for (const [edge, count] of edgeCount) {
    if (count === 1) {
      const [a, b] = edge.split("-").map(Number);
      boundaryEdges.push([a, b]);
    }
  }

  if (boundaryEdges.length === 0) {
    return { vertices: new Float32Array(0), triangleIndices: new Uint32Array(0) };
  }

  const usedPoints = new Set<number>();
  for (const [a, b] of boundaryEdges) {
    usedPoints.add(a);
    usedPoints.add(b);
  }

  const boundaryIndices = Array.from(usedPoints);
  const pointIndexMap = new Map<number, number>();
  boundaryIndices.forEach((idx, newIdx) => pointIndexMap.set(idx, newIdx));

  const boundaryPoints2D = boundaryIndices.map((i) => points2D[i]);
  const boundaryDelaunay = Delaunay.from(boundaryPoints2D);
  const boundaryTriangles = boundaryDelaunay.triangles;

  const vertexCount = boundaryIndices.length;
  const vertices = new Float32Array(vertexCount * 3);
  boundaryIndices.forEach((originalIdx, newIdx) => {
    const x = positions[originalIdx * 3];
    const y = positions[originalIdx * 3 + 1];
    const z = positions[originalIdx * 3 + 2];

    vertices[newIdx * 3] = x;
    vertices[newIdx * 3 + 1] = y;
    vertices[newIdx * 3 + 2] = z;
  });

  const triangleIndices = new Uint32Array(boundaryTriangles.length);
  for (let i = 0; i < boundaryTriangles.length; i++) {
    const origIdx = boundaryIndices[boundaryTriangles[i]];
    triangleIndices[i] = pointIndexMap.get(origIdx)!;
  }

  return { vertices, triangleIndices };
}

export function serializeRequiredComputedStats(
  metadata: AnimationMetadata,
  positions: Float32Array,
  dispLin: Float32Array,
  groundMotion: Float32Array,
  nodeStoryDrift: Float32Array
): SerializedComputedStatsCore {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i] ?? 0;
    const y = positions[i + 1] ?? 0;
    const z = positions[i + 2] ?? 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  const center: [number, number, number] = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
  const radius = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2 + (maxZ - minZ) ** 2) / 2;

  const storyElevations: Record<string, number> = {};
  const storyHeights = metadata.storyHeights;
  let cumulativeElevation = 0;
  metadata.storyOrder.forEach((storyId) => {
    cumulativeElevation += storyHeights[storyId] || 0;
    storyElevations[storyId] = cumulativeElevation;
  });

  const getMaxComp = (buffer: Float32Array): [number, number, number] => {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let i = 0; i < buffer.length; i += 3) {
      x = Math.max(x, Math.abs(buffer[i] ?? 0));
      y = Math.max(y, Math.abs(buffer[i + 1] ?? 0));
      z = Math.max(z, Math.abs(buffer[i + 2] ?? 0));
    }
    return [x, y, z];
  };

  const getMaxMag = (buffer: Float32Array) => {
    let maxSq = 0;
    for (let i = 0; i < buffer.length; i += 3) {
      const x = buffer[i] ?? 0;
      const y = buffer[i + 1] ?? 0;
      const z = buffer[i + 2] ?? 0;
      maxSq = Math.max(maxSq, x * x + y * y + z * z);
    }
    return Math.sqrt(maxSq);
  };

  const storyCount = metadata.storyOrder.length;
  const frameCount = metadata.frameCount;
  const missingNodeSet = new Set(metadata.displacementMissingNodeIndices);

  const gmMax: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const gmMin: [number, number, number] = [Infinity, Infinity, Infinity];
  const gmMagnitude = new Float32Array(groundMotion.length / 3);
  for (let i = 0; i < groundMotion.length; i += 3) {
    const x = groundMotion[i] ?? 0;
    const y = groundMotion[i + 1] ?? 0;
    const z = groundMotion[i + 2] ?? 0;
    gmMax[0] = Math.max(gmMax[0], x);
    gmMax[1] = Math.max(gmMax[1], y);
    gmMax[2] = Math.max(gmMax[2], z);
    gmMin[0] = Math.min(gmMin[0], x);
    gmMin[1] = Math.min(gmMin[1], y);
    gmMin[2] = Math.min(gmMin[2], z);
    gmMagnitude[Math.floor(i / 3)] = Math.hypot(x, y, z);
  }

  const peakNodeDisplacement = new Float32Array(metadata.nodeCount);
  const peakNodeDisplacementFrame = new Uint32Array(metadata.nodeCount);
  const peakNodeDisplacementX = new Float32Array(metadata.nodeCount);
  const peakNodeDisplacementY = new Float32Array(metadata.nodeCount);
  const peakNodeDisplacementZ = new Float32Array(metadata.nodeCount);
  const avgDisplacementPerFrame = {
    x: new Float32Array(frameCount),
    y: new Float32Array(frameCount),
    z: new Float32Array(frameCount),
    mag: new Float32Array(frameCount),
  };
  const avgDisplacementPerStory = new Float32Array(storyCount * frameCount * 3);

  const peakStoryDrift = new Float32Array(metadata.nodeCount);
  const peakStoryDriftFrame = new Float32Array(metadata.nodeCount);
  const avgStoryDriftPerFrame = new Float32Array(frameCount);
  const avgStoryDriftPerStory = new Float32Array(frameCount * storyCount);
  let maxStoryDrift = 0;

  const storyNodeIndices = metadata.storyOrder.map((storyId) => metadata.stories[storyId] ?? []);

  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    const frameOffset = frameIdx * metadata.nodeCount * 3;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    let sumDrift = 0;

    for (let nodeIdx = 0; nodeIdx < metadata.nodeCount; nodeIdx++) {
      const offset = frameOffset + nodeIdx * 3;
      const dx = dispLin[offset] ?? 0;
      const dy = dispLin[offset + 1] ?? 0;
      const dz = dispLin[offset + 2] ?? 0;
      const mag = Math.hypot(dx, dy, dz);
      if (mag > peakNodeDisplacement[nodeIdx]) {
        peakNodeDisplacement[nodeIdx] = mag;
        peakNodeDisplacementFrame[nodeIdx] = frameIdx;
        peakNodeDisplacementX[nodeIdx] = dx;
        peakNodeDisplacementY[nodeIdx] = dy;
        peakNodeDisplacementZ[nodeIdx] = dz;
      }
      sumX += dx;
      sumY += dy;
      sumZ += dz;

      const drift = nodeStoryDrift[frameIdx * metadata.nodeCount + nodeIdx];
      sumDrift += drift;
      if (drift > peakStoryDrift[nodeIdx]) {
        peakStoryDrift[nodeIdx] = drift;
        peakStoryDriftFrame[nodeIdx] = frameIdx;
      }
      if (drift > maxStoryDrift) {
        maxStoryDrift = drift;
      }
    }

    avgDisplacementPerFrame.x[frameIdx] = sumX / metadata.nodeCount;
    avgDisplacementPerFrame.y[frameIdx] = sumY / metadata.nodeCount;
    avgDisplacementPerFrame.z[frameIdx] = sumZ / metadata.nodeCount;
    avgDisplacementPerFrame.mag[frameIdx] = Math.hypot(
      avgDisplacementPerFrame.x[frameIdx],
      avgDisplacementPerFrame.y[frameIdx],
      avgDisplacementPerFrame.z[frameIdx]
    );
    avgStoryDriftPerFrame[frameIdx] = sumDrift / metadata.nodeCount;

    for (let storyIdx = 0; storyIdx < storyCount; storyIdx++) {
      const nodes = storyNodeIndices[storyIdx];
      if (nodes.length === 0) continue;
      let storyX = 0;
      let storyY = 0;
      let storyZ = 0;
      let count = 0;
      nodes.forEach((nodeId) => {
        if (missingNodeSet.has(nodeId)) return;
        const offset = frameOffset + nodeId * 3;
        storyX += dispLin[offset] ?? 0;
        storyY += dispLin[offset + 1] ?? 0;
        storyZ += dispLin[offset + 2] ?? 0;
        count++;
      });
      const avgIdx = (frameIdx * storyCount + storyIdx) * 3;
      avgDisplacementPerStory[avgIdx] = storyX / count;
      avgDisplacementPerStory[avgIdx + 1] = storyY / count;
      avgDisplacementPerStory[avgIdx + 2] = storyZ / count;
    }

    for (let storyIdx = 0; storyIdx < storyCount; storyIdx++) {
      const nodes = storyNodeIndices[storyIdx];
      if (nodes.length === 0) continue;
      let driftSum = 0;
      nodes.forEach((nodeId) => {
        driftSum += nodeStoryDrift[frameIdx * metadata.nodeCount + nodeId];
      });
      avgStoryDriftPerStory[frameIdx * storyCount + storyIdx] = driftSum / nodes.length;
    }
  }

  const [maxDisplacementX, maxDisplacementY, maxDisplacementZ] = getMaxComp(dispLin);

  const numCrossSectionsX = Object.keys(metadata.crossSectionsX).length;
  const numCrossSectionsY = Object.keys(metadata.crossSectionsY).length;

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const spanZ = maxZ - minZ;

  const boundingGeometries: SerializedBoundingGeometries | undefined = (() => {
    try {
      return {
        zAxis: computeBoundingGeometry(positions, "z"),
        yAxis: computeBoundingGeometry(positions, "y"),
        xAxis: computeBoundingGeometry(positions, "x"),
      };
    } catch {
      return undefined;
    }
  })();

  return {
    boundingBox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ], center, radius, span: [spanX, spanY, spanZ] },
    storyElevations,
    maxDisplacement: getMaxMag(dispLin),
    maxDisplacementX,
    maxDisplacementY,
    maxDisplacementZ,
    maxStoryDrift,
    groundMotion: {
      min: gmMin,
      max: gmMax,
      magnitude: gmMagnitude,
      maxMagnitude: Math.max(...gmMagnitude),
      minMagnitude: Math.min(...gmMagnitude),
    },
    peakStoryDrift,
    peakStoryDriftFrame,
    avgStoryDriftPerFrame,
    avgStoryDriftPerStory,
    peakNodeDisplacement,
    peakNodeDisplacementFrame,
    peakNodeDisplacementX,
    peakNodeDisplacementY,
    peakNodeDisplacementZ,
    avgDisplacementPerFrame,
    avgDisplacementPerStory,
    numCrossSectionsX,
    numCrossSectionsY,
    boundingGeometries,
  };
}

export function calculateBrbStats(metadata: BrbMetadata, body: Float32Array): OptionalStatsDelta {
  let maxBrbTensionRatio = 0;
  let maxBrbCompressionRatio = 0;
  let maxBrbRatioAbs = 0;

  for (let rowIdx = 0; rowIdx < metadata.count_rows; rowIdx++) {
    const offset = rowIdx * metadata.stride;
    const tensionRatio = body[offset + 5];
    const compressionRatio = body[offset + 6];
    const ratioAbs = body[offset + 7];

    if (Number.isFinite(tensionRatio)) {
      maxBrbTensionRatio = Math.max(maxBrbTensionRatio, Math.abs(tensionRatio));
    }
    if (Number.isFinite(compressionRatio)) {
      maxBrbCompressionRatio = Math.max(maxBrbCompressionRatio, Math.abs(compressionRatio));
    }
    if (Number.isFinite(ratioAbs)) {
      maxBrbRatioAbs = Math.max(maxBrbRatioAbs, Math.abs(ratioAbs));
    }
  }

  return {
    maxBrbTensionRatio,
    maxBrbCompressionRatio,
    maxBrbRatioAbs,
  };
}

export function calculateShearStats(metadata: ShearMetadata, body: Float32Array): OptionalStatsDelta {
  const maxAbsByColumn = [0, 0, 0, 0];
  let maxShearXAbs = 0;
  let maxShearYAbs = 0;

  for (let rowIdx = 0; rowIdx < metadata.count_rows; rowIdx++) {
    const offset = rowIdx * metadata.stride;
    const xMax = body[offset];
    const xMin = body[offset + 1];
    const yMax = body[offset + 2];
    const yMin = body[offset + 3];
    const values = [xMax, xMin, yMax, yMin];

    values.forEach((value, index) => {
      if (Number.isFinite(value)) {
        maxAbsByColumn[index] = Math.max(maxAbsByColumn[index], Math.abs(value));
      }
    });

    maxShearXAbs = Math.max(
      maxShearXAbs,
      Number.isFinite(xMax) ? Math.abs(xMax) : 0,
      Number.isFinite(xMin) ? Math.abs(xMin) : 0
    );
    maxShearYAbs = Math.max(
      maxShearYAbs,
      Number.isFinite(yMax) ? Math.abs(yMax) : 0,
      Number.isFinite(yMin) ? Math.abs(yMin) : 0
    );
  }

  return {
    maxshearXMax: maxAbsByColumn[0],
    maxShearXMin: maxAbsByColumn[1],
    maxShearXAbs,
    maxShearYMax: maxAbsByColumn[2],
    maxShearYMin: maxAbsByColumn[3],
    maxShearYAbs,
  };
}

export function calculateOptionalTimeSeriesStats(
  key: Exclude<OptionalDatasetKey, "beamData" | "hingeData" | "shearData" | "brbData">,
  metadata: AnimationMetadata,
  body: Float32Array
): OptionalStatsDelta {
  const getMaxComp = (buffer: Float32Array): [number, number, number] => {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let i = 0; i < buffer.length; i += 3) {
      x = Math.max(x, Math.abs(buffer[i] ?? 0));
      y = Math.max(y, Math.abs(buffer[i + 1] ?? 0));
      z = Math.max(z, Math.abs(buffer[i + 2] ?? 0));
    }
    return [x, y, z];
  };

  const getMaxMag = (buffer: Float32Array) => {
    let maxSq = 0;
    for (let i = 0; i < buffer.length; i += 3) {
      const x = buffer[i] ?? 0;
      const y = buffer[i + 1] ?? 0;
      const z = buffer[i + 2] ?? 0;
      maxSq = Math.max(maxSq, x * x + y * y + z * z);
    }
    return Math.sqrt(maxSq);
  };

  const computeRotationStats = (
    magKey: "maxRotation" | "maxRotationVelocity" | "maxRotationAcceleration",
    compX: "maxRotationX" | "maxRotationVelocityX" | "maxRotationAccelerationX",
    compY: "maxRotationY" | "maxRotationVelocityY" | "maxRotationAccelerationY",
    compZ: "maxRotationZ" | "maxRotationVelocityZ" | "maxRotationAccelerationZ",
    storyKey: "avgRotationPerStory" | "avgRotationVelocityPerStory" | "avgRotationAccelerationPerStory"
  ): OptionalStatsDelta => {
    const [x, y, z] = getMaxComp(body);
    const storyCount = metadata.storyOrder.length;
    const frameCount = metadata.frameCount;
    const storyNodeIndices = metadata.storyOrder.map((storyId) => metadata.stories[storyId] ?? []);
    const avgPerStory = new Float32Array(storyCount * frameCount * 3);

    for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
      const frameOffset = frameIdx * metadata.nodeCount * 3;
      for (let storyIdx = 0; storyIdx < storyCount; storyIdx++) {
        const nodes = storyNodeIndices[storyIdx];
        if (nodes.length === 0) continue;
        let sumX = 0;
        let sumY = 0;
        let sumZ = 0;
        nodes.forEach((nodeId) => {
          const offset = frameOffset + nodeId * 3;
          sumX += body[offset] ?? 0;
          sumY += body[offset + 1] ?? 0;
          sumZ += body[offset + 2] ?? 0;
        });
        const avgIdx = (frameIdx * storyCount + storyIdx) * 3;
        avgPerStory[avgIdx] = sumX / nodes.length;
        avgPerStory[avgIdx + 1] = sumY / nodes.length;
        avgPerStory[avgIdx + 2] = sumZ / nodes.length;
      }
    }

    return {
      [magKey]: getMaxMag(body),
      [compX]: x,
      [compY]: y,
      [compZ]: z,
      [storyKey]: avgPerStory,
    } as OptionalStatsDelta;
  };

  if (key === "displacementRot") {
    return computeRotationStats("maxRotation", "maxRotationX", "maxRotationY", "maxRotationZ", "avgRotationPerStory");
  }

  if (key === "velocityRot") {
    return computeRotationStats(
      "maxRotationVelocity",
      "maxRotationVelocityX",
      "maxRotationVelocityY",
      "maxRotationVelocityZ",
      "avgRotationVelocityPerStory"
    );
  }

  if (key === "accelerationRot") {
    return computeRotationStats(
      "maxRotationAcceleration",
      "maxRotationAccelerationX",
      "maxRotationAccelerationY",
      "maxRotationAccelerationZ",
      "avgRotationAccelerationPerStory"
    );
  }

  const frameCount = metadata.frameCount;
  const nodeCount = metadata.nodeCount;
  const storyCount = metadata.storyOrder.length;
  const storyNodeIndices = metadata.storyOrder.map((storyId) => metadata.stories[storyId] ?? []);
  const [x, y, z] = getMaxComp(body);

  const avgPerFrame = {
    x: new Float32Array(frameCount),
    y: new Float32Array(frameCount),
    z: new Float32Array(frameCount),
    mag: new Float32Array(frameCount),
  };
  const avgPerStory = new Float32Array(storyCount * frameCount * 3);
  const peakNode = new Float32Array(nodeCount);
  const magnitudes: number[] = [];

  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    const frameOffset = frameIdx * nodeCount * 3;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
      const offset = frameOffset + nodeIdx * 3;
      const vx = body[offset] ?? 0;
      const vy = body[offset + 1] ?? 0;
      const vz = body[offset + 2] ?? 0;
      const mag = Math.hypot(vx, vy, vz);
      if (mag > peakNode[nodeIdx]) {
        peakNode[nodeIdx] = mag;
      }
      if (key === "velocityLin") {
        magnitudes.push(mag);
      }
      sumX += vx;
      sumY += vy;
      sumZ += vz;
    }

    avgPerFrame.x[frameIdx] = sumX / nodeCount;
    avgPerFrame.y[frameIdx] = sumY / nodeCount;
    avgPerFrame.z[frameIdx] = sumZ / nodeCount;
    avgPerFrame.mag[frameIdx] = Math.hypot(avgPerFrame.x[frameIdx], avgPerFrame.y[frameIdx], avgPerFrame.z[frameIdx]);

    for (let storyIdx = 0; storyIdx < storyCount; storyIdx++) {
      const nodes = storyNodeIndices[storyIdx];
      if (nodes.length === 0) continue;
      let storyX = 0;
      let storyY = 0;
      let storyZ = 0;
      nodes.forEach((nodeId) => {
        const offset = frameOffset + nodeId * 3;
        storyX += body[offset] ?? 0;
        storyY += body[offset + 1] ?? 0;
        storyZ += body[offset + 2] ?? 0;
      });
      const avgIdx = (frameIdx * storyCount + storyIdx) * 3;
      avgPerStory[avgIdx] = storyX / nodes.length;
      avgPerStory[avgIdx + 1] = storyY / nodes.length;
      avgPerStory[avgIdx + 2] = storyZ / nodes.length;
    }
  }

  if (key === "velocityLin") {
    magnitudes.sort((a, b) => a - b);
    return {
      maxVelocity: getMaxMag(body),
      maxVelocityX: x,
      maxVelocityY: y,
      maxVelocityZ: z,
      peakNodeVelocity: peakNode,
      avgVelocityPerFrame: avgPerFrame,
      avgVelocityPerStory: avgPerStory,
    };
  }

  return {
    maxAcceleration: getMaxMag(body),
    maxAccelerationX: x,
    maxAccelerationY: y,
    maxAccelerationZ: z,
    peakNodeAcceleration: peakNode,
    avgAccelerationPerFrame: avgPerFrame,
    avgAccelerationPerStory: avgPerStory,
  };
}
