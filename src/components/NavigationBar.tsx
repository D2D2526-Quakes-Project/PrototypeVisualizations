import { AlertTriangle, Check, LogOutIcon, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import DataSources from "@/data/index";
import { usePlayback } from "@/features/playback/PlaybackContext";
import { useColor, useFloorVisibility } from "@/features/view-3d/contexts/visualization";
import { copyShareableUrlToClipboard } from "@/features/view-3d/lib/statePersistence";
import { OPTIONAL_DATASET_KEYS, type OptionalDatasetKey } from "@/lib/loadingTypes";
import { getMetricConfig } from "@/lib/metrics";
import { useAnimationData } from "@/lib/useAnimationData";
import { formatFixed3 } from "@/lib/utils";
import { useViewStore, useViewStoreRaw } from "@/state";
import { ColorScaleBarTooltip } from "../features/view-3d/components/CanvasWithControls/ColorScaleBar";

export function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const store = useViewStoreRaw();
  const { showAllDefaultFloors } = useFloorVisibility();
  const visibleFloorCount = useViewStore((state) => state.visibleFloors.length);
  const showAllNodes = useViewStore((state) => state.showAllNodes);
  const renderNodes = useViewStore((state) => state.renderNodes);
  const renderFloorSlabs = useViewStore((state) => state.renderFloorSlabs);
  const renderXCrossSectionSlabs = useViewStore((state) => state.renderXCrossSectionSlabs);
  const renderYCrossSectionSlabs = useViewStore((state) => state.renderYCrossSectionSlabs);
  const hiddenNodeCount = useViewStore((state) => state.hiddenNodeIds.length);
  const setRenderNodes = useViewStore((state) => state.setRenderNodes);
  const {
    animationData,
    clearSelection,
    currentBuilding,
    currentSimulation,
    datasetStates,
    requestDatasetLoad,
    retryDatasetLoad,
  } = useAnimationData();
  const { frameIndex } = usePlayback();
  const { currentMetric, metricPaletteOverrides, thresholdHighlighting } = useColor();
  const config = getMetricConfig(currentMetric);

  const [activeMenu, setActiveMenu] = useState("");
  const [isCopyingLink, setIsCopyingLink] = useState(false);

  const backToHome = () => {
    clearSelection();
    navigate("/");
  };

  const copyLink = async () => {
    if (isCopyingLink) return;
    setIsCopyingLink(true);
    setActiveMenu("share");
    await copyShareableUrlToClipboard(store);
    setIsCopyingLink(false);
    setActiveMenu("");
  };

  const clearCurrentSelection = () => {
    store.getState().setSelectedNodes([]);
  };

  const optionalDatasetStates = useMemo(
    () => OPTIONAL_DATASET_KEYS.map((key) => datasetStates[key]).filter((state) => state.available),
    [datasetStates]
  );
  const backgroundLoadingCount = useMemo(
    () => optionalDatasetStates.filter((state) => state.stage === "fetching" || state.stage === "parsing").length,
    [optionalDatasetStates]
  );
  const loadedOptionalCount = useMemo(
    () => optionalDatasetStates.filter((state) => state.stage === "ready").length,
    [optionalDatasetStates]
  );
  const availableOptionalCount = optionalDatasetStates.length;
  const unselectedAvailableCount = useMemo(
    () => optionalDatasetStates.filter((state) => !state.selected && state.stage !== "ready").length,
    [optionalDatasetStates]
  );
  const optionalSummaryProgress = useMemo(() => {
    const activeStates = optionalDatasetStates.filter(
      (state) => state.stage === "fetching" || state.stage === "parsing"
    );
    if (activeStates.length === 0) return 100;
    return activeStates.reduce((sum, state) => sum + state.progress, 0) / activeStates.length;
  }, [optionalDatasetStates]);
  const loadingSummaryLabel = useMemo(() => {
    if (backgroundLoadingCount > 0) {
      return `${backgroundLoadingCount} dataset${backgroundLoadingCount === 1 ? "" : "s"} loading`;
    }
    if (loadedOptionalCount === availableOptionalCount && availableOptionalCount > 0) {
      return `${loadedOptionalCount} datasets loaded`;
    }
    if (loadedOptionalCount > 0 && unselectedAvailableCount > 0) {
      return `${loadedOptionalCount} loaded, ${unselectedAvailableCount} available`;
    }
    return `${unselectedAvailableCount} dataset${unselectedAvailableCount === 1 ? "" : "s"} available`;
  }, [availableOptionalCount, backgroundLoadingCount, loadedOptionalCount, unselectedAvailableCount]);

  const allFloorsHiddenWarning = useMemo(() => {
    const totalFloorCount = animationData?.metadata.storyOrder.length ?? 0;
    if (totalFloorCount === 0) return null;
    if (visibleFloorCount > 0) return null;
    return {
      totalFloorCount,
      restore: () => showAllDefaultFloors(),
    };
  }, [animationData, visibleFloorCount, showAllDefaultFloors]);

  const mostNodesHiddenWarning = useMemo(() => {
    if (hiddenNodeCount < animationData.metadata.nodeCount * 0.75) return null;
    return {
      restore: () => showAllNodes(),
    };
  }, [animationData, hiddenNodeCount, showAllNodes]);

  const allVisibilityHiddenWarning = useMemo(() => {
    if (renderNodes || renderFloorSlabs || renderXCrossSectionSlabs || renderYCrossSectionSlabs) return null;
    return {
      restore: () => {
        setRenderNodes(true);
      },
    };
  }, [renderNodes, renderFloorSlabs, renderXCrossSectionSlabs, renderYCrossSectionSlabs, setRenderNodes]);

  return (
    <div className="grid grid-cols-[auto_auto_auto] items-center gap-3 border-b border-neutral-300 bg-neutral-100">
      <div className="flex h-full min-w-0 items-center justify-start gap-3">
        <Menubar
          className="h-full rounded-none border-none bg-neutral-50/80 pl-2"
          value={activeMenu}
          onValueChange={setActiveMenu}>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                <AnimatedTitle />
              </MenubarItem>
              {location.pathname !== "/" && (
                <MenubarItem onClick={backToHome}>
                  <LogOutIcon className="-scale-x-100" />
                  Return to 3D View
                </MenubarItem>
              )}
              <MenubarItem onClick={backToHome}>
                <LogOutIcon className="-scale-x-100" />
                Exit to Menu
              </MenubarItem>

              <MenubarSub>
                <MenubarSubTrigger>Simulation</MenubarSubTrigger>
                <MenubarSubContent className="w-80 p-2">
                  <DataPicker />
                </MenubarSubContent>
              </MenubarSub>

              <MenubarItem>
                <AlertTriangle />
                Export
              </MenubarItem>
              <MenubarItem>
                <AlertTriangle />
                Add Split View
              </MenubarItem>
              <MenubarItem>
                <AlertTriangle />
                Datasets
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <div className="h-6 w-px shrink-0 rounded-full bg-neutral-300" />

          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onClick={clearCurrentSelection}>Clear Selection</MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <div className="h-6 w-px shrink-0 rounded-full bg-neutral-300" />

          <MenubarMenu value="share">
            <MenubarTrigger>Share</MenubarTrigger>
            <MenubarContent>
              <MenubarItem
                disabled={isCopyingLink}
                onSelect={(event) => {
                  event.preventDefault();
                  void copyLink();
                }}>
                <Share2 />
                {isCopyingLink ? "Copying..." : "Copy Shareable Link"}
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      <div className="flex items-center justify-center gap-2 py-1 text-sm whitespace-nowrap">
        {/* <AnimatedTitle /> */}
        <span className="font-medium">Frame:</span>
        <span className="font-mono">{frameIndex + 1}</span>
        <span className="text-neutral-300">|</span>
        <span className="font-medium">Time:</span>
        <span className="font-mono">{formatFixed3(frameIndex * animationData.metadata.dt)} s</span>
        <span className="text-neutral-300">|</span>
        <div className="font-medium">{config.label}</div>
        <div className="w-full">
          <ColorScaleBarTooltip
            currentMetric={currentMetric}
            metricPaletteOverrides={metricPaletteOverrides}
            thresholdHighlighting={thresholdHighlighting}
            insideLabel
          />
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-end py-1 pr-2">
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <div className="truncate">
            {currentBuilding?.name} / {currentSimulation?.name}
          </div>
          {allFloorsHiddenWarning && (
            <div className="inline-flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] whitespace-nowrap text-amber-800">
              <AlertTriangle size={11} />
              <span>All {allFloorsHiddenWarning.totalFloorCount} floors hidden</span>
              <button
                type="button"
                onClick={allFloorsHiddenWarning.restore}
                className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-amber-900 hover:bg-amber-100">
                Show
              </button>
            </div>
          )}
          {mostNodesHiddenWarning && (
            <div className="inline-flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] whitespace-nowrap text-amber-800">
              <AlertTriangle size={11} />
              <span>All nodes hidden</span>
              <button
                type="button"
                onClick={mostNodesHiddenWarning.restore}
                className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-amber-900 hover:bg-amber-100">
                Show
              </button>
            </div>
          )}
          {allVisibilityHiddenWarning && (
            <div className="inline-flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] whitespace-nowrap text-amber-800">
              <AlertTriangle size={11} />
              <span>All views hidden</span>
              <button
                type="button"
                onClick={allVisibilityHiddenWarning.restore}
                className="rounded border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-amber-900 hover:bg-amber-100">
                Show
              </button>
            </div>
          )}
          {optionalDatasetStates.length > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`inline-flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-[10px] whitespace-nowrap ${
                    backgroundLoadingCount > 0
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-neutral-300 bg-white text-neutral-700"
                  }`}>
                  {backgroundLoadingCount > 0 ? <AlertTriangle size={11} /> : <Check size={11} />}
                  <span>{loadingSummaryLabel}</span>
                  {backgroundLoadingCount > 0 ? (
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-amber-100">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${optionalSummaryProgress}%` }}
                      />
                    </div>
                  ) : null}
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-sm space-y-2 p-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-neutral-800">Optional dataset loading</div>
                  <div className="text-xs text-neutral-500">
                    Selected datasets continue loading in the background. Unselected datasets can be queued on demand.
                  </div>
                </div>
                <div className="space-y-1.5">
                  {optionalDatasetStates.map((state) => (
                    <div key={state.key} className="rounded border border-neutral-200 bg-white px-2 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-neutral-800">{state.label}</span>
                        <span className="flex items-center gap-2 text-[10px] text-neutral-500">
                          {state.stage === "ready" ? (
                            <>
                              <Check size={11} /> Loaded
                            </>
                          ) : state.stage === "error" ? (
                            "Failed"
                          ) : state.selected ? (
                            state.message
                          ) : (
                            "Available"
                          )}
                          <div className="inline-block items-center justify-between gap-2 text-[10px]">
                            {state.stage === "error" ? (
                              <button
                                type="button"
                                onClick={() => retryDatasetLoad(state.key as OptionalDatasetKey)}
                                className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-neutral-700 hover:bg-neutral-100">
                                Retry
                              </button>
                            ) : state.stage === "idle" || !state.selected ? (
                              <button
                                type="button"
                                onClick={() => requestDatasetLoad(state.key as OptionalDatasetKey)}
                                className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-neutral-700 hover:bg-neutral-100">
                                Load
                              </button>
                            ) : null}
                          </div>
                        </span>
                      </div>
                      <span className="flex items-center gap-2 text-[10px] text-neutral-500">{state.error}</span>
                      {state.stage === "fetching" || state.stage === "parsing" || state.stage === "queued" ? (
                        <div className="mt-1 mb-1 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                          <div
                            className="h-full rounded-full bg-amber-500 transition-all"
                            style={{ width: `${state.progress}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AnimatedTitle() {
  return (
    <span
      className="flex cursor-pointer select-none"
      onClick={() => {
        const letters = document.querySelectorAll("[data-letter]");
        letters.forEach((element, index) => {
          element.classList.remove("animate-wiggle");
          void (element as HTMLElement).offsetWidth;
          setTimeout(() => element.classList.add("animate-wiggle"), index * 50);
        });
      }}>
      {"Quakes".split("").map((letter, index) => (
        <span
          key={index}
          data-letter
          className="animate-wiggle inline-block text-2xl font-bold text-neutral-800"
          style={{ animationDelay: `${index * 50}ms` }}>
          {letter}
        </span>
      ))}
    </span>
  );
}

function DataPicker() {
  const { currentBuilding, currentSimulation, loadSelection, optionalLoadOptions } = useAnimationData();
  const currentValue =
    currentBuilding && currentSimulation ? `${currentBuilding.folder}::${currentSimulation.folder}` : "";

  return (
    <>
      <MenubarRadioGroup
        value={currentValue}
        onValueChange={(value) => {
          const [buildingFolder, simulationFolder] = value.split("::");
          const selectedBuilding = DataSources.buildings.find((item) => item.folder === buildingFolder);
          if (!selectedBuilding) return;

          const selectedSimulation = selectedBuilding.simulations.find((item) => item.folder === simulationFolder);
          if (!selectedSimulation) return;

          loadSelection(selectedBuilding, selectedSimulation, optionalLoadOptions);
        }}>
        {DataSources.buildings.map((building, buildingIndex) => (
          <div key={building.folder}>
            {buildingIndex > 0 ? <MenubarSeparator /> : null}
            <MenubarLabel>{building.name}</MenubarLabel>
            {building.simulations.map((simulation) => (
              <MenubarRadioItem key={simulation.folder} value={`${building.folder}::${simulation.folder}`}>
                {simulation.name}
              </MenubarRadioItem>
            ))}
          </div>
        ))}
      </MenubarRadioGroup>
    </>
  );
}
