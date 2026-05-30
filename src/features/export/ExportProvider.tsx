// @refresh reset
/* eslint-disable react-refresh/only-export-components */
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { rasterizeElementToCanvas } from "@/features/export/domCapture";
import { canvasToPngBytes, getFfmpegEncoder, type ExportVideoFormat } from "@/features/export/ffmpegEncoder";
import {
  canEncodeWebmWithMediaRecorder,
  encodeCanvasFramesWithMediaRecorder,
  encodeRealtimeCanvasWithMediaRecorder,
} from "@/features/export/mediaRecorderEncoder";
import { createZipArchive } from "@/features/export/zip";
import { usePlayback } from "@/features/playback/usePlayback";
import { useLiveStore, useProfileActions } from "@/state";
import { Download, Film, LoaderCircle, Video } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type ExportMode = "workspace" | "separate-panels";
export type ExportStatus = "idle" | "loading" | "ready" | "recording" | "processing" | "complete" | "error";
type ExportFps = "variable" | 10 | 15 | 24 | 30 | 60;
type ExportScale = 1 | 1.5 | 2 | 3;

interface ExportPanelSelection {
  panelId: string;
  title: string;
  enabled: boolean;
}

interface PanelCaptureTarget {
  panelId: string;
  title: string;
  element: HTMLElement;
  width: number;
  height: number;
}

interface ExportContextValue {
  openExportPanel: () => void;
  showTransientUi: boolean;
  showPanelHeaders: boolean;
  frameloop: "always" | "demand";
  exportStatus: ExportStatus;
  exportProgress: number;
  exportStatusLabel: string;
}

const ExportContext = createContext<ExportContextValue | null>(null);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0 s";
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function getBaseDownloadName(buildingSlug?: string | null, simulationSlug?: string | null) {
  return `${buildingSlug ?? "building"}-${simulationSlug ?? "simulation"}`;
}

function getDownloadName(baseName: string, mode: ExportMode, format: ExportVideoFormat) {
  return mode === "workspace" ? `${baseName}-workspace.${format}` : `${baseName}-panels.zip`;
}

function getSourceFrameRate(dt: number) {
  return dt > 0 ? 1 / dt : 30;
}

function buildSampledFrameSequence(startFrame: number, endFrame: number, sourceFps: number, outputFps: number) {
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

function getSourceDurationSeconds(startFrame: number, endFrame: number, sourceFps: number) {
  const span = Math.max(0, endFrame - startFrame);
  return (span + 1) / sourceFps;
}

function triggerDownload(url: string, name: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function getPanelCaptureTargets(root: HTMLElement): PanelCaptureTarget[] {
  const panelRoots = Array.from(root.querySelectorAll<HTMLElement>("[data-export-panel-root='true']"));
  return panelRoots
    .map((panelRoot) => {
      const panelId = panelRoot.dataset.exportPanelId;
      const title = panelRoot.dataset.exportPanelTitle;
      if (!panelId || !title) return null;
      const captureElement = panelRoot;
      const rect = captureElement.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return null;
      return {
        panelId,
        title,
        element: captureElement,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    })
    .filter((target): target is PanelCaptureTarget => Boolean(target));
}

function syncPanelSelections(previous: ExportPanelSelection[], nextTargets: PanelCaptureTarget[]) {
  const previousMap = new Map(previous.map((selection) => [selection.panelId, selection.enabled]));
  return nextTargets.map((target) => ({
    panelId: target.panelId,
    title: target.title,
    enabled: previousMap.get(target.panelId) ?? true,
  }));
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function useExportVideo(): ExportContextValue {
  const context = useContext(ExportContext);
  if (!context) {
    throw new Error("useExportVideo must be used within ExportProvider");
  }
  return context;
}

function frameToTime(frameIndex: number, dt: number) {
  return frameIndex * dt;
}

function timeToFrame(seconds: number, dt: number) {
  return Math.round(seconds / dt);
}

export function ExportProvider({ children }: { children: ReactNode }) {
  const { animationData, currentBuilding, currentSimulation } = useAnimationData();
  const { frameIndex, totalFrames } = usePlayback();
  const { setFrameIndex: setStoreFrameIndex } = useProfileActions();
  const setStorePlaying = useLiveStore((s) => s._setPlaying);
  const exportStartTimeRef = useRef<number | null>(null);
  const cancelRef = useRef<AbortController | null>(null);
  const stopNowRef = useRef(false);
  const dt = animationData.metadata.dt;

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState("Preview ready");
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("quake-export.mp4");
  const [autoDownloaded, setAutoDownloaded] = useState(false);

  const [mode, setMode] = useState<ExportMode>("workspace");
  const [startFrame, setStartFrame] = useState(0);
  const [endFrame, setEndFrame] = useState(0);
  const [fps, setFps] = useState<ExportFps>(30);
  const [scale, setScale] = useState<ExportScale>(1.5);
  const [outputFormat, setOutputFormat] = useState<ExportVideoFormat>("webm");
  const [showTransientUi, setShowTransientUi] = useState(false);
  const [showPanelHeaders, setShowPanelHeaders] = useState(false);

  const [rangeValue, setRangeValue] = useState([0, 0]);
  const prevRangeRef = useRef(rangeValue[0]);

  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoadProgress, setFfmpegLoadProgress] = useState(0);
  const [ffmpegLoadLabel, setFfmpegLoadLabel] = useState("Idle");

  const [panelSelections, setPanelSelections] = useState<ExportPanelSelection[]>([]);

  const sourceFps = useMemo(() => getSourceFrameRate(dt), [dt]);
  const fixedFps = fps === "variable" ? 30 : fps;
  const isVariableFps = fps === "variable";
  const sourceDurationSeconds = useMemo(
    () => getSourceDurationSeconds(startFrame, endFrame, sourceFps),
    [startFrame, endFrame, sourceFps]
  );
  const sampledFrames = useMemo(
    () => buildSampledFrameSequence(startFrame, endFrame, sourceFps, fixedFps),
    [startFrame, endFrame, sourceFps, fixedFps]
  );
  const durationSeconds = isVariableFps ? sourceDurationSeconds : sampledFrames.length / fixedFps;
  const baseDownloadName = useMemo(
    () => getBaseDownloadName(currentBuilding?.folder, currentSimulation?.folder),
    [currentBuilding?.folder, currentSimulation?.folder]
  );
  const maxTime = useMemo(() => Math.max(0, (totalFrames - 1) * dt), [totalFrames, dt]);
  const startSeconds = useMemo(() => frameToTime(startFrame, dt), [startFrame, dt]);
  const endSeconds = useMemo(() => frameToTime(endFrame, dt), [endFrame, dt]);

  const isRecording = status === "recording";
  const isExporting = isRecording || status === "processing";
  const requiresFfmpeg = outputFormat === "mp4" || !canEncodeWebmWithMediaRecorder() || !isVariableFps;

  const renderModeValue = useMemo(
    () => ({
      showPanelHeaders: isSheetOpen || isExporting ? showPanelHeaders : true,
      showTransientUi: isSheetOpen || isExporting ? showTransientUi : true,
      frameloop: (isExporting ? "always" : "demand") as "always" | "demand",
    }),
    [isSheetOpen, isExporting, showPanelHeaders, showTransientUi]
  );

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const updateExportProgress = useCallback((nextProgress: number, nextLabel?: string) => {
    setProgress(nextProgress);
    if (nextLabel) {
      setStatusLabel(nextLabel);
    }
    const start = exportStartTimeRef.current;
    if (!start || nextProgress < 0.02) {
      setEtaSeconds(null);
      return;
    }
    const elapsedSeconds = (performance.now() - start) / 1000;
    setEtaSeconds(Math.max(0, (elapsedSeconds * (1 - nextProgress)) / nextProgress));
  }, []);

  const refreshPanelSelections = useCallback(() => {
    const workspace = document.querySelector<HTMLElement>("[data-export-workspace]");
    if (!workspace) return;
    const targets = getPanelCaptureTargets(workspace);
    setPanelSelections((current) => syncPanelSelections(current, targets));
  }, []);

  const refreshPreview = useCallback(() => {
    const nextStart = frameIndex;
    const nextEnd = Math.min(totalFrames - 1, frameIndex + 3000);
    setStartFrame(nextStart);
    setEndFrame(nextEnd);
    setRangeValue([frameToTime(nextStart, dt), frameToTime(nextEnd, dt)]);
    setStatus(requiresFfmpeg && !ffmpegReady ? "loading" : "ready");
    setStatusLabel(requiresFfmpeg && !ffmpegReady ? "Loading encoder" : "Preview ready");
    setProgress(0);
    setEtaSeconds(null);
    setError(null);
    setAutoDownloaded(false);
    setPanelSelections([]);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setDownloadName(getDownloadName(baseDownloadName, mode, outputFormat));
  }, [frameIndex, totalFrames, ffmpegReady, requiresFfmpeg, baseDownloadName, downloadUrl, mode, outputFormat, dt]);

  const ensureFfmpegReady = useCallback(async () => {
    if (ffmpegReady) return;
    setStatus("loading");
    setStatusLabel("Loading encoder");
    setFfmpegLoadLabel("Loading encoder");
    setFfmpegLoadProgress(0);

    try {
      await getFfmpegEncoder(({ phase, progress: nextProgress }) => {
        setFfmpegLoadProgress(nextProgress);
        setFfmpegLoadLabel(
          phase === "core-script"
            ? "Loading ffmpeg runtime"
            : phase === "core-wasm"
              ? "Loading wasm core"
              : "Encoder ready"
        );
      });
      setFfmpegReady(true);
      setStatus("ready");
      setStatusLabel("Preview ready");
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load ffmpeg";
      setStatus("error");
      setError(message);
      setStatusLabel(message);
    }
  }, [ffmpegReady]);

  const openExportPanel = useCallback(() => {
    if (status === "recording" || status === "processing" || status === "complete" || status === "error") {
      setIsSheetOpen(true);
      return;
    }
    refreshPreview();
    setIsSheetOpen(true);
    if (requiresFfmpeg) {
      void ensureFfmpegReady();
    }
  }, [ensureFfmpegReady, refreshPreview, requiresFfmpeg, status]);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      setIsSheetOpen(open);
      if (!open && (status === "idle" || status === "complete" || status === "error")) {
        setStatus("idle");
        setProgress(0);
        setEtaSeconds(null);
        setError(null);
        setAutoDownloaded(false);
      }
    },
    [status]
  );

  useEffect(() => {
    if (isSheetOpen && mode === "separate-panels") {
      const timer = window.setTimeout(() => {
        refreshPanelSelections();
      }, 500);
      return () => window.clearTimeout(timer);
    }
  }, [isSheetOpen, mode, refreshPanelSelections, showTransientUi, showPanelHeaders]);

  const handleRangeChange = useCallback(
    (value: number[]) => {
      const prevStart = prevRangeRef.current;
      const [nextStartSec, nextEndSec] = value;
      prevRangeRef.current = nextStartSec;
      setRangeValue([nextStartSec, nextEndSec]);

      const start = timeToFrame(nextStartSec, dt);
      const end = timeToFrame(nextEndSec, dt);
      setStartFrame(clamp(start, 0, totalFrames - 1));
      setEndFrame(clamp(end, 0, totalFrames - 1));

      const endChanged = nextStartSec === prevStart;
      const previewFrame = endChanged ? timeToFrame(nextEndSec, dt) : timeToFrame(nextStartSec, dt);
      setStoreFrameIndex(clamp(previewFrame, 0, totalFrames - 1));
    },
    [dt, totalFrames, setStoreFrameIndex]
  );

  const handleDownload = useCallback(() => {
    if (!downloadUrl) return;
    triggerDownload(downloadUrl, downloadName);
    setAutoDownloaded(true);
  }, [downloadName, downloadUrl]);

  function getCaptureElement(): HTMLElement {
    const dockview = document.querySelector<HTMLElement>(".dockview-theme-container");
    if (dockview) return dockview;
    const workspace = document.querySelector<HTMLElement>("[data-export-workspace]");
    if (workspace) return workspace;
    throw new Error("Could not find workspace element for capture");
  }

  const encodeWorkspace = useCallback(
    async (
      encoder: Awaited<ReturnType<typeof getFfmpegEncoder>> | null,
      onCaptureDone?: () => void,
      signal?: AbortSignal
    ) => {
      const captureElement = getCaptureElement();

      const exportCanvas = document.createElement("canvas");
      const totalFramesToCapture = sampledFrames.length;

      const container = document.querySelector<HTMLElement>("[data-export-workspace]");
      container?.setAttribute("data-capturing", "true");

      setStoreFrameIndex(sampledFrames[0] ?? startFrame);
      await nextAnimationFrame();

      const renderFrame = async (index: number) => {
        const frame = sampledFrames[index] ?? startFrame;
        setStoreFrameIndex(frame);
        await nextAnimationFrame();
        await rasterizeElementToCanvas({
          element: captureElement,
          canvas: exportCanvas,
          scale,
        });
      };
      const renderElapsedTime = async (elapsedSeconds: number) => {
        const frame = clamp(startFrame + Math.round(elapsedSeconds / dt), startFrame, endFrame);
        setStoreFrameIndex(frame);
        await nextAnimationFrame();
        await rasterizeElementToCanvas({
          element: captureElement,
          canvas: exportCanvas,
          scale,
        });
      };

      if (canEncodeWebmWithMediaRecorder()) {
        await (isVariableFps ? renderElapsedTime(0) : renderFrame(0));
        const recordedVideo = isVariableFps
          ? await encodeRealtimeCanvasWithMediaRecorder({
              canvas: exportCanvas,
              estimatedFps: fixedFps,
              durationSeconds,
              renderElapsedTime,
              signal,
              stopNowRef,
              onProgress: ({ phase, progress: captureProgress }) => {
                updateExportProgress(
                  outputFormat === "webm"
                    ? phase === "recording"
                      ? captureProgress * 0.98
                      : 0.99
                    : phase === "recording"
                      ? captureProgress * 0.82
                      : 0.83,
                  phase === "recording"
                    ? `Recording realtime playback ${Math.round(captureProgress * 100)}%`
                    : outputFormat === "webm"
                      ? "Finalizing WebM"
                      : "Preparing MP4 conversion"
                );
              },
            })
          : await encodeCanvasFramesWithMediaRecorder({
              canvas: exportCanvas,
              fps: fixedFps,
              totalFrames: totalFramesToCapture,
              renderFrame,
              signal,
              stopNowRef,
              onProgress: ({ phase, progress: captureProgress }) => {
                updateExportProgress(
                  phase === "recording" ? captureProgress * 0.82 : 0.83,
                  phase === "recording"
                    ? `Recording frame ${Math.ceil(captureProgress * totalFramesToCapture)} of ${totalFramesToCapture}`
                    : "Preparing playback speed correction"
                );
              },
            });

        container?.removeAttribute("data-capturing");
        onCaptureDone?.();

        if (isVariableFps && outputFormat === "webm") {
          return {
            bytes: recordedVideo.bytes,
            downloadName: getDownloadName(baseDownloadName, "workspace", outputFormat),
            mimeType: "video/webm",
          };
        }

        updateExportProgress(
          0.84,
          isVariableFps
            ? `Converting ${outputFormat.toUpperCase()}`
            : `Correcting ${outputFormat.toUpperCase()} playback speed`
        );
        const postprocessEncoder = encoder ?? (await getFfmpegEncoder());
        setFfmpegReady(true);
        const encodedVideo = await postprocessEncoder.transcodeRecordedWebm({
          webm: recordedVideo.bytes,
          fps: isVariableFps ? undefined : fixedFps,
          format: outputFormat,
          targetDurationSeconds: isVariableFps ? undefined : durationSeconds,
          recordedDurationSeconds: isVariableFps ? undefined : recordedVideo.recordedDurationSeconds,
          onProgress: ({ phase, progress: encodeProgress }) => {
            if (phase === "frames") {
              updateExportProgress(0.85, "Writing recording to encoder");
              return;
            }
            if (phase === "encoding") {
              updateExportProgress(
                0.85 + encodeProgress * 0.14,
                isVariableFps
                  ? `Converting ${outputFormat.toUpperCase()}`
                  : `Correcting ${outputFormat.toUpperCase()} playback speed`
              );
              return;
            }
            updateExportProgress(0.99, "Finalizing video");
          },
        });

        return {
          bytes: encodedVideo,
          downloadName: getDownloadName(baseDownloadName, "workspace", outputFormat),
          mimeType: outputFormat === "mp4" ? "video/mp4" : "video/webm",
        };
      }

      if (isVariableFps) {
        throw new Error("Variable frame rate export requires browser WebM recording support.");
      }

      if (!encoder) {
        throw new Error("MP4 export requires the ffmpeg encoder.");
      }

      const encodedFrames: Uint8Array[] = [];
      for (let index = 0; index < totalFramesToCapture; index += 1) {
        if (stopNowRef.current) break;
        if (signal?.aborted) throw new DOMException("Recording cancelled", "AbortError");
        await renderFrame(index);
        encodedFrames.push(await canvasToPngBytes(exportCanvas));
        updateExportProgress(
          ((index + 1) / totalFramesToCapture) * 0.68,
          `Capturing frame ${index + 1} of ${totalFramesToCapture}`
        );
        await sleep(0);
      }

      container?.removeAttribute("data-capturing");
      onCaptureDone?.();

      const encodedVideo = await encoder.encodeFrames({
        frames: encodedFrames,
        fps: fixedFps,
        format: outputFormat,
        onProgress: ({ phase, progress: encodeProgress }) => {
          if (phase === "frames") {
            updateExportProgress(0.68 + encodeProgress * 0.08, "Writing frames to encoder");
            return;
          }
          if (phase === "encoding") {
            updateExportProgress(0.76 + encodeProgress * 0.23, `Encoding ${outputFormat.toUpperCase()}`);
            return;
          }
          updateExportProgress(0.99, "Finalizing video");
        },
      });

      return {
        bytes: encodedVideo,
        downloadName: getDownloadName(baseDownloadName, "workspace", outputFormat),
        mimeType: outputFormat === "mp4" ? "video/mp4" : "video/webm",
      };
    },
    [
      baseDownloadName,
      outputFormat,
      sampledFrames,
      fixedFps,
      isVariableFps,
      scale,
      startFrame,
      endFrame,
      dt,
      durationSeconds,
      setStoreFrameIndex,
      updateExportProgress,
    ]
  );

  const encodeSeparatePanels = useCallback(
    async (
      encoder: Awaited<ReturnType<typeof getFfmpegEncoder>> | null,
      onCaptureDone?: () => void,
      signal?: AbortSignal
    ) => {
      const workspace = document.querySelector<HTMLElement>("[data-export-workspace]");
      if (!workspace) {
        throw new Error("Could not find workspace element for capture");
      }

      const selectionMap = new Map(panelSelections.map((selection) => [selection.panelId, selection.enabled]));
      const targets = getPanelCaptureTargets(workspace).filter((t) => selectionMap.get(t.panelId) !== false);

      if (targets.length === 0) {
        throw new Error("Choose at least one panel to export.");
      }

      const exportCanvas = document.createElement("canvas");
      const files: Array<{ name: string; data: Uint8Array }> = [];
      const totalCaptureFrames = targets.length * sampledFrames.length;
      let completedCaptureFrames = 0;

      const container = document.querySelector<HTMLElement>("[data-export-workspace]");
      container?.setAttribute("data-capturing", "true");

      for (let panelIndex = 0; panelIndex < targets.length; panelIndex += 1) {
        if (stopNowRef.current) break;
        if (signal?.aborted) throw new DOMException("Recording cancelled", "AbortError");

        const target = targets[panelIndex];
        setStoreFrameIndex(sampledFrames[0] ?? startFrame);
        await nextAnimationFrame();

        const renderFrame = async (frameIdx: number) => {
          const frame = sampledFrames[frameIdx] ?? startFrame;
          setStoreFrameIndex(frame);
          await nextAnimationFrame();
          await rasterizeElementToCanvas({
            element: target.element,
            canvas: exportCanvas,
            scale,
          });
        };
        const renderElapsedTime = async (elapsedSeconds: number) => {
          const frame = clamp(startFrame + Math.round(elapsedSeconds / dt), startFrame, endFrame);
          setStoreFrameIndex(frame);
          await nextAnimationFrame();
          await rasterizeElementToCanvas({
            element: target.element,
            canvas: exportCanvas,
            scale,
          });
        };

        if (canEncodeWebmWithMediaRecorder()) {
          await (isVariableFps ? renderElapsedTime(0) : renderFrame(0));
          const recordedVideo = isVariableFps
            ? await encodeRealtimeCanvasWithMediaRecorder({
                canvas: exportCanvas,
                estimatedFps: fixedFps,
                durationSeconds,
                renderElapsedTime,
                signal,
                stopNowRef,
                onProgress: ({ phase, progress: captureProgress }) => {
                  const panelBaseProgress = panelIndex / targets.length;
                  const panelSpan = 1 / targets.length;
                  updateExportProgress(
                    outputFormat === "webm"
                      ? phase === "recording"
                        ? (panelBaseProgress + captureProgress * panelSpan) * 0.98
                        : 0.99
                      : phase === "recording"
                        ? (panelBaseProgress + captureProgress * panelSpan) * 0.78
                        : 0.79,
                    phase === "recording"
                      ? `Recording ${target.title} realtime (${Math.round(captureProgress * 100)}%)`
                      : `Preparing ${target.title}`
                  );
                },
              })
            : await encodeCanvasFramesWithMediaRecorder({
                canvas: exportCanvas,
                fps: fixedFps,
                totalFrames: sampledFrames.length,
                renderFrame: async (frameIdx) => {
                  await renderFrame(frameIdx);
                  completedCaptureFrames += 1;
                },
                signal,
                stopNowRef,
                onProgress: ({ phase, progress: captureProgress }) => {
                  const panelBaseProgress = panelIndex / targets.length;
                  const panelSpan = 1 / targets.length;
                  updateExportProgress(
                    phase === "recording" ? (panelBaseProgress + captureProgress * panelSpan) * 0.78 : 0.79,
                    phase === "recording"
                      ? `Recording ${target.title} (${Math.ceil(captureProgress * sampledFrames.length)}/${sampledFrames.length})`
                      : `Preparing ${target.title}`
                  );
                },
              });

          if (isVariableFps && outputFormat === "webm") {
            const outputBytes = new Uint8Array(recordedVideo.bytes.byteLength);
            outputBytes.set(recordedVideo.bytes);
            files.push({
              name: `${String(panelIndex + 1).padStart(2, "0")}-${slugify(target.title || target.panelId)}.${outputFormat}`,
              data: outputBytes,
            });
            continue;
          }

          updateExportProgress(
            0.8,
            isVariableFps ? `Converting ${target.title}` : `Correcting ${target.title} playback speed`
          );
          const postprocessEncoder = encoder ?? (await getFfmpegEncoder());
          setFfmpegReady(true);
          const encodedVideo = await postprocessEncoder.transcodeRecordedWebm({
            webm: recordedVideo.bytes,
            fps: isVariableFps ? undefined : fixedFps,
            format: outputFormat,
            targetDurationSeconds: isVariableFps ? undefined : durationSeconds,
            recordedDurationSeconds: isVariableFps ? undefined : recordedVideo.recordedDurationSeconds,
            onProgress: ({ phase, progress: encodeProgress }) => {
              const panelBaseProgress = panelIndex / targets.length;
              const panelSpan = 1 / targets.length;
              if (phase === "frames") {
                updateExportProgress(0.8 + panelBaseProgress * 0.18, `Writing ${target.title}`);
                return;
              }
              if (phase === "encoding") {
                updateExportProgress(
                  0.8 + (panelBaseProgress + encodeProgress * panelSpan) * 0.18,
                  isVariableFps ? `Converting ${target.title}` : `Correcting ${target.title}`
                );
                return;
              }
              updateExportProgress(0.98 + panelSpan * 0.01, `Finalizing ${target.title}`);
            },
          });

          const outputBytes = new Uint8Array(encodedVideo.byteLength);
          outputBytes.set(encodedVideo);
          files.push({
            name: `${String(panelIndex + 1).padStart(2, "0")}-${slugify(target.title || target.panelId)}.${outputFormat}`,
            data: outputBytes,
          });
          continue;
        }

        if (isVariableFps) {
          throw new Error("Variable frame rate export requires browser WebM recording support.");
        }

        if (!encoder) {
          throw new Error("MP4 export requires the ffmpeg encoder.");
        }

        const encodedFrames: Uint8Array[] = [];
        for (let frameIdx = 0; frameIdx < sampledFrames.length; frameIdx += 1) {
          if (stopNowRef.current) break;
          if (signal?.aborted) throw new DOMException("Recording cancelled", "AbortError");
          await renderFrame(frameIdx);
          encodedFrames.push(await canvasToPngBytes(exportCanvas));
          completedCaptureFrames += 1;
          updateExportProgress(
            (completedCaptureFrames / totalCaptureFrames) * 0.68,
            `Capturing ${target.title} (${frameIdx + 1}/${sampledFrames.length})`
          );
          await sleep(0);
        }

        const encodedVideo = await encoder.encodeFrames({
          frames: encodedFrames,
          fps: fixedFps,
          format: outputFormat,
          onProgress: ({ phase, progress: encodeProgress }) => {
            const panelBaseProgress = panelIndex / targets.length;
            const panelSpan = 1 / targets.length;
            if (phase === "frames") {
              updateExportProgress(
                0.68 + (panelBaseProgress + encodeProgress * 0.35) * 0.28,
                `Writing ${target.title}`
              );
              return;
            }
            if (phase === "encoding") {
              updateExportProgress(
                0.68 + (panelBaseProgress + 0.35 + encodeProgress * 0.65) * 0.28,
                `Encoding ${target.title}`
              );
              return;
            }
            updateExportProgress(0.97 + panelSpan * 0.02, `Finalizing ${target.title}`);
          },
        });

        const outputBytes = new Uint8Array(encodedVideo.byteLength);
        outputBytes.set(encodedVideo);
        files.push({
          name: `${String(panelIndex + 1).padStart(2, "0")}-${slugify(target.title || target.panelId)}.${outputFormat}`,
          data: outputBytes,
        });
      }

      container?.removeAttribute("data-capturing");
      onCaptureDone?.();
      updateExportProgress(0.995, "Packaging ZIP archive");
      return {
        bytes: createZipArchive(files),
        downloadName: getDownloadName(baseDownloadName, "separate-panels", outputFormat),
        mimeType: "application/zip",
      };
    },
    [
      baseDownloadName,
      outputFormat,
      panelSelections,
      sampledFrames,
      fixedFps,
      isVariableFps,
      scale,
      startFrame,
      endFrame,
      dt,
      durationSeconds,
      setStoreFrameIndex,
      updateExportProgress,
    ]
  );

  const startRecording = useCallback(async () => {
    if (requiresFfmpeg && !ffmpegReady) {
      await ensureFfmpegReady();
    }

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    setStorePlaying(false);
    setIsSheetOpen(false);

    setStatus("recording");
    setProgress(0);
    setEtaSeconds(null);
    setError(null);
    setAutoDownloaded(false);
    setStatusLabel(mode === "workspace" ? "Preparing workspace export" : "Preparing panel batch export");
    exportStartTimeRef.current = performance.now();

    cancelRef.current = new AbortController();
    stopNowRef.current = false;
    const signal = cancelRef.current.signal;

    try {
      const encoder = requiresFfmpeg ? await getFfmpegEncoder() : null;
      const result =
        mode === "workspace"
          ? await encodeWorkspace(
              encoder,
              () => {
                setStatus("processing");
                setIsSheetOpen(true);
              },
              signal
            )
          : await encodeSeparatePanels(
              encoder,
              () => {
                setStatus("processing");
                setIsSheetOpen(true);
              },
              signal
            );

      const outputBytes = new Uint8Array(result.bytes.byteLength);
      outputBytes.set(result.bytes);
      const blob = new Blob([outputBytes], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadName(result.downloadName);
      triggerDownload(url, result.downloadName);
      setAutoDownloaded(true);
      setStatus("complete");
      setProgress(1);
      setEtaSeconds(0);
      setStatusLabel(mode === "workspace" ? "Downloaded workspace video" : "Downloaded panel ZIP");
    } catch (recordingError) {
      if (recordingError instanceof DOMException && recordingError.name === "AbortError" && !stopNowRef.current) {
        return;
      }
      console.error(recordingError);
      const message = recordingError instanceof Error ? recordingError.message : "Video export failed";
      setStatus("error");
      setError(message);
      setStatusLabel(message);
      setIsSheetOpen(true);
    }
  }, [
    downloadUrl,
    encodeSeparatePanels,
    encodeWorkspace,
    ensureFfmpegReady,
    ffmpegReady,
    mode,
    requiresFfmpeg,
    setStorePlaying,
  ]);

  const handleStartRecording = useCallback(() => {
    setStoreFrameIndex(startFrame);
    void startRecording();
  }, [startFrame, setStoreFrameIndex, startRecording]);

  const handleStopNow = useCallback(() => {
    stopNowRef.current = true;
    cancelRef.current?.abort();
  }, []);

  const handleCancel = useCallback(() => {
    cancelRef.current?.abort();
    setIsSheetOpen(true);
    setStatus("idle");
    setProgress(0);
    setEtaSeconds(null);
    setError(null);
    setAutoDownloaded(false);
  }, []);

  const contextValue = useMemo<ExportContextValue>(
    () => ({
      openExportPanel,
      ...renderModeValue,
      exportStatus: status,
      exportProgress: progress,
      exportStatusLabel: statusLabel,
    }),
    [openExportPanel, renderModeValue, status, progress, statusLabel]
  );

  return (
    <ExportContext.Provider value={contextValue}>
      {children}

      {isRecording && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          style={{ pointerEvents: "auto" }}>
          <div className="flex flex-col items-center gap-4 rounded-lg bg-white px-6 py-4 shadow-lg">
            <div className="flex items-center gap-3">
              <span className="relative flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-red-600" />
              </span>
              <span className="text-sm font-medium text-neutral-900">
                {etaSeconds !== null ? `Recording \u2022 ETA ${formatDuration(etaSeconds)}` : "Recording..."}
              </span>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="default" size="sm" onClick={handleStopNow}>
                Stop Now
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        [data-capturing] .dv-sash,
        [data-capturing] .dv-groupview > .dv-tabs-and-actions-container {
          display: none !important;
        }
        [data-capturing] ::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
        }
        [data-capturing] {
          scrollbar-width: none !important;
        }
        [data-export-workspace] ::-webkit-scrollbar,
        [data-export-workspace] {
          scrollbar-width: none !important;
        }
        ${
          contextValue.showPanelHeaders
            ? ""
            : `[data-export-workspace] .dv-groupview > .dv-tabs-and-actions-container {
          display: none !important;
          height: 0 !important;
          min-height: 0 !important;
          overflow: hidden !important;
          border: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
        }`
        }
      `}</style>

      <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="left" className="" showCloseButton showOverlay={false}>
          <div className="flex h-full flex-col">
            <SheetHeader className="border-b border-neutral-200">
              <SheetTitle className="flex items-center gap-2">
                <Video className="size-4" />
                Export Video
              </SheetTitle>
              <SheetDescription>
                {currentBuilding?.name ?? "No building"} / {currentSimulation?.name ?? "No simulation"}
              </SheetDescription>
            </SheetHeader>

            <div
              className={`flex flex-1 flex-col gap-4 overflow-y-auto p-4 ${isExporting ? "pointer-events-none opacity-50" : ""}`}>
              <div className="space-y-1">
                <Label htmlFor="export-mode">Mode</Label>
                <NativeSelect
                  id="export-mode"
                  value={mode}
                  onChange={(event) => {
                    const nextMode = event.target.value as ExportMode;
                    setMode(nextMode);
                    setDownloadName(getDownloadName(baseDownloadName, nextMode, outputFormat));
                  }}>
                  <NativeSelectOption value="workspace">Workspace video</NativeSelectOption>
                  <NativeSelectOption value="separate-panels">Separate panel files</NativeSelectOption>
                </NativeSelect>
              </div>

              <div className="grid grid-cols-[auto_auto_auto] gap-3">
                <div className="space-y-1">
                  <Label htmlFor="export-fps">FPS</Label>
                  <NativeSelect
                    id="export-fps"
                    value={`${fps}`}
                    onChange={(event) => {
                      const nextFps =
                        event.target.value === "variable" ? "variable" : (Number(event.target.value) as ExportFps);
                      setFps(nextFps);
                      if (nextFps !== "variable" || outputFormat === "mp4" || !canEncodeWebmWithMediaRecorder()) {
                        setStatus(ffmpegReady ? "ready" : "loading");
                        setStatusLabel(ffmpegReady ? "Preview ready" : "Loading encoder");
                        void ensureFfmpegReady();
                      } else {
                        setStatus("ready");
                        setStatusLabel("Preview ready");
                      }
                    }}>
                    <NativeSelectOption value="variable">Variable</NativeSelectOption>
                    <NativeSelectOption value="10">10 fps</NativeSelectOption>
                    <NativeSelectOption value="15">15 fps</NativeSelectOption>
                    <NativeSelectOption value="24">24 fps</NativeSelectOption>
                    <NativeSelectOption value="30">30 fps</NativeSelectOption>
                    <NativeSelectOption value="60">60 fps</NativeSelectOption>
                  </NativeSelect>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="export-scale">Scale</Label>
                  <NativeSelect
                    id="export-scale"
                    value={`${scale}`}
                    onChange={(event) => setScale(Number(event.target.value) as ExportScale)}>
                    <NativeSelectOption value="1">1x</NativeSelectOption>
                    <NativeSelectOption value="1.5">1.5x</NativeSelectOption>
                    <NativeSelectOption value="2">2x</NativeSelectOption>
                    <NativeSelectOption value="3">3x</NativeSelectOption>
                  </NativeSelect>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="export-format">Format</Label>
                  <NativeSelect
                    id="export-format"
                    value={outputFormat}
                    onChange={(event) => {
                      const nextFormat = event.target.value as ExportVideoFormat;
                      setOutputFormat(nextFormat);
                      setDownloadName(getDownloadName(baseDownloadName, mode, nextFormat));
                      if (nextFormat === "mp4" || fps !== "variable" || !canEncodeWebmWithMediaRecorder()) {
                        setStatus(ffmpegReady ? "ready" : "loading");
                        setStatusLabel(ffmpegReady ? "Preview ready" : "Loading encoder");
                        void ensureFfmpegReady();
                      } else {
                        setStatus("ready");
                        setStatusLabel("Preview ready");
                      }
                    }}>
                    <NativeSelectOption value="webm">WebM</NativeSelectOption>
                    <NativeSelectOption value="mp4">MP4</NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>

              <div className="text-xs whitespace-nowrap text-neutral-600">
                {isVariableFps ? "Variable fps realtime capture" : `${fps} fps output`} from {sourceFps.toFixed(0)} fps
                source
                <br />
                scale {scale}x,{" "}
                {isVariableFps && outputFormat === "webm" && canEncodeWebmWithMediaRecorder()
                  ? "realtime WebM recording"
                  : outputFormat === "webm" && canEncodeWebmWithMediaRecorder()
                    ? "browser capture + speed correction"
                    : outputFormat === "mp4" && isVariableFps && canEncodeWebmWithMediaRecorder()
                      ? "realtime recording + MP4 conversion"
                      : outputFormat === "mp4" && canEncodeWebmWithMediaRecorder()
                        ? "browser capture + MP4 conversion"
                        : `${outputFormat.toUpperCase()} via ffmpeg`}
              </div>

              <div className="space-y-1">
                <Label>Time range</Label>
                <Slider
                  value={rangeValue}
                  onValueChange={handleRangeChange}
                  min={0}
                  max={Math.max(0.001, maxTime)}
                  step={dt}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>{startSeconds.toFixed(2)} s</span>
                  <span>{endSeconds.toFixed(2)} s</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-neutral-600">
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <div className="font-medium text-neutral-900">Duration</div>
                  <div>{durationSeconds.toFixed(2)} s</div>
                </div>
                <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <div className="font-medium text-neutral-900">{isVariableFps ? "Frame rate" : "Output frames"}</div>
                  <div>{isVariableFps ? "As fast as possible" : sampledFrames.length}</div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
                <div className="text-sm font-medium text-neutral-900">Interface</div>
                <label className="flex items-start gap-2 text-sm text-neutral-700">
                  <Checkbox
                    checked={showTransientUi}
                    onCheckedChange={(checked) => {
                      setShowTransientUi(checked === true);
                    }}
                  />
                  <span>Show transient UI like playback controls and dropdown menus</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-neutral-700">
                  <Checkbox
                    checked={showPanelHeaders}
                    onCheckedChange={(checked) => {
                      setShowPanelHeaders(checked === true);
                    }}
                  />
                  <span>Show panel tab bars and dock headers in the export</span>
                </label>
              </div>

              {mode === "separate-panels" && (
                <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
                  <div className="text-sm font-medium text-neutral-900">Panels</div>
                  <div className="space-y-1">
                    {panelSelections.map((panel) => (
                      <label key={panel.panelId} className="flex items-start gap-2 text-sm text-neutral-700">
                        <Checkbox
                          checked={panel.enabled}
                          onCheckedChange={(checked) =>
                            setPanelSelections((current) =>
                              current.map((selection) =>
                                selection.panelId === panel.panelId
                                  ? { ...selection, enabled: checked === true }
                                  : selection
                              )
                            )
                          }
                        />
                        <span>{panel.title}</span>
                      </label>
                    ))}
                    {panelSelections.length === 0 && (
                      <div className="text-xs text-neutral-500">
                        Panel list will populate when the preview is ready.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                  {status === "loading" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Film className="size-4" />
                  )}
                  {status === "loading" ? "Encoder loading" : "Export status"}
                </div>
                <div className="text-xs text-neutral-600">
                  {status === "loading"
                    ? ffmpegLoadLabel
                    : status === "recording"
                      ? `${statusLabel}${etaSeconds !== null ? ` \u2022 ETA ${formatDuration(etaSeconds)}` : ""}`
                      : status === "complete"
                        ? "Export downloaded"
                        : status === "error"
                          ? (error ?? "Export failed")
                          : statusLabel}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-neutral-800 transition-all"
                    style={{ width: `${(status === "loading" ? ffmpegLoadProgress : progress) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <SheetFooter className="border-t border-neutral-200 bg-white">
              <Button
                type="button"
                onClick={handleStartRecording}
                disabled={status === "recording" || status === "processing" || status === "loading"}>
                <Video className="size-4" />
                {status === "loading"
                  ? "Loading ffmpeg..."
                  : status === "recording"
                    ? `Encoding ${outputFormat.toUpperCase()}...`
                    : status === "processing"
                      ? "Processing..."
                      : mode === "workspace"
                        ? `Export ${outputFormat.toUpperCase()}`
                        : `Export panel ZIP`}
              </Button>
              <Button type="button" variant="outline" onClick={handleDownload} disabled={!downloadUrl}>
                <Download className="size-4" />
                {autoDownloaded ? "Downloaded! Download again?" : "Download"}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </ExportContext.Provider>
  );
}
