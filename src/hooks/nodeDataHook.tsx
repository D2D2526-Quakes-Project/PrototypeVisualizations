import DataSources from "@/data/index";
import type { BinaryBuilding, BinarySimulation, Building, BuildingAnimationData, Simulation } from "@/lib/types";
import { XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
// import { buildAnimationData, type BuildingAnimationData } from "../lib/parser";
import { fetchWithProgressAndCache } from "@/lib/dataLoader";
import { buildAnimationDataFromBinary } from "@/lib/parser";

export type AnimationDataContextType = {
  animationData: BuildingAnimationData;
  loading: boolean;
  currentBuilding: BinaryBuilding;
  currentSimulation: BinarySimulation;
  loadSelection: (building: BinaryBuilding, simulation: BinarySimulation) => void;
  clearSelection: () => void;
};

const AnimationDataContext = createContext<AnimationDataContextType>(undefined!);

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
  const initializedRef = useRef(false);

  const updateUrl = (building: BinaryBuilding | null, simulation: BinarySimulation | null) => {
    const url = new URL(window.location.href);

    if (building && simulation) {
      url.searchParams.set("building", building.folder);
      url.searchParams.set("simulation", simulation.folder);
    } else {
      url.searchParams.delete("building");
      url.searchParams.delete("simulation");
    }

    window.history.pushState({}, "", url);
  };

  const loadBinaryData = useCallback(async (building: BinaryBuilding, simulation: BinarySimulation) => {
    setLoading(true);
    setError(null);
    setFileProgress({ building: 0, groundMotion: 0 });
    setProgressMessage("");
    setAnimationData(null);

    const abortController = new AbortController();

    const progressRef = { current: { building: 0, displacementLin: 0, groundMotion: 0 } };

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
        /* dispRotBuffer, velLinBuffer, velRotBuffer, accelLinBuffer, accelRotBuffer,*/ gmBuffer,
      ] = await Promise.all([
        fetchWithProgressAndCache(
          resolveUrl(building.building_data, building.folder),
          (p) => {
            progressRef.current.building = p;
            setFileProgress((prev) => ({ ...prev, building: p * 100 }));
          },
          abortController.signal,
        ),
        fetchWithProgressAndCache(
          resolveUrl(simulation.displacementLin, `${building.folder}/${simulation.folder}`),
          (p) => {
            progressRef.current.displacementLin = p;
            setFileProgress((prev) => ({ ...prev, displacementLin: p * 100 }));
          },
          abortController.signal,
        ),
        // Uncomment to load displacement rotation data:
        // simulation.displacementRot ? fetchWithProgressAndCache(
        //   resolveUrl(simulation.displacementRot, `${building.folder}/${simulation.folder}`),
        //   (p) => { progressRef.current.displacementRot = p; updateOverallProgress(); },
        // ) : Promise.resolve(undefined),
        // Uncomment to load velocity data:
        // simulation.velocityLin ? fetchWithProgressAndCache(
        //   resolveUrl(simulation.velocityLin, `${building.folder}/${simulation.folder}`),
        //   (p) => { progressRef.current.velocityLin = p; updateOverallProgress(); },
        // ) : Promise.resolve(undefined),
        // simulation.velocityRot ? fetchWithProgressAndCache(
        //   resolveUrl(simulation.velocityRot, `${building.folder}/${simulation.folder}`),
        //   (p) => { progressRef.current.velocityRot = p; updateOverallProgress(); },
        // ) : Promise.resolve(undefined),
        // Uncomment to load acceleration data:
        // simulation.accelerationLin ? fetchWithProgressAndCache(
        //   resolveUrl(simulation.accelerationLin, `${building.folder}/${simulation.folder}`),
        //   (p) => { progressRef.current.accelerationLin = p; updateOverallProgress(); },
        // ) : Promise.resolve(undefined),
        // simulation.accelerationRot ? fetchWithProgressAndCache(
        //   resolveUrl(simulation.accelerationRot, `${building.folder}/${simulation.folder}`),
        //   (p) => { progressRef.current.accelerationRot = p; updateOverallProgress(); },
        // ) : Promise.resolve(undefined),
        fetchWithProgressAndCache(
          resolveUrl(simulation.groundMotion, `${building.folder}/${simulation.folder}`),
          (p) => {
            progressRef.current.groundMotion = p;
            setFileProgress((prev) => ({ ...prev, groundMotion: p * 100 }));
          },
          abortController.signal,
        ),
      ]);

      if (abortController.signal.aborted) return;

      setProgressMessage("Decompressing & Parsing...");

      // Give the UI a moment to breathe before the heavy parsing starts
      await new Promise((r) => setTimeout(r, 10));

      if (abortController.signal.aborted) return;

      if (buildingBuffer === undefined || gmBuffer === undefined || dispLinBuffer === undefined) return;

      // Pass the ArrayBuffers to your parser
      // Add optional buffers when uncommenting above: dispRotBuffer, velLinBuffer, velRotBuffer, accelLinBuffer, accelRotBuffer
      const built = await buildAnimationDataFromBinary(
        buildingBuffer,
        gmBuffer,
        dispLinBuffer,
        undefined, // dispRotBuffer
        undefined, // velLinBuffer
        undefined, // velRotBuffer
        undefined, // accelLinBuffer
        undefined, // accelRotBuffer
        async (_p: number, msg?: string) => {
          if (abortController.signal.aborted) return;
          if (msg) setProgressMessage(msg);
          await new Promise((r) => setTimeout(r, 0));
        },
      );

      if (abortController.signal.aborted) return;

      setProgressMessage("Done!");
      setAnimationData(built);

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
  }, []);

  const loadSelection = useCallback(
    (building: BinaryBuilding, simulation: BinarySimulation) => {
      setCurrentBuilding(building);
      setCurrentSimulation(simulation);
      setNeedsSelection(false);
      updateUrl(building, simulation);

      const cleanup = loadBinaryData(building, simulation as BinarySimulation);
      return cleanup;
    },
    [loadBinaryData],
  );

  const clearSelection = useCallback(() => {
    setCurrentBuilding(null);
    setCurrentSimulation(null);
    setNeedsSelection(false);
    updateUrl(null, null);
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const params = new URLSearchParams(location.search);
    const building = params.get("building");
    const simulation = params.get("simulation");

    if (building && simulation) {
      const b = DataSources.buildings.find((b) => b.folder === building);
      if (b) {
        const s = b.simulations.find((s: Simulation) => s.folder === simulation);
        if (s) {
          queueMicrotask(() => {
            setCurrentBuilding(b);
            setCurrentSimulation(s);
            loadBinaryData(b, s);
          });
          return;
        }
      }
    }

    queueMicrotask(() => {
      setNeedsSelection(true);
    });
  }, [loadBinaryData]);

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
        <SimulationPickerOverlay onSelect={loadSelection} />
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
      className="fixed inset-0 bg-neutral-300 flex flex-col items-center justify-center z-9999">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-6xl font-bold text-neutral-800 mb-8">
        Quakes
      </motion.div>
      <div className="text-neutral-500">Loading animation data...</div>
      <div className="w-1/2 max-w-lg flex flex-col gap-2">
        {Object.entries(fileProgress).map(([name, p]) => (
          <div key={name} className="flex flex-col">
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span className="capitalize">{name}</span>
              <span>{Math.round(p)}%</span>
            </div>
            <div className="h-2 bg-neutral-400 rounded-lg shadow-md">
              <motion.div initial={{ width: 0 }} animate={{ width: `${p}%` }} className="bg-amber-400 h-full rounded" />
            </div>
          </div>
        ))}
      </div>
      {memory && (
        <div className="w-1/2 max-w-lg flex flex-col gap-1 mt-2">
          <div className="flex justify-between text-xs text-neutral-500">
            <span>Memory</span>
            <span>
              {Math.round(memory.used / 1024 / 1024)} MB / {Math.round(memory.limit / 1024 / 1024)} MB
            </span>
          </div>
          <div className="h-2 bg-neutral-300 rounded-lg inset-shadow-sm">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(memory.used / memory.limit) * 100}%` }}
              className="bg-indigo-200 h-full rounded inset-shadow-sm inset-shadow-indigo-300"
            />
          </div>
        </div>
      )}
      <div className="text-neutral-400 mt-2 text-sm">{progressMessage}</div>
      {error ? <div style={{ padding: 20 }}>Failed to load animation data: {String(error)}</div> : null}
    </motion.div>
  );
}

function SimulationPickerOverlay({
  onSelect,
}: {
  onSelect: (building: BinaryBuilding, simulation: BinarySimulation) => void;
}) {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  return (
    <motion.div
      key="loadingoverlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-neutral-300 flex flex-col items-center justify-center z-9999">
      <div className="flex flex-col items-center h-1/2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-6xl font-bold text-neutral-800 mb-8">
          Quakes
        </motion.div>
        <div className="text-neutral-500 mb-4">Pick your building and simulation to view</div>
        <div className="w-full max-w-sm flex flex-col gap-4">
          {DataSources.buildings.map((b) => {
            // Helper to check if a path is incomplete (starts with "*" but not a URL)
            const isIncomplete = (path: string) => !path.startsWith("http") && path.startsWith("*");

            const incompleteWarning = isIncomplete(b.building_data);
            return (
              <div
                key={b.folder}
                className={`${selectedBuilding == b ? "border-amber-400" : "border-transparent"} border-l-2 px-1 pt-1 pb-3 transition-colors`}>
                <button
                  onClick={() => setSelectedBuilding((ex) => (ex == b ? null : b))}
                  className={`w-full overflow-clip px-4 py-3 flex items-baseline justify-between bg-neutral-200 cursor-pointer rounded hover:bg-neutral-200/50 transition-colors text-left disabled:cursor-not-allowed disabled:opacity-50 ${incompleteWarning ? "incomplete-warning" : ""}`}>
                  <span className="font-semibold text-neutral-800">{b.name}</span>
                  <span>
                    <span className="text-xs text-neutral-400">{b.simulations.length} Simulations</span>
                    <AnimatePresence>
                      {selectedBuilding == b && (
                        <motion.span
                          className="inline-block"
                          initial={{
                            opacity: 0,
                            x: 5,
                            width: 0,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            width: "auto",
                          }}
                          exit={{
                            opacity: 0,
                            x: 5,
                            width: 0,
                          }}
                          transition={{ duration: 0.2, ease: "easeOut" }}>
                          <XIcon className="inline-block size-5 ml-2" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </button>
                <AnimatePresence>
                  {selectedBuilding == b && (
                    <motion.div
                      className="flex flex-col gap-2 origin-top pl-4 pr-1"
                      initial={{
                        height: 0,
                        opacity: 0,
                      }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}>
                      {selectedBuilding.simulations.map((s) => {
                        const isIncomplete = (path: string) => !path.startsWith("http") && path.startsWith("*");

                        const incompleteWarning =
                          isIncomplete(s.displacementLin) ||
                          (s.displacementRot && isIncomplete(s.displacementRot)) ||
                          (s.velocityLin && isIncomplete(s.velocityLin)) ||
                          (s.velocityRot && isIncomplete(s.velocityRot)) ||
                          (s.accelerationLin && isIncomplete(s.accelerationLin)) ||
                          (s.accelerationRot && isIncomplete(s.accelerationRot)) ||
                          isIncomplete(s.groundMotion);
                        return (
                          <button
                            key={s.folder}
                            onClick={() => onSelect(selectedBuilding, s as BinarySimulation)}
                            className={`flex justify-between items-baseline px-2 pt-3 border-b-2 border-black cursor-pointer hover:border-amber-400 transition-colors group ${incompleteWarning ? "incomplete-warning" : ""}`}>
                            <span className="font-medium text-neutral-700">
                              {s.name}
                              <span className="text-xs text-neutral-400 ml-2">
                                {(s.size / 1024 / 1024 / 1024).toFixed(1)} GB
                              </span>
                            </span>
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
