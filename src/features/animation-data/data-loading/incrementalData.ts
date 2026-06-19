import { buildBeamToHingeIndexMap, buildHingeNodeMetrics, buildNodeToHingeIndexMap } from "@/features/metrics/hingeMetrics";
import type { AnimationMetadata, BeamDataMetadata, BrbMetadata, BuildingAnimationData, BuildingMetadata, ComputedStats, GroundMotionMetadata, HingeMetadata, ShearMetadata, SimulationMetadata } from "@/lib/types";
import { buildNodeToStoryMap, ensureDecompressed, makeAccessor, makeBeamAccessor, makeBrbAccessor, makeHingeAccessor, makeNodeValueTimeAccessor, makeShearAccessor, makeTimeAccessor, parseBlob } from "./blobAccessors";
import { calculateBrbStats, calculateOptionalTimeSeriesStats, calculateShearStats, serializeRequiredComputedStats } from "./compute";
import type { OptionalWorkerRequest, SerializedOptionalDatasetResult, SerializedRequiredAnimationData } from "./serializedTypes";

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
    nodeToBelow: buildingData.metadata.node_to_below.map((belowIdx) => (belowIdx === -1 ? null : belowIdx)) ?? [],
    crossSectionsX: buildingData.metadata.cross_sections_x,
    crossSectionsY: buildingData.metadata.cross_sections_y,
    hiddenFloors: buildingData.metadata.hidden_floors ?? [],
    displacementMissingNodeIndices: dispLinData.metadata.missing_node_indices ?? [],
    nodeToStory: Array.from({ length: buildingData.metadata.count_nodes }, () => null),
  };
  metadata.nodeToStory = buildNodeToStoryMap(metadata);

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
      if (belowIdx === null || belowIdx < 0) continue; // ground floor or no match

      // Current node 2D magnitude
      const nX = dispLin[frameOffset + nodeIdx * 3] ?? 0;
      const nY = dispLin[frameOffset + nodeIdx * 3 + 1] ?? 0;
      const currentMag = Math.sqrt(nX * nX + nY * nY);

      // Node directly below 2D magnitude
      const bX = dispLin[frameOffset + belowIdx * 3] ?? 0;
      const bY = dispLin[frameOffset + belowIdx * 3 + 1] ?? 0;
      const belowMag = Math.sqrt(bX * bX + bY * bY);

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
  const metadata: AnimationMetadata = {
    ...data.metadata,
    nodeToStory:
      data.metadata.nodeToStory && data.metadata.nodeToStory.length === data.metadata.nodeCount
        ? data.metadata.nodeToStory
        : buildNodeToStoryMap(data.metadata),
  };

  const { avgDisplacementPerStory: rawAvgDisplacementPerStory, ...restPrecomputed } = data.precomputed;

  return {
    metadata,
    precomputed: {
      ...restPrecomputed,
      avgDisplacementPerStory: makeTimeAccessor(rawAvgDisplacementPerStory, metadata.storyOrder.length),
    },
    initialPositions: makeAccessor(data.initialPositions, 3),
    displacementLin: makeTimeAccessor(data.displacementLin, metadata.nodeCount),
    groundMotion: makeAccessor(data.groundMotion, 3),
    storyDrift: makeNodeValueTimeAccessor(data.storyDrift, metadata.frameCount, metadata.nodeCount),
  };
}

export function mergeOptionalDatasetIntoAnimationData(
  animationData: BuildingAnimationData,
  result: SerializedOptionalDatasetResult
): BuildingAnimationData {
  const storyCount = animationData.metadata.storyOrder.length;
  const {
    avgVelocityPerStory: rawAvgVelocityPerStory,
    avgAccelerationPerStory: rawAvgAccelerationPerStory,
    avgRotationPerStory: rawAvgRotationPerStory,
    avgRotationVelocityPerStory: rawAvgRotationVelocityPerStory,
    avgRotationAccelerationPerStory: rawAvgRotationAccelerationPerStory,
    ...restStatsDelta
  } = result.statsDelta;

  const nextPrecomputed: ComputedStats = {
    ...animationData.precomputed,
    ...restStatsDelta,
  };
  if (rawAvgVelocityPerStory) {
    nextPrecomputed.avgVelocityPerStory = makeTimeAccessor(rawAvgVelocityPerStory, storyCount);
  }
  if (rawAvgAccelerationPerStory) {
    nextPrecomputed.avgAccelerationPerStory = makeTimeAccessor(rawAvgAccelerationPerStory, storyCount);
  }
  if (rawAvgRotationPerStory) {
    nextPrecomputed.avgRotationPerStory = makeTimeAccessor(rawAvgRotationPerStory, storyCount);
  }
  if (rawAvgRotationVelocityPerStory) {
    nextPrecomputed.avgRotationVelocityPerStory = makeTimeAccessor(rawAvgRotationVelocityPerStory, storyCount);
  }
  if (rawAvgRotationAccelerationPerStory) {
    nextPrecomputed.avgRotationAccelerationPerStory = makeTimeAccessor(rawAvgRotationAccelerationPerStory, storyCount);
  }

  const nextAnimationData: BuildingAnimationData = {
    ...animationData,
    precomputed: nextPrecomputed,
  };

  if (result.key === "beamData") {
    nextAnimationData.beamData = makeBeamAccessor(result.metadata as BeamDataMetadata, result.data);
  } else if (result.key === "hingeData") {
    nextAnimationData.hingeData = makeHingeAccessor(result.metadata as HingeMetadata, result.data);
  } else if (result.key === "shearData") {
    nextAnimationData.shearData = makeShearAccessor(result.metadata as ShearMetadata, result.data);
  } else if (result.key === "brbData") {
    nextAnimationData.brbData = makeBrbAccessor(result.metadata as BrbMetadata, result.data);
  } else {
    const accessor = makeTimeAccessor(result.data, animationData.metadata.nodeCount);
    if (result.key === "displacementRot") nextAnimationData.displacementRot = accessor;
    if (result.key === "velocityLin") nextAnimationData.velocityLin = accessor;
    if (result.key === "velocityRot") nextAnimationData.velocityRot = accessor;
    if (result.key === "accelerationLin") nextAnimationData.accelerationLin = accessor;
    if (result.key === "accelerationRot") nextAnimationData.accelerationRot = accessor;
  }

  const hingeNodeMetrics = buildHingeNodeMetrics(
    nextAnimationData.hingeData,
    nextAnimationData.beamData,
    nextAnimationData.metadata.nodeCount
  );
  const nodeToHingeIndexMap = buildNodeToHingeIndexMap(
    nextAnimationData.hingeData,
    nextAnimationData.beamData,
    nextAnimationData.metadata.nodeCount
  );
  const beamToHingeIndexMap = buildBeamToHingeIndexMap(nextAnimationData.hingeData, nextAnimationData.beamData);
  if (hingeNodeMetrics) {
    nextAnimationData.precomputed = {
      ...nextAnimationData.precomputed,
      hingeNodeMetrics,
      nodeToHingeIndexMap,
      beamToHingeIndexMap,
    };
  }
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
        hinge: undefined,
      },
    };
  }

  if (request.key === "shearData") {
    const parsed = parseBlob<ShearMetadata>(buffer);
    const data = parsed.bodyView.subarray(0, parsed.metadata.count_rows * parsed.metadata.stride);
    return {
      key: request.key,
      kind: "shearData",
      metadata: parsed.metadata,
      data,
      statsDelta: calculateShearStats(parsed.metadata, data),
    };
  }

  if (request.key === "brbData") {
    const parsed = parseBlob<BrbMetadata>(buffer);
    const data = parsed.bodyView.subarray(0, parsed.metadata.count_rows * parsed.metadata.stride);
    return {
      key: request.key,
      kind: "brbData",
      metadata: parsed.metadata,
      data,
      statsDelta: calculateBrbStats(parsed.metadata, data),
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
