import type {
  AnimationMetadata,
  BuildingAnimationData,
  BuildingMetadata,
  ComputedStats,
  GroundMotionMetadata,
  IndexAccessor,
  SimulationMetadata,
  TimeIndexAccessor,
} from "./types";

/**
 * Helper to decompress GZIP data if needed.
 * If the buffer starts with the GZIP magic number (0x1f, 0x8b), it decompresses it.
 */
async function ensureDecompressed(raw: ArrayBuffer | string): Promise<ArrayBuffer> {
  // Handle the edge case where the old hook passed a string
  let buffer: ArrayBuffer;
  if (typeof raw === "string") {
    // This is technically broken data if read via r.text(), but we try to salvage
    // Note: You REALLY should change the hook to use r.arrayBuffer()
    const enc = new TextEncoder();
    buffer = enc.encode(raw).buffer;
  } else {
    buffer = raw;
  }

  const view = new Uint8Array(buffer);

  // Check GZIP Magic Number (1F 8B)
  if (view[0] === 0x1f && view[1] === 0x8b) {
    const ds = new DecompressionStream("gzip");
    const writer = ds.writable.getWriter();
    writer.write(buffer);
    writer.close();
    const output = await new Response(ds.readable).arrayBuffer();
    return output;
  }

  return buffer;
}

/**
 * parseBlob reads the Length-Prefixed JSON Header and returns the Metadata + Body View
 */
function parseBlob<T>(buffer: ArrayBuffer) {
  // 1. Read Header Length (First 4 bytes, Little Endian)
  const headerLen = new Uint32Array(buffer, 0, 1)[0];

  // 2. Decode Header JSON
  const decoder = new TextDecoder("utf-8");
  const headerBytes = new Uint8Array(buffer, 4, headerLen);
  const headerJson = decoder.decode(headerBytes);
  const metadata = JSON.parse(headerJson) as T;

  // 3. Create View on the Body
  let bodyOffset = 4 + headerLen;
  const remainder = bodyOffset % 4;
  if (remainder !== 0) {
    bodyOffset += 4 - remainder;
  }

  const bodyView = new Float32Array(buffer, bodyOffset);

  return { metadata, bodyView };
}

/**
 * Main Entry Point for the Hook
 */
export async function buildAnimationDataFromBinary(
  rawBuilding: ArrayBuffer,
  rawGM: ArrayBuffer,
  rawDispLin: ArrayBuffer,
  rawDispRot?: ArrayBuffer,
  rawVelLin?: ArrayBuffer,
  rawVelRot?: ArrayBuffer,
  rawAccelLin?: ArrayBuffer,
  rawAccelRot?: ArrayBuffer,
  onProgress?: (p: number, msg: string) => void,
): Promise<BuildingAnimationData> {
  // 1. Decompress all buffers
  if (onProgress) onProgress(10, "Decompressing Building Data...");
  const buildingBuff = await ensureDecompressed(rawBuilding);

  if (onProgress) onProgress(20, "Decompressing Displacement Linear Data...");
  const dispLinBuff = await ensureDecompressed(rawDispLin);

  if (onProgress && rawDispRot) onProgress(25, "Decompressing Displacement Rotation Data...");
  const dispRotBuff = rawDispRot ? await ensureDecompressed(rawDispRot) : undefined;

  if (onProgress && rawVelLin) onProgress(40, "Decompressing Velocity Linear Data...");
  const velLinBuff = rawVelLin ? await ensureDecompressed(rawVelLin) : undefined;

  if (onProgress && rawVelRot) onProgress(45, "Decompressing Velocity Rotation Data...");
  const velRotBuff = rawVelRot ? await ensureDecompressed(rawVelRot) : undefined;

  if (onProgress && rawAccelLin) onProgress(60, "Decompressing Acceleration Linear Data...");
  const accelLinBuff = rawAccelLin ? await ensureDecompressed(rawAccelLin) : undefined;

  if (onProgress && rawAccelRot) onProgress(65, "Decompressing Acceleration Rotation Data...");
  const accelRotBuff = rawAccelRot ? await ensureDecompressed(rawAccelRot) : undefined;

  if (onProgress) onProgress(80, "Decompressing Ground Motion...");
  const gmBuff = await ensureDecompressed(rawGM);

  // 2. Parse Building
  const bData = parseBlob<BuildingMetadata>(buildingBuff);

  // 3. Parse Simulations
  const dispLinData = parseBlob<SimulationMetadata>(dispLinBuff);
  const dispRotData = dispRotBuff ? parseBlob<SimulationMetadata>(dispRotBuff) : undefined;
  const velLinData = velLinBuff ? parseBlob<SimulationMetadata>(velLinBuff) : undefined;
  const velRotData = velRotBuff ? parseBlob<SimulationMetadata>(velRotBuff) : undefined;
  const accelLinData = accelLinBuff ? parseBlob<SimulationMetadata>(accelLinBuff) : undefined;
  const accelRotData = accelRotBuff ? parseBlob<SimulationMetadata>(accelRotBuff) : undefined;
  const gmData = parseBlob<GroundMotionMetadata>(gmBuff);

  // 4. Verification
  if (dispLinData.metadata.count_nodes !== bData.metadata.count_nodes) {
    throw new Error(
      `Mismatch: Building has ${bData.metadata.count_nodes} nodes, but Displacement Linear file has ${dispLinData.metadata.count_nodes}`,
    );
  }

  if (onProgress) onProgress(100, "Processing Complete");

  const metadata: AnimationMetadata = {
    nodeCount: bData.metadata.count_nodes,
    frameCount: dispLinData.metadata.count_frames,
    dt: dispLinData.metadata.dt,
    stories: bData.metadata.stories,
    corners: bData.metadata.corners,
    storyHeights: bData.metadata.story_heights,
    storyOrder: bData.metadata.story_order,
  };

  const precomputed = calculateStats(
    metadata,
    gmData.bodyView,
    bData.bodyView,
    dispLinData.bodyView,
    dispRotData?.bodyView,
    velLinData?.bodyView,
    accelLinData?.bodyView,
  );

  function makeAccessor(data: Float32Array, stride: number): IndexAccessor {
    return {
      data,
      stride,
      at(idx: number) {
        return data.subarray(idx * stride, (idx + 1) * stride);
      },
      xAt(idx: number) {
        return data.subarray(idx * stride, (idx + 1) * stride)[0];
      },
      yAt(idx: number) {
        return data.subarray(idx * stride, (idx + 1) * stride)[1];
      },
      zAt(idx: number) {
        return data.subarray(idx * stride, (idx + 1) * stride)[2];
      },
    };
  }

  function makeTimeAccessor(
    linData: Float32Array,
    rotData: Float32Array | undefined,
    nodeCount: number,
  ): TimeIndexAccessor {
    const outerStride = nodeCount * 3; // Stride 3 for each file
    return {
      data: linData,
      stride: outerStride,
      atFrame(frameIdx: number) {
        const frameData = linData.subarray(frameIdx * outerStride, (frameIdx + 1) * outerStride);
        return makeAccessor(frameData, 3);
      },
      linAt(frameIdx: number) {
        const frameData = linData.subarray(frameIdx * outerStride, (frameIdx + 1) * outerStride);
        return makeAccessor(frameData, 3);
      },
      rotAt(frameIdx: number) {
        if (!rotData) {
          // Return zeros if no rotation data
          return {
            data: new Float32Array(3),
            stride: 3,
            at: () => new Float32Array(3),
            xAt: () => 0,
            yAt: () => 0,
            zAt: () => 0,
          };
        }
        const frameData = rotData.subarray(frameIdx * outerStride, (frameIdx + 1) * outerStride);
        return makeAccessor(frameData, 3);
      },
    };
  }

  // 5. Construct Final Object
  return {
    metadata,
    precomputed,
    initialPositions: makeAccessor(bData.bodyView, 3), // [x, y, z...]
    displacement: makeTimeAccessor(dispLinData.bodyView, dispRotData?.bodyView, metadata.nodeCount),
    velocity: velLinData ? makeTimeAccessor(velLinData.bodyView, velRotData?.bodyView, metadata.nodeCount) : undefined,
    acceleration: accelLinData ? makeTimeAccessor(accelLinData.bodyView, accelRotData?.bodyView, metadata.nodeCount) : undefined,
    groundMotion: makeAccessor(gmData.bodyView, 3), // [frame][x,y,z]
  };
}

function calculateStats(
  metadata: AnimationMetadata,
  gm: Float32Array,
  positions: Float32Array,
  dispLin: Float32Array,
  dispRot?: Float32Array,
  velLin?: Float32Array,
  accelLin?: Float32Array,
): ComputedStats {
  // --- 1. GEOMETRY BOUNDS ---
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  const center: [number, number, number] = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];

  // Radius for camera zoom (approximate via bounding box diagonal)
  const radius = Math.sqrt(Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2) + Math.pow(maxZ - minZ, 2)) / 2;

  // --- 2. STORY ELEVATIONS & HEIGHTS ---
  const storyElevations: Record<string, number> = {};
  const storyHeights: Record<string, number> = {};

  // Calculate average Z for each story
  Object.entries(metadata.stories).forEach(([storyName, nodeIndices]) => {
    if (nodeIndices.length === 0) return;

    // Just grab the Z of the first node in the story (assuming flat floors)
    // nodeIndices stores the node Index. Position index is nodeIndex * 3 + 2 (Z)
    const firstNodeIdx = nodeIndices[0];
    const zVal = positions[firstNodeIdx * 3 + 2];
    storyElevations[storyName] = zVal;
  });

  // Sort stories to calculate height diffs
  const sortedStories = Object.entries(storyElevations).sort(([, zA], [, zB]) => zA - zB);

  for (let i = 1; i < sortedStories.length; i++) {
    const [upperName, upperZ] = sortedStories[i];
    const [, lowerZ] = sortedStories[i - 1];
    storyHeights[upperName] = upperZ - lowerZ;
  }
  // Base case for ground floor if needed, or handle generically

  // --- 3. SIMULATION MAXIMA (Vector Magnitude) ---
  // Helper to find max vector magnitude in a stride-3 buffer (x,y,z)
  const getMaxMag = (buffer: Float32Array) => {
    let maxSq = 0;
    // Stride is 3.
    for (let i = 0; i < buffer.length; i += 3) {
      const x = buffer[i];
      const y = buffer[i + 1];
      const z = buffer[i + 2];
      const magSq = x * x + y * y + z * z;
      if (magSq > maxSq) maxSq = magSq;
    }
    return Math.sqrt(maxSq);
  };

  // --- 4. GROUND MOTION PEAKS ---
  // Stride is 3 (x,y,z)
  const gmMax: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const gmMin: [number, number, number] = [Infinity, Infinity, Infinity];
  const gmMag = new Float32Array(gm.length / 3);
  for (let i = 0; i < gm.length; i += 3) {
    const x = gm[i];
    const y = gm[i + 1];
    const z = gm[i + 2];
    // Usually we care about the strongest single component or the vector
    if (x > gmMax[0]) gmMax[0] = x;
    if (y > gmMax[1]) gmMax[1] = y;
    if (z > gmMax[2]) gmMax[2] = z;
    if (x < gmMin[0]) gmMin[0] = x;
    if (y < gmMin[1]) gmMin[1] = y;
    if (z < gmMin[2]) gmMin[2] = z;
    gmMag[Math.floor(i / 3)] = Math.hypot(x, y, z);
  }
  const gmMagMax = Math.max(...gmMag);
  const gmMagMin = Math.min(...gmMag);

  // --- 5. STORY DRIFT PRECOMPUTATIONS ---

  // 5.1 Calculate corner nodes mapping (similar to hook lines 8-37)
  const cornerSets = {
    NW: new Set(metadata.corners.NW),
    NE: new Set(metadata.corners.NE),
    SW: new Set(metadata.corners.SW),
    SE: new Set(metadata.corners.SE),
  };

  const cornerNodes: Record<string, { NW: number; NE: number; SW: number; SE: number }> = {};
  const cumulativeStoryElevations: Record<string, number> = {};

  // Calculate cumulative elevations and corner nodes
  metadata.storyOrder.forEach((storyId, index) => {
    const nodeIndices = metadata.stories[storyId];

    // Find corner nodes for this story
    const corners = {
      NW: nodeIndices.find((n) => cornerSets.NW.has(n))!,
      NE: nodeIndices.find((n) => cornerSets.NE.has(n))!,
      SW: nodeIndices.find((n) => cornerSets.SW.has(n))!,
      SE: nodeIndices.find((n) => cornerSets.SE.has(n))!,
    };
    cornerNodes[storyId] = corners;

    // Calculate cumulative elevation (similar to hook lines 39-45)
    if (index > 0) {
      let elevation = metadata.storyHeights[storyId];
      metadata.storyOrder.forEach((storyId2, index2) => {
        if (index2 < index) elevation += metadata.storyHeights[storyId2];
      });
      cumulativeStoryElevations[storyId] = elevation;
    }
  });

  // 5.2 Precompute all story drift values
  const storyCount = metadata.storyOrder.length;
  const frameCount = metadata.frameCount;
  const cornerCount = 4; // NW, NE, SW, SE
  const storyDriftData = new Float32Array(storyCount * frameCount * cornerCount);

  // Calculate drift for each story, frame, and corner
  for (let storyIdx = 1; storyIdx < storyCount; storyIdx++) {
    const storyId = metadata.storyOrder[storyIdx];
    const belowId = metadata.storyOrder[storyIdx - 1];

    const height = cumulativeStoryElevations[storyId];
    const corners = cornerNodes[storyId];
    const belowCorners = cornerNodes[belowId];

    for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
      // Get displacement data for this frame - stride 3
      const frameOffset = frameIdx * metadata.nodeCount * 3;

      // Calculate drift for each corner - stride 3
      const cornerOffsets = [corners.NW * 3, corners.NE * 3, corners.SW * 3, corners.SE * 3];
      const belowCornerOffsets = [belowCorners.NW * 3, belowCorners.NE * 3, belowCorners.SW * 3, belowCorners.SE * 3];

      for (let cornerIdx = 0; cornerIdx < cornerCount; cornerIdx++) {
        const nodeOffset = frameOffset + cornerOffsets[cornerIdx];
        const belowNodeOffset = frameOffset + belowCornerOffsets[cornerIdx];

        // Calculate drift magnitude using linear displacement (dispLin)
        const currentMag = Math.hypot(dispLin[nodeOffset], dispLin[nodeOffset + 1], dispLin[nodeOffset + 2]);
        const belowMag = Math.hypot(dispLin[belowNodeOffset], dispLin[belowNodeOffset + 1], dispLin[belowNodeOffset + 2]);

        const driftPercent = ((currentMag - belowMag) / height) * 100;

        // Store in Float32Array: [story][frame][corner]
        const arrayIndex = storyIdx * frameCount * cornerCount + frameIdx * cornerCount + cornerIdx;
        storyDriftData[arrayIndex] = driftPercent;
      }
    }
  }

  // 5.3 Calculate peak story drift (similar to hook lines 92-123)
  const peakStoryDrift: Record<string, { NW: number; NE: number; SW: number; SE: number }> = {};

  for (let storyIdx = 1; storyIdx < storyCount; storyIdx++) {
    const storyId = metadata.storyOrder[storyIdx];
    const max = { NW: -Infinity, NE: -Infinity, SW: -Infinity, SE: -Infinity };

    for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
      for (let cornerIdx = 0; cornerIdx < cornerCount; cornerIdx++) {
        const arrayIndex = storyIdx * frameCount * cornerCount + frameIdx * cornerCount + cornerIdx;
        const driftValue = storyDriftData[arrayIndex];

        const cornerNames = ["NW", "NE", "SW", "SE"] as const;
        max[cornerNames[cornerIdx]] = Math.max(max[cornerNames[cornerIdx]], driftValue);
      }
    }

    peakStoryDrift[storyId] = max;
  }

  // Helper accessor function
  const getStoryDrift = (storyIndex: number, frameIndex: number): [number, number, number, number] => {
    const baseIndex = storyIndex * frameCount * cornerCount + frameIndex * cornerCount;
    return [
      storyDriftData[baseIndex], // NW
      storyDriftData[baseIndex + 1], // NE
      storyDriftData[baseIndex + 2], // SW
      storyDriftData[baseIndex + 3], // SE
    ];
  };

  return {
    boundingBox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ], center, radius },
    storyElevations,
    storyHeights,
    maxDisplacement: getMaxMag(dispLin),
    maxVelocity: velLin ? getMaxMag(velLin) : undefined,
    maxAcceleration: accelLin ? getMaxMag(accelLin) : undefined,
    groundMotion: {
      min: gmMin,
      max: gmMax,
      magnitude: gmMag,
      maxMagnitude: gmMagMax,
      minMagnitude: gmMagMin,
    },
    cornerNodes,
    storyDrift: {
      data: storyDriftData,
      storyCount,
      frameCount,
      cornerCount,
      getStoryDrift,
    },
    peakStoryDrift,
  };
}
