import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, Film, LoaderCircle, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { canvasToPngBytes, getFfmpegEncoder, type ExportVideoFormat } from "@/features/export/ffmpegEncoder";
import { rasterizeElementToCanvas } from "@/features/export/domCapture";
import { ExportRenderModeProvider } from "@/features/export/renderMode";
import { PlaybackProvider } from "@/features/playback/PlaybackContext";
import { CrossSectionSelectionProvider } from "@/features/view-3d/contexts/visualization/CrossSectionSelectionContext";
import { SliceSelectionProvider } from "@/features/view-3d/contexts/visualization";
import { getCurrentAppStateSnapshot, type AppState } from "@/features/view-3d/lib/statePersistence";
import { View3dWorkspace } from "@/features/view-3d/page";
import { useAnimationData } from "@/lib/useAnimationData";
import { ViewProvider, useViewStoreRaw, type ViewStore } from "@/state";

type ExportQuality = "draft" | "standard" | "high";
type ExportStatus = "idle" | "loading" | "ready" | "recording" | "complete" | "error";

interface VideoExportSpec {
  startFrame: number;
  endFrame: number;
  fps: 15 | 30 | 60;
  scale: 1 | 1.5 | 2;
  showTransientUi: boolean;
  showPanelHeaders: boolean;
}

interface ExportContextValue {
  openExportPanel: () => void;
}

const ExportContext = createContext<ExportContextValue | null>(null);

const QUALITY_PRESETS: Record<ExportQuality, Pick<VideoExportSpec, "fps" | "scale">> = {
  draft: { fps: 15, scale: 1 },
  standard: { fps: 30, scale: 1.5 },
  high: { fps: 60, scale: 2 },
};

function cloneAppState(state: AppState): AppState {
  return JSON.parse(JSON.stringify(state)) as AppState;
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildDefaultSpec(frameIndex: number, totalFrames: number): VideoExportSpec {
  return {
    startFrame: frameIndex,
    endFrame: Math.min(totalFrames - 1, frameIndex + 299),
    fps: QUALITY_PRESETS.standard.fps,
    scale: QUALITY_PRESETS.standard.scale,
    showTransientUi: false,
    showPanelHeaders: false,
  };
}

function buildSampledFrameSequence(
  startFrame: number,
  endFrame: number,
  sourceFps: number,
  outputFps: number
): number[] {
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

function getSourceFrameRate(dt: number): number {
  return dt > 0 ? 1 / dt : 30;
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
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [previewState, setPreviewState] = useState<AppState | null>(null);
  const [quality, setQuality] = useState<ExportQuality>("standard");
  const [spec, setSpec] = useState<VideoExportSpec>(() => buildDefaultSpec(0, 1));
  const [startFrameDraft, setStartFrameDraft] = useState("0");
  const [endFrameDraft, setEndFrameDraft] = useState("0");
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("quake-export.mp4");
  const [outputFormat, setOutputFormat] = useState<ExportVideoFormat>("mp4");
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [ffmpegLoadProgress, setFfmpegLoadProgress] = useState(0);
  const [ffmpegLoadLabel, setFfmpegLoadLabel] = useState("Idle");
  const frameCount = animationData.metadata.frameCount;
  const sourceFps = useMemo(() => getSourceFrameRate(animationData.metadata.dt), [animationData.metadata.dt]);
  const sampledFrames = useMemo(
    () => buildSampledFrameSequence(spec.startFrame, spec.endFrame, sourceFps, spec.fps),
    [spec.endFrame, spec.fps, spec.startFrame, sourceFps]
  );
  const durationSeconds = useMemo(() => sampledFrames.length / spec.fps, [sampledFrames.length, spec.fps]);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const setPreviewFrame = useCallback(
    (frame: number) => {
      previewStoreRef.current?.getState().setFrameIndex(clamp(frame, 0, frameCount - 1));
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
    setQuality("standard");
    setStatus(ffmpegReady ? "ready" : "loading");
    setProgress(0);
    setError(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    const buildingSlug = currentBuilding?.folder ?? "building";
    const simulationSlug = currentSimulation?.folder ?? "simulation";
    setDownloadName(`${buildingSlug}-${simulationSlug}-workspace.${outputFormat}`);
  }, [
    animationData.metadata.frameCount,
    currentBuilding?.folder,
    currentSimulation?.folder,
    downloadUrl,
    ffmpegReady,
    outputFormat,
    store,
  ]);

  const ensureFfmpegReady = useCallback(async () => {
    if (ffmpegReady) return;
    setStatus("loading");
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
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load ffmpeg";
      setStatus("error");
      setError(message);
    }
  }, [ffmpegReady]);

  const openExportPanel = useCallback(() => {
    refreshPreview();
    setIsSheetOpen(true);
    void ensureFfmpegReady();
  }, [ensureFfmpegReady, refreshPreview]);

  const handleQualityChange = useCallback((nextQuality: ExportQuality) => {
    setQuality(nextQuality);
    setSpec((current) => ({
      ...current,
      fps: QUALITY_PRESETS[nextQuality].fps,
      scale: QUALITY_PRESETS[nextQuality].scale,
    }));
  }, []);

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
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, [downloadName, downloadUrl]);

  const handleOutputFormatChange = useCallback(
    (nextFormat: ExportVideoFormat) => {
      setOutputFormat(nextFormat);
      const buildingSlug = currentBuilding?.folder ?? "building";
      const simulationSlug = currentSimulation?.folder ?? "simulation";
      setDownloadName(`${buildingSlug}-${simulationSlug}-workspace.${nextFormat}`);
    },
    [currentBuilding?.folder, currentSimulation?.folder]
  );

  const startRecording = useCallback(async () => {
    if (!previewRootRef.current || !previewStoreRef.current || !previewState) {
      setStatus("error");
      setError("Export preview is still loading. Give it a moment and try again.");
      return;
    }
    if (!ffmpegReady) {
      await ensureFfmpegReady();
    }

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    const previewRoot = previewRootRef.current;
    const previewStore = previewStoreRef.current;
    const exportCanvas = document.createElement("canvas");

    setStatus("recording");
    setProgress(0);
    setError(null);

    try {
      const encoder = await getFfmpegEncoder();
      previewStore.getState().setPlaying(false);
      previewStore.getState().setFrameIndex(sampledFrames[0] ?? spec.startFrame);
      await nextAnimationFrame();
      await nextAnimationFrame();
      const encodedFrames: Uint8Array[] = [];

      for (let index = 0; index < sampledFrames.length; index += 1) {
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
        setProgress(((index + 1) / sampledFrames.length) * 0.7);
        await sleep(0);
      }

      const encodedVideo = await encoder.encodeFrames({
        frames: encodedFrames,
        fps: spec.fps,
        format: outputFormat,
        onProgress: ({ phase, progress: encodeProgress }) => {
          if (phase === "frames") {
            setProgress(encodeProgress * 0.7);
            return;
          }
          if (phase === "encoding") {
            setProgress(0.7 + encodeProgress * 0.28);
            return;
          }
          setProgress(0.99);
        },
      });

      const outputBytes = new Uint8Array(encodedVideo.byteLength);
      outputBytes.set(encodedVideo);
      const blob = new Blob([outputBytes], {
        type: outputFormat === "mp4" ? "video/mp4" : "video/webm",
      });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("complete");
      setProgress(1);
      resetPreviewFrame();
    } catch (recordingError) {
      console.error(recordingError);
      let message;
      if (recordingError instanceof Error) {
        message = recordingError.message;
        console.error(recordingError.cause);
      } else {
        message = "Video export failed";
      }
      setStatus("error");
      setError(message);
    }
  }, [
    downloadUrl,
    ensureFfmpegReady,
    ffmpegReady,
    outputFormat,
    previewState,
    resetPreviewFrame,
    sampledFrames,
    spec.fps,
    spec.scale,
    spec.startFrame,
  ]);

  const contextValue = useMemo<ExportContextValue>(
    () => ({
      openExportPanel,
    }),
    [openExportPanel]
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
            <div className="flex w-[340px] shrink-0 flex-col border-r border-neutral-300 bg-white">
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
                  <Label htmlFor="export-quality">Quality</Label>
                  <NativeSelect
                    id="export-quality"
                    value={quality}
                    onChange={(event) => handleQualityChange(event.target.value as ExportQuality)}>
                    <NativeSelectOption value="draft">Draft (15 fps, 1x)</NativeSelectOption>
                    <NativeSelectOption value="standard">Standard (30 fps, 1.5x)</NativeSelectOption>
                    <NativeSelectOption value="high">High (60 fps, 2x)</NativeSelectOption>
                  </NativeSelect>
                  <div className="text-xs text-neutral-500">
                    Source data runs at {sourceFps.toFixed(0)} fps from dt = {animationData.metadata.dt.toFixed(3)} s.
                  </div>
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
                  <div className="text-sm font-medium text-neutral-900">Interface</div>
                  <label className="flex items-start gap-2 text-sm text-neutral-700">
                    <Checkbox
                      checked={spec.showTransientUi}
                      onCheckedChange={(checked) =>
                        setSpec((current) => ({ ...current, showTransientUi: checked === true }))
                      }
                    />
                    <span>Show transient UI like playback controls, and dropdown menus</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-neutral-700">
                    <Checkbox
                      checked={spec.showPanelHeaders}
                      onCheckedChange={(checked) =>
                        setSpec((current) => ({ ...current, showPanelHeaders: checked === true }))
                      }
                    />
                    <span>Show panel tab bars and dock headers in the export</span>
                  </label>
                </div>

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
                        ? `Recording ${Math.round(progress * 100)}%`
                        : status === "complete"
                          ? "Video ready to download"
                          : status === "error"
                            ? (error ?? "Export failed")
                            : "Preview ready"}
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
                      : `Export ${outputFormat.toUpperCase()}`}
                </Button>
                <Button type="button" variant="outline" onClick={handleDownload} disabled={!downloadUrl}>
                  <Download className="size-4" />
                  Download
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

              <div className="min-h-0 flex-1 p-3">
                {previewState ? (
                  <ExportPreviewWorkspace
                    initialState={previewState}
                    showTransientUi={spec.showTransientUi}
                    showPanelHeaders={spec.showPanelHeaders}
                    onPreviewReady={(nextStore, nextRoot) => {
                      previewStoreRef.current = nextStore;
                      previewRootRef.current = nextRoot;
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </ExportContext.Provider>
  );
}

function ExportPreviewWorkspace({
  initialState,
  showTransientUi,
  showPanelHeaders,
  onPreviewReady,
}: {
  initialState: AppState;
  showTransientUi: boolean;
  showPanelHeaders: boolean;
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
                showTransientUi: showTransientUi,
                showPanelHeaders: showPanelHeaders,
              }}>
              <ExportPreviewWorkspaceInner
                initialState={initialState}
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
  rootRef,
  onPreviewReady,
}: {
  initialState: AppState;
  rootRef: React.RefObject<HTMLDivElement | null>;
  onPreviewReady: (store: ViewStore, rootElement: HTMLDivElement) => void;
}) {
  const previewStore = useViewStoreRaw();

  useEffect(() => {
    const rootElement = rootRef.current;
    if (!rootElement) return;
    onPreviewReady(previewStore, rootElement);
  }, [onPreviewReady, previewStore, rootRef]);

  return (
    <div
      ref={rootRef}
      data-export-preview="true"
      className="relative flex h-full min-h-0 overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-sm select-none">
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
        `}
      </style>
      <View3dWorkspace
        initialState={initialState}
        autoSave={false}
        className="flex min-h-0 flex-1 flex-col bg-neutral-200"
      />
      <div className="absolute inset-0 z-[200] bg-transparent" />
    </div>
  );
}
