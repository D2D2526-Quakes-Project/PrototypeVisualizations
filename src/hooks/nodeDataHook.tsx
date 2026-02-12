import type {
  BinaryBuilding,
  BinarySimulation,
  Building,
  CSVSimulation,
  Simulation,
  BuildingAnimationData,
} from "@/lib/types";
import DataSources from "@/data/index";
import { XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
// import { buildAnimationData, type BuildingAnimationData } from "../lib/parser";
import { buildAnimationDataFromBinary } from "@/lib/binaryParser";
import { fetchWithProgressAndCache } from "@/lib/dataLoader";

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

  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [needsSelection, setNeedsSelection] = useState(false);

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
    setProgress(0);
    setProgressMessage("");
    setAnimationData(null);

    const progressMap = {
      building: 0,
      displacement: 0,
      velocity: 0,
      acceleration: 0,
      groundMotion: 0,
    };

    const updateOverallProgress = () => {
      const values = Object.values(progressMap);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;

      // Map 0-100% download to 5-80% of total bar (leaving 20% for parsing)
      setProgress(5 + avg * 75);
      setProgressMessage(`Downloading... ${Math.round(avg * 100)}%`);
    };

    // Helper to resolve URL - supports both full URLs (http/https) and relative paths
    const resolveUrl = (pathOrUrl: string, folder: string): string => {
      if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        return pathOrUrl;
      }
      return `/data/${folder}/${pathOrUrl}`;
    };

    try {
      setProgress(5);
      setProgressMessage("Initializing download...");

      const [buildingBuffer, dispBuffer, /* velBuffer, accelBuffer,*/ gmBuffer] = await Promise.all([
        fetchWithProgressAndCache(resolveUrl(building.building_data, building.folder), (p) => {
          progressMap.building = p;
          updateOverallProgress();
        }),
        fetchWithProgressAndCache(resolveUrl(simulation.displacement, `${building.folder}/${simulation.folder}`), (p) => {
          progressMap.displacement = p;
          updateOverallProgress();
        }),
        // fetchWithProgressAndCache(resolveUrl(simulation.velocity, `${building.folder}/${simulation.folder}`), (p) => {
        //   progressMap.velocity = p;
        //   updateOverallProgress();
        // }),
        // fetchWithProgressAndCache(resolveUrl(simulation.acceleration, `${building.folder}/${simulation.folder}`), (p) => {
        //   progressMap.acceleration = p;
        //   updateOverallProgress();
        // }),
        fetchWithProgressAndCache(resolveUrl(simulation.groundMotion, `${building.folder}/${simulation.folder}`), (p) => {
          progressMap.groundMotion = p;
          updateOverallProgress();
        }),
      ]);

      setProgress(85);
      setProgressMessage("Decompressing & Parsing...");

      // Give the UI a moment to breathe before the heavy parsing starts
      await new Promise((r) => setTimeout(r, 10));

      // Pass the ArrayBuffers to your parser
      const built = await buildAnimationDataFromBinary(
        buildingBuffer,
        gmBuffer,
        dispBuffer,
        undefined,
        undefined,
        // velBuffer,
        // accelBuffer,
        async (p: number, msg?: string) => {
          if (p !== -1) setProgress(85 + p * 0.15);
          if (msg) setProgressMessage(msg);
          await new Promise((r) => setTimeout(r, 0));
        },
      );

      setProgress(100);
      setProgressMessage("Done!");
      setAnimationData(built);

      // Short delay so user sees "Done!"
      await new Promise((r) => setTimeout(r, 200));

      setLoading(false);
    } catch (err) {
      console.error("Binary Load Error:", err);
      setError(err);
      setLoading(false);
    }
  }, []);

  const loadSelection = useCallback(
    (building: BinaryBuilding, simulation: BinarySimulation) => {
      setCurrentBuilding(building);
      setCurrentSimulation(simulation);
      setNeedsSelection(false);
      updateUrl(building, simulation);

      loadBinaryData(building, simulation as BinarySimulation);
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
    const params = new URLSearchParams(location.search);
    const building = params.get("building");
    const simulation = params.get("simulation");

    if (building && simulation) {
      const b = DataSources.buildings.find((b) => b.folder === building);
      if (b && b.data_type === "binary") {
        const s = b.simulations.find((s: Simulation) => s.folder === simulation);
        if (s) {
          setCurrentBuilding(b);
          setCurrentSimulation(s);
          loadBinaryData(b, s);
          return;
        }
      }
    }

    setNeedsSelection(true);
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
          <LoadingOverlay progress={progress} progressMessage={progressMessage} error={error} />
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
  progress,
  progressMessage,
  error,
}: {
  progress: number;
  progressMessage: string;
  error?: unknown;
}) {
  const memory = useMemo(() => {
    if ("memory" in performance) {
      // @ts-expect-error - performance.memory is not defined in Node
      const limit = performance.memory.jsHeapSizeLimit;
      // @ts-expect-error - performance.memory is not defined in Node
      const used = performance.memory.usedJSHeapSize;
      console.log(`Memory: ${Math.round(used / 1024 / 1024)} MB / ${Math.round(limit / 1024 / 1024)} MB`);
      return {
        used: used,
        limit: limit,
      };
    }
    console.log(progress);
    return undefined;
  }, [progress]);

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
      <div className="w-1/2 max-w-lg h-2 bg-neutral-400 rounded-lg shadow-md">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="bg-amber-400 h-full rounded"
        />
      </div>
      {memory && (
        <div className="w-1/2 max-w-lg h-2 bg-neutral-300 rounded-lg inset-shadow-sm mt-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(memory.used / memory.limit) * 100}%` }}
            className="bg-indigo-200 h-full rounded inset-shadow-sm inset-shadow-indigo-300"
          />
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
            const isIncomplete = (path: string) => !path.startsWith('http') && path.startsWith("*");
            
            const incompleteWarning =
              b.data_type === "csv"
                ? isIncomplete(b.height_map) || isIncomplete(b.node_map) || isIncomplete(b.center_map)
                : isIncomplete(b.building_data);
            return (
              <div
                key={b.folder}
                className={`${selectedBuilding == b ? "border-amber-400" : "border-transparent"} border-l-2 px-1 pt-1 pb-3 transition-colors`}>
                <button
                  onClick={() => setSelectedBuilding((ex) => (ex == b ? null : b.data_type === "binary" ? b : null))}
                  disabled={b.data_type === "csv"}
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
                        // Helper to check if a path is incomplete (starts with "*" but not a URL)
                        const isIncomplete = (path: string) => !path.startsWith('http') && path.startsWith("*");
                        
                        let incompleteWarning;
                        if (b.data_type === "csv") {
                          s = s as CSVSimulation;
                          incompleteWarning =
                            isIncomplete(s.groundMotion) ||
                            s.displacementFiles.find((f) => isIncomplete(f)) ||
                            s.velocityFiles.find((f) => isIncomplete(f)) ||
                            s.accelerationFiles.find((f) => isIncomplete(f));
                        } else {
                          s = s as BinarySimulation;
                          incompleteWarning =
                            isIncomplete(s.displacement) ||
                            isIncomplete(s.velocity) ||
                            isIncomplete(s.acceleration) ||
                            isIncomplete(s.groundMotion);
                        }
                        return (
                          <button
                            key={s.folder}
                            onClick={() =>
                              selectedBuilding.data_type === "binary" &&
                              onSelect(selectedBuilding, s as BinarySimulation)
                            }
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
