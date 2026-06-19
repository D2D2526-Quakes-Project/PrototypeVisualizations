import type { AnimationMetadata, BeamDataAccessor, BeamDataMetadata, BrbDataAccessor, BrbMetadata, BrbRow, HingeDataAccessor, HingeMetadata, IndexAccessor, NodeValueTimeAccessor, ShearDataAccessor, ShearMetadata, ShearRow, TimeIndexAccessor } from "@/lib/types";

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

export function makeAccessor(data: Float32Array, stride: number): IndexAccessor {
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

export function makeTimeAccessor(data: Float32Array, nodeCount: number): TimeIndexAccessor {
  const outerStride = nodeCount * 3;
  return {
    data,
    stride: outerStride,
    atFrame(frameIdx: number) {
      return makeAccessor(data.subarray(frameIdx * outerStride, (frameIdx + 1) * outerStride), 3);
    },
  };
}

export function makeNodeValueTimeAccessor(data: Float32Array, frameCount: number, nodeCount: number): NodeValueTimeAccessor {
  return {
    data,
    frameCount,
    nodeCount,
    get(frameIdx: number, nodeIdx: number) {
      return data[frameIdx * nodeCount + nodeIdx] ?? 0;
    },
  };
}

export function buildNodeToStoryMap(
  metadata: Pick<AnimationMetadata, "nodeCount" | "storyOrder" | "stories">
): Array<string | null> {
  const nodeToStory = Array.from({ length: metadata.nodeCount }, () => null as string | null);
  metadata.storyOrder.forEach((storyId) => {
    const nodes = metadata.stories[storyId] ?? [];
    nodes.forEach((nodeIndex) => {
      nodeToStory[nodeIndex] = storyId;
    });
  });
  return nodeToStory;
}

export function makeBeamAccessor(metadata: BeamDataMetadata, body: Float32Array): BeamDataAccessor {
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
        iNodeIndex: Math.trunc(valueAt(row, 0)),
        jNodeIndex: Math.trunc(valueAt(row, 1)),
        groupId: Math.trunc(valueAt(row, 2)),
      };
    },
  };
}

export function makeHingeAccessor(metadata: HingeMetadata, body: Float32Array): HingeDataAccessor {
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
        endMask: Math.trunc(valueAt(row, 1)) as 0 | 1 | 2 | 3,
        iM3Max: valueAt(row, 2),
        iM3Min: valueAt(row, 3),
        iR3Max: valueAt(row, 4),
        iR3Min: valueAt(row, 5),
        jM3Max: valueAt(row, 6),
        jM3Min: valueAt(row, 7),
        jR3Max: valueAt(row, 8),
        jR3Min: valueAt(row, 9),
      };
    },
  };
}

export function makeShearAccessor(metadata: ShearMetadata, body: Float32Array): ShearDataAccessor {
  const stride = metadata.stride;
  const count = metadata.count_rows;
  const data = body.subarray(0, count * stride);
  const storyIndexById = new Map(metadata.story_order.map((storyId, index) => [storyId, index]));
  const valueAt = (row: Float32Array, index: number): number => row[index] ?? Number.NaN;
  const absEnvelope = (maxValue: number, minValue: number): number => {
    if (!Number.isFinite(maxValue) && !Number.isFinite(minValue)) return Number.NaN;
    return Math.max(
      Number.isFinite(maxValue) ? Math.abs(maxValue) : 0,
      Number.isFinite(minValue) ? Math.abs(minValue) : 0
    );
  };
  const buildRow = (idx: number): ShearRow => {
    const row = data.subarray(idx * stride, (idx + 1) * stride);
    const xMax = valueAt(row, 0);
    const xMin = valueAt(row, 1);
    const yMax = valueAt(row, 2);
    const yMin = valueAt(row, 3);
    return {
      storyId: metadata.story_order[idx] ?? "",
      xMax,
      xMin,
      xAbs: absEnvelope(xMax, xMin),
      yMax,
      yMin,
      yAbs: absEnvelope(yMax, yMin),
    };
  };

  return {
    data,
    stride,
    count,
    metadata,
    at(idx: number) {
      return data.subarray(idx * stride, (idx + 1) * stride);
    },
    getRow: buildRow,
    getByStory(storyId: string) {
      const index = storyIndexById.get(storyId);
      if (index === undefined) return undefined;
      return buildRow(index);
    },
  };
}

export function makeBrbAccessor(metadata: BrbMetadata, body: Float32Array): BrbDataAccessor {
  const stride = metadata.stride;
  const count = metadata.count_rows;
  const data = body.subarray(0, count * stride);
  const valueAt = (row: Float32Array, index: number): number => row[index] ?? Number.NaN;
  const buildRow = (idx: number): BrbRow => {
    const row = data.subarray(idx * stride, (idx + 1) * stride);

    return {
      beamIndex: Math.trunc(valueAt(row, 0)),
      axialForceMax: valueAt(row, 1),
      axialForceMin: valueAt(row, 2),
      axialDeformationMax: valueAt(row, 3),
      axialDeformationMin: valueAt(row, 4),
      tensionRatio: valueAt(row, 5),
      compressionRatio: valueAt(row, 6),
      ratioAbs: valueAt(row, 7),
    };
  };

  return {
    data,
    stride,
    count,
    metadata,
    at(idx: number) {
      return data.subarray(idx * stride, (idx + 1) * stride);
    },
    getRow: buildRow,
  };
}
