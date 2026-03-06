import DataSources from "@/data/index";
import type { BinaryBuilding, BinarySimulation, BuildingAnimationData, Simulation } from "@/lib/types";
import { CheckIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
// import { buildAnimationData, type BuildingAnimationData } from "../lib/parser";
import { clearCache, fetchWithProgressAndCache } from "@/lib/dataLoader";
import { buildAnimationDataFromBinary } from "@/lib/parser";
import { useViewStoreRaw } from "@/state";
import {
  getSelectionFromCurrentUrlStateOrParams,
  OPTIONAL_DATA_LOAD_OPTION_KEYS,
  type OptionalDataLoadOptions,
} from "@/features/view-3d/lib/statePersistence";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type AnimationDataContextType = {
  animationData: BuildingAnimationData;
  loading: boolean;
  currentBuilding: BinaryBuilding;
  currentSimulation: BinarySimulation;
  loadSelection: (
    building: BinaryBuilding,
    simulation: BinarySimulation,
    options?: Partial<OptionalDataLoadOptions>
  ) => void;
  clearSelection: () => void;
};

const AnimationDataContext = createContext<AnimationDataContextType>(undefined!);

type OptionalDataLoadKey = keyof OptionalDataLoadOptions;

const DEFAULT_OPTIONAL_DATA_LOAD_OPTIONS: OptionalDataLoadOptions = {
  beamData: false,
  hingeData: false,
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
    displacementRot: normalized.displacementRot && available.displacementRot,
    velocityLin: normalized.velocityLin && available.velocityLin,
    velocityRot: normalized.velocityRot && available.velocityRot,
    accelerationLin: normalized.accelerationLin && available.accelerationLin,
    accelerationRot: normalized.accelerationRot && available.accelerationRot,
  };
}

export function useAnimationData() {
  const ctx = useContext(AnimationDataContext);
  if (!ctx) {
    throw new Error("useAnimationData must be used within AnimationDataProvider");
  }
  return ctx;
}

/* Provider that exposes { animationData, loading } */
export function AnimationDataProvider({ children }: { children: React.ReactNode }) {
  const [animationData, setAnimationData] = useState<BuildingAnimationData | null>(null);

  const [currentBuilding, setCurrentBuilding] = useState<BinaryBuilding | null>(null);
  const [currentSimulation, setCurrentSimulation] = useState<BinarySimulation | null>(null);

  const [fileProgress, setFileProgress] = useState<Record<string, number>>({
    building: 0,
    displacementLin: 0,
    groundMotion: 0,
  });
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [needsSelection, setNeedsSelection] = useState(false);
  const [optionalLoadOptions, setOptionalLoadOptions] = useState<OptionalDataLoadOptions>(
    DEFAULT_OPTIONAL_DATA_LOAD_OPTIONS
  );
  const initializedRef = useRef(false);
  const viewStore = useViewStoreRaw();

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
      const optionalLoadsEncoded = OPTIONAL_DATA_LOAD_OPTION_KEYS.map((key) => (optionalLoads[key] ? "1" : "0")).join(
        ""
      );
      url.searchParams.set("optionalLoads", optionalLoadsEncoded);
    } else {
      url.searchParams.delete("building");
      url.searchParams.delete("simulation");
      url.searchParams.delete("optionalLoads");
    }

    window.history.pushState({}, "", url);
  };

  const loadBinaryData = useCallback(
    async (
      building: BinaryBuilding,
      simulation: BinarySimulation,
      requestedOptionalLoads?: Partial<OptionalDataLoadOptions>
    ) => {
      const effectiveOptionalLoads = getEffectiveOptionalDataLoadOptions(building, simulation, requestedOptionalLoads);
      const initialProgress: Record<string, number> = {
        building: 0,
        displacementLin: 0,
        groundMotion: 0,
      };
      if (effectiveOptionalLoads.beamData) {
        initialProgress.beamData = 0;
      }
      if (effectiveOptionalLoads.hingeData) {
        initialProgress.hingeData = 0;
      }
      if (effectiveOptionalLoads.displacementRot) {
        initialProgress.displacementRot = 0;
      }
      if (effectiveOptionalLoads.velocityLin) {
        initialProgress.velocityLin = 0;
      }
      if (effectiveOptionalLoads.velocityRot) {
        initialProgress.velocityRot = 0;
      }
      if (effectiveOptionalLoads.accelerationLin) {
        initialProgress.accelerationLin = 0;
      }
      if (effectiveOptionalLoads.accelerationRot) {
        initialProgress.accelerationRot = 0;
      }

      setLoading(true);
      setError(null);
      setFileProgress(initialProgress);
      setProgressMessage("");
      setAnimationData(null);

      const abortController = new AbortController();

      const progressRef = { current: { ...initialProgress } };

      // Helper to resolve URL - supports both full URLs (http/https) and relative paths
      const resolveUrl = (pathOrUrl: string, folder: string): string => {
        if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
          return pathOrUrl;
        }
        return `/data/${folder}/${pathOrUrl}`;
      };

      try {
        if (abortController.signal.aborted) return;
        setProgressMessage("Initializing download...");

        // Fetch required files (building, displacementLin, groundMotion)
        // Optional files (displacementRot, velocityLin/Rot, accelerationLin/Rot) are commented out
        const [
          buildingBuffer,
          dispLinBuffer,
          dispRotBuffer,
          velLinBuffer,
          velRotBuffer,
          accelLinBuffer,
          accelRotBuffer,
          gmBuffer,
          beamBuffer,
          hingeBuffer,
        ] = await Promise.all([
          fetchWithProgressAndCache(
            resolveUrl(building.building_data, building.folder),
            (p) => {
              progressRef.current.building = p;
              setFileProgress((prev) => ({ ...prev, building: p * 100 }));
            },
            abortController.signal
          ),
          fetchWithProgressAndCache(
            resolveUrl(simulation.displacementLin, `${building.folder}/${simulation.folder}`),
            (p) => {
              progressRef.current.displacementLin = p;
              setFileProgress((prev) => ({ ...prev, displacementLin: p * 100 }));
            },
            abortController.signal
          ),
          effectiveOptionalLoads.displacementRot && simulation.displacementRot
            ? fetchWithProgressAndCache(
                resolveUrl(simulation.displacementRot, `${building.folder}/${simulation.folder}`),
                (p) => {
                  progressRef.current.displacementRot = p;
                  setFileProgress((prev) => ({ ...prev, displacementRot: p * 100 }));
                },
                abortController.signal
              )
            : Promise.resolve(undefined),
          effectiveOptionalLoads.velocityLin && simulation.velocityLin
            ? fetchWithProgressAndCache(
                resolveUrl(simulation.velocityLin, `${building.folder}/${simulation.folder}`),
                (p) => {
                  progressRef.current.velocityLin = p;
                  setFileProgress((prev) => ({ ...prev, velocityLin: p * 100 }));
                },
                abortController.signal
              )
            : Promise.resolve(undefined),
          effectiveOptionalLoads.velocityRot && simulation.velocityRot
            ? fetchWithProgressAndCache(
                resolveUrl(simulation.velocityRot, `${building.folder}/${simulation.folder}`),
                (p) => {
                  progressRef.current.velocityRot = p;
                  setFileProgress((prev) => ({ ...prev, velocityRot: p * 100 }));
                },
                abortController.signal
              )
            : Promise.resolve(undefined),
          effectiveOptionalLoads.accelerationLin && simulation.accelerationLin
            ? fetchWithProgressAndCache(
                resolveUrl(simulation.accelerationLin, `${building.folder}/${simulation.folder}`),
                (p) => {
                  progressRef.current.accelerationLin = p;
                  setFileProgress((prev) => ({ ...prev, accelerationLin: p * 100 }));
                },
                abortController.signal
              )
            : Promise.resolve(undefined),
          effectiveOptionalLoads.accelerationRot && simulation.accelerationRot
            ? fetchWithProgressAndCache(
                resolveUrl(simulation.accelerationRot, `${building.folder}/${simulation.folder}`),
                (p) => {
                  progressRef.current.accelerationRot = p;
                  setFileProgress((prev) => ({ ...prev, accelerationRot: p * 100 }));
                },
                abortController.signal
              )
            : Promise.resolve(undefined),
          fetchWithProgressAndCache(
            resolveUrl(simulation.groundMotion, `${building.folder}/${simulation.folder}`),
            (p) => {
              progressRef.current.groundMotion = p;
              setFileProgress((prev) => ({ ...prev, groundMotion: p * 100 }));
            },
            abortController.signal
          ),
          effectiveOptionalLoads.beamData && building.beamData
            ? fetchWithProgressAndCache(
                resolveUrl(building.beamData, building.folder),
                (p) => {
                  progressRef.current.beamData = p;
                  setFileProgress((prev) => ({ ...prev, beamData: p * 100 }));
                },
                abortController.signal
              )
            : Promise.resolve(undefined),
          effectiveOptionalLoads.hingeData && simulation.hingeData
            ? fetchWithProgressAndCache(
                resolveUrl(simulation.hingeData, `${building.folder}/${simulation.folder}`),
                (p) => {
                  progressRef.current.hingeData = p;
                  setFileProgress((prev) => ({ ...prev, hingeData: p * 100 }));
                },
                abortController.signal
              )
            : Promise.resolve(undefined),
        ]);

        if (abortController.signal.aborted) return;

        setProgressMessage("Decompressing & Parsing...");

        // Give the UI a moment to breathe before the heavy parsing starts
        await new Promise((r) => setTimeout(r, 10));

        if (abortController.signal.aborted) return;

        if (buildingBuffer === undefined || gmBuffer === undefined || dispLinBuffer === undefined) return;

        const built = await buildAnimationDataFromBinary({
          rawBuilding: buildingBuffer,
          rawGM: gmBuffer,
          rawDispLin: dispLinBuffer,
          rawDispRot: dispRotBuffer,
          rawVelLin: velLinBuffer,
          rawVelRot: velRotBuffer,
          rawAccelLin: accelLinBuffer,
          rawAccelRot: accelRotBuffer,
          rawBeamData: beamBuffer,
          rawHinge: hingeBuffer,
          onProgress: async (_p: number, msg?: string) => {
            if (abortController.signal.aborted) return;
            if (msg) setProgressMessage(msg);
            await new Promise((r) => setTimeout(r, 0));
          },
        });

        if (abortController.signal.aborted) return;

        setProgressMessage("Done!");
        setAnimationData(built);
        viewStore.getState().setThresholdsFromPrecomputed(built.precomputed);

        // Short delay so user sees "Done!"
        await new Promise((r) => setTimeout(r, 800));

        if (abortController.signal.aborted) return;

        setLoading(false);
      } catch (err) {
        console.error("Binary Load Error:", err);
        setError(err);
        setLoading(false);
      }

      return () => abortController.abort();
    },
    [viewStore]
  );

  const loadSelection = useCallback(
    (building: BinaryBuilding, simulation: BinarySimulation, options?: Partial<OptionalDataLoadOptions>) => {
      const nextOptionalLoads = normalizeOptionalDataLoadOptions(options ?? optionalLoadOptions);
      setOptionalLoadOptions(nextOptionalLoads);
      setCurrentBuilding(building);
      setCurrentSimulation(simulation);
      setNeedsSelection(false);
      updateUrl(building, simulation, nextOptionalLoads);

      const cleanup = loadBinaryData(building, simulation as BinarySimulation, nextOptionalLoads);
      return cleanup;
    },
    [loadBinaryData, optionalLoadOptions]
  );

  const clearSelection = useCallback(() => {
    setAnimationData(null);
    setCurrentBuilding(null);
    setCurrentSimulation(null);
    setError(null);
    setLoading(false);
    setProgressMessage("");
    setNeedsSelection(true);
    updateUrl(null, null);
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    void (async () => {
      const selection = await getSelectionFromCurrentUrlStateOrParams();

      if (selection) {
        const b = DataSources.buildings.find((item) => item.folder === selection.building);
        if (b) {
          const s = b.simulations.find((item: Simulation) => item.folder === selection.simulation);
          if (s) {
            const restoredOptionalLoads = normalizeOptionalDataLoadOptions(selection.optionalLoads);
            queueMicrotask(() => {
              setOptionalLoadOptions(restoredOptionalLoads);
              setCurrentBuilding(b);
              setCurrentSimulation(s);
              loadBinaryData(b, s, restoredOptionalLoads);
            });
            return;
          }
        }
      }

      queueMicrotask(() => {
        setNeedsSelection(true);
      });
    })();
  }, [loadBinaryData]);

  useEffect(() => {
    const handlePopState = () => {
      // URL params drive selection/state bootstrap; reload to re-hydrate correctly on browser back/forward.
      window.location.reload();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const providerValue = {
    animationData: animationData!,
    loading,
    currentBuilding: currentBuilding!,
    currentSimulation: currentSimulation!,
    loadSelection,
    clearSelection,
  };

  return (
    <AnimatePresence>
      {needsSelection ? (
        <SimulationPickerOverlay onSelect={loadSelection} initialOptionalLoadOptions={optionalLoadOptions} />
      ) : (
        (loading || error != null || needsSelection) && (
          <LoadingOverlay progressMessage={progressMessage} error={error} fileProgress={fileProgress} />
        )
      )}
      {animationData && (
        <AnimationDataContext.Provider key="animationdataprovider" value={providerValue}>
          {children}
        </AnimationDataContext.Provider>
      )}
    </AnimatePresence>
  );
}

function LoadingOverlay({
  progressMessage,
  error,
  fileProgress,
}: {
  progressMessage: string;
  error?: unknown;
  fileProgress: Record<string, number>;
}) {
  let memory = undefined;
  if ("memory" in performance) {
    // @ts-expect-error - performance.memory is not defined in Node
    const limit = performance.memory.jsHeapSizeLimit;
    // @ts-expect-error - performance.memory is not defined in Node
    const used = performance.memory.usedJSHeapSize;
    memory = {
      used: used,
      limit: limit,
    };
  }

  return (
    <motion.div
      key="loadingoverlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-neutral-200">
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-5 text-neutral-400">
        {progressMessage || "Loading..."}
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex w-96 flex-col gap-1.5">
        {Object.entries(fileProgress).map(([name, p]) => (
          <div key={name} className="flex items-center gap-2">
            <span className="text w-32 shrink-0 truncate text-neutral-400 capitalize">{name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-300">
              <div
                style={{ width: `${p}%` }}
                className="h-full rounded-full bg-amber-400 transition-all duration-100 ease-out"
              />
            </div>
            <span className="w-7 shrink-0 text-right text-sm text-neutral-400">{Math.round(p)}%</span>
          </div>
        ))}
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
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-500">
          Failed to load: {String(error)}
        </motion.div>
      ) : null}
    </motion.div>
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

  return (
    <motion.div
      key="simulationpicker"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-9999 overflow-y-auto bg-neutral-200">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-6 cursor-pointer text-6xl font-bold text-neutral-800 select-none"
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
        <div className="mb-5 text-neutral-400">Select a building and simulation</div>

        {/* Building + simulation list */}
        <div className="flex w-full flex-col gap-2">
          {DataSources.buildings.map((b) => {
            const buildingIsExpanded = expandedBuildings.includes(b.folder);
            const incompleteWarning = isCatalogPathIncomplete(b.building_data);
            const totalSimulationBytes = b.simulations.reduce((sum, simulation) => sum + (simulation.size ?? 0), 0);
            const selectedInBuilding = pendingSelection?.building.folder === b.folder;

            return (
              <div
                key={b.folder}
                className={`rounded border transition-colors ${selectedInBuilding ? "border-amber-400/70" : "border-neutral-300"}`}>
                {/* Building row */}
                <button
                  onClick={() => toggleBuilding(b.folder)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded bg-neutral-100/60 px-3 py-2 text-left transition-colors hover:bg-neutral-100 ${incompleteWarning ? "incomplete-warning" : ""}`}>
                  <div className="flex min-w-0 items-baseline gap-3">
                    <span className="text-lg font-medium text-neutral-800">{b.name}</span>
                    {/* <span className="text-[10px] tracking-widest uppercase text-neutral-400">{b.folder}</span> */}
                    <span className="text-sm text-neutral-400">
                      {b.simulations.length} sims · {formatBytes(totalSimulationBytes)}
                    </span>
                  </div>
                  <motion.span
                    animate={{ rotate: buildingIsExpanded ? 90 : 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="shrink-0 text-neutral-400">
                    <ChevronRightIcon className="size-4" />
                  </motion.span>
                </button>

                {/* Simulations */}
                <AnimatePresence>
                  {buildingIsExpanded && (
                    <motion.div
                      className="grid origin-top grid-cols-1 gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}>
                      {b.simulations.map((s) => {
                        const incompleteWarning =
                          isCatalogPathIncomplete(s.displacementLin) ||
                          (s.displacementRot && isCatalogPathIncomplete(s.displacementRot)) ||
                          (s.velocityLin && isCatalogPathIncomplete(s.velocityLin)) ||
                          (s.velocityRot && isCatalogPathIncomplete(s.velocityRot)) ||
                          (s.accelerationLin && isCatalogPathIncomplete(s.accelerationLin)) ||
                          (s.accelerationRot && isCatalogPathIncomplete(s.accelerationRot)) ||
                          isCatalogPathIncomplete(s.groundMotion) ||
                          (s.hingeData && isCatalogPathIncomplete(s.hingeData));
                        const isSelected =
                          pendingSelection?.building.folder === b.folder &&
                          pendingSelection?.simulation.folder === s.folder;
                        const availableDomains = getSimulationCapabilities(s);
                        return (
                          <motion.button
                            key={s.folder}
                            type="button"
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setPendingSelection({ building: b, simulation: s })}
                            className={`cursor-pointer rounded border px-3 py-2 text-left transition-colors ${
                              isSelected
                                ? "border-amber-400 bg-amber-50/90"
                                : "border-neutral-300 bg-white/50 hover:border-amber-300/70 hover:bg-white/80"
                            } ${incompleteWarning ? "incomplete-warning" : ""}`}>
                            {/* Name + size row */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <span
                                  className={`inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-amber-500 bg-amber-400" : "border-neutral-300 bg-white"}`}>
                                  {isSelected ? <CheckIcon className="size-2.5" /> : null}
                                </span>
                                <span className="truncate font-medium text-neutral-800">{s.name}</span>
                              </div>
                              <span className="shrink-0 text-xs text-neutral-400">{formatBytes(s.size)}</span>
                            </div>
                            {/* Capability chips */}
                            <div className="mt-1.5 grid grid-cols-2 gap-1">
                              {Object.entries(availableDomains).map(([cap, available]) => (
                                <span
                                  key={cap}
                                  className="flex w-fit items-center gap-1 rounded-sm border border-neutral-200 bg-neutral-200/50 px-1.5 py-px text-xs text-neutral-500">
                                  {available ? (
                                    <CheckIcon className="size-2.5 text-green-500" />
                                  ) : (
                                    <XIcon className="size-2.5 text-red-500" />
                                  )}
                                  <span className="font-medium whitespace-nowrap text-neutral-800">{cap}</span>
                                </span>
                              ))}
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

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-4 w-full rounded border border-neutral-300 bg-neutral-100/80 px-3 py-2.5">
          <div className="flex flex-col gap-2.5">
            {/* Selection summary + open button */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                {pendingSelection ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text truncate font-medium text-neutral-800">
                      {pendingSelection.building.name} / {pendingSelection.simulation.name}
                    </span>
                    <span className="shrink-0 text-sm text-neutral-400">
                      {formatBytes(pendingSelection.simulation.size)} ·{" "}
                      {countSimulationFiles(pendingSelection.simulation)} files
                    </span>
                  </div>
                ) : (
                  <span className="text-neutral-400">Select a simulation above</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="shrink-0 rounded bg-neutral-800 px-3 py-1.5 font-medium text-neutral-100 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-35"
                  onClick={() => clearCache()}>
                  Clear Cache
                </button>
                <button
                  type="button"
                  disabled={!pendingSelection}
                  onClick={openSelectedSimulation}
                  className="shrink-0 rounded bg-neutral-800 px-3 py-1.5 font-medium text-neutral-100 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-35">
                  Open
                </button>
              </div>
            </div>

            {/* Optional toggles */}
            <div>
              <div className="mb-1.5 flex items-baseline gap-2 text-xs">
                <div className="tracking-widest text-neutral-400 uppercase">Optional data · </div>
                {/* All toggle */}
                <button
                  type="button"
                  disabled={!pendingSelection}
                  onClick={() =>
                    setOptionalLoads((current) => {
                      // Set all to true
                      const all = Object.keys(current).reduce(
                        (acc, key) => {
                          acc[key as keyof OptionalDataLoadOptions] = true;
                          return acc;
                        },
                        {} as Record<keyof typeof current, boolean>
                      );
                      return all;
                    })
                  }
                  className="shrink-0 cursor-pointer text-neutral-600 underline transition-colors hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-35">
                  All
                </button>
                {/* None toggle */}
                <button
                  type="button"
                  disabled={!pendingSelection}
                  onClick={() =>
                    setOptionalLoads((current) => {
                      // Set all to false
                      const all = Object.keys(current).reduce(
                        (acc, key) => {
                          acc[key as keyof OptionalDataLoadOptions] = false;
                          return acc;
                        },
                        {} as Record<keyof typeof current, boolean>
                      );
                      return all;
                    })
                  }
                  className="shrink-0 cursor-pointer text-neutral-600 underline transition-colors hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-35">
                  None
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(OPTIONAL_DATA_LOAD_CONTROL_CONFIG as readonly OptionalDataLoadControlConfig[]).map((control) => {
                  const isAvailable = pendingAvailability ? pendingAvailability[control.key] : false;
                  const enabled = optionalLoads[control.key];
                  const active = enabled && isAvailable;
                  return (
                    <div
                      key={control.key}
                      title={control.description}
                      className={`rounded border px-2 py-0.5 transition-colors select-none ${
                        !pendingSelection || !isAvailable
                          ? "cursor-not-allowed border-neutral-200 text-neutral-300"
                          : active
                            ? "border-amber-400 bg-amber-50 text-amber-800"
                            : "border-neutral-300 text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
                      } flex w-fit items-center gap-1.5`}>
                      <Checkbox
                        id={`${control.key}-checkbox`}
                        disabled={!pendingSelection || !isAvailable}
                        checked={active}
                        onCheckedChange={() =>
                          setOptionalLoads((current) => ({ ...current, [control.key]: !current[control.key] }))
                        }
                        className="data-[state=checked]:border-amber-400 data-[state=checked]:bg-amber-400 dark:data-[state=checked]:bg-amber-400"
                      />
                      <Label className="text-sm" htmlFor={`${control.key}-checkbox`}>
                        {control.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
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
  ].filter(Boolean).length;
}

function getSimulationCapabilities(simulation: BinarySimulation): Record<string, boolean> {
  const capabilities: Record<string, boolean> = {
    Displacement: true,
    "Ground Motion": true,
  };

  if (simulation.displacementRot) capabilities["Rotation"] = true;
  if (simulation.velocityLin || simulation.velocityRot) capabilities["Velocity"] = true;
  if (simulation.accelerationLin || simulation.accelerationRot) capabilities["Acceleration"] = true;
  if (simulation.hingeData) capabilities["Hinge"] = true;
  return capabilities;
}

type OptionalDataLoadControlConfig = {
  key: OptionalDataLoadKey;
  label: string;
  description: string;
};

const OPTIONAL_DATA_LOAD_CONTROL_CONFIG = [
  { key: "beamData", label: "Beam Data", description: "Connectivity + beam mapping support for structural overlays." },
  { key: "hingeData", label: "Hinge Data", description: "Hinge summaries and hinge analysis panels." },
  { key: "displacementRot", label: "Rot. Displacement", description: "Node rotational displacement channels (rad)." },
  { key: "velocityLin", label: "Linear Velocity", description: "Linear velocity channels (in/s)." },
  { key: "velocityRot", label: "Rot. Velocity", description: "Rotational velocity channels (rad/s)." },
  { key: "accelerationLin", label: "Linear Acceleration", description: "Linear acceleration channels (in/s²)." },
  { key: "accelerationRot", label: "Rot. Acceleration", description: "Rotational acceleration channels (rad/s²)." },
] as const satisfies readonly OptionalDataLoadControlConfig[];
