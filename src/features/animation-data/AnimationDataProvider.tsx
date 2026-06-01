import DataSources from "@/data/index";
import {
  fetchWithProgressAndCache,
  getProcessedFromCache,
  saveProcessedToCache,
} from "@/features/animation-data/data-loading/dataLoader";
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
} from "@/features/animation-data/data-loading/incrementalData";
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
} from "@/features/animation-data/data-loading/loadingTypes";
import type { BinaryBuilding, BinarySimulation, BuildingAnimationData, Simulation } from "@/lib/types";
import { AnimatePresence } from "motion/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { getSelectionFromCurrentUrl } from "@/lib/urlState";
import { LoadingOverlay } from "./LoadingOverlay";
import { SimulationPickerOverlay } from "./SimulationPickerOverlay";
import { AnimationDataContext } from "./useAnimationData";
import {
  DEFAULT_OPTIONAL_DATA_LOAD_OPTIONS,
  getEffectiveOptionalDataLoadOptions,
  normalizeOptionalDataLoadOptions,
} from "./data-loading/util";
import { useAppStore } from "@/state";
import { BUILT_IN_PROFILE_DEFINITIONS } from "@/state/default";

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

  const activeProfileId = useAppStore((state) => {
    const buildingId = currentBuilding?.folder;
    if (!buildingId) return null;
    return state.activeProfileIds[buildingId];
  });

  const initializedRef = useRef(false);
  const sessionIdRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const workerQueueRef = useRef(Promise.resolve());
  const abortControllersRef = useRef<Partial<Record<DatasetKey, AbortController>>>({});

  useEffect(() => {
    workerRef.current = new Worker(new URL("./data-loading/optionalDataWorker.ts", import.meta.url), {
      type: "module",
    });
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
      key: OptionalDatasetKey | "beamData",
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
            if (key === "hingeData") {
              void loadOptionalDataset(sessionId, building, simulation, "beamData", Promise.resolve(serialized)).catch(
                (error) => {
                  if (sessionIdRef.current !== sessionId) return;
                  updateDatasetState("beamData", {
                    stage: "error",
                    message: "Failed",
                    error: error instanceof Error ? error.message : String(error),
                  });
                }
              );
            }
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

  const profileRequiredDatasetsReady =
    activeProfileId && datasetStates
      ? (() => {
          const profileDef = BUILT_IN_PROFILE_DEFINITIONS.find((d) => d.profileId === activeProfileId);
          if (!profileDef || profileDef.requiredDatasets.length === 0) return true;
          return profileDef.requiredDatasets.every((key) => datasetStates[key]?.stage === "ready");
        })()
      : true;

  const dismissStartupOverlay = useCallback(() => {
    if (!startupReady) return;
    if (!profileRequiredDatasetsReady) return;
    setStartupDismissed(true);
  }, [startupReady, profileRequiredDatasetsReady]);

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

      const queueDataset = (k: DatasetKey) => {
        setDatasetStates((current) =>
          current
            ? {
                ...current,
                [k]: {
                  ...current[k],
                  selected: true,
                  stage: "queued",
                  message: "Queued",
                  error: null,
                  progress: 0,
                },
              }
            : current
        );
      };

      queueDataset(key);
      if (key === "hingeData" && currentBuilding.beamData) {
        queueDataset("beamData");
      }

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
          avgStoryDriftPerFrame: animationData.precomputed.avgStoryDriftPerFrame,
          avgStoryDriftPerStory: animationData.precomputed.avgStoryDriftPerStory,
          peakNodeDisplacement: animationData.precomputed.peakNodeDisplacement,
          peakNodeDisplacementFrame: animationData.precomputed.peakNodeDisplacementFrame,
          peakNodeDisplacementX: animationData.precomputed.peakNodeDisplacementX,
          peakNodeDisplacementY: animationData.precomputed.peakNodeDisplacementY,
          peakNodeDisplacementZ: animationData.precomputed.peakNodeDisplacementZ,
          avgDisplacementPerFrame: animationData.precomputed.avgDisplacementPerFrame,
          avgDisplacementPerStory: animationData.precomputed.avgDisplacementPerStory.data,
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

      if (key === "hingeData" && currentBuilding.beamData) {
        void loadOptionalDataset(
          sessionId,
          currentBuilding,
          currentSimulation,
          "beamData",
          Promise.resolve(requiredSerialized)
        ).catch((error) => {
          if (sessionIdRef.current !== sessionId) return;
          updateDatasetState("beamData", {
            stage: "error",
            message: "Failed",
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
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

  useEffect(() => {
    if (!activeProfileId || !datasetStates || !startupReady) return;

    const profileDef = BUILT_IN_PROFILE_DEFINITIONS.find((d) => d.profileId === activeProfileId);
    if (!profileDef || profileDef.requiredDatasets.length === 0) return;

    const allRequiredReady = profileDef.requiredDatasets.every((key) => datasetStates[key]?.stage === "ready");

    if (!allRequiredReady) {
      setStartupDismissed(false);
      for (const key of profileDef.requiredDatasets) {
        const state = datasetStates[key];
        if (state?.available && state.stage !== "fetching" && state.stage !== "parsing" && state.stage !== "ready") {
          requestDatasetLoad(key);
        }
      }
    }
  }, [activeProfileId, datasetStates, startupReady, requestDatasetLoad]);

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
            canContinue={profileRequiredDatasetsReady}
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
