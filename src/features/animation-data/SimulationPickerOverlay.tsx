import DataSources from "@/data/index";
import { useState } from "react";
import type { OptionalDataLoadOptions } from "./data-loading/loadingTypes";
import { AnimatePresence, motion } from "motion/react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ChevronRightIcon, CheckIcon } from "lucide-react";
import { clearCache, clearProcessedCache } from "./data-loading/dataLoader";
import { getAvailableOptionalDataLoadOptions, normalizeOptionalDataLoadOptions } from "./data-loading/util";
import type { BinaryBuilding, BinarySimulation } from "@/lib/types";

export function SimulationPickerOverlay({
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
            <img className="overflow-hidden rounded-sm bg-contain" src="/stations-map.png" alt="Station map" />
            <span className="text-xs text-neutral-500 italic">U.S. Geological Survey ShakeMap</span>
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
  key: keyof OptionalDataLoadOptions;
  label: string;
  description: string;
};

const OPTIONAL_DATA_LOAD_CONTROL_CONFIG = [
  { key: "hingeData", label: "Beam + Hinge", description: "Beam connectivity + hinge rotation summaries." },
  { key: "shearData", label: "Shear", description: "Static per-floor column shear summaries (kip)." },
  { key: "displacementRot", label: "Rot. disp.", description: "Node rotational displacement channels (rad)." },
  { key: "velocityLin", label: "Tra. velocity", description: "Translational velocity channels (in/s)." },
  { key: "velocityRot", label: "Rot. velocity", description: "Rotational velocity channels (rad/s)." },
  { key: "accelerationLin", label: "Tra. accel.", description: "Translational acceleration channels (in/s²)." },
  { key: "accelerationRot", label: "Rot. accel.", description: "Rotational acceleration channels (rad/s²)." },
] as const satisfies readonly OptionalDataLoadControlConfig[];
