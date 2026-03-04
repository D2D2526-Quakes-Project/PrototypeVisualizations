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
export async function buildAnimationDataFromBinary({
  rawBuilding,
  rawGM,
  rawDispLin,
  rawDispRot,
  rawVelLin,
  rawVelRot,
  rawAccelLin,
  rawAccelRot,
  rawBeamData,
  rawHinge,
  onProgress,
}: {
  rawBuilding: ArrayBuffer;
  rawGM: ArrayBuffer;
  rawDispLin: ArrayBuffer;
  rawDispRot?: ArrayBuffer;
  rawVelLin?: ArrayBuffer;
  rawVelRot?: ArrayBuffer;
  rawAccelLin?: ArrayBuffer;
  rawAccelRot?: ArrayBuffer;
  rawBeamData?: ArrayBuffer;
  rawHinge?: ArrayBuffer;
  onProgress?: (p: number, msg: string) => void;
}): Promise<BuildingAnimationData> {
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

  if (onProgress && rawBeamData) onProgress(83, "Decompressing Beam Data...");
  const beamBuff = rawBeamData ? await ensureDecompressed(rawBeamData) : undefined;

  if (onProgress && rawHinge) onProgress(85, "Decompressing Hinge Data...");
  const hingeBuff = rawHinge ? await ensureDecompressed(rawHinge) : undefined;

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
  const beamData = beamBuff ? parseBlob<BeamDataMetadata>(beamBuff) : undefined;
  const hingeData = hingeBuff ? parseBlob<HingeMetadata>(hingeBuff) : undefined;

  // 4. Verification
  if (dispLinData.metadata.count_nodes !== bData.metadata.count_nodes) {
    throw new Error(
      `Mismatch: Building has ${bData.metadata.count_nodes} nodes, but Displacement Linear file has ${dispLinData.metadata.count_nodes}`,
    );
  }

  if (beamData) {
    if (beamData.metadata.type !== "beam_data") {
      throw new Error(`Mismatch: Expected beam_data metadata type, got ${beamData.metadata.type}`);
    }
    if (beamData.metadata.count_rows < 0 || beamData.metadata.stride <= 0) {
      throw new Error("Invalid beam metadata: count_rows must be >= 0 and stride must be > 0");
    }
    const expectedLength = beamData.metadata.count_rows * beamData.metadata.stride;
    if (beamData.bodyView.length < expectedLength) {
      throw new Error(
        `Invalid beam payload length: expected at least ${expectedLength} float values, got ${beamData.bodyView.length}`,
      );
    }
  }

  if (hingeData) {
    if (hingeData.metadata.type !== "hinge_data") {
      throw new Error(`Mismatch: Expected hinge_data metadata type, got ${hingeData.metadata.type}`);
    }
    if (hingeData.metadata.count_rows < 0 || hingeData.metadata.stride <= 0) {
      throw new Error("Invalid hinge metadata: count_rows must be >= 0 and stride must be > 0");
    }
    const expectedLength = hingeData.metadata.count_rows * hingeData.metadata.stride;
    if (hingeData.bodyView.length < expectedLength) {
      throw new Error(
        `Invalid hinge payload length: expected at least ${expectedLength} float values, got ${hingeData.bodyView.length}`,
      );
    }
  }

  if (onProgress) onProgress(100, "Processing Complete");

  const normalizeStoryName = (name: string): string => {
    return name === "Internal Mezzanine" ? "Mezzanine" : name;
  };

  const normalizedStoryOrder = bData.metadata.story_order.map(normalizeStoryName);
  const normalizedStories = Object.fromEntries(
    Object.entries(bData.metadata.stories).map(([storyId, nodeIds]) => [normalizeStoryName(storyId), nodeIds]),
  );
  const normalizedCorners = Object.fromEntries(
    Object.entries(bData.metadata.corners).map(([storyId, corners]) => [normalizeStoryName(storyId), corners]),
  );
  const normalizedStoryHeights = Object.fromEntries(
    Object.entries(bData.metadata.story_heights).map(([storyId, height]) => [normalizeStoryName(storyId), height]),
  );

  const metadata: AnimationMetadata = {
    nodeCount: bData.metadata.count_nodes,
    frameCount: dispLinData.metadata.count_frames,
    dt: dispLinData.metadata.dt,
    stories: normalizedStories,
    corners: normalizedCorners,
    storyHeights: normalizedStoryHeights,
    storyOrder: normalizedStoryOrder,
  };

  const precomputed = calculateStats(
    metadata,
    gmData.bodyView,
    bData.bodyView,
    dispLinData.bodyView,
    dispRotData?.bodyView,
    velLinData?.bodyView,
    velRotData?.bodyView,
    accelLinData?.bodyView,
    accelRotData?.bodyView,
    hingeData?.metadata.summary,
  );

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

  function makeTimeAccessor(linData: Float32Array, nodeCount: number): TimeIndexAccessor {
    const outerStride = nodeCount * 3; // Stride 3 for each file
    return {
      data: linData,
      stride: outerStride,
      atFrame(frameIdx: number) {
        const frameData = linData.subarray(frameIdx * outerStride, (frameIdx + 1) * outerStride);
        return makeAccessor(frameData, 3);
      },
      // linAt(frameIdx: number) {
      //   const frameData = linData.subarray(frameIdx * outerStride, (frameIdx + 1) * outerStride);
      //   return makeAccessor(frameData, 3);
      // }
    };
  }

  function makeBeamAccessor(beamMetadata: BeamDataMetadata, body: Float32Array): BeamDataAccessor {
    const stride = beamMetadata.stride;
    const count = beamMetadata.count_rows;
    const data = body.subarray(0, count * stride);
    const valueAt = (row: Float32Array, index: number): number => row[index] ?? 0;

    return {
      data,
      stride,
      count,
      metadata: beamMetadata,
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

  function makeHingeAccessor(hingeMetadata: HingeMetadata, body: Float32Array): HingeDataAccessor {
    const stride = hingeMetadata.stride;
    const count = hingeMetadata.count_rows;
    const data = body.subarray(0, count * stride);

    const valueAt = (row: Float32Array, index: number): number => row[index] ?? 0;

    return {
      data,
      stride,
      count,
      metadata: hingeMetadata,
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

  // 5. Construct Final Object
  return {
    metadata,
    precomputed,
    initialPositions: makeAccessor(bData.bodyView, 3), // [x, y, z...]
    displacementLin: makeTimeAccessor(dispLinData.bodyView, metadata.nodeCount),
    displacementRot: dispRotData ? makeTimeAccessor(dispRotData.bodyView, metadata.nodeCount) : undefined,
    velocityLin: velLinData ? makeTimeAccessor(velLinData.bodyView, metadata.nodeCount) : undefined,
    velocityRot: velRotData ? makeTimeAccessor(velRotData.bodyView, metadata.nodeCount) : undefined,
    accelerationLin: accelLinData ? makeTimeAccessor(accelLinData.bodyView, metadata.nodeCount) : undefined,
    accelerationRot: accelRotData ? makeTimeAccessor(accelRotData.bodyView, metadata.nodeCount) : undefined,
    groundMotion: makeAccessor(gmData.bodyView, 3), // [frame][x,y,z]
    beamData: beamData ? makeBeamAccessor(beamData.metadata, beamData.bodyView) : undefined,
    hingeData: hingeData ? makeHingeAccessor(hingeData.metadata, hingeData.bodyView) : undefined,
  };
}

function calculateStats(
  metadata: AnimationMetadata,
  gm: Float32Array,
  positions: Float32Array,
  dispLin: Float32Array,
  dispRot?: Float32Array,
  velLin?: Float32Array,
  velRot?: Float32Array,
  accelLin?: Float32Array,
  accelRot?: Float32Array,
  hingeSummary?: HingeSummary,
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
  // storyElevations: Cumulative elevation from ground for each story (in inches)
  // Calculated by summing story heights from ground up, NOT from raw node Z positions
  const storyElevations: Record<string, number> = {};
  // storyHeights: Height of each individual story (in inches) - use from metadata
  const storyHeights: Record<string, number> = {};

  // Use the per-story heights from metadata (which come from building_height.csv)
  // These are the correct heights in inches
  Object.entries(metadata.storyHeights).forEach(([storyName, height]) => {
    storyHeights[storyName] = height;
  });

  // Calculate cumulative elevation by summing heights from ground (storyOrder is already bottom-up)
  let cumulativeElevation = 0;
  metadata.storyOrder.forEach((storyId) => {
    storyElevations[storyId] = cumulativeElevation;
    cumulativeElevation += storyHeights[storyId] || 0;
  });
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

  // Helper to find max absolute component in a stride-3 buffer
  const getMaxComp = (buffer: Float32Array): [number, number, number] => {
    let maxX = 0;
    let maxY = 0;
    let maxZ = 0;
    for (let i = 0; i < buffer.length; i += 3) {
      const x = Math.abs(buffer[i]);
      const y = Math.abs(buffer[i + 1]);
      const z = Math.abs(buffer[i + 2]);
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }
    return [maxX, maxY, maxZ];
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

  // Calculate corner nodes for each story
  metadata.storyOrder.forEach((storyId) => {
    const nodeIndices = metadata.stories[storyId];

    // Find corner nodes for this story
    const corners = {
      NW: nodeIndices.find((n) => cornerSets.NW.has(n))!,
      NE: nodeIndices.find((n) => cornerSets.NE.has(n))!,
      SW: nodeIndices.find((n) => cornerSets.SW.has(n))!,
      SE: nodeIndices.find((n) => cornerSets.SE.has(n))!,
    };
    cornerNodes[storyId] = corners;
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

    // storyHeights: height of this story only (in inches)
    const storyHeight = metadata.storyHeights[storyId];
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
        const belowMag = Math.hypot(
          dispLin[belowNodeOffset],
          dispLin[belowNodeOffset + 1],
          dispLin[belowNodeOffset + 2],
        );

        // Use absolute value to ensure positive drift (interstory drift is always a magnitude)
        // storyHeight is in inches, drift is expressed as percentage
        const driftPercent = (Math.abs(currentMag - belowMag) / storyHeight) * 100;

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

  // --- 6. PEAK NODE VALUES ---
  const nodeCount = metadata.nodeCount;
  const peakNodeDisplacement = new Float32Array(nodeCount);
  const peakNodeDisplacementFrame = new Uint32Array(nodeCount);
  const peakNodeDisplacementX = new Float32Array(nodeCount);
  const peakNodeDisplacementY = new Float32Array(nodeCount);
  const peakNodeDisplacementZ = new Float32Array(nodeCount);
  let peakNodeVelocity: Float32Array | undefined;
  let peakNodeAcceleration: Float32Array | undefined;

  // Initialize with zeros
  peakNodeDisplacement.fill(0);
  peakNodeDisplacementFrame.fill(0);
  peakNodeDisplacementX.fill(0);
  peakNodeDisplacementY.fill(0);
  peakNodeDisplacementZ.fill(0);

  if (velLin) {
    peakNodeVelocity = new Float32Array(nodeCount);
    peakNodeVelocity.fill(0);
  }

  if (accelLin) {
    peakNodeAcceleration = new Float32Array(nodeCount);
    peakNodeAcceleration.fill(0);
  }

  // Calculate peak values for each node
  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    const frameOffset = frameIdx * nodeCount * 3;

    for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
      const nodeOffset = frameOffset + nodeIdx * 3;
      const dx = dispLin[nodeOffset];
      const dy = dispLin[nodeOffset + 1];
      const dz = dispLin[nodeOffset + 2];
      const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (mag > peakNodeDisplacement[nodeIdx]) {
        peakNodeDisplacement[nodeIdx] = mag;
        peakNodeDisplacementFrame[nodeIdx] = frameIdx;
        peakNodeDisplacementX[nodeIdx] = dx;
        peakNodeDisplacementY[nodeIdx] = dy;
        peakNodeDisplacementZ[nodeIdx] = dz;
      }

      if (velLin && peakNodeVelocity) {
        const velOffset = frameIdx * nodeCount * 3 + nodeIdx * 3;
        const vx = velLin[velOffset];
        const vy = velLin[velOffset + 1];
        const vz = velLin[velOffset + 2];
        const velMag = Math.sqrt(vx * vx + vy * vy + vz * vz);
        if (velMag > peakNodeVelocity[nodeIdx]) {
          peakNodeVelocity[nodeIdx] = velMag;
        }
      }

      if (accelLin && peakNodeAcceleration) {
        const accelOffset = frameIdx * nodeCount * 3 + nodeIdx * 3;
        const ax = accelLin[accelOffset];
        const ay = accelLin[accelOffset + 1];
        const az = accelLin[accelOffset + 2];
        const accelMag = Math.sqrt(ax * ax + ay * ay + az * az);
        if (accelMag > peakNodeAcceleration[nodeIdx]) {
          peakNodeAcceleration[nodeIdx] = accelMag;
        }
      }
    }
  }

  // --- 7. STORY DRIFT MAX & AVG ---
  let maxStoryDrift = 0;
  let totalStoryDrift = 0;
  let storyDriftCount = 0;

  for (let i = 0; i < storyDriftData.length; i++) {
    const val = storyDriftData[i];
    if (val > maxStoryDrift) maxStoryDrift = val;
    totalStoryDrift += val;
    storyDriftCount++;
  }
  const avgStoryDrift = storyDriftCount > 0 ? totalStoryDrift / storyDriftCount : 0;

  // --- 8. COMPUTE MAX VALUES FOR ALL COMPONENTS ---
  const [maxDispX, maxDispY, maxDispZ] = getMaxComp(dispLin);
  const [maxVelX, maxVelY, maxVelZ] = velLin ? getMaxComp(velLin) : [0, 0, 0];
  const [maxAccelX, maxAccelY, maxAccelZ] = accelLin ? getMaxComp(accelLin) : [0, 0, 0];
  const [maxRotX, maxRotY, maxRotZ] = dispRot ? getMaxComp(dispRot) : [0, 0, 0];
  const [maxRotVelX, maxRotVelY, maxRotVelZ] = velRot ? getMaxComp(velRot) : [0, 0, 0];
  const [maxRotAccelX, maxRotAccelY, maxRotAccelZ] = accelRot ? getMaxComp(accelRot) : [0, 0, 0];

  // --- 9. PER-FRAME AGGREGATES ---
  const avgDispPerFrameX = new Float32Array(frameCount);
  const avgDispPerFrameY = new Float32Array(frameCount);
  const avgDispPerFrameZ = new Float32Array(frameCount);
  const avgDispPerFrameMag = new Float32Array(frameCount);

  const avgVelPerFrameX = velLin ? new Float32Array(frameCount) : undefined;
  const avgVelPerFrameY = velLin ? new Float32Array(frameCount) : undefined;
  const avgVelPerFrameZ = velLin ? new Float32Array(frameCount) : undefined;
  const avgVelPerFrameMag = velLin ? new Float32Array(frameCount) : undefined;

  const avgAccelPerFrameX = accelLin ? new Float32Array(frameCount) : undefined;
  const avgAccelPerFrameY = accelLin ? new Float32Array(frameCount) : undefined;
  const avgAccelPerFrameZ = accelLin ? new Float32Array(frameCount) : undefined;
  const avgAccelPerFrameMag = accelLin ? new Float32Array(frameCount) : undefined;

  // Accumulate sums per frame
  for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
    const frameOffset = frameIdx * nodeCount * 3;
    let sumDispX = 0,
      sumDispY = 0,
      sumDispZ = 0;
    let sumVelX = 0,
      sumVelY = 0,
      sumVelZ = 0;
    let sumAccelX = 0,
      sumAccelY = 0,
      sumAccelZ = 0;

    for (let nodeIdx = 0; nodeIdx < nodeCount; nodeIdx++) {
      const offset = frameOffset + nodeIdx * 3;
      sumDispX += dispLin[offset];
      sumDispY += dispLin[offset + 1];
      sumDispZ += dispLin[offset + 2];

      if (velLin && avgVelPerFrameX) {
        sumVelX += velLin[offset];
        sumVelY += velLin[offset + 1];
        sumVelZ += velLin[offset + 2];
      }

      if (accelLin && avgAccelPerFrameX) {
        sumAccelX += accelLin[offset];
        sumAccelY += accelLin[offset + 1];
        sumAccelZ += accelLin[offset + 2];
      }
    }

    avgDispPerFrameX[frameIdx] = sumDispX / nodeCount;
    avgDispPerFrameY[frameIdx] = sumDispY / nodeCount;
    avgDispPerFrameZ[frameIdx] = sumDispZ / nodeCount;
    avgDispPerFrameMag[frameIdx] = Math.sqrt(
      avgDispPerFrameX[frameIdx] ** 2 + avgDispPerFrameY[frameIdx] ** 2 + avgDispPerFrameZ[frameIdx] ** 2,
    );

    if (velLin && avgVelPerFrameX && avgVelPerFrameY && avgVelPerFrameZ && avgVelPerFrameMag) {
      avgVelPerFrameX[frameIdx] = sumVelX / nodeCount;
      avgVelPerFrameY[frameIdx] = sumVelY / nodeCount;
      avgVelPerFrameZ[frameIdx] = sumVelZ / nodeCount;
      avgVelPerFrameMag[frameIdx] = Math.sqrt(
        avgVelPerFrameX[frameIdx] ** 2 + avgVelPerFrameY[frameIdx] ** 2 + avgVelPerFrameZ[frameIdx] ** 2,
      );
    }

    if (accelLin && avgAccelPerFrameX && avgAccelPerFrameY && avgAccelPerFrameZ && avgAccelPerFrameMag) {
      avgAccelPerFrameX[frameIdx] = sumAccelX / nodeCount;
      avgAccelPerFrameY[frameIdx] = sumAccelY / nodeCount;
      avgAccelPerFrameZ[frameIdx] = sumAccelZ / nodeCount;
      avgAccelPerFrameMag[frameIdx] = Math.sqrt(
        avgAccelPerFrameX[frameIdx] ** 2 + avgAccelPerFrameY[frameIdx] ** 2 + avgAccelPerFrameZ[frameIdx] ** 2,
      );
    }
  }

  // --- 10. PER-STORY AGGREGATES ---
  const avgDispPerStory = new Float32Array(storyCount * frameCount);
  const avgVelPerStory = velLin ? new Float32Array(storyCount * frameCount) : undefined;
  const avgAccelPerStory = accelLin ? new Float32Array(storyCount * frameCount) : undefined;

  // Get node indices per story
  const storyNodeIndices: number[][] = [];
  for (let s = 0; s < storyCount; s++) {
    const storyId = metadata.storyOrder[s];
    storyNodeIndices.push(metadata.stories[storyId] || []);
  }

  for (let storyIdx = 0; storyIdx < storyCount; storyIdx++) {
    const nodes = storyNodeIndices[storyIdx];
    if (nodes.length === 0) continue;

    for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
      const frameOffset = frameIdx * nodeCount * 3;
      let sumDispX = 0,
        sumDispY = 0,
        sumDispZ = 0;
      let sumVelX = 0,
        sumVelY = 0,
        sumVelZ = 0;
      let sumAccelX = 0,
        sumAccelY = 0,
        sumAccelZ = 0;

      for (const nodeIdx of nodes) {
        const offset = frameOffset + nodeIdx * 3;
        sumDispX += dispLin[offset];
        sumDispY += dispLin[offset + 1];
        sumDispZ += dispLin[offset + 2];

        if (velLin && avgVelPerStory) {
          sumVelX += velLin[offset];
          sumVelY += velLin[offset + 1];
          sumVelZ += velLin[offset + 2];
        }

        if (accelLin && avgAccelPerStory) {
          sumAccelX += accelLin[offset];
          sumAccelY += accelLin[offset + 1];
          sumAccelZ += accelLin[offset + 2];
        }
      }

      const idx = storyIdx * frameCount + frameIdx;
      const count = nodes.length;
      avgDispPerStory[idx] = Math.sqrt((sumDispX / count) ** 2 + (sumDispY / count) ** 2 + (sumDispZ / count) ** 2);

      if (velLin && avgVelPerStory) {
        avgVelPerStory[idx] = Math.sqrt((sumVelX / count) ** 2 + (sumVelY / count) ** 2 + (sumVelZ / count) ** 2);
      }

      if (accelLin && avgAccelPerStory) {
        avgAccelPerStory[idx] = Math.sqrt(
          (sumAccelX / count) ** 2 + (sumAccelY / count) ** 2 + (sumAccelZ / count) ** 2,
        );
      }
    }
  }

  // --- 11. VELOCITY PERCENTILE 90 ---
  let velocityPercentile90: number | undefined;
  if (velLin) {
    const velocities: number[] = [];
    for (let i = 0; i < velLin.length; i += 3) {
      velocities.push(Math.sqrt(velLin[i] ** 2 + velLin[i + 1] ** 2 + velLin[i + 2] ** 2));
    }
    velocities.sort((a, b) => a - b);
    const percentileIdx = Math.floor(velocities.length * 0.9);
    velocityPercentile90 = velocities[percentileIdx];
  }

  return {
    boundingBox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ], center, radius },
    storyElevations,
    storyHeights,
    maxDisplacement: getMaxMag(dispLin),
    maxDisplacementX: maxDispX,
    maxDisplacementY: maxDispY,
    maxDisplacementZ: maxDispZ,

    // Velocity
    maxVelocity: velLin ? getMaxMag(velLin) : undefined,
    maxVelocityX: velLin ? maxVelX : undefined,
    maxVelocityY: velLin ? maxVelY : undefined,
    maxVelocityZ: velLin ? maxVelZ : undefined,

    // Acceleration
    maxAcceleration: accelLin ? getMaxMag(accelLin) : undefined,
    maxAccelerationX: accelLin ? maxAccelX : undefined,
    maxAccelerationY: accelLin ? maxAccelY : undefined,
    maxAccelerationZ: accelLin ? maxAccelZ : undefined,

    // Rotation
    maxRotation: dispRot ? getMaxMag(dispRot) : undefined,
    maxRotationX: dispRot ? maxRotX : undefined,
    maxRotationY: dispRot ? maxRotY : undefined,
    maxRotationZ: dispRot ? maxRotZ : undefined,

    // Rotation Velocity
    maxRotationVelocity: velRot ? getMaxMag(velRot) : undefined,
    maxRotationVelocityX: velRot ? maxRotVelX : undefined,
    maxRotationVelocityY: velRot ? maxRotVelY : undefined,
    maxRotationVelocityZ: velRot ? maxRotVelZ : undefined,

    // Rotation Acceleration
    maxRotationAcceleration: accelRot ? getMaxMag(accelRot) : undefined,
    maxRotationAccelerationX: accelRot ? maxRotAccelX : undefined,
    maxRotationAccelerationY: accelRot ? maxRotAccelY : undefined,
    maxRotationAccelerationZ: accelRot ? maxRotAccelZ : undefined,
    maxStoryDrift,
    avgStoryDrift,
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
    peakNodeDisplacement,
    peakNodeVelocity,
    peakNodeAcceleration,
    peakNodeDisplacementFrame,
    peakNodeDisplacementX,
    peakNodeDisplacementY,
    peakNodeDisplacementZ,
    avgDisplacementPerFrame: {
      x: avgDispPerFrameX,
      y: avgDispPerFrameY,
      z: avgDispPerFrameZ,
      mag: avgDispPerFrameMag,
    },
    avgVelocityPerFrame:
      velLin && avgVelPerFrameX && avgVelPerFrameY && avgVelPerFrameZ && avgVelPerFrameMag
        ? {
            x: avgVelPerFrameX,
            y: avgVelPerFrameY,
            z: avgVelPerFrameZ,
            mag: avgVelPerFrameMag,
          }
        : undefined,
    avgAccelerationPerFrame:
      accelLin && avgAccelPerFrameX && avgAccelPerFrameY && avgAccelPerFrameZ && avgAccelPerFrameMag
        ? {
            x: avgAccelPerFrameX,
            y: avgAccelPerFrameY,
            z: avgAccelPerFrameZ,
            mag: avgAccelPerFrameMag,
          }
        : undefined,
    avgDisplacementPerStory: avgDispPerStory,
    avgVelocityPerStory: avgVelPerStory,
    avgAccelerationPerStory: avgAccelPerStory,
    velocityPercentile90,
    hinge: hingeSummary,
  } as ComputedStats;
}
