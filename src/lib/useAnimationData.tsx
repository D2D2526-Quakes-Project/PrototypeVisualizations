import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import DataSources from "@/data/index";
import {
  clearCache,
  clearProcessedCache,
  fetchWithProgressAndCache,
  getProcessedFromCache,
  saveProcessedToCache,
} from "@/lib/dataLoader";
import {
  buildRequiredSerializedAnimationDataFromRaw,
  createCoreProcessedCacheKey,
  createOptionalProcessedCacheKey,
  mergeOptionalDatasetIntoAnimationData,
  rebuildAnimationDataFromSerializedCore,
  type OptionalWorkerRequest,
  type OptionalWorkerResponse,
  type ProcessedCacheRecord,
  type SerializedOptionalDatasetResult,
  type SerializedRequiredAnimationData,
} from "@/lib/incrementalData";
import {
  DATASET_KEYS,
  DATASET_LABELS,
  getDatasetAvailability,
  isOptionalDatasetKey,
  OPTIONAL_DATASET_KEYS,
  REQUIRED_DATASET_KEYS,
  type DatasetKey,
  type DatasetLoadState,
  type OptionalDataLoadOptions,
  type OptionalDatasetKey,
} from "@/lib/loadingTypes";
import type { BinaryBuilding, BinarySimulation, BuildingAnimationData, Simulation } from "@/lib/types";
import { CheckIcon, ChevronRightIcon, LoaderCircleIcon, TriangleAlertIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getSelectionFromCurrentUrl } from "./urlState";

export type AnimationDataContextType = {
  animationData: BuildingAnimationData;
  loading: boolean;
  startupReady: boolean;
  startupDismissed: boolean;
  startupError: string | null;
  currentBuilding: BinaryBuilding;
  currentSimulation: BinarySimulation;
  optionalLoadOptions: OptionalDataLoadOptions;
  datasetStates: Record<DatasetKey, DatasetLoadState>;
  loadSelection: (
    building: BinaryBuilding,
    simulation: BinarySimulation,
    options?: Partial<OptionalDataLoadOptions>
  ) => void;
  clearSelection: () => void;
  dismissStartupOverlay: () => void;
  requestDatasetLoad: (key: OptionalDatasetKey) => void;
  retryDatasetLoad: (key: OptionalDatasetKey) => void;
};

const AnimationDataContext = createContext<AnimationDataContextType>(undefined!);

type OptionalDataLoadKey = keyof OptionalDataLoadOptions;

const DEFAULT_OPTIONAL_DATA_LOAD_OPTIONS: OptionalDataLoadOptions = {
  beamData: false,
  hingeData: false,
  shearData: false,
  displacementRot: false,
  velocityLin: false,
  velocityRot: false,
  accelerationLin: false,
  accelerationRot: false,
};

function normalizeOptionalDataLoadOptions(options?: Partial<OptionalDataLoadOptions>): OptionalDataLoadOptions {
  return {
    ...DEFAULT_OPTIONAL_DATA_LOAD_OPTIONS,
    ...options,
  };
}

function getAvailableOptionalDataLoadOptions(
  building: BinaryBuilding,
  simulation: BinarySimulation
): OptionalDataLoadOptions {
  return {
    beamData: Boolean(building.beamData),
    hingeData: Boolean(simulation.hingeData),
    shearData: Boolean(simulation.shearData),
    displacementRot: Boolean(simulation.displacementRot),
    velocityLin: Boolean(simulation.velocityLin),
    velocityRot: Boolean(simulation.velocityRot),
    accelerationLin: Boolean(simulation.accelerationLin),
    accelerationRot: Boolean(simulation.accelerationRot),
  };
}

function getEffectiveOptionalDataLoadOptions(
  building: BinaryBuilding,
  simulation: BinarySimulation,
  requested?: Partial<OptionalDataLoadOptions>
): OptionalDataLoadOptions {
  const normalized = normalizeOptionalDataLoadOptions(requested);
  const available = getAvailableOptionalDataLoadOptions(building, simulation);

  return {
    beamData: normalized.beamData && available.beamData,
    hingeData: normalized.hingeData && available.hingeData,
    shearData: normalized.shearData && available.shearData,
    displacementRot: normalized.displacementRot && available.displacementRot,
    velocityLin: normalized.velocityLin && available.velocityLin,
    velocityRot: normalized.velocityRot && available.velocityRot,
    accelerationLin: normalized.accelerationLin && available.accelerationLin,
    accelerationRot: normalized.accelerationRot && available.accelerationRot,
  };
}

function resolveDataUrl(pathOrUrl: string, folder: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  return `/data/${folder}/${pathOrUrl}`;
}

function buildDatasetStates(
  building: BinaryBuilding,
  simulation: BinarySimulation,
  optionalLoads: OptionalDataLoadOptions
): Record<DatasetKey, DatasetLoadState> {
  const availability = getDatasetAvailability(building, simulation);
  return Object.fromEntries(
    DATASET_KEYS.map((key) => {
      const required = (REQUIRED_DATASET_KEYS as readonly string[]).includes(key);
      const selected = required || (isOptionalDatasetKey(key) ? optionalLoads[key] : false);
      return [
        key,
        {
          key,
          label: DATASET_LABELS[key],
          required,
          available: availability[key],
          selected,
          stage: selected && availability[key] ? "queued" : "idle",
          progress: 0,
          message: selected && availability[key] ? "Queued" : availability[key] ? "Not selected" : "Unavailable",
          error: null,
        },
      ];
    })
  ) as Record<DatasetKey, DatasetLoadState>;
}

export function useAnimationData() {
  const ctx = useContext(AnimationDataContext);
  if (!ctx) {
    throw new Error("useAnimationData must be used within AnimationDataProvider");
  }
  return ctx;
}

export function AnimationDataProvider({ children }: { children: React.ReactNode }) {
  const [animationData, setAnimationData] = useState<BuildingAnimationData | null>(null);
  const [currentBuilding, setCurrentBuilding] = useState<BinaryBuilding | null>(null);
  const [currentSimulation, setCurrentSimulation] = useState<BinarySimulation | null>(null);
  const [datasetStates, setDatasetStates] = useState<Record<DatasetKey, DatasetLoadState> | null>(null);
  const [startupReady, setStartupReady] = useState(false);
  const [startupDismissed, setStartupDismissed] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [needsSelection, setNeedsSelection] = useState(false);
  const [optionalLoadOptions, setOptionalLoadOptions] = useState<OptionalDataLoadOptions>(
    DEFAULT_OPTIONAL_DATA_LOAD_OPTIONS
  );
  const initializedRef = useRef(false);
  const sessionIdRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const workerQueueRef = useRef(Promise.resolve());
  const abortControllersRef = useRef<Partial<Record<DatasetKey, AbortController>>>({});

  useEffect(() => {
    workerRef.current = new Worker(new URL("./optionalDataWorker.ts", import.meta.url), { type: "module" });
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const updateUrl = (
    building: BinaryBuilding | null,
    simulation: BinarySimulation | null,
    options?: Partial<OptionalDataLoadOptions>
  ) => {
    const url = new URL(window.location.href);

    if (building && simulation) {
      url.searchParams.set("building", building.folder);
      url.searchParams.set("simulation", simulation.folder);

      const optionalLoads = normalizeOptionalDataLoadOptions(options);
      const optionalLoadsEncoded = OPTIONAL_DATASET_KEYS.map((key) => (optionalLoads[key] ? "1" : "0")).join("");
      url.searchParams.set("optionalLoads", optionalLoadsEncoded);
    } else {
      url.searchParams.delete("building");
      url.searchParams.delete("simulation");
      url.searchParams.delete("optionalLoads");
    }

    window.history.pushState({}, "", url);
  };

  const updateDatasetState = useCallback((key: DatasetKey, patch: Partial<DatasetLoadState>) => {
    setDatasetStates((current) => {
      if (!current?.[key]) return current;
      return {
        ...current,
        [key]: {
          ...current[key],
          ...patch,
        },
      };
    });
  }, []);

  const parseWithWorker = useCallback((request: OptionalWorkerRequest) => {
    const nextJob = workerQueueRef.current.then(
      () =>
        new Promise<SerializedOptionalDatasetResult>((resolve, reject) => {
          const worker = workerRef.current;
          if (!worker) {
            reject(new Error("Optional data worker is not available"));
            return;
          }

          const handleMessage = (event: MessageEvent<OptionalWorkerResponse & { error?: string }>) => {
            worker.removeEventListener("message", handleMessage);
            if (event.data.error) {
              reject(new Error(event.data.error));
              return;
            }
            resolve(event.data.result);
          };

          worker.addEventListener("message", handleMessage, { once: true });
          worker.postMessage(request);
        })
    );

    workerQueueRef.current = nextJob.then(
      () => undefined,
      () => undefined
    );

    return nextJob;
  }, []);

  const cancelOutstandingLoads = useCallback(() => {
    Object.values(abortControllersRef.current).forEach((controller) => controller?.abort());
    abortControllersRef.current = {};
  }, []);

  const loadRequiredCore = useCallback(
    async (sessionId: number, building: BinaryBuilding, simulation: BinarySimulation) => {
      const selectionKey = `${building.folder}::${simulation.folder}`;
      const sourceFingerprint = [
        building.building_data,
        simulation.displacementLin,
        simulation.groundMotion,
        building.building_data_size,
        simulation.size,
      ].join("|");
      const cacheKey = createCoreProcessedCacheKey(selectionKey, sourceFingerprint);
      const cached = await getProcessedFromCache<ProcessedCacheRecord<SerializedRequiredAnimationData>>(cacheKey);

      if (cached?.payload) {
        REQUIRED_DATASET_KEYS.forEach((key) => {
          updateDatasetState(key, {
            stage: "ready",
            progress: 100,
            message: "Loaded from processed cache",
            error: null,
          });
        });
        return cached.payload;
      }

      const buildingController = new AbortController();
      const displacementController = new AbortController();
      const groundController = new AbortController();
      abortControllersRef.current.building = buildingController;
      abortControllersRef.current.displacementLin = displacementController;
      abortControllersRef.current.groundMotion = groundController;

      updateDatasetState("building", { stage: "fetching", message: "Downloading..." });
      updateDatasetState("displacementLin", { stage: "fetching", message: "Downloading..." });
      updateDatasetState("groundMotion", { stage: "fetching", message: "Downloading..." });

      const [rawBuilding, rawDispLin, rawGroundMotion] = await Promise.all([
        fetchWithProgressAndCache(
          resolveDataUrl(building.building_data, building.folder),
          (progress) => {
            if (sessionIdRef.current !== sessionId) return;
            updateDatasetState("building", {
              stage: "fetching",
              progress: progress * 100,
              message: progress >= 1 ? "Downloaded" : "Downloading...",
            });
          },
          buildingController.signal
        ),
        fetchWithProgressAndCache(
          resolveDataUrl(simulation.displacementLin, `${building.folder}/${simulation.folder}`),
          (progress) => {
            if (sessionIdRef.current !== sessionId) return;
            updateDatasetState("displacementLin", {
              stage: "fetching",
              progress: progress * 100,
              message: progress >= 1 ? "Downloaded" : "Downloading...",
            });
          },
          displacementController.signal
        ),
        fetchWithProgressAndCache(
          resolveDataUrl(simulation.groundMotion, `${building.folder}/${simulation.folder}`),
          (progress) => {
            if (sessionIdRef.current !== sessionId) return;
            updateDatasetState("groundMotion", {
              stage: "fetching",
              progress: progress * 100,
              message: progress >= 1 ? "Downloaded" : "Downloading...",
            });
          },
          groundController.signal
        ),
      ]);

      if (!rawBuilding || !rawDispLin || !rawGroundMotion) {
        throw new Error("Required data download was interrupted");
      }

      REQUIRED_DATASET_KEYS.forEach((key) => {
        updateDatasetState(key, {
          stage: "parsing",
          progress: 100,
          message: "Parsing...",
        });
      });

      const serialized = await buildRequiredSerializedAnimationDataFromRaw({
        rawBuilding,
        rawDispLin,
        rawGroundMotion,
      });

      await saveProcessedToCache<ProcessedCacheRecord<SerializedRequiredAnimationData>>(cacheKey, {
        version: 1,
        cacheKey,
        createdAt: Date.now(),
        payload: serialized,
      });

      REQUIRED_DATASET_KEYS.forEach((key) => {
        updateDatasetState(key, {
          stage: "ready",
          progress: 100,
          message: "Ready",
          error: null,
        });
      });

      return serialized;
    },
    [updateDatasetState]
  );

  const loadOptionalDataset = useCallback(
    async (
      sessionId: number,
      building: BinaryBuilding,
      simulation: BinarySimulation,
      key: OptionalDatasetKey,
      requiredPromise: Promise<SerializedRequiredAnimationData>,
      forceRefresh: boolean = false
    ) => {
      if (sessionIdRef.current !== sessionId) return;

      const sourcePath =
        key === "beamData"
          ? building.beamData
          : key === "hingeData"
            ? simulation.hingeData
            : key === "shearData"
              ? simulation.shearData
              : simulation[key];
      if (!sourcePath) return;

      const selectionKey = `${building.folder}::${simulation.folder}`;
      const sourceFingerprint = `${sourcePath}|${simulation.size}|${building.size}`;
      const cacheKey = createOptionalProcessedCacheKey(selectionKey, key, sourceFingerprint);

      updateDatasetState(key, {
        stage: "queued",
        progress: 0,
        message: "Queued",
        selected: true,
        error: null,
      });

      if (!forceRefresh) {
        const cached = await getProcessedFromCache<ProcessedCacheRecord<SerializedOptionalDatasetResult>>(cacheKey);
        if (sessionIdRef.current !== sessionId) return;

        if (cached?.payload) {
          const payload = cached.payload;
          if (payload.key && payload.data && payload.data.length > 0) {
            setAnimationData((current) =>
              current ? mergeOptionalDatasetIntoAnimationData(current, payload) : current
            );
            updateDatasetState(key, {
              stage: "ready",
              progress: 100,
              message: "Loaded from processed cache",
              error: null,
            });
            return;
          }
        }
      }

      const controller = new AbortController();
      abortControllersRef.current[key] = controller;

      updateDatasetState(key, {
        stage: "fetching",
        progress: 0,
        message: "Downloading...",
      });

      const folder = key === "beamData" ? building.folder : `${building.folder}/${simulation.folder}`;
      const rawBuffer = await fetchWithProgressAndCache(
        resolveDataUrl(sourcePath, folder),
        (progress) => {
          if (sessionIdRef.current !== sessionId) return;
          updateDatasetState(key, {
            stage: "fetching",
            progress: progress * 100,
            message: progress >= 1 ? "Downloaded" : "Downloading...",
          });
        },
        controller.signal
      );

      if (!rawBuffer || sessionIdRef.current !== sessionId) return;

      updateDatasetState(key, {
        stage: "parsing",
        progress: 100,
        message: "Parsing...",
      });

      const requiredSerialized = await requiredPromise;
      if (sessionIdRef.current !== sessionId) return;

      const parsed = await parseWithWorker({
        key,
        rawBuffer,
        baseMetadata: requiredSerialized.metadata,
      });

      if (sessionIdRef.current !== sessionId) return;

      await saveProcessedToCache<ProcessedCacheRecord<SerializedOptionalDatasetResult>>(cacheKey, {
        version: 1,
        cacheKey,
        createdAt: Date.now(),
        payload: parsed,
      });

      setAnimationData((current) => (current ? mergeOptionalDatasetIntoAnimationData(current, parsed) : current));
      updateDatasetState(key, {
        stage: "ready",
        progress: 100,
        message: "Ready",
        error: null,
      });
    },
    [parseWithWorker, updateDatasetState]
  );

  const startLoadingSelection = useCallback(
    async (
      sessionId: number,
      building: BinaryBuilding,
      simulation: BinarySimulation,
      optionalLoads: OptionalDataLoadOptions
    ) => {
      setStartupReady(false);
      setStartupDismissed(false);
      setStartupError(null);
      setAnimationData(null);

      const requiredPromise = loadRequiredCore(sessionId, building, simulation);

      try {
        const serialized = await requiredPromise;
        if (sessionIdRef.current !== sessionId) return;

        const built = rebuildAnimationDataFromSerializedCore(serialized);
        setAnimationData(built);
        setStartupReady(true);

        OPTIONAL_DATASET_KEYS.forEach((key) => {
          if (optionalLoads[key]) {
            void loadOptionalDataset(sessionId, building, simulation, key, Promise.resolve(serialized)).catch(
              (error) => {
                if (sessionIdRef.current !== sessionId) return;
                updateDatasetState(key, {
                  stage: "error",
                  message: "Failed",
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            );
          }
        });
      } catch (error) {
        if (sessionIdRef.current !== sessionId) return;

        const message = error instanceof Error ? error.message : String(error);
        setStartupError(message);
        REQUIRED_DATASET_KEYS.forEach((key) => {
          updateDatasetState(key, {
            stage: "error",
            message: "Failed",
            error: message,
          });
        });
      }
    },
    [loadOptionalDataset, loadRequiredCore, updateDatasetState]
  );

  const loadSelection = useCallback(
    (building: BinaryBuilding, simulation: BinarySimulation, options?: Partial<OptionalDataLoadOptions>) => {
      cancelOutstandingLoads();
      sessionIdRef.current += 1;
      const sessionId = sessionIdRef.current;
      const nextOptionalLoads = getEffectiveOptionalDataLoadOptions(
        building,
        simulation,
        options ?? optionalLoadOptions
      );
      setOptionalLoadOptions(nextOptionalLoads);
      setCurrentBuilding(building);
      setCurrentSimulation(simulation);
      setNeedsSelection(false);
      setDatasetStates(buildDatasetStates(building, simulation, nextOptionalLoads));
      updateUrl(building, simulation, nextOptionalLoads);
      void startLoadingSelection(sessionId, building, simulation, nextOptionalLoads);
    },
    [cancelOutstandingLoads, optionalLoadOptions, startLoadingSelection]
  );

  const dismissStartupOverlay = useCallback(() => {
    if (!startupReady) return;
    setStartupDismissed(true);
  }, [startupReady]);

  useEffect(() => {
    if (!startupReady || startupDismissed || !datasetStates) return;

    const selectedOptionalStates = OPTIONAL_DATASET_KEYS.map((key) => datasetStates[key]).filter(
      (state) => state.selected
    );
    const allSelectedOptionalReady = selectedOptionalStates.every((state) => state.stage === "ready");

    if (allSelectedOptionalReady) {
      setStartupDismissed(true);
    }
  }, [datasetStates, startupDismissed, startupReady]);

  const requestDatasetLoad = useCallback(
    (key: OptionalDatasetKey) => {
      if (!currentBuilding || !currentSimulation || !datasetStates?.[key]?.available) return;
      const stage = datasetStates[key].stage;
      if (stage === "fetching" || stage === "parsing" || stage === "ready") return;

      const nextOptionalLoads = {
        ...optionalLoadOptions,
        [key]: true,
      };
      setOptionalLoadOptions(nextOptionalLoads);
      updateUrl(currentBuilding, currentSimulation, nextOptionalLoads);
      setDatasetStates((current) =>
        current
          ? {
              ...current,
              [key]: {
                ...current[key],
                selected: true,
                stage: "queued",
                message: "Queued",
                error: null,
                progress: 0,
              },
            }
          : current
      );

      if (!animationData) return;
      const sessionId = sessionIdRef.current;
      const requiredSerialized: SerializedRequiredAnimationData = {
        metadata: animationData.metadata,
        precomputed: {
          boundingBox: animationData.precomputed.boundingBox,
          storyElevations: animationData.precomputed.storyElevations,
          maxDisplacement: animationData.precomputed.maxDisplacement,
          maxDisplacementX: animationData.precomputed.maxDisplacementX,
          maxDisplacementY: animationData.precomputed.maxDisplacementY,
          maxDisplacementZ: animationData.precomputed.maxDisplacementZ,
          maxStoryDrift: animationData.precomputed.maxStoryDrift,
          groundMotion: animationData.precomputed.groundMotion,
          peakStoryDrift: animationData.precomputed.peakStoryDrift,
          peakStoryDriftFrame: animationData.precomputed.peakStoryDriftFrame,
          peakNodeDisplacement: animationData.precomputed.peakNodeDisplacement,
          peakNodeDisplacementFrame: animationData.precomputed.peakNodeDisplacementFrame,
          peakNodeDisplacementX: animationData.precomputed.peakNodeDisplacementX,
          peakNodeDisplacementY: animationData.precomputed.peakNodeDisplacementY,
          peakNodeDisplacementZ: animationData.precomputed.peakNodeDisplacementZ,
          avgDisplacementPerFrame: animationData.precomputed.avgDisplacementPerFrame,
          avgDisplacementPerStory: animationData.precomputed.avgDisplacementPerStory,
          numCrossSectionsX: animationData.precomputed.numCrossSectionsX,
          numCrossSectionsY: animationData.precomputed.numCrossSectionsY,
        },
        initialPositions: animationData.initialPositions.data,
        displacementLin: animationData.displacementLin.data,
        groundMotion: animationData.groundMotion.data,
        storyDrift: animationData.storyDrift.data,
      };

      void loadOptionalDataset(
        sessionId,
        currentBuilding,
        currentSimulation,
        key,
        Promise.resolve(requiredSerialized)
      ).catch((error) => {
        if (sessionIdRef.current !== sessionId) return;
        updateDatasetState(key, {
          stage: "error",
          message: "Failed",
          error: error instanceof Error ? error.message : String(error),
        });
      });
    },
    [
      animationData,
      currentBuilding,
      currentSimulation,
      datasetStates,
      loadOptionalDataset,
      optionalLoadOptions,
      updateDatasetState,
    ]
  );

  const retryDatasetLoad = useCallback(
    (key: OptionalDatasetKey) => {
      requestDatasetLoad(key);
    },
    [requestDatasetLoad]
  );

  const clearSelection = useCallback(() => {
    cancelOutstandingLoads();
    sessionIdRef.current += 1;
    setAnimationData(null);
    setCurrentBuilding(null);
    setCurrentSimulation(null);
    setDatasetStates(null);
    setStartupReady(false);
    setStartupDismissed(false);
    setStartupError(null);
    setNeedsSelection(true);
    updateUrl(null, null);
  }, [cancelOutstandingLoads]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    void (async () => {
      const selection = await getSelectionFromCurrentUrl();

      if (selection) {
        const building = DataSources.buildings.find((item) => item.folder === selection.building);
        if (building) {
          const simulation = building.simulations.find((item: Simulation) => item.folder === selection.simulation);
          if (simulation) {
            const restoredOptionalLoads = normalizeOptionalDataLoadOptions(selection.optionalLoads);
            queueMicrotask(() => {
              loadSelection(building, simulation, restoredOptionalLoads);
            });
            return;
          }
        }
      }

      queueMicrotask(() => {
        setNeedsSelection(true);
      });
    })();
  }, [loadSelection]);

  useEffect(() => {
    const handlePopState = () => {
      window.location.reload();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const providerValue =
    animationData && currentBuilding && currentSimulation && datasetStates
      ? {
          animationData,
          loading: !startupReady,
          startupReady,
          startupDismissed,
          startupError,
          currentBuilding,
          currentSimulation,
          optionalLoadOptions,
          datasetStates,
          loadSelection,
          clearSelection,
          dismissStartupOverlay,
          requestDatasetLoad,
          retryDatasetLoad,
        }
      : null;

  return (
    <AnimatePresence>
      {needsSelection ? (
        <SimulationPickerOverlay onSelect={loadSelection} initialOptionalLoadOptions={optionalLoadOptions} />
      ) : (
        currentBuilding &&
        currentSimulation &&
        datasetStates &&
        (!startupDismissed || startupError != null) && (
          <LoadingOverlay
            datasetStates={datasetStates}
            startupReady={startupReady}
            startupError={startupError}
            onContinue={dismissStartupOverlay}
            onReturnToMenu={clearSelection}
          />
        )
      )}
      {/* eslint-disable-next-line react-hooks/refs */}
      {providerValue && startupDismissed && (
        <AnimationDataContext.Provider key="animationdataprovider" value={providerValue}>
          {children}
        </AnimationDataContext.Provider>
      )}
    </AnimatePresence>
  );
}

function LoadingOverlay({
  datasetStates,
  startupReady,
  startupError,
  onContinue,
  onReturnToMenu,
}: {
  datasetStates: Record<DatasetKey, DatasetLoadState>;
  startupReady: boolean;
  startupError: string | null;
  onContinue: () => void;
  onReturnToMenu: () => void;
}) {
  const requiredStates = REQUIRED_DATASET_KEYS.map((key) => datasetStates[key]);
  const optionalStates = OPTIONAL_DATASET_KEYS.map((key) => datasetStates[key]).filter((state) => state.selected);
  const requiredProgress = requiredStates.reduce((sum, state) => sum + state.progress, 0) / requiredStates.length;
  const optionalActiveCount = optionalStates.filter((state) => state.stage !== "ready").length;

  let memory = undefined;
  if ("memory" in performance) {
    // @ts-expect-error - performance.memory is not defined in Node
    const limit = performance.memory.jsHeapSizeLimit;
    // @ts-expect-error - performance.memory is not defined in Node
    const used = performance.memory.usedJSHeapSize;
    memory = { used, limit };
  }

  return (
    <motion.div
      key="loadingoverlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-49 flex flex-col items-center justify-center bg-neutral-200">
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-6 cursor-pointer text-6xl font-bold text-neutral-800 select-none"
          onClick={() => {
            const letters = document.querySelectorAll("[data-loader-letter]");
            letters.forEach((el, i) => {
              el.classList.remove("animate-wiggle");
              void (el as HTMLElement).offsetWidth;
              setTimeout(() => el.classList.add("animate-wiggle"), i * 50);
            });
          }}>
          {"Quakes".split("").map((letter, i) => (
            <span
              key={i}
              data-loader-letter
              className="animate-wiggle inline-block"
              style={{ animationDelay: `${i * 50}ms` }}>
              {letter}
            </span>
          ))}
        </motion.div>

        <div className="mb-5 text-center text-neutral-500">
          {startupReady
            ? "Required data is ready. Optional datasets continue loading in the background."
            : "Loading required data for the app..."}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex w-full flex-col gap-1.5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-neutral-800">Required startup datasets</span>
            <span className="text-neutral-500">{Math.round(requiredProgress)}%</span>
          </div>
          <div className="space-y-2">
            {requiredStates.map((state) => (
              <DatasetProgressRow key={state.key} state={state} />
            ))}
          </div>

          {optionalStates.length > 0 ? (
            <>
              <div className="mt-4 mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-800">Selected optional datasets</span>
                <span className="text-neutral-500">
                  {optionalActiveCount === 0 ? "All ready" : `${optionalActiveCount} still loading`}
                </span>
              </div>
              <div className="space-y-2">
                {optionalStates.map((state) => (
                  <DatasetProgressRow key={state.key} state={state} />
                ))}
              </div>
            </>
          ) : null}

          {memory && (
            <div className="mt-1 flex items-center gap-2 border-t border-neutral-300 pt-1">
              <span className="w-28 shrink-0 text-[10px] text-neutral-400">
                Memory — {Math.round(memory.used / 1024 / 1024)}MB
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-300/50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(memory.used / memory.limit) * 100}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="h-full rounded-full bg-indigo-300"
                />
              </div>
            </div>
          )}
        </motion.div>

        {startupReady ? (
          <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <div>
                Some features may remain unavailable until the optional datasets finish loading. Loading continues
                whether or not you enter the app now.
              </div>
            </div>
          </div>
        ) : null}

        {startupError ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Failed to load required data: {startupError}
          </div>
        ) : null}

        {startupReady ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={onReturnToMenu}>
              Return to menu
            </Button>
            <Button onClick={onContinue}>Continue into application</Button>
          </div>
        ) : (
          <div className="mt-4 flex justify-start">
            <Button variant="outline" onClick={onReturnToMenu}>
              Return to menu
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DatasetProgressRow({ state }: { state: DatasetLoadState }) {
  const isError = state.stage === "error";
  const isBusy = state.stage === "fetching" || state.stage === "parsing" || state.stage === "queued";

  return (
    <div className="flex items-center gap-2">
      <span className="w-full max-w-52 shrink-0 truncate text-sm text-neutral-700">{state.label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-300">
        <div
          style={{ width: `${state.progress}%` }}
          className={`h-full rounded-full transition-all duration-150 ${
            isError ? "bg-red-400" : state.stage === "ready" ? "bg-green-400" : "bg-amber-400"
          }`}
        />
      </div>
      <span className="flex w-full max-w-24 shrink-0 justify-end gap-1 text-right text-xs text-neutral-500">
        {isBusy ? state.message : isError ? "Failed" : state.stage === "ready" ? "Ready" : state.message}
        {isBusy ? <LoaderCircleIcon className="size-3.5 animate-spin text-neutral-400" /> : null}
      </span>
    </div>
  );
}

function SimulationPickerOverlay({
  onSelect,
  initialOptionalLoadOptions,
}: {
  onSelect: (
    building: BinaryBuilding,
    simulation: BinarySimulation,
    options?: Partial<OptionalDataLoadOptions>
  ) => void;
  initialOptionalLoadOptions: OptionalDataLoadOptions;
}) {
  const [expandedBuildings, setExpandedBuildings] = useState<string[]>(() =>
    DataSources.buildings.map((b) => b.folder)
  );
  const [pendingSelection, setPendingSelection] = useState<{
    building: BinaryBuilding;
    simulation: BinarySimulation;
  } | null>(null);
  const [optionalLoads, setOptionalLoads] = useState<OptionalDataLoadOptions>(() =>
    normalizeOptionalDataLoadOptions(initialOptionalLoadOptions)
  );

  const toggleBuilding = (buildingFolder: string) => {
    setExpandedBuildings((current) =>
      current.includes(buildingFolder)
        ? current.filter((folder) => folder !== buildingFolder)
        : [...current, buildingFolder]
    );
  };

  const openSelectedSimulation = () => {
    if (!pendingSelection) return;
    onSelect(pendingSelection.building, pendingSelection.simulation, optionalLoads);
  };

  const pendingAvailability = pendingSelection
    ? getAvailableOptionalDataLoadOptions(pendingSelection.building, pendingSelection.simulation)
    : null;

  const totalSimulationBytes = pendingSelection?.simulation.size ?? 0;
  const fileCount = pendingSelection ? countSimulationFiles(pendingSelection.simulation) : 0;

  return (
    <motion.div
      key="simulationpicker"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-49 overflow-y-auto bg-neutral-200">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-1 cursor-pointer text-center text-6xl font-bold text-neutral-800 select-none"
          onClick={() => {
            const letters = document.querySelectorAll("[data-picker-letter]");
            letters.forEach((el, i) => {
              el.classList.remove("animate-wiggle");
              void (el as HTMLElement).offsetWidth;
              setTimeout(() => el.classList.add("animate-wiggle"), i * 50);
            });
          }}>
          {"Quakes".split("").map((letter, i) => (
            <span
              key={i}
              data-picker-letter
              className="animate-wiggle inline-block"
              style={{ animationDelay: `${i * 50}ms` }}>
              {letter}
            </span>
          ))}
        </motion.div>
        <div className="mb-6 text-center text-sm text-neutral-400">Select a building and simulation</div>

        <div className="flex flex-1 items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {DataSources.buildings.map((b) => {
              const buildingIsExpanded = expandedBuildings.includes(b.folder);
              const incompleteWarning = isCatalogPathIncomplete(b.building_data);
              const totalSimBytes = b.simulations.reduce((sum, s) => sum + (s.size ?? 0), 0);
              const selectedInBuilding = pendingSelection?.building.folder === b.folder;

              return (
                <div
                  key={b.folder}
                  className={`rounded-lg border transition-colors ${
                    selectedInBuilding ? "border-amber-400/70" : "border-neutral-300"
                  } ${incompleteWarning ? "incomplete-warning" : ""}`}>
                  <button
                    onClick={() => toggleBuilding(b.folder)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg bg-neutral-100/60 px-3 py-2.5 text-left transition-colors hover:bg-neutral-100 ${incompleteWarning ? "incomplete-warning" : ""}`}>
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="text-base font-medium text-neutral-800">{b.name}</span>
                      <span className="text-xs text-neutral-400">
                        {b.simulations.length} sims · {formatBytes(totalSimBytes)}
                      </span>
                    </div>
                    <motion.span
                      animate={{ rotate: buildingIsExpanded ? 90 : 0 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="shrink-0 text-neutral-400">
                      <ChevronRightIcon className="size-4" />
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {buildingIsExpanded && (
                      <motion.div
                        className="grid origin-top grid-cols-1 gap-1.5 p-1.5 sm:grid-cols-2"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}>
                        {b.simulations.map((s) => {
                          const simIncomplete =
                            isCatalogPathIncomplete(s.displacementLin) ||
                            (s.displacementRot && isCatalogPathIncomplete(s.displacementRot)) ||
                            (s.velocityLin && isCatalogPathIncomplete(s.velocityLin)) ||
                            (s.velocityRot && isCatalogPathIncomplete(s.velocityRot)) ||
                            (s.accelerationLin && isCatalogPathIncomplete(s.accelerationLin)) ||
                            (s.accelerationRot && isCatalogPathIncomplete(s.accelerationRot)) ||
                            isCatalogPathIncomplete(s.groundMotion) ||
                            (s.hingeData && isCatalogPathIncomplete(s.hingeData)) ||
                            (s.shearData && isCatalogPathIncomplete(s.shearData));
                          const isSelected =
                            pendingSelection?.building.folder === b.folder &&
                            pendingSelection?.simulation.folder === s.folder;

                          return (
                            <motion.button
                              key={s.folder}
                              type="button"
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setPendingSelection({ building: b, simulation: s })}
                              className={`cursor-pointer rounded-md border px-3 py-2 text-left transition-colors ${
                                isSelected
                                  ? "border-amber-400 bg-amber-50/90"
                                  : "border-neutral-300 bg-white/50 hover:border-amber-300/70 hover:bg-white/80"
                              } ${simIncomplete ? "incomplete-warning" : ""}`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <span
                                    className={`inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border ${
                                      isSelected ? "border-amber-500 bg-amber-400" : "border-neutral-300 bg-white"
                                    }`}>
                                    {isSelected ? <CheckIcon className="size-2.5" /> : null}
                                  </span>
                                  <span className="truncate text-sm font-medium text-neutral-800">{s.name}</span>
                                </div>
                                <span className="shrink-0 text-xs text-neutral-400">{formatBytes(s.size)}</span>
                              </div>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="sticky top-4 w-48 shrink-0 rounded-lg border border-neutral-300 bg-neutral-100/60 p-2">
            <img className="overflow-hidden rounded-sm bg-contain" src="/stations-map.webp" alt="Station map" />
            <span
              title="Wang, Zijia & Zhang, Wenqiang & Taymaz, Tuncay & He, Zhongqiu & Xu, Tianhong & Zhang, Zhenguo. (2023). Dynamic Rupture Process of the 2023 Mw 7.8 Kahramanmaraş Earthquake (SE Türkiye): Variable Rupture Speed and Implications for Seismic Hazard. Geophysical Research Letters. 50. 10.1029/2023GL104787."
              className="text-xs text-neutral-500 underline">
              Wang, Et. Al. 2023
            </span>
          </div>
        </div>

        <Tooltip disableHoverableContent>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-3 flex items-center gap-3 rounded-lg border border-neutral-300 bg-neutral-100/80 px-3 py-2.5">
              <div className="w-36 shrink-0">
                {pendingSelection ? (
                  <>
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {pendingSelection.building.name} / {pendingSelection.simulation.name}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {formatBytes(totalSimulationBytes)} · {fileCount} files
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-neutral-400">Select a simulation</p>
                )}
              </div>

              <div className="h-8 w-px shrink-0 bg-neutral-300" />

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium tracking-widest text-neutral-400 uppercase">
                    Optional datasets
                  </span>
                  <button
                    type="button"
                    disabled={!pendingSelection}
                    onClick={() =>
                      setOptionalLoads((current) =>
                        Object.keys(current).reduce(
                          (acc, key) => {
                            acc[key as keyof OptionalDataLoadOptions] = true;
                            return acc;
                          },
                          {} as Record<keyof typeof current, boolean>
                        )
                      )
                    }
                    className="text-[10px] text-neutral-500 underline transition-colors hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40">
                    All
                  </button>
                  <button
                    type="button"
                    disabled={!pendingSelection}
                    onClick={() =>
                      setOptionalLoads((current) =>
                        Object.keys(current).reduce(
                          (acc, key) => {
                            acc[key as keyof OptionalDataLoadOptions] = false;
                            return acc;
                          },
                          {} as Record<keyof typeof current, boolean>
                        )
                      )
                    }
                    className="text-[10px] text-neutral-500 underline transition-colors hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40">
                    None
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(OPTIONAL_DATA_LOAD_CONTROL_CONFIG as readonly OptionalDataLoadControlConfig[]).map((control) => {
                    const isAvailable = pendingAvailability ? pendingAvailability[control.key] : false;
                    const enabled = optionalLoads[control.key];
                    const active = enabled && isAvailable;
                    return (
                      <Tooltip key={control.key} disableHoverableContent>
                        <TooltipTrigger asChild>
                          <Label
                            htmlFor={`${control.key}-checkbox`}
                            className={`flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 transition-colors select-none ${
                              !pendingSelection || !isAvailable
                                ? "cursor-not-allowed border-neutral-200 text-neutral-300"
                                : active
                                  ? "border-amber-400 bg-amber-50 text-amber-800"
                                  : "border-neutral-300 text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
                            }`}>
                            <Checkbox
                              id={`${control.key}-checkbox`}
                              disabled={!pendingSelection || !isAvailable}
                              checked={active}
                              onCheckedChange={() => {
                                setOptionalLoads((current) => ({ ...current, [control.key]: !current[control.key] }));
                              }}
                              className="data-[state=checked]:border-amber-400 data-[state=checked]:bg-amber-400 dark:data-[state=checked]:bg-amber-400"
                            />
                            <span className="text-sm">{control.label}</span>
                          </Label>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <div>{control.description}</div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>

              <div className="h-8 w-px shrink-0 bg-neutral-300" />

              {/* Open button */}
              <button
                type="button"
                disabled={!pendingSelection}
                onClick={openSelectedSimulation}
                className="shrink-0 rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-100 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-35">
                Open
              </button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <div className="max-w-xs">
              Optional datasets contain additional data that can be loaded to view additional metrics and analysis
              panels. These can be toggled inside the application aswell.
            </div>
          </TooltipContent>
        </Tooltip>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => clearCache()}
            className="text-left text-[11px] text-neutral-500 underline transition-colors hover:text-neutral-700">
            Clear all cache
          </button>
          <button
            onClick={() => clearProcessedCache()}
            className="text-left text-[11px] text-neutral-500 underline transition-colors hover:text-neutral-700">
            Clear computed cache
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function isCatalogPathIncomplete(path: string) {
  return !path.startsWith("http") && path.startsWith("*");
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = unitIndex >= 2 ? 1 : 0;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function countSimulationFiles(simulation: BinarySimulation) {
  return [
    simulation.displacementLin,
    simulation.displacementRot,
    simulation.velocityLin,
    simulation.velocityRot,
    simulation.accelerationLin,
    simulation.accelerationRot,
    simulation.groundMotion,
    simulation.hingeData,
    simulation.shearData,
  ].filter(Boolean).length;
}

type OptionalDataLoadControlConfig = {
  key: OptionalDataLoadKey;
  label: string;
  description: string;
};

const OPTIONAL_DATA_LOAD_CONTROL_CONFIG = [
  { key: "beamData", label: "Beam", description: "Connectivity + beam mapping support for structural overlays." },
  { key: "hingeData", label: "Hinge", description: "Hinge summaries and hinge analysis panels." },
  { key: "shearData", label: "Shear", description: "Static per-floor column shear summaries (kip)." },
  { key: "displacementRot", label: "Rot. disp.", description: "Node rotational displacement channels (rad)." },
  { key: "velocityLin", label: "Tra. velocity", description: "Translational velocity channels (in/s)." },
  { key: "velocityRot", label: "Rot. velocity", description: "Rotational velocity channels (rad/s)." },
  { key: "accelerationLin", label: "Tra. accel.", description: "Translational acceleration channels (in/s²)." },
  { key: "accelerationRot", label: "Rot. accel.", description: "Rotational acceleration channels (rad/s²)." },
] as const satisfies readonly OptionalDataLoadControlConfig[];
