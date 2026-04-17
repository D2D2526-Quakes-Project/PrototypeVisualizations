import type {
  AnimationMetadata,
  BeamDataAccessor,
  BeamDataMetadata,
  BuildingAnimationData,
  BuildingMetadata,
  ComputedStats,
  GroundMotionMetadata,
  HingeDataAccessor,
  HingeMetadata,
  HingeSummary,
  IndexAccessor,
  NodeValueTimeAccessor,
  SimulationMetadata,
  TimeIndexAccessor,
} from "@/lib/types";
import type { DatasetKey, OptionalDatasetKey } from "@/lib/loadingTypes";

export const PROCESSED_CACHE_VERSION = 1;

export interface SerializedStoryDrift {
  data: Float32Array;
  storyCount: number;
  frameCount: number;
  cornerCount: number;
}

export interface SerializedComputedStatsCore {
  boundingBox: ComputedStats["boundingBox"];
  storyElevations: Record<string, number>;
  maxDisplacement: number;
  maxDisplacementX: number;
  maxDisplacementY: number;
  maxDisplacementZ: number;
  maxStoryDrift: number;
  groundMotion: {
    min: [number, number, number];
    max: [number, number, number];
    magnitude: Float32Array;
    maxMagnitude: number;
    minMagnitude: number;
  };
  peakNodeDisplacement: Float32Array;
  peakNodeDisplacementFrame: Uint32Array;
  peakNodeDisplacementX: Float32Array;
  peakNodeDisplacementY: Float32Array;
  peakNodeDisplacementZ: Float32Array;
  peakStoryDrift: Float32Array;
  peakStoryDriftFrame: Float32Array;
  avgDisplacementPerFrame: {
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    mag: Float32Array;
  };
  avgDisplacementPerStory: Float32Array;
  numCrossSectionsX: number;
  numCrossSectionsY: number;
}

export interface SerializedRequiredAnimationData {
  metadata: AnimationMetadata;
  precomputed: SerializedComputedStatsCore;
  initialPositions: Float32Array;
  displacementLin: Float32Array;
  groundMotion: Float32Array;
  storyDrift: Float32Array;
}

export interface OptionalStatsDelta {
  maxVelocity?: number;
  maxVelocityX?: number;
  maxVelocityY?: number;
  maxVelocityZ?: number;
  maxAcceleration?: number;
  maxAccelerationX?: number;
  maxAccelerationY?: number;
  maxAccelerationZ?: number;
  maxRotation?: number;
  maxRotationX?: number;
  maxRotationY?: number;
  maxRotationZ?: number;
  maxRotationVelocity?: number;
  maxRotationVelocityX?: number;
  maxRotationVelocityY?: number;
  maxRotationVelocityZ?: number;
  maxRotationAcceleration?: number;
  maxRotationAccelerationX?: number;
  maxRotationAccelerationY?: number;
  maxRotationAccelerationZ?: number;
  peakNodeVelocity?: Float32Array;
  peakNodeAcceleration?: Float32Array;
  avgVelocityPerFrame?: {
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    mag: Float32Array;
  };
  avgAccelerationPerFrame?: {
    x: Float32Array;
    y: Float32Array;
    z: Float32Array;
    mag: Float32Array;
  };
  avgVelocityPerStory?: Float32Array;
  avgAccelerationPerStory?: Float32Array;
  hinge?: HingeSummary;
}

export interface SerializedOptionalDatasetResult {
  key: OptionalDatasetKey;
  kind: "timeSeries" | "beamData" | "hingeData";
  metadata: SimulationMetadata | BeamDataMetadata | HingeMetadata;
  data: Float32Array;
  statsDelta: OptionalStatsDelta;
}

export interface OptionalWorkerRequest {
  key: OptionalDatasetKey;
  rawBuffer: ArrayBuffer;
  baseMetadata: AnimationMetadata;
}

export interface OptionalWorkerResponse {
  result: SerializedOptionalDatasetResult;
}

export async function ensureDecompressed(raw: ArrayBuffer | string): Promise<ArrayBuffer> {
  let buffer: ArrayBuffer;
  if (typeof raw === "string") {
    const enc = new TextEncoder();
    buffer = enc.encode(raw).buffer;
  } else {
    buffer = raw;
  }

  const view = new Uint8Array(buffer);
  if (view[0] === 0x1f && view[1] === 0x8b) {
    const ds = new DecompressionStream("gzip");
    const writer = ds.writable.getWriter();
    writer.write(buffer);
    writer.close();
    return new Response(ds.readable).arrayBuffer();
  }

  return buffer;
}

export function parseBlob<T>(buffer: ArrayBuffer) {
  const headerLen = new Uint32Array(buffer, 0, 1)[0];
  const decoder = new TextDecoder("utf-8");
  const headerBytes = new Uint8Array(buffer, 4, headerLen);
  const headerJson = decoder.decode(headerBytes);
  const metadata = JSON.parse(headerJson) as T;

  let bodyOffset = 4 + headerLen;
  const remainder = bodyOffset % 4;
  if (remainder !== 0) {
    bodyOffset += 4 - remainder;
  }

  const bodyView = new Float32Array(buffer, bodyOffset);
  return { metadata, bodyView };
}

function makeAccessor(data: Float32Array, stride: number): IndexAccessor {
  return {
    data,
    stride,
    at(idx: number) {
      return data.subarray(idx * stride, (idx + 1) * stride);
    },
    xAt(idx: number) {
      return data.subarray(idx * stride, (idx + 1) * stride)[0] ?? 0;
    },
    yAt(idx: number) {
      return data.subarray(idx * stride, (idx + 1) * stride)[1] ?? 0;
    },
    zAt(idx: number) {
      return data.subarray(idx * stride, (idx + 1) * stride)[2] ?? 0;
    },
  };
}

function makeTimeAccessor(data: Float32Array, nodeCount: number): TimeIndexAccessor {
  const outerStride = nodeCount * 3;
  return {
    data,
    stride: outerStride,
    atFrame(frameIdx: number) {
      return makeAccessor(data.subarray(frameIdx * outerStride, (frameIdx + 1) * outerStride), 3);
    },
  };
}

function makeNodeValueTimeAccessor(data: Float32Array, frameCount: number, nodeCount: number): NodeValueTimeAccessor {
  return {
    data,
    frameCount,
    nodeCount,
    get(frameIdx: number, nodeIdx: number) {
      return data[frameIdx * nodeCount + nodeIdx] ?? 0;
    },
  };
}

function makeBeamAccessor(metadata: BeamDataMetadata, body: Float32Array): BeamDataAccessor {
  const stride = metadata.stride;
  const count = metadata.count_rows;
  const data = body.subarray(0, count * stride);
  const valueAt = (row: Float32Array, index: number): number => row[index] ?? 0;

  return {
    data,
    stride,
    count,
    metadata,
    at(idx: number) {
      return data.subarray(idx * stride, (idx + 1) * stride);
    },
    getRow(idx: number) {
      const row = data.subarray(idx * stride, (idx + 1) * stride);
      return {
        elementId: Math.trunc(valueAt(row, 0)),
        iNodeIndex: Math.trunc(valueAt(row, 1)),
        jNodeIndex: Math.trunc(valueAt(row, 2)),
        groupId: Math.trunc(valueAt(row, 3)),
      };
    },
  };
}

function makeHingeAccessor(metadata: HingeMetadata, body: Float32Array): HingeDataAccessor {
  const stride = metadata.stride;
  const count = metadata.count_rows;
  const data = body.subarray(0, count * stride);
  const valueAt = (row: Float32Array, index: number): number => row[index] ?? 0;

  return {
    data,
    stride,
    count,
    metadata,
    at(idx: number) {
      return data.subarray(idx * stride, (idx + 1) * stride);
    },
    getRow(idx: number) {
      const row = data.subarray(idx * stride, (idx + 1) * stride);
      return {
        beamIndex: Math.trunc(valueAt(row, 0)),
        endMask: Math.trunc(valueAt(row, 1)),
        iM3Max: valueAt(row, 2),
        iM3Min: valueAt(row, 3),
        iR3Max: valueAt(row, 4),
        iR3Min: valueAt(row, 5),
        iMaxPosDcrMax: valueAt(row, 6),
        iMaxPosDcrMin: valueAt(row, 7),
        iMaxNegDcrMax: valueAt(row, 8),
        iMaxNegDcrMin: valueAt(row, 9),
        jM3Max: valueAt(row, 10),
        jM3Min: valueAt(row, 11),
        jR3Max: valueAt(row, 12),
        jR3Min: valueAt(row, 13),
        jMaxPosDcrMax: valueAt(row, 14),
        jMaxPosDcrMin: valueAt(row, 15),
        jMaxNegDcrMax: valueAt(row, 16),
        jMaxNegDcrMin: valueAt(row, 17),
      };
    },
  };
}

function serializeRequiredComputedStats(
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
  const avgDisplacementPerStory = new Float32Array(storyCount * frameCount);

  const peakStoryDrift = new Float32Array(metadata.nodeCount);
  const peakStoryDriftFrame = new Float32Array(metadata.nodeCount);
  let maxStoryDrift = 0;

  const storyNodeIndices = metadata.storyOrder.map((storyId) => metadata.stories[storyId] ?? []);

  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    const frameOffset = frameIdx * metadata.nodeCount * 3;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

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

    for (let storyIdx = 0; storyIdx < storyCount; storyIdx++) {
      const nodes = storyNodeIndices[storyIdx];
      if (nodes.length === 0) continue;
      let storyX = 0;
      let storyY = 0;
      let storyZ = 0;
      nodes.forEach((nodeId) => {
        const offset = frameOffset + nodeId * 3;
        storyX += dispLin[offset] ?? 0;
        storyY += dispLin[offset + 1] ?? 0;
        storyZ += dispLin[offset + 2] ?? 0;
      });
      avgDisplacementPerStory[storyIdx * frameCount + frameIdx] = Math.hypot(
        storyX / nodes.length,
        storyY / nodes.length,
        storyZ / nodes.length
      );
    }
  }

  const [maxDisplacementX, maxDisplacementY, maxDisplacementZ] = getMaxComp(dispLin);

  const numCrossSectionsX = Object.keys(metadata.crossSectionsX).length;
  const numCrossSectionsY = Object.keys(metadata.crossSectionsY).length;

  return {
    boundingBox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ], center, radius },
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
    peakNodeDisplacement,
    peakNodeDisplacementFrame,
    peakNodeDisplacementX,
    peakNodeDisplacementY,
    peakNodeDisplacementZ,
    avgDisplacementPerFrame,
    avgDisplacementPerStory,
    numCrossSectionsX,
    numCrossSectionsY,
  };
}

export async function buildRequiredSerializedAnimationDataFromRaw(input: {
  rawBuilding: ArrayBuffer;
  rawDispLin: ArrayBuffer;
  rawGroundMotion: ArrayBuffer;
}): Promise<SerializedRequiredAnimationData> {
  const buildingBuffer = await ensureDecompressed(input.rawBuilding);
  const dispLinBuffer = await ensureDecompressed(input.rawDispLin);
  const groundMotionBuffer = await ensureDecompressed(input.rawGroundMotion);

  const buildingData = parseBlob<BuildingMetadata>(buildingBuffer);
  const dispLinData = parseBlob<SimulationMetadata>(dispLinBuffer);
  const groundMotionData = parseBlob<GroundMotionMetadata>(groundMotionBuffer);

  if (dispLinData.metadata.count_nodes !== buildingData.metadata.count_nodes) {
    throw new Error(
      `Mismatch: Building has ${buildingData.metadata.count_nodes} nodes, displacement file has ${dispLinData.metadata.count_nodes}`
    );
  }

  const storyOrder = buildingData.metadata.story_order;
  const stories = buildingData.metadata.stories;
  const corners = buildingData.metadata.corners;
  const storyHeights = buildingData.metadata.story_heights;

  const cornerSets = {
    NW: new Set(corners.NW),
    NE: new Set(corners.NE),
    SW: new Set(corners.SW),
    SE: new Set(corners.SE),
  };
  const cornerNodes: Record<string, { NW: number; NE: number; SW: number; SE: number }> = {};
  storyOrder.forEach((storyId) => {
    const nodeIndices = stories[storyId] ?? [];
    cornerNodes[storyId] = {
      NW: nodeIndices.find((nodeId) => cornerSets.NW.has(nodeId)) ?? -1,
      NE: nodeIndices.find((nodeId) => cornerSets.NE.has(nodeId)) ?? -1,
      SW: nodeIndices.find((nodeId) => cornerSets.SW.has(nodeId)) ?? -1,
      SE: nodeIndices.find((nodeId) => cornerSets.SE.has(nodeId)) ?? -1,
    };
  });

  const metadata: AnimationMetadata = {
    nodeCount: buildingData.metadata.count_nodes,
    frameCount: dispLinData.metadata.count_frames,
    dt: dispLinData.metadata.dt,
    stories: stories,
    corners: corners,
    cornerNodes: cornerNodes,
    storyHeights: storyHeights,
    storyOrder: storyOrder,
    nodeToBelow: buildingData.metadata.node_to_below ?? [],
    crossSectionsX: buildingData.metadata.cross_sections_x,
    crossSectionsY: buildingData.metadata.cross_sections_y,
    hiddenFloors: buildingData.metadata.hidden_floors ?? [],
  };

  // --- Compute Node Story Drift Dynamically ---
  const nodeCount = metadata.nodeCount;
  const frameCount = metadata.frameCount;
  const nodeStoryDrift = new Float32Array(frameCount * nodeCount);
  const dispLin = dispLinData.bodyView;

  // Build a fast lookup for node -> story height
  const nodeToStoryHeight = new Float32Array(nodeCount);
  metadata.storyOrder.forEach((storyId) => {
    const height = metadata.storyHeights[storyId] || 1;
    const nodes = metadata.stories[storyId] || [];
    nodes.forEach((n) => {
      nodeToStoryHeight[n] = height;
    });
  });

  // Loop every frame and every node to calculate drift exactly like the python script
  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    const frameOffset = frameIdx * nodeCount * 3;
    const outOffset = frameIdx * nodeCount;

    for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
      const belowIdx = metadata.nodeToBelow[nodeIdx];
      if (belowIdx === undefined || belowIdx < 0) continue; // ground floor or no match

      // Current node 3D magnitude
      const nX = dispLin[frameOffset + nodeIdx * 3] ?? 0;
      const nY = dispLin[frameOffset + nodeIdx * 3 + 1] ?? 0;
      const nZ = dispLin[frameOffset + nodeIdx * 3 + 2] ?? 0;
      const currentMag = Math.sqrt(nX * nX + nY * nY + nZ * nZ);

      // Node directly below 3D magnitude
      const bX = dispLin[frameOffset + belowIdx * 3] ?? 0;
      const bY = dispLin[frameOffset + belowIdx * 3 + 1] ?? 0;
      const bZ = dispLin[frameOffset + belowIdx * 3 + 2] ?? 0;
      const belowMag = Math.sqrt(bX * bX + bY * bY + bZ * bZ);

      const height = nodeToStoryHeight[nodeIdx] || 1;

      // Calculate % difference
      nodeStoryDrift[outOffset + nodeIdx] = (Math.abs(currentMag - belowMag) / height) * 100;
    }
  }

  return {
    metadata,
    precomputed: serializeRequiredComputedStats(
      metadata,
      buildingData.bodyView.subarray(0),
      dispLinData.bodyView.subarray(0),
      groundMotionData.bodyView.subarray(0),
      nodeStoryDrift
    ),
    initialPositions: buildingData.bodyView.subarray(0),
    displacementLin: dispLinData.bodyView.subarray(0),
    groundMotion: groundMotionData.bodyView.subarray(0),
    storyDrift: nodeStoryDrift,
  };
}

export function rebuildAnimationDataFromSerializedCore(data: SerializedRequiredAnimationData): BuildingAnimationData {
  return {
    metadata: {
      ...data.metadata,
    },
    precomputed: {
      ...data.precomputed,
    },
    initialPositions: makeAccessor(data.initialPositions, 3),
    displacementLin: makeTimeAccessor(data.displacementLin, data.metadata.nodeCount),
    groundMotion: makeAccessor(data.groundMotion, 3),
    storyDrift: makeNodeValueTimeAccessor(data.storyDrift, data.metadata.frameCount, data.metadata.nodeCount),
  };
}

export function mergeOptionalDatasetIntoAnimationData(
  animationData: BuildingAnimationData,
  result: SerializedOptionalDatasetResult
): BuildingAnimationData {
  const nextPrecomputed: ComputedStats = {
    ...animationData.precomputed,
    ...result.statsDelta,
  };

  const nextAnimationData: BuildingAnimationData = {
    ...animationData,
    precomputed: nextPrecomputed,
  };

  if (result.key === "beamData") {
    nextAnimationData.beamData = makeBeamAccessor(result.metadata as BeamDataMetadata, result.data);
    return nextAnimationData;
  }

  if (result.key === "hingeData") {
    nextAnimationData.hingeData = makeHingeAccessor(result.metadata as HingeMetadata, result.data);
    return nextAnimationData;
  }

  const accessor = makeTimeAccessor(result.data, animationData.metadata.nodeCount);
  if (result.key === "displacementRot") nextAnimationData.displacementRot = accessor;
  if (result.key === "velocityLin") nextAnimationData.velocityLin = accessor;
  if (result.key === "velocityRot") nextAnimationData.velocityRot = accessor;
  if (result.key === "accelerationLin") nextAnimationData.accelerationLin = accessor;
  if (result.key === "accelerationRot") nextAnimationData.accelerationRot = accessor;
  return nextAnimationData;
}

export async function parseOptionalDatasetFromRawBuffer(
  request: OptionalWorkerRequest
): Promise<SerializedOptionalDatasetResult> {
  const buffer = await ensureDecompressed(request.rawBuffer);

  if (request.key === "beamData") {
    const parsed = parseBlob<BeamDataMetadata>(buffer);
    return {
      key: request.key,
      kind: "beamData",
      metadata: parsed.metadata,
      data: parsed.bodyView.subarray(0, parsed.metadata.count_rows * parsed.metadata.stride),
      statsDelta: {},
    };
  }

  if (request.key === "hingeData") {
    const parsed = parseBlob<HingeMetadata>(buffer);
    return {
      key: request.key,
      kind: "hingeData",
      metadata: parsed.metadata,
      data: parsed.bodyView.subarray(0, parsed.metadata.count_rows * parsed.metadata.stride),
      statsDelta: {
        hinge: parsed.metadata.summary,
      },
    };
  }

  const parsed = parseBlob<SimulationMetadata>(buffer);
  if (parsed.metadata.count_nodes !== request.baseMetadata.nodeCount) {
    throw new Error(
      `Mismatch: optional dataset has ${parsed.metadata.count_nodes} nodes, expected ${request.baseMetadata.nodeCount}`
    );
  }

  const statsDelta = calculateOptionalTimeSeriesStats(request.key, request.baseMetadata, parsed.bodyView);
  return {
    key: request.key,
    kind: "timeSeries",
    metadata: parsed.metadata,
    data: parsed.bodyView.subarray(0),
    statsDelta,
  };
}

function calculateOptionalTimeSeriesStats(
  key: Exclude<OptionalDatasetKey, "beamData" | "hingeData">,
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

  if (key === "displacementRot") {
    const [x, y, z] = getMaxComp(body);
    return {
      maxRotation: getMaxMag(body),
      maxRotationX: x,
      maxRotationY: y,
      maxRotationZ: z,
    };
  }

  if (key === "velocityRot") {
    const [x, y, z] = getMaxComp(body);
    return {
      maxRotationVelocity: getMaxMag(body),
      maxRotationVelocityX: x,
      maxRotationVelocityY: y,
      maxRotationVelocityZ: z,
    };
  }

  if (key === "accelerationRot") {
    const [x, y, z] = getMaxComp(body);
    return {
      maxRotationAcceleration: getMaxMag(body),
      maxRotationAccelerationX: x,
      maxRotationAccelerationY: y,
      maxRotationAccelerationZ: z,
    };
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
  const avgPerStory = new Float32Array(storyCount * frameCount);
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
      avgPerStory[storyIdx * frameCount + frameIdx] = Math.hypot(
        storyX / nodes.length,
        storyY / nodes.length,
        storyZ / nodes.length
      );
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

export interface ProcessedCacheRecord<TPayload> {
  version: number;
  cacheKey: string;
  createdAt: number;
  payload: TPayload;
}

export function createCoreProcessedCacheKey(selectionKey: string, sourceFingerprint: string) {
  return `core:${PROCESSED_CACHE_VERSION}:${selectionKey}:${sourceFingerprint}`;
}

export function createOptionalProcessedCacheKey(
  selectionKey: string,
  datasetKey: DatasetKey,
  sourceFingerprint: string
) {
  return `optional:${PROCESSED_CACHE_VERSION}:${selectionKey}:${datasetKey}:${sourceFingerprint}`;
}
