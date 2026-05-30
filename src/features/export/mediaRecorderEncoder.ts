export type MediaRecorderEncodeProgress = {
  phase: "recording" | "finalizing";
  progress: number;
};

export interface MediaRecorderEncodeResult {
  bytes: Uint8Array;
  recordedDurationSeconds: number;
}

const WEBM_MIME_TYPES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getSupportedWebmMimeType() {
  if (!("MediaRecorder" in window)) {
    return null;
  }

  return WEBM_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? null;
}

function estimateHighQualityBitrate(canvas: HTMLCanvasElement, fps: number) {
  const megapixels = (canvas.width * canvas.height) / 1_000_000;
  const targetBitsPerSecond = megapixels * fps * 950_000;
  return Math.round(Math.min(80_000_000, Math.max(8_000_000, targetBitsPerSecond)));
}

export function canEncodeWebmWithMediaRecorder() {
  return getSupportedWebmMimeType() !== null;
}

export async function encodeCanvasFramesWithMediaRecorder(params: {
  canvas: HTMLCanvasElement;
  fps: number;
  totalFrames: number;
  renderFrame: (frameIndex: number) => Promise<void>;
  onProgress?: (progress: MediaRecorderEncodeProgress) => void;
  signal?: AbortSignal;
  stopNowRef?: { current: boolean };
}): Promise<MediaRecorderEncodeResult> {
  const { canvas, fps, totalFrames, renderFrame, onProgress, signal, stopNowRef } = params;
  const mimeType = getSupportedWebmMimeType();
  if (!mimeType) {
    throw new Error("This browser does not support fast WebM recording.");
  }

  const stream = canvas.captureStream(0);
  const [track] = stream.getVideoTracks() as CanvasCaptureMediaStreamTrack[];
  if (!track) {
    throw new Error("Unable to create a video stream from the export canvas.");
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: estimateHighQualityBitrate(canvas, fps),
  });

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onerror = () => reject(new Error("WebM recording failed."));
    recorder.onstop = () => resolve();
  });

  const startedAt = performance.now();
  recorder.start();
  const frameDurationMs = 1000 / fps;

  let renderError: unknown = null;
  try {
    for (let index = 0; index < totalFrames; index += 1) {
      if (stopNowRef?.current) break;
      if (signal?.aborted) throw new DOMException("Recording cancelled", "AbortError");
      const startedAt = performance.now();
      await renderFrame(index);
      track.requestFrame?.();
      onProgress?.({ phase: "recording", progress: (index + 1) / totalFrames });

      const elapsedMs = performance.now() - startedAt;
      await sleep(Math.max(0, frameDurationMs - elapsedMs));
    }
  } catch (error) {
    renderError = error;
  } finally {
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  const recordedDurationSeconds = Math.max(0.001, (performance.now() - startedAt) / 1000);
  onProgress?.({ phase: "finalizing", progress: 1 });
  try {
    await stopped;
  } finally {
    track.stop();
    stream.getTracks().forEach((streamTrack) => streamTrack.stop());
  }

  if (renderError) {
    throw renderError;
  }

  return {
    bytes: new Uint8Array(await new Blob(chunks, { type: mimeType }).arrayBuffer()),
    recordedDurationSeconds,
  };
}

export async function encodeRealtimeCanvasWithMediaRecorder(params: {
  canvas: HTMLCanvasElement;
  estimatedFps: number;
  durationSeconds: number;
  renderElapsedTime: (elapsedSeconds: number) => Promise<void>;
  onProgress?: (progress: MediaRecorderEncodeProgress) => void;
  signal?: AbortSignal;
  stopNowRef?: { current: boolean };
}): Promise<MediaRecorderEncodeResult> {
  const { canvas, estimatedFps, durationSeconds, renderElapsedTime, onProgress, signal, stopNowRef } = params;
  const mimeType = getSupportedWebmMimeType();
  if (!mimeType) {
    throw new Error("This browser does not support fast WebM recording.");
  }

  const stream = canvas.captureStream(0);
  const [track] = stream.getVideoTracks() as CanvasCaptureMediaStreamTrack[];
  if (!track) {
    throw new Error("Unable to create a video stream from the export canvas.");
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: estimateHighQualityBitrate(canvas, estimatedFps),
  });

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onerror = () => reject(new Error("WebM recording failed."));
    recorder.onstop = () => resolve();
  });

  const startedAt = performance.now();
  recorder.start();

  let renderError: unknown = null;
  try {
    while (true) {
      if (stopNowRef?.current) break;
      if (signal?.aborted) throw new DOMException("Recording cancelled", "AbortError");
      const elapsedSeconds = (performance.now() - startedAt) / 1000;
      if (elapsedSeconds > durationSeconds) break;

      await renderElapsedTime(elapsedSeconds);
      track.requestFrame?.();
      onProgress?.({ phase: "recording", progress: Math.min(1, elapsedSeconds / durationSeconds) });
      await nextAnimationFrame();
    }
    await renderElapsedTime(durationSeconds);
    track.requestFrame?.();
    onProgress?.({ phase: "recording", progress: 1 });
  } catch (error) {
    renderError = error;
  } finally {
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  const recordedDurationSeconds = Math.max(0.001, (performance.now() - startedAt) / 1000);
  onProgress?.({ phase: "finalizing", progress: 1 });
  try {
    await stopped;
  } finally {
    track.stop();
    stream.getTracks().forEach((streamTrack) => streamTrack.stop());
  }

  if (renderError) {
    throw renderError;
  }

  return {
    bytes: new Uint8Array(await new Blob(chunks, { type: mimeType }).arrayBuffer()),
    recordedDurationSeconds,
  };
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
