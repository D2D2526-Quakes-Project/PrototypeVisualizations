import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { buildAnimationData, type BuildingAnimationData } from "../lib/parser";
import { data, useLocation } from "react-router";
import { dataSources, type Building, type Simulation } from "@public/data";
import { XIcon } from "lucide-react";

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

  const loadData = useCallback(async (building: Building, simulation: Simulation) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressMessage("");
    setAnimationData(null);

    try {
      const buildingFolder = `/data/${building.folder}`;
      const simulationFolder = `/data/${building.folder}/${simulation.folder}`;

      setProgress(5);
      setProgressMessage("Loading Data");

      const totalFiles = 4 + simulation.displacementFiles.length + simulation.accelerationFiles.length + simulation.velocityFiles.length;
      let loadedFiles = 0;
      function completeFile() {
        loadedFiles++;
        setProgress(5 + (loadedFiles / totalFiles) * 20);
        setProgressMessage("Loading " + loadedFiles + "/" + totalFiles);
        // await new Promise((r) => setTimeout(r, 0));
      }

      const nodeMappingCsvPromise = fetch(`${buildingFolder}/${building.node_map}`).then((r) => (completeFile(), r.text()));
      const buildingHeightCsvPromise = fetch(`${buildingFolder}/${building.height_map}`).then((r) => (completeFile(), r.text()));
      const buildingCenterCsvPromise = fetch(`${buildingFolder}/${building.center_map}`).then((r) => (completeFile(), r.text()));
      const groundMotionCsvPromise = fetch(`${simulationFolder}/ground_motion.txt`).then((r) => (completeFile(), r.text()));

      const displacementFilesPromise = Promise.all(
        simulation.displacementFiles.map((f) =>
          fetch(`${simulationFolder}/Displacements/${f}`)
            .then((r) => (completeFile(), r.text()))
            .then((text) => ({ filename: f, text }))
        )
      );
      const accelerationFilesPromise = Promise.all(
        simulation.accelerationFiles.map((f) =>
          fetch(`${simulationFolder}/Accelerations/${f}`)
            .then((r) => (completeFile(), r.text()))
            .then((text) => ({ filename: f, text }))
        )
      );
      const velocityFilesPromise = Promise.all(
        simulation.velocityFiles.map((f) =>
          fetch(`${simulationFolder}/Velocities/${f}`)
            .then((r) => (completeFile(), r.text()))
            .then((text) => ({ filename: f, text }))
        )
      );

      await Promise.all([nodeMappingCsvPromise, buildingHeightCsvPromise, buildingCenterCsvPromise, groundMotionCsvPromise, displacementFilesPromise, accelerationFilesPromise, velocityFilesPromise]);

      const nodeMappingCsv = await nodeMappingCsvPromise;
      const buildingHeightCsv = await buildingHeightCsvPromise;
      const buildingCenterCsv = await buildingCenterCsvPromise;
      const groundMotionCsv = await groundMotionCsvPromise;
      const dataFiles = Object.fromEntries((await displacementFilesPromise).map((f) => [f.filename, f.text]));

      console.log(dataFiles);

      await new Promise((r) => setTimeout(r, 0));

      const built = await buildAnimationData(nodeMappingCsv, groundMotionCsv, dataFiles, async (p: number, msg?: string) => {
        if (p !== -1) setProgress(25 + p * 0.75);
        if (msg) setProgressMessage(msg);
        await new Promise((r) => setTimeout(r, 0));
      });
      console.log(built);

      setProgress(100);
      setProgressMessage("Done!");
      setAnimationData(built);

      await new Promise((r) => setTimeout(r, 200));

      setLoading(false);
    } catch (err) {
      console.error(err);
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
      loadData(building, simulation);
    },
    [loadData]
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
      const b = dataSources.buildings.find((b) => b.folder === building);
      if (b) {
        const s = b.simulations.find((s) => s.folder === simulation);
        if (s) {
          setCurrentBuilding(b);
          setCurrentSimulation(s);
          loadData(b, s);
          return;
        }
      }
    }

    setNeedsSelection(true);
  }, [dataSources.buildings]);

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
      {needsSelection ? <SimulationPickerOverlay onSelect={loadSelection} /> : (loading || error != null || needsSelection) && <LoadingOverlay progress={progress} progressMessage={progressMessage} error={error} />}
      {animationData && (
        <AnimationDataContext.Provider key="animationdataprovider" value={providerValue}>
          {children}
        </AnimationDataContext.Provider>
      )}
    </AnimatePresence>
  );
}

function LoadingOverlay({ progress, progressMessage, error }: { progress: number; progressMessage: string; error?: unknown }) {
  return (
    <motion.div key="loadingoverlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-neutral-300 flex flex-col items-center justify-center z-9999">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-6xl font-bold text-neutral-800 mb-8">
        Quakes
      </motion.div>
      <div className="text-neutral-500">Loading animation data...</div>
      <div className="w-1/2 max-w-lg h-2 bg-neutral-400 rounded-lg shadow-md">
        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="bg-amber-400 h-full rounded" />
      </div>
      <div className="text-neutral-400 mt-2 text-sm">{progressMessage}</div>
      {error ? <div style={{ padding: 20 }}>Failed to load animation data: {String(error)}</div> : null}
    </motion.div>
  );
}

function SimulationPickerOverlay({ onSelect }: { onSelect: (building: Building, simulation: Simulation) => void }) {
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  return (
    <motion.div key="loadingoverlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-neutral-300 flex flex-col items-center justify-center z-9999">
      <div className="flex flex-col items-center h-1/2">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-6xl font-bold text-neutral-800 mb-8">
          Quakes
        </motion.div>
        <div className="text-neutral-500 mb-4">Pick your building and simulation to view</div>
        <div className="w-full max-w-sm flex flex-col gap-4">
          {dataSources.buildings.map((b) => (
            <div key={b.folder} className={`${selectedBuilding == b ? "border-amber-400" : "border-transparent"} border-l-2 px-1 pt-1 pb-3 transition-colors`}>
              <button onClick={() => setSelectedBuilding((ex) => (ex == b ? null : b))} className={`w-full overflow-clip px-4 py-3 flex items-baseline justify-between bg-neutral-200 cursor-pointer rounded hover:bg-neutral-200/50 transition-colors text-left`}>
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
                    {selectedBuilding.simulations.map((s) => (
                      <button key={s.folder} onClick={() => onSelect(selectedBuilding, s)} className="flex justify-between items-baseline px-2 pt-3 border-b-2 border-black cursor-pointer hover:border-amber-400 transition-colors group">
                        <span className="font-medium text-neutral-700">
                          {s.name}
                          <span className="text-xs text-neutral-400 ml-2">{(s.size / 1024 / 1024 / 1024).toFixed(1)} GB</span>
                        </span>
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
