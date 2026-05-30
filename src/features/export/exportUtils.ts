export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0 s";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

export function getBaseDownloadName(buildingSlug?: string | null, simulationSlug?: string | null) {
  return `${buildingSlug ?? "building"}-${simulationSlug ?? "simulation"}`;
}

export function getDownloadName(baseName: string, mode: string, format: string) {
  return mode === "workspace" ? `${baseName}-workspace.${format}` : `${baseName}-panels.zip`;
}

export function getSourceFrameRate(dt: number) {
  return dt > 0 ? 1 / dt : 30;
}

export function buildSampledFrameSequence(startFrame: number, endFrame: number, sourceFps: number, outputFps: number) {
  const span = Math.max(0, endFrame - startFrame);
  const sourceDurationSeconds = (span + 1) / sourceFps;
  const outputFrameCount = Math.max(1, Math.round(sourceDurationSeconds * outputFps));

  if (outputFrameCount === 1) {
    return [startFrame];
  }

  return Array.from({ length: outputFrameCount }, (_, index) => {
    const progress = index / (outputFrameCount - 1);
    return Math.round(startFrame + span * progress);
  });
}

export function getSourceDurationSeconds(startFrame: number, endFrame: number, sourceFps: number) {
  const span = Math.max(0, endFrame - startFrame);
  return (span + 1) / sourceFps;
}

export function triggerDownload(url: string, name: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function frameToTime(frameIndex: number, dt: number) {
  return frameIndex * dt;
}

export function timeToFrame(seconds: number, dt: number) {
  return Math.round(seconds / dt);
}
