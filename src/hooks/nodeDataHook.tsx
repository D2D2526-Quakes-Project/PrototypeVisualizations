import type {
  BinaryBuilding,
  BinarySimulation,
  Building,
  CSVBuilding,
  CSVSimulation,
  Simulation,
  BuildingAnimationData,
} from "@/lib/types";
import DataSources from "@public/data/index";
import { XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
// import { buildAnimationData, type BuildingAnimationData } from "../lib/parser";
import { buildAnimationDataFromBinary } from "@/lib/binaryParser";
import { fetchWithProgressAndCache } from "@/lib/dataLoader";

export type AnimationDataContextType = {
  animationData: BuildingAnimationData;
  loading: boolean;
  currentBuilding: Building;
  currentSimulation: Simulation;
  loadSelection: (building: Building, simulation: Simulation) => void;
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

  const [currentBuilding, setCurrentBuilding] = useState<Building | null>(null);
  const [currentSimulation, setCurrentSimulation] = useState<Simulation | null>(null);

  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [needsSelection, setNeedsSelection] = useState(false);

  const updateUrl = (building: Building | null, simulation: Simulation | null) => {
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

  const loadCSVData = useCallback(async (building: CSVBuilding, simulation: CSVSimulation) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressMessage("");
    setAnimationData(null);

    try {
      const buildingFolder = `/data/${building.folder}`;
      const simulationFolder = `/data/${building.folder}/${simulation.folder}`;
      console.log(buildingFolder, simulationFolder);

      // setProgress(5);
      // setProgressMessage("Loading Data");

      // const totalFiles =
      //   4 + simulation.displacementFiles.length + simulation.accelerationFiles.length + simulation.velocityFiles.length;
      // let loadedFiles = 0;
      // function completeFile() {
      //   loadedFiles++;
      //   setProgress(5 + (loadedFiles / totalFiles) * 20);
      //   setProgressMessage("Loading " + loadedFiles + "/" + totalFiles);
      //   // await new Promise((r) => setTimeout(r, 0));
      // }

      // const nodeMappingCsvPromise = fetch(`${buildingFolder}/${building.node_map}`).then(
      //   (r) => (completeFile(), r.text()),
      // );
      // const buildingHeightCsvPromise = fetch(`${buildingFolder}/${building.height_map}`).then(
      //   (r) => (completeFile(), r.text()),
      // );
      // const buildingCenterCsvPromise = fetch(`${buildingFolder}/${building.center_map}`).then(
      //   (r) => (completeFile(), r.text()),
      // );
      // const groundMotionCsvPromise = fetch(`${simulationFolder}/ground_motion.txt`).then(
      //   (r) => (completeFile(), r.text()),
      // );

      // const displacementFilesPromise = Promise.all(
      //   simulation.displacementFiles.map((f) =>
      //     fetch(`${simulationFolder}/Displacements/${f}`)
      //       .then((r) => (completeFile(), r.text()))
      //       .then((text) => ({ filename: f, text })),
      //   ),
      // );
      // const accelerationFilesPromise = Promise.all(
      //   simulation.accelerationFiles.map((f) =>
      //     fetch(`${simulationFolder}/Accelerations/${f}`)
      //       .then((r) => (completeFile(), r.text()))
      //       .then((text) => ({ filename: f, text })),
      //   ),
      // );
      // const velocityFilesPromise = Promise.all(
      //   simulation.velocityFiles.map((f) =>
      //     fetch(`${simulationFolder}/Velocities/${f}`)
      //       .then((r) => (completeFile(), r.text()))
      //       .then((text) => ({ filename: f, text })),
      //   ),
      // );

      // await Promise.all([
      //   nodeMappingCsvPromise,
      //   buildingHeightCsvPromise,
      //   buildingCenterCsvPromise,
      //   groundMotionCsvPromise,
      //   displacementFilesPromise,
      //   accelerationFilesPromise,
      //   velocityFilesPromise,
      // ]);

      // const nodeMappingCsv = await nodeMappingCsvPromise;
      // const groundMotionCsv = await groundMotionCsvPromise;
      // const dataFiles = Object.fromEntries((await displacementFilesPromise).map((f) => [f.filename, f.text]));

      // console.log(dataFiles);

      // await new Promise((r) => setTimeout(r, 0));

      // // const built = await buildAnimationData(
      // //   nodeMappingCsv,
      // //   groundMotionCsv,
      // //   dataFiles,
      // //   async (p: number, msg?: string) => {
      // //     if (p !== -1) setProgress(25 + p * 0.75);
      // //     if (msg) setProgressMessage(msg);
      // //     await new Promise((r) => setTimeout(r, 0));
      // //   },
      // // );
      // // console.log(built);

      // setProgress(100);
      // setProgressMessage("Done!");
      // // setAnimationData(built);

      // await new Promise((r) => setTimeout(r, 200));

      // setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err);
      setLoading(false);
    }
  }, []);

  const loadBinaryData = useCallback(async (building: BinaryBuilding, simulation: BinarySimulation) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressMessage("");
    setAnimationData(null);

    const progressMap = {
      "building.bld": 0,
      "displacement.bld": 0,
      "velocity.bld": 0,
      "acceleration.bld": 0,
      "ground_motion.bld": 0,
    };

    const updateOverallProgress = () => {
      const values = Object.values(progressMap);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;

      // Map 0-100% download to 5-80% of total bar (leaving 20% for parsing)
      setProgress(5 + avg * 75);
      setProgressMessage(`Downloading... ${Math.round(avg * 100)}%`);

      if ("memory" in performance) {
        // @ts-expect-error - performance.memory is not defined in Node
        const limit = performance.memory.jsHeapSizeLimit;
        // @ts-expect-error - performance.memory is not defined in Node
        const used = performance.memory.usedJSHeapSize;
        console.log(`Memory: ${Math.round(used / 1024 / 1024)} MB / ${Math.round(limit / 1024 / 1024)} MB`);
      }
    };

    try {
      const buildingFolder = `/data/${building.folder}`;
      const simulationFolder = `/data/${building.folder}/${simulation.folder}`;

      setProgress(5);
      setProgressMessage("Initializing download...");

      const [buildingBuffer, dispBuffer, /* velBuffer, accelBuffer,*/ gmBuffer] = await Promise.all([
        fetchWithProgressAndCache(`${buildingFolder}/${building.building_data}`, (p) => {
          progressMap["building.bld"] = p;
          updateOverallProgress();
        }),
        fetchWithProgressAndCache(`${simulationFolder}/${simulation.displacement}`, (p) => {
          progressMap["displacement.bld"] = p;
          updateOverallProgress();
        }),
        // fetchWithProgressAndCache(`${simulationFolder}/${simulation.velocity}`, (p) => {
        //   progressMap["velocity.bld"] = p;
        //   updateOverallProgress();
        // }),
        // fetchWithProgressAndCache(`${simulationFolder}/${simulation.acceleration}`, (p) => {
        //   progressMap["acceleration.bld"] = p;
        //   updateOverallProgress();
        // }),
        fetchWithProgressAndCache(`${simulationFolder}/${simulation.groundMotion}`, (p) => {
          progressMap["ground_motion.bld"] = p;
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
    (building: Building, simulation: Simulation) => {
      setCurrentBuilding(building);
      setCurrentSimulation(simulation);
      setNeedsSelection(false);
      updateUrl(building, simulation);

      if (building.data_type === "csv") {
        loadCSVData(building, simulation as CSVSimulation);
      } else {
        loadBinaryData(building, simulation as BinarySimulation);
      }
    },
    [loadBinaryData, loadCSVData],
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
      if (b) {
        const s = b.simulations.find((s: Simulation) => s.folder === simulation);
        if (s) {
          setCurrentBuilding(b);
          setCurrentSimulation(s);
          if (b.data_type === "csv") {
            loadCSVData(b, s as CSVSimulation);
          } else {
            loadBinaryData(b, s as BinarySimulation);
          }
          return;
        }
      }
    }

    setNeedsSelection(true);
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
      <div className="text-neutral-400 mt-2 text-sm">{progressMessage}</div>
      {error ? <div style={{ padding: 20 }}>Failed to load animation data: {String(error)}</div> : null}
    </motion.div>
  );
}

function SimulationPickerOverlay({ onSelect }: { onSelect: (building: Building, simulation: Simulation) => void }) {
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
            const incompleteWarning =
              b.data_type === "csv"
                ? b.height_map.includes("*") || b.node_map.includes("*") || b.center_map.includes("*")
                : b.building_data.includes("*");
            return (
              <div
                key={b.folder}
                className={`${selectedBuilding == b ? "border-amber-400" : "border-transparent"} border-l-2 px-1 pt-1 pb-3 transition-colors`}>
                <button
                  onClick={() => setSelectedBuilding((ex) => (ex == b ? null : b))}
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
                        let incompleteWarning;
                        if (b.data_type === "csv") {
                          s = s as CSVSimulation;
                          incompleteWarning =
                            s.groundMotion.includes("*") ||
                            s.displacementFiles.find((f) => f.includes("*")) ||
                            s.velocityFiles.find((f) => f.includes("*")) ||
                            s.accelerationFiles.find((f) => f.includes("*"));
                        } else {
                          s = s as BinarySimulation;
                          incompleteWarning =
                            s.displacement.includes("*") ||
                            s.velocity.includes("*") ||
                            s.acceleration.includes("*") ||
                            s.groundMotion.includes("*");
                        }
                        return (
                          <button
                            key={s.folder}
                            onClick={() => onSelect(selectedBuilding, s)}
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
