import { Download, Film, LoaderCircle, Video } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { rasterizeElementToCanvas } from "@/features/export/domCapture";
import { canvasToPngBytes, getFfmpegEncoder, type ExportVideoFormat } from "@/features/export/ffmpegEncoder";
import { ExportRenderModeProvider } from "@/features/export/renderMode";
import { createZipArchive } from "@/features/export/zip";
import { PlaybackProvider } from "@/features/playback/PlaybackContext";
import { MagicPanel, type MagicPanelParams } from "@/features/view-3d/components/MagicPanel";
import { SliceSelectionProvider } from "@/features/view-3d/contexts/visualization";
import { CrossSectionSelectionProvider } from "@/features/view-3d/contexts/visualization/CrossSectionSelectionContext";
import { getCurrentAppStateSnapshot, type AppState } from "@/features/view-3d/lib/statePersistence";
import { View3dWorkspace } from "@/features/view-3d/page";
import { useAnimationData } from "@/lib/useAnimationData";
import { ViewProvider, useViewStoreRaw, type ViewStore } from "@/state";
import type { IDockviewPanelProps } from "dockview";

type ExportMode = "workspace" | "separate-panels";
type ExportStatus = "idle" | "loading" | "ready" | "recording" | "complete" | "error";
type ExportFps = 10 | 15 | 24 | 30 | 60;
type ExportScale = 1 | 1.5 | 2 | 3;

interface ExportStageSize {
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
}

interface ExportPanelSelection {
  panelId: string;
  title: string;
  enabled: boolean;
}

interface ExportPanelDescriptor {
  panelId: string;
  title: string;
  panelType: MagicPanelParams["panelType"];
  width: number;
  height: number;
}

interface VideoExportSpec {
  mode: ExportMode;
  startFrame: number;
  endFrame: number;
  fps: ExportFps;
  scale: ExportScale;
  showTransientUi: boolean;
  showPanelHeaders: boolean;
  stage: ExportStageSize;
  separatePanels: ExportPanelSelection[];
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
}

const ExportContext = createContext<ExportContextValue | null>(null);

function cloneAppState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

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

function getWindowStageSize(): ExportStageSize {
  const sourceWidth = Math.max(640, Math.round(window.innerWidth));
  const sourceHeight = Math.max(360, Math.round(window.innerHeight));
  return {
    sourceWidth,
    sourceHeight,
    width: sourceWidth,
    height: sourceHeight,
  };
}

function getBaseDownloadName(buildingSlug?: string | null, simulationSlug?: string | null) {
  return `${buildingSlug ?? "building"}-${simulationSlug ?? "simulation"}`;
}

function getDownloadName(baseName: string, mode: ExportMode, format: ExportVideoFormat) {
  return mode === "workspace" ? `${baseName}-workspace.${format}` : `${baseName}-panels.zip`;
}

function buildDefaultSpec(frameIndex: number, totalFrames: number): VideoExportSpec {
  return {
    mode: "workspace",
    startFrame: frameIndex,
    endFrame: Math.min(totalFrames - 1, frameIndex + 299),
    fps: 30,
    scale: 1.5,
    showTransientUi: false,
    showPanelHeaders: false,
    stage: getWindowStageSize(),
    separatePanels: [],
  };
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

function getSourceFrameRate(dt: number) {
  return dt > 0 ? 1 / dt : 30;
}

function triggerDownload(url: string, name: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function syncPanelSelections(previous: ExportPanelSelection[], nextTargets: PanelCaptureTarget[]) {
  const previousMap = new Map(previous.map((selection) => [selection.panelId, selection.enabled]));
  return nextTargets.map((target) => ({
    panelId: target.panelId,
    title: target.title,
    enabled: previousMap.get(target.panelId) ?? true,
  }));
}

function arePanelDescriptorsEqual(left: ExportPanelDescriptor[], right: ExportPanelDescriptor[]) {
  return (
    left.length === right.length &&
    left.every(
      (panel, index) =>
        panel.panelId === right[index]?.panelId &&
        panel.title === right[index]?.title &&
        panel.panelType === right[index]?.panelType &&
        panel.width === right[index]?.width &&
        panel.height === right[index]?.height
    )
  );
}

function arePanelSelectionsEqual(left: ExportPanelSelection[], right: ExportPanelSelection[]) {
  return (
    left.length === right.length &&
    left.every(
      (selection, index) =>
        selection.panelId === right[index]?.panelId &&
        selection.title === right[index]?.title &&
        selection.enabled === right[index]?.enabled
    )
  );
}

function getPanelDescriptors(root: HTMLElement): ExportPanelDescriptor[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-export-panel-root='true']"))
    .map((panelRoot) => {
      const panelId = panelRoot.dataset.exportPanelId;
      const title = panelRoot.dataset.exportPanelTitle;
      const panelType = panelRoot.dataset.exportPanelType as MagicPanelParams["panelType"] | undefined;
      if (!panelId || !title || !panelType) return null;
      const rect = panelRoot.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) return null;
      return {
        panelId,
        title,
        panelType,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    })
    .filter((panel): panel is ExportPanelDescriptor => Boolean(panel));
}

function getPanelCaptureTargets(root: HTMLElement, includeHeaders: boolean): PanelCaptureTarget[] {
  const panelRoots = Array.from(root.querySelectorAll<HTMLElement>("[data-export-panel-root='true']"));
  return panelRoots
    .map((panelRoot) => {
      const panelId = panelRoot.dataset.exportPanelId;
      const title = panelRoot.dataset.exportPanelTitle;
      if (!panelId || !title) return null;
      const captureElement = includeHeaders
        ? (panelRoot.closest<HTMLElement>(".dv-groupview") ?? panelRoot)
        : panelRoot;
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

function useElementSize<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function getContainedStageSize(stage: ExportStageSize, bounds: { width: number; height: number }) {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { width: stage.width, height: stage.height, scale: 1 };
  }
  const scale = Math.min(bounds.width / stage.width, bounds.height / stage.height);
  return {
    width: Math.max(1, Math.round(stage.width * scale)),
    height: Math.max(1, Math.round(stage.height * scale)),
    scale,
  };
}

export function useExportVideo(): ExportContextValue {
  const context = useContext(ExportContext);
  if (!context) {
    throw new Error("useExportVideo must be used within ExportProvider");
  }
  return context;
}

export function ExportProvider({ children }: { children: ReactNode }) {
  const store = useViewStoreRaw();
  const { animationData, currentBuilding, currentSimulation } = useAnimationData();
  const previewStoreRef = useRef<ViewStore | null>(null);
  const previewRootRef = useRef<HTMLDivElement | null>(null);
  const previewAreaRef = useRef<HTMLDivElement | null>(null);
  const separatePanelHostRef = useRef<HTMLDivElement | null>(null);
  const exportStartTimeRef = useRef<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewState, setPreviewState] = useState<AppState | null>(null);
  const [spec, setSpec] = useState<VideoExportSpec>(() => buildDefaultSpec(0, 1));
  const [startFrameDraft, setStartFrameDraft] = useState("0");
  const [endFrameDraft, setEndFrameDraft] = useState("0");
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState("Preview ready");
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("quake-export.mp4");
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const [outputFormat, setOutputFormat] = useState<ExportVideoFormat>("mp4");
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoadProgress, setFfmpegLoadProgress] = useState(0);
  const [ffmpegLoadLabel, setFfmpegLoadLabel] = useState("Idle");
  const [panelDescriptors, setPanelDescriptors] = useState<ExportPanelDescriptor[]>([]);
  const [panelPreviewVersion, setPanelPreviewVersion] = useState(0);
  const [separatePanelHost, setSeparatePanelHost] = useState<HTMLDivElement | null>(null);
  const frameCount = animationData.metadata.frameCount;
  const sourceFps = useMemo(() => getSourceFrameRate(animationData.metadata.dt), [animationData.metadata.dt]);
  const sampledFrames = useMemo(
    () => buildSampledFrameSequence(spec.startFrame, spec.endFrame, sourceFps, spec.fps),
    [spec.endFrame, spec.fps, spec.startFrame, sourceFps]
  );
  const durationSeconds = useMemo(() => sampledFrames.length / spec.fps, [sampledFrames.length, spec.fps]);
  const baseDownloadName = useMemo(
    () => getBaseDownloadName(currentBuilding?.folder, currentSimulation?.folder),
    [currentBuilding?.folder, currentSimulation?.folder]
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

  const handlePreviewReady = useCallback((nextStore: ViewStore, nextRoot: HTMLDivElement) => {
    const storeChanged = previewStoreRef.current !== nextStore;
    const rootChanged = previewRootRef.current !== nextRoot;
    previewStoreRef.current = nextStore;
    previewRootRef.current = nextRoot;
    if (storeChanged || rootChanged) {
      setPanelPreviewVersion((current) => current + 1);
    }
  }, []);

  const handleSeparatePanelHostRef = useCallback((element: HTMLDivElement | null) => {
    separatePanelHostRef.current = element;
    setSeparatePanelHost(element);
  }, []);

  const setPreviewFrame = useCallback(
    (frame: number) => {
      previewStoreRef.current?.getState().setFrameIndex(clamp(frame, 0, frameCount - 1));
      setPanelPreviewVersion((current) => current + 1);
    },
    [frameCount]
  );

  const resetPreviewFrame = useCallback(() => {
    setPreviewFrame(0);
  }, [setPreviewFrame]);

  const refreshPreview = useCallback(() => {
    const currentState = cloneAppState(getCurrentAppStateSnapshot(store));
    const nextSpec = buildDefaultSpec(currentState.frameIndex, animationData.metadata.frameCount);
    setPreviewState(currentState);
    setSpec(nextSpec);
    setStartFrameDraft(`${nextSpec.startFrame}`);
    setEndFrameDraft(`${nextSpec.endFrame}`);
    setStatus(ffmpegReady ? "ready" : "loading");
    setStatusLabel(ffmpegReady ? "Preview ready" : "Loading encoder");
    setProgress(0);
    setEtaSeconds(null);
    setError(null);
    setAutoDownloaded(false);
    setPanelDescriptors([]);
    setPanelPreviewVersion((current) => current + 1);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setDownloadName(getDownloadName(baseDownloadName, nextSpec.mode, outputFormat));
  }, [animationData.metadata.frameCount, baseDownloadName, downloadUrl, ffmpegReady, outputFormat, store]);

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
    refreshPreview();
    setIsSheetOpen(true);
    void ensureFfmpegReady();
  }, [ensureFfmpegReady, refreshPreview]);

  const commitFrameBoundary = useCallback(
    (key: "startFrame" | "endFrame", draftValue: string) => {
      const parsedValue = Number.parseInt(draftValue, 10);
      if (!Number.isFinite(parsedValue)) {
        if (key === "startFrame") {
          setStartFrameDraft(`${spec.startFrame}`);
        } else {
          setEndFrameDraft(`${spec.endFrame}`);
        }
        resetPreviewFrame();
        return;
      }

      setSpec((current) => {
        const nextValue = clamp(parsedValue, 0, frameCount - 1);
        const next = { ...current, [key]: nextValue };

        if (key === "startFrame" && next.startFrame > next.endFrame) {
          next.endFrame = next.startFrame;
        }
        if (key === "endFrame" && next.endFrame < next.startFrame) {
          next.startFrame = next.endFrame;
        }

        return next;
      });

      const normalizedValue = clamp(parsedValue, 0, frameCount - 1);
      if (key === "startFrame") {
        setStartFrameDraft(`${normalizedValue}`);
        setEndFrameDraft((current) => {
          const currentEnd = Number.parseInt(current, 10);
          return Number.isFinite(currentEnd) && currentEnd >= normalizedValue ? current : `${normalizedValue}`;
        });
      } else {
        setEndFrameDraft(`${normalizedValue}`);
        setStartFrameDraft((current) => {
          const currentStart = Number.parseInt(current, 10);
          return Number.isFinite(currentStart) && currentStart <= normalizedValue ? current : `${normalizedValue}`;
        });
      }
      resetPreviewFrame();
    },
    [frameCount, resetPreviewFrame, spec.endFrame, spec.startFrame]
  );

  const handleDownload = useCallback(() => {
    if (!downloadUrl) return;
    triggerDownload(downloadUrl, downloadName);
    setAutoDownloaded(true);
  }, [downloadName, downloadUrl]);

  const updatePanelSelectionsFromDom = useCallback(() => {
    const previewRoot = previewRootRef.current;
    if (!previewRoot) return [];
    const targets = getPanelCaptureTargets(previewRoot, spec.showPanelHeaders);
    const descriptors = getPanelDescriptors(previewRoot);
    setPanelDescriptors((current) => (arePanelDescriptorsEqual(current, descriptors) ? current : descriptors));
    setSpec((current) => {
      const nextSelections = syncPanelSelections(current.separatePanels, targets);
      if (arePanelSelectionsEqual(current.separatePanels, nextSelections)) {
        return current;
      }
      return { ...current, separatePanels: nextSelections };
    });
    return targets;
  }, [spec.showPanelHeaders]);

  const refreshSeparatePanelPreview = useCallback(async () => {
    if (!isSheetOpen || spec.mode !== "separate-panels" || !previewRootRef.current) return;
    await nextAnimationFrame();
    await nextAnimationFrame();
    updatePanelSelectionsFromDom();
  }, [isSheetOpen, spec.mode, updatePanelSelectionsFromDom]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSeparatePanelPreview();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    panelPreviewVersion,
    previewState,
    refreshSeparatePanelPreview,
    spec.mode,
    spec.showPanelHeaders,
    spec.showTransientUi,
    spec.stage.height,
    spec.stage.width,
  ]);

  const handleModeChange = useCallback(
    (nextMode: ExportMode) => {
      setSpec((current) => ({ ...current, mode: nextMode }));
      setDownloadName(getDownloadName(baseDownloadName, nextMode, outputFormat));
      setPanelPreviewVersion((current) => current + 1);
    },
    [baseDownloadName, outputFormat]
  );

  const handleOutputFormatChange = useCallback(
    (nextFormat: ExportVideoFormat) => {
      setOutputFormat(nextFormat);
      setDownloadName(getDownloadName(baseDownloadName, spec.mode, nextFormat));
    },
    [baseDownloadName, spec.mode]
  );

  const encodeWorkspace = useCallback(
    async (
      encoder: Awaited<ReturnType<typeof getFfmpegEncoder>>,
      previewRoot: HTMLDivElement,
      previewStore: ViewStore
    ) => {
      const exportCanvas = document.createElement("canvas");
      const encodedFrames: Uint8Array[] = [];
      const totalFrames = sampledFrames.length;

      previewStore.getState().setPlaying(false);
      previewStore.getState().setFrameIndex(sampledFrames[0] ?? spec.startFrame);
      await nextAnimationFrame();
      await nextAnimationFrame();

      for (let index = 0; index < totalFrames; index += 1) {
        const frame = sampledFrames[index];
        previewStore.getState().setFrameIndex(frame);
        await nextAnimationFrame();
        await nextAnimationFrame();
        await rasterizeElementToCanvas({
          element: previewRoot,
          canvas: exportCanvas,
          scale: spec.scale,
        });
        encodedFrames.push(await canvasToPngBytes(exportCanvas));
        updateExportProgress(((index + 1) / totalFrames) * 0.68, `Capturing frame ${index + 1} of ${totalFrames}`);
        await sleep(0);
      }

      const encodedVideo = await encoder.encodeFrames({
        frames: encodedFrames,
        fps: spec.fps,
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
    [baseDownloadName, outputFormat, sampledFrames, spec.fps, spec.scale, spec.startFrame, updateExportProgress]
  );

  const encodeSeparatePanels = useCallback(
    async (encoder: Awaited<ReturnType<typeof getFfmpegEncoder>>, previewStore: ViewStore) => {
      const separatePanelHost = separatePanelHostRef.current;
      if (!separatePanelHost) {
        throw new Error("Separate panel export preview is not ready yet.");
      }

      const selectionMap = new Map(spec.separatePanels.map((selection) => [selection.panelId, selection.enabled]));
      const targets = Array.from(
        separatePanelHost.querySelectorAll<HTMLElement>("[data-export-separate-panel-root='true']")
      )
        .map((element) => {
          const panelId = element.dataset.exportPanelId;
          const title = element.dataset.exportPanelTitle;
          if (!panelId || !title || selectionMap.get(panelId) === false) return null;
          const rect = element.getBoundingClientRect();
          return {
            panelId,
            title,
            element,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        })
        .filter((target): target is PanelCaptureTarget => Boolean(target));

      if (targets.length === 0) {
        throw new Error("Choose at least one panel to export.");
      }

      const exportCanvas = document.createElement("canvas");
      const files: Array<{ name: string; data: Uint8Array }> = [];
      const totalCaptureFrames = targets.length * sampledFrames.length;
      let completedCaptureFrames = 0;

      previewStore.getState().setPlaying(false);

      for (let panelIndex = 0; panelIndex < targets.length; panelIndex += 1) {
        const target = targets[panelIndex];
        const encodedFrames: Uint8Array[] = [];
        previewStore.getState().setFrameIndex(sampledFrames[0] ?? spec.startFrame);
        await nextAnimationFrame();
        await nextAnimationFrame();

        for (let frameIndex = 0; frameIndex < sampledFrames.length; frameIndex += 1) {
          const frame = sampledFrames[frameIndex];
          previewStore.getState().setFrameIndex(frame);
          await nextAnimationFrame();
          await nextAnimationFrame();
          await rasterizeElementToCanvas({
            element: target.element,
            canvas: exportCanvas,
            scale: spec.scale,
          });
          encodedFrames.push(await canvasToPngBytes(exportCanvas));
          completedCaptureFrames += 1;
          updateExportProgress(
            (completedCaptureFrames / totalCaptureFrames) * 0.68,
            `Capturing ${target.title} (${frameIndex + 1}/${sampledFrames.length})`
          );
          await sleep(0);
        }

        const encodedVideo = await encoder.encodeFrames({
          frames: encodedFrames,
          fps: spec.fps,
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
      sampledFrames,
      spec.fps,
      spec.scale,
      spec.separatePanels,
      spec.startFrame,
      updateExportProgress,
    ]
  );

  const startRecording = useCallback(async () => {
    if (!previewStoreRef.current || !previewState || !previewRootRef.current) {
      setStatus("error");
      setError("Export preview is still loading. Give it a moment and try again.");
      setStatusLabel("Export preview is still loading");
      return;
    }
    if (!ffmpegReady) {
      await ensureFfmpegReady();
    }

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    setStatus("recording");
    setProgress(0);
    setEtaSeconds(null);
    setError(null);
    setAutoDownloaded(false);
    setStatusLabel(spec.mode === "workspace" ? "Preparing workspace export" : "Preparing panel batch export");
    exportStartTimeRef.current = performance.now();

    try {
      const encoder = await getFfmpegEncoder();
      const previewStore = previewStoreRef.current;
      const result =
        spec.mode === "workspace"
          ? await encodeWorkspace(encoder, previewRootRef.current, previewStore)
          : await encodeSeparatePanels(encoder, previewStore);

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
      setStatusLabel(spec.mode === "workspace" ? "Downloaded workspace video" : "Downloaded panel ZIP");
      resetPreviewFrame();
    } catch (recordingError) {
      console.error(recordingError);
      const message = recordingError instanceof Error ? recordingError.message : "Video export failed";
      setStatus("error");
      setError(message);
      setStatusLabel(message);
    }
  }, [
    downloadUrl,
    encodeSeparatePanels,
    encodeWorkspace,
    ensureFfmpegReady,
    ffmpegReady,
    previewState,
    resetPreviewFrame,
    spec.mode,
  ]);

  const contextValue = useMemo<ExportContextValue>(
    () => ({
      openExportPanel,
    }),
    [openExportPanel]
  );

  const enabledPanelIds = useMemo(
    () => new Set(spec.separatePanels.filter((panel) => panel.enabled).map((panel) => panel.panelId)),
    [spec.separatePanels]
  );

  return (
    <ExportContext.Provider value={contextValue}>
      {children}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="right"
          className="w-screen max-w-none border-l border-neutral-300 bg-neutral-100 p-0 sm:max-w-none"
          showCloseButton>
          <div className="flex min-h-0 flex-1">
            <div className="flex w-[22rem] shrink-0 flex-col border-r border-neutral-300 bg-white">
              <SheetHeader className="border-b border-neutral-200">
                <SheetTitle className="flex items-center gap-2">
                  <Video className="size-4" />
                  Export Video
                </SheetTitle>
                <SheetDescription>
                  {currentBuilding?.name ?? "No building"} / {currentSimulation?.name ?? "No simulation"}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="space-y-2">
                  <Label htmlFor="export-mode">Mode</Label>
                  <NativeSelect
                    id="export-mode"
                    value={spec.mode}
                    onChange={(event) => handleModeChange(event.target.value as ExportMode)}>
                    <NativeSelectOption value="workspace">Workspace video</NativeSelectOption>
                    <NativeSelectOption value="separate-panels">Separate panel files</NativeSelectOption>
                  </NativeSelect>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="export-fps">FPS</Label>
                    <NativeSelect
                      id="export-fps"
                      value={`${spec.fps}`}
                      onChange={(event) =>
                        setSpec((current) => ({ ...current, fps: Number(event.target.value) as ExportFps }))
                      }>
                      <NativeSelectOption value="10">10 fps</NativeSelectOption>
                      <NativeSelectOption value="15">15 fps</NativeSelectOption>
                      <NativeSelectOption value="24">24 fps</NativeSelectOption>
                      <NativeSelectOption value="30">30 fps</NativeSelectOption>
                      <NativeSelectOption value="60">60 fps</NativeSelectOption>
                    </NativeSelect>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="export-scale">Scale</Label>
                    <NativeSelect
                      id="export-scale"
                      value={`${spec.scale}`}
                      onChange={(event) =>
                        setSpec((current) => ({ ...current, scale: Number(event.target.value) as ExportScale }))
                      }>
                      <NativeSelectOption value="1">1x</NativeSelectOption>
                      <NativeSelectOption value="1.5">1.5x</NativeSelectOption>
                      <NativeSelectOption value="2">2x</NativeSelectOption>
                      <NativeSelectOption value="3">3x</NativeSelectOption>
                    </NativeSelect>
                  </div>
                </div>

                <div className="text-xs text-neutral-500">
                  Source data runs at {sourceFps.toFixed(0)} fps from dt = {animationData.metadata.dt.toFixed(3)} s.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="export-format">Format</Label>
                  <NativeSelect
                    id="export-format"
                    value={outputFormat}
                    onChange={(event) => handleOutputFormatChange(event.target.value as ExportVideoFormat)}>
                    <NativeSelectOption value="mp4">MP4</NativeSelectOption>
                    <NativeSelectOption value="webm">WebM</NativeSelectOption>
                  </NativeSelect>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="export-start-frame">Start frame</Label>
                    <Input
                      id="export-start-frame"
                      type="number"
                      min={0}
                      max={frameCount - 1}
                      value={startFrameDraft}
                      onFocus={() => setPreviewFrame(Number.parseInt(startFrameDraft, 10) || spec.startFrame)}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setStartFrameDraft(nextValue);
                        const parsedValue = Number.parseInt(nextValue, 10);
                        if (Number.isFinite(parsedValue)) {
                          setPreviewFrame(parsedValue);
                        }
                      }}
                      onBlur={() => commitFrameBoundary("startFrame", startFrameDraft)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="export-end-frame">End frame</Label>
                    <Input
                      id="export-end-frame"
                      type="number"
                      min={0}
                      max={frameCount - 1}
                      value={endFrameDraft}
                      onFocus={() => setPreviewFrame(Number.parseInt(endFrameDraft, 10) || spec.endFrame)}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setEndFrameDraft(nextValue);
                        const parsedValue = Number.parseInt(nextValue, 10);
                        if (Number.isFinite(parsedValue)) {
                          setPreviewFrame(parsedValue);
                        }
                      }}
                      onBlur={() => commitFrameBoundary("endFrame", endFrameDraft)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-neutral-600">
                  <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                    <div className="font-medium text-neutral-900">Duration</div>
                    <div>{durationSeconds.toFixed(2)} s</div>
                  </div>
                  <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                    <div className="font-medium text-neutral-900">Output frames</div>
                    <div>{sampledFrames.length}</div>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
                  <div className="text-sm font-medium text-neutral-900">Capture stage</div>
                  <div className="text-xs text-neutral-600">
                    {spec.stage.width} × {spec.stage.height} px from {spec.stage.sourceWidth} ×{" "}
                    {spec.stage.sourceHeight} px window snapshot
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
                  <div className="text-sm font-medium text-neutral-900">Interface</div>
                  <label className="flex items-start gap-2 text-sm text-neutral-700">
                    <Checkbox
                      checked={spec.showTransientUi}
                      onCheckedChange={(checked) => {
                        setSpec((current) => ({ ...current, showTransientUi: checked === true }));
                        setPanelPreviewVersion((current) => current + 1);
                      }}
                    />
                    <span>Show transient UI like playback controls and dropdown menus</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-neutral-700">
                    <Checkbox
                      checked={spec.showPanelHeaders}
                      onCheckedChange={(checked) => {
                        setSpec((current) => ({ ...current, showPanelHeaders: checked === true }));
                        setPanelPreviewVersion((current) => current + 1);
                      }}
                    />
                    <span>Show panel tab bars and dock headers in the export</span>
                  </label>
                </div>

                {spec.mode === "separate-panels" && (
                  <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
                    <div className="text-sm font-medium text-neutral-900">Panels</div>
                    <div className="space-y-2">
                      {spec.separatePanels.map((panel) => (
                        <label key={panel.panelId} className="flex items-start gap-2 text-sm text-neutral-700">
                          <Checkbox
                            checked={panel.enabled}
                            onCheckedChange={(checked) =>
                              setSpec((current) => ({
                                ...current,
                                separatePanels: current.separatePanels.map((selection) =>
                                  selection.panelId === panel.panelId
                                    ? { ...selection, enabled: checked === true }
                                    : selection
                                ),
                              }))
                            }
                          />
                          <span>{panel.title}</span>
                        </label>
                      ))}
                      {spec.separatePanels.length === 0 && (
                        <div className="text-xs text-neutral-500">
                          Panel list will populate when the preview is ready.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
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
                        ? `${statusLabel}${etaSeconds !== null ? ` • ETA ${formatDuration(etaSeconds)}` : ""}`
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
                  onClick={() => void startRecording()}
                  disabled={status === "recording" || status === "loading" || !previewState}>
                  <Video className="size-4" />
                  {status === "loading"
                    ? "Loading ffmpeg..."
                    : status === "recording"
                      ? `Encoding ${outputFormat.toUpperCase()}...`
                      : spec.mode === "workspace"
                        ? `Export ${outputFormat.toUpperCase()}`
                        : `Export panel ZIP`}
                </Button>
                <Button type="button" variant="outline" onClick={handleDownload} disabled={!downloadUrl}>
                  <Download className="size-4" />
                  {autoDownloaded ? "Downloaded! Download again?" : "Download"}
                </Button>
              </SheetFooter>
            </div>

            <div className="flex min-h-0 flex-1 flex-col bg-neutral-200">
              <div className="flex items-center justify-between border-b border-neutral-300 bg-neutral-100 px-4 py-2 pr-10">
                <div>
                  <div className="text-sm font-medium text-neutral-900">Export Preview</div>
                  <div className="text-xs text-neutral-600">
                    Isolated workspace snapshot. Recording here will not mutate the live app state.
                  </div>
                </div>
                <div className="mr-10 text-right text-xs text-neutral-600">
                  {spec.fps} fps output from {sourceFps.toFixed(0)} fps source
                  <br />
                  scale {spec.scale}x, frames {spec.startFrame}-{spec.endFrame}, {outputFormat.toUpperCase()}
                </div>
              </div>

              <div ref={previewAreaRef} className="relative min-h-0 flex-1 overflow-hidden p-3">
                {previewState ? (
                  <>
                    <WorkspacePreviewSurface
                      visible={spec.mode === "workspace"}
                      stage={spec.stage}
                      initialState={previewState}
                      showTransientUi={spec.showTransientUi}
                      showPanelHeaders={spec.showPanelHeaders}
                      showSeparatePanelPreview={spec.mode === "separate-panels"}
                      separatePanelHost={separatePanelHost}
                      panelDescriptors={panelDescriptors}
                      enabledPanelIds={enabledPanelIds}
                      outputFormat={outputFormat}
                      onPreviewReady={handlePreviewReady}
                    />
                    {spec.mode === "separate-panels" && (
                      <div
                        ref={handleSeparatePanelHostRef}
                        className="absolute inset-3 overflow-hidden rounded-lg border border-neutral-300 bg-transparent"
                      />
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </ExportContext.Provider>
  );
}

function WorkspacePreviewSurface({
  visible,
  stage,
  initialState,
  showTransientUi,
  showPanelHeaders,
  showSeparatePanelPreview,
  separatePanelHost,
  panelDescriptors,
  enabledPanelIds,
  outputFormat,
  onPreviewReady,
}: {
  visible: boolean;
  stage: ExportStageSize;
  initialState: AppState;
  showTransientUi: boolean;
  showPanelHeaders: boolean;
  showSeparatePanelPreview: boolean;
  separatePanelHost: HTMLDivElement | null;
  panelDescriptors: ExportPanelDescriptor[];
  enabledPanelIds: Set<string>;
  outputFormat: ExportVideoFormat;
  onPreviewReady: (store: ViewStore, rootElement: HTMLDivElement) => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewportSize = useElementSize(viewportRef);
  const containedStage = useMemo(() => getContainedStageSize(stage, viewportSize), [stage, viewportSize]);

  return (
    <div
      ref={viewportRef}
      className={
        visible
          ? "absolute inset-3 flex items-center justify-center overflow-hidden"
          : "pointer-events-none absolute top-0 -left-[100000px]"
      }
      style={visible ? undefined : { width: stage.width, height: stage.height }}>
      <div
        className="relative overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm"
        style={{
          width: visible ? containedStage.width : stage.width,
          height: visible ? containedStage.height : stage.height,
        }}>
        <div
          className={visible ? "absolute top-0 left-0" : undefined}
          style={{
            width: stage.width,
            height: stage.height,
            transform: visible ? `scale(${containedStage.scale})` : undefined,
            transformOrigin: "top left",
          }}>
          <ExportPreviewWorkspace
            initialState={initialState}
            showTransientUi={showTransientUi}
            showPanelHeaders={showPanelHeaders}
            showSeparatePanelPreview={showSeparatePanelPreview}
            separatePanelHost={separatePanelHost}
            panelDescriptors={panelDescriptors}
            enabledPanelIds={enabledPanelIds}
            outputFormat={outputFormat}
            onPreviewReady={onPreviewReady}
          />
        </div>
      </div>
    </div>
  );
}

function SeparatePanelPreviewPortal({
  host,
  panels,
  enabledPanelIds,
  showPanelHeaders,
  outputFormat,
}: {
  host: HTMLDivElement;
  panels: ExportPanelDescriptor[];
  enabledPanelIds: Set<string>;
  showPanelHeaders: boolean;
  outputFormat: ExportVideoFormat;
}) {
  return createPortal(
    <div className="flex h-full min-h-0 flex-wrap content-start gap-10 overflow-auto p-3">
      {panels.map((panel) => (
        <SeparatePanelCard
          key={panel.panelId}
          panel={panel}
          enabled={enabledPanelIds.has(panel.panelId)}
          showPanelHeaders={showPanelHeaders}
          outputFormat={outputFormat}
        />
      ))}
      {panels.length === 0 && (
        <div className="text-sm text-neutral-500">
          Panel previews are still loading from the isolated workspace.
        </div>
      )}
    </div>,
    host
  );
}

function SeparatePanelCard({
  panel,
  enabled,
  showPanelHeaders,
  outputFormat,
}: {
  panel: ExportPanelDescriptor;
  enabled: boolean;
  showPanelHeaders: boolean;
  outputFormat: ExportVideoFormat;
}) {
  const panelProps = useMemo(
    () =>
      ({
        api: { id: panel.panelId },
        params: { panelType: panel.panelType },
      }) as IDockviewPanelProps<MagicPanelParams>,
    [panel.panelId, panel.panelType]
  );

  return (
    <div
      data-export-separate-panel-root="true"
      data-export-panel-id={panel.panelId}
      data-export-panel-title={panel.title}
      className={`relative overflow-hidden rounded-xl border border-neutral-300 bg-white shadow-sm transition ${
        enabled ? "opacity-100" : "opacity-35 grayscale"
      }`}
      style={{ width: panel.width, minWidth: panel.width }}>
      {showPanelHeaders && (
        <div className="border-b border-neutral-200 bg-white px-4 py-2">
          <div className="text-sm font-medium text-neutral-900">{panel.title}</div>
          <div className="text-xs text-neutral-500">
            {panel.width} × {panel.height} px • {outputFormat.toUpperCase()}
          </div>
        </div>
      )}
      <div className="relative bg-white" style={{ width: panel.width, height: panel.height }}>
        <MagicPanel {...panelProps} />
        <div className="absolute inset-0 z-10 bg-transparent" />
      </div>
      {!enabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-sm font-medium text-neutral-700">
          Not exporting
        </div>
      )}
    </div>
  );
}

function ExportPreviewWorkspace({
  initialState,
  showTransientUi,
  showPanelHeaders,
  showSeparatePanelPreview,
  separatePanelHost,
  panelDescriptors,
  enabledPanelIds,
  outputFormat,
  onPreviewReady,
}: {
  initialState: AppState;
  showTransientUi: boolean;
  showPanelHeaders: boolean;
  showSeparatePanelPreview: boolean;
  separatePanelHost: HTMLDivElement | null;
  panelDescriptors: ExportPanelDescriptor[];
  enabledPanelIds: Set<string>;
  outputFormat: ExportVideoFormat;
  onPreviewReady: (store: ViewStore, rootElement: HTMLDivElement) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  return (
    <ViewProvider>
      <PlaybackProvider>
        <SliceSelectionProvider>
          <CrossSectionSelectionProvider>
            <ExportRenderModeProvider
              value={{
                showTransientUi,
                showPanelHeaders,
              }}>
              <ExportPreviewWorkspaceInner
                initialState={initialState}
                showPanelHeaders={showPanelHeaders}
                showSeparatePanelPreview={showSeparatePanelPreview}
                separatePanelHost={separatePanelHost}
                panelDescriptors={panelDescriptors}
                enabledPanelIds={enabledPanelIds}
                outputFormat={outputFormat}
                rootRef={rootRef}
                onPreviewReady={onPreviewReady}
              />
            </ExportRenderModeProvider>
          </CrossSectionSelectionProvider>
        </SliceSelectionProvider>
      </PlaybackProvider>
    </ViewProvider>
  );
}

function ExportPreviewWorkspaceInner({
  initialState,
  showPanelHeaders,
  showSeparatePanelPreview,
  separatePanelHost,
  panelDescriptors,
  enabledPanelIds,
  outputFormat,
  rootRef,
  onPreviewReady,
}: {
  initialState: AppState;
  showPanelHeaders: boolean;
  showSeparatePanelPreview: boolean;
  separatePanelHost: HTMLDivElement | null;
  panelDescriptors: ExportPanelDescriptor[];
  enabledPanelIds: Set<string>;
  outputFormat: ExportVideoFormat;
  rootRef: RefObject<HTMLDivElement | null>;
  onPreviewReady: (store: ViewStore, rootElement: HTMLDivElement) => void;
}) {
  const previewStore = useViewStoreRaw();
  const lastReadyRef = useRef<{ store: ViewStore | null; root: HTMLDivElement | null }>({
    store: null,
    root: null,
  });

  useEffect(() => {
    const rootElement = rootRef.current;
    if (!rootElement) return;
    if (lastReadyRef.current.store === previewStore && lastReadyRef.current.root === rootElement) {
      return;
    }
    lastReadyRef.current = { store: previewStore, root: rootElement };
    onPreviewReady(previewStore, rootElement);
  }, [onPreviewReady, previewStore, rootRef]);

  return (
    <div
      ref={rootRef}
      data-export-preview="true"
      className="relative flex h-full min-h-0 overflow-hidden bg-white select-none">
      <style>
        {`
          [data-export-preview="true"],
          [data-export-preview="true"] * {
            cursor: default !important;
          }
          [data-export-preview="true"] [data-slot="tooltip-content"],
          [data-export-preview="true"] [data-slot="popover-content"],
          [data-export-preview="true"] [data-slot="hover-card-content"],
          [data-export-preview="true"] [data-slot="select-content"],
          [data-export-preview="true"] [data-slot="context-menu-content"] {
            display: none !important;
          }
          ${
            showPanelHeaders
              ? ""
              : `[data-export-preview="true"] .dv-groupview > .dv-tabs-and-actions-container,
                 [data-export-preview="true"] .dv-right-actions-container {
                   display: none !important;
                   height: 0 !important;
                   min-height: 0 !important;
                   overflow: hidden !important;
                   border: 0 !important;
                   padding: 0 !important;
                   margin: 0 !important;
                 }`
          }
        `}
      </style>
      <div className="flex min-h-0 flex-1 flex-col bg-neutral-200">
        <View3dWorkspace
          initialState={initialState}
          autoSave={false}
          className="flex min-h-0 flex-1 flex-col bg-neutral-200"
        />
      </div>
      <div className="absolute inset-0 z-[200] bg-transparent" />
      {showSeparatePanelPreview && separatePanelHost
        ? (
          <SeparatePanelPreviewPortal
            host={separatePanelHost}
            panels={panelDescriptors}
            enabledPanelIds={enabledPanelIds}
            showPanelHeaders={showPanelHeaders}
            outputFormat={outputFormat}
          />
        )
        : null}
    </div>
  );
}
