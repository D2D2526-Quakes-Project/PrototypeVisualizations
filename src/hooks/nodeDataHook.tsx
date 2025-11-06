import React, { createContext, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import D_H1_Grid_11 from "../lib/data/D_H1_Grid_11.txt?raw";
import D_H1_Grid_36 from "../lib/data/D_H1_Grid_36.txt?raw";
import D_H2_Grid_11 from "../lib/data/D_H2_Grid_11.txt?raw";
import D_H2_Grid_36 from "../lib/data/D_H2_Grid_36.txt?raw";
import D_V_Grid_11 from "../lib/data/D_V_Grid_11.txt?raw";
import D_V_Grid_36 from "../lib/data/D_V_Grid_36.txt?raw";
import nodeMappingCsv from "../lib/data/node_mapping.txt?raw";
import { BuildingDataParser, type BuildingAnimationData } from "../lib/parser";

const dataFiles = {
  D_H1_Grid_11: D_H1_Grid_11,
  D_H2_Grid_11: D_H2_Grid_11,
  D_V_Grid_11: D_V_Grid_11,
  D_H1_Grid_36: D_H1_Grid_36,
  D_H2_Grid_36: D_H2_Grid_36,
  D_V_Grid_36: D_V_Grid_36,
};

const AnimationDataContext = createContext<BuildingAnimationData>(undefined!);

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
  const [progress, setProgress] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const minVisibleMs = 200;

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    async function load() {
      try {
        // slight tick so UI can mount loader first (optional)
        await new Promise((r) => setTimeout(r, 0));

        // TODO: call setProgress(...) from parser.buildAnimationData
        const parser = new BuildingDataParser();

        const built = parser.buildAnimationData(nodeMappingCsv, dataFiles);

        const elapsed = Date.now() - start;
        const remaining = Math.max(0, minVisibleMs - elapsed);
        await new Promise((r) => setTimeout(r, remaining));

        if (!cancelled) {
          setProgress(100);
          setAnimationData(built);

          await new Promise((r) => setTimeout(r, 200));

          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [minVisibleMs]);

  return (
    <AnimatePresence>
      {(loading || error != null) && <LoadingOverlay progress={progress} error={error} />}
      {animationData && (
        <AnimationDataContext.Provider key="animationdataprovider" value={animationData}>
          {children}
        </AnimationDataContext.Provider>
      )}
    </AnimatePresence>
  );
}

function LoadingOverlay({ progress = 0, error }: { progress: number; error?: unknown }) {
  return (
    <motion.div key="loadingoverlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-neutral-300 flex flex-col items-center justify-center z-9999">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-4xl font-bold text-neutral-800 mb-8">
        Quakes
      </motion.div>
      <div className="text-neutral-500">Loading animation data...</div>
      <div className="w-1/2 max-w-lg h-2 bg-neutral-400 rounded-lg shadow-md">
        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="bg-amber-400 h-full rounded" />
      </div>
      {error ? <div style={{ padding: 20 }}>Failed to load animation data: {String(error)}</div> : null}
    </motion.div>
  );
}
