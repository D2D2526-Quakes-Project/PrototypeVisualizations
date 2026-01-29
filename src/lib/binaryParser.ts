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
  rawDisp: ArrayBuffer,
  rawVel?: ArrayBuffer,
  rawAccel?: ArrayBuffer,
  onProgress?: (p: number, msg: string) => void,
): Promise<BuildingAnimationData> {
  // 1. Decompress all buffers
  if (onProgress) onProgress(10, "Decompressing Building Data...");
  const buildingBuff = await ensureDecompressed(rawBuilding);

  if (onProgress) onProgress(20, "Decompressing Displacement Data...");
  const dispBuff = await ensureDecompressed(rawDisp);

  if (onProgress && rawVel) onProgress(40, "Decompressing Velocity Data...");
  const velBuff = rawVel ? await ensureDecompressed(rawVel) : undefined;

  if (onProgress && rawAccel) onProgress(60, "Decompressing Acceleration Data...");
  const accelBuff = rawAccel ? await ensureDecompressed(rawAccel) : undefined;

  if (onProgress) onProgress(80, "Decompressing Ground Motion...");
  const gmBuff = await ensureDecompressed(rawGM);

  // 2. Parse Building
  const bData = parseBlob<BuildingMetadata>(buildingBuff);

  // 3. Parse Simulations
  const dispData = parseBlob<SimulationMetadata>(dispBuff);
  const velData = velBuff ? parseBlob<SimulationMetadata>(velBuff) : undefined;
  const accelData = accelBuff ? parseBlob<SimulationMetadata>(accelBuff) : undefined;
  const gmData = parseBlob<GroundMotionMetadata>(gmBuff);

  // 4. Verification
  if (dispData.metadata.count_nodes !== bData.metadata.count_nodes) {
    throw new Error(
      `Mismatch: Building has ${bData.metadata.count_nodes} nodes, but Displacement file has ${dispData.metadata.count_nodes}`,
    );
  }

  if (onProgress) onProgress(100, "Processing Complete");

  const metadata: AnimationMetadata = {
    nodeCount: bData.metadata.count_nodes,
    frameCount: dispData.metadata.count_frames,
    dt: dispData.metadata.dt,
    stories: bData.metadata.stories,
    corners: bData.metadata.corners,
  };

  const precomputed = calculateStats(
    metadata,
    gmData.bodyView,
    bData.bodyView,
    dispData.bodyView,
    velData ? velData.bodyView : undefined,
    accelData ? accelData.bodyView : undefined,
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

  function makeTimeAccessor(data: Float32Array, outerStride: number, innerStride: number): TimeIndexAccessor {
    return {
      data,
      stride: outerStride,
      at(frameIdx: number) {
        const frameData = data.subarray(frameIdx * outerStride, (frameIdx + 1) * outerStride);
        return makeAccessor(frameData, innerStride);
      },
      linAt(frameIdx: number) {
        const frameData = data.subarray(frameIdx * outerStride, (frameIdx + 1) * outerStride);
        return makeAccessor(frameData, innerStride);
      },
      rotAt(frameIdx: number) {
        const frameData = data.subarray(frameIdx * outerStride, (frameIdx + 1) * outerStride);
        return makeAccessor(frameData, innerStride);
      },
    };
  }

  // 5. Construct Final Object
  return {
    metadata,
    precomputed,
    initialPositions: makeAccessor(bData.bodyView, 3), // [x, y, z...]
    displacement: makeTimeAccessor(dispData.bodyView, metadata.nodeCount * 6, 6), // [frame][node][x,y,z,rx,ry,rz]
    velocity: undefined,
    acceleration: undefined,
    // velocity: velData.bodyView,
    // acceleration: accelData.bodyView,
    groundMotion: makeAccessor(gmData.bodyView, 3), // [frame][x,y,z]
  };
}

function calculateStats(
  metadata: AnimationMetadata,
  gm: Float32Array,
  positions: Float32Array,
  disp: Float32Array,
  vel?: Float32Array,
  accel?: Float32Array,
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
  // Helper to find max vector magnitude in a stride-6 buffer (x,y,z,rx,ry,rz)
  const getMaxMag = (buffer: Float32Array) => {
    let maxSq = 0;
    // Stride is 6. We only care about linear (0,1,2).
    for (let i = 0; i < buffer.length; i += 6) {
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

  return {
    boundingBox: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ], center, radius },
    storyElevations,
    storyHeights,
    maxDisplacement: getMaxMag(disp),
    maxVelocity: vel ? getMaxMag(vel) : undefined,
    maxAcceleration: accel ? getMaxMag(accel) : undefined,
    groundMotion: {
      min: gmMin,
      max: gmMax,
      magnitude: gmMag,
      maxMagnitude: gmMagMax,
      minMagnitude: gmMagMin,
    },
  };
}
