import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRenderModes } from "@/features/3d/lib/useRenderModes";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMetrics } from "@/features/metrics/useMetrics";
import {
  CheckIcon,
  Columns2Icon,
  GridIcon,
  LayersIcon,
  MaximizeIcon,
  MoveHorizontalIcon,
  MoveVerticalIcon,
  Rows2Icon,
  Share2Icon,
  WorkflowIcon,
} from "lucide-react";
import { useMemo } from "react";

export function ViewToggleSection() {
  const { animationData } = useAnimationData();

  const {
    renderNodes,
    setRenderNodes,
    renderFloorSlabs,
    setRenderFloorSlabs,
    renderXCrossSectionSlabs,
    setRenderXCrossSectionSlabs,
    renderYCrossSectionSlabs,
    setRenderYCrossSectionSlabs,
    showCornersOnly,
    setShowCornersOnly,
    renderVerticalConnections,
    setRenderVerticalConnections,
    renderHorizontalConnections,
    setRenderHorizontalConnections,
  } = useRenderModes();

  const { isCurrentMetricHinge } = useMetrics();

  const hasBeamData = Boolean(animationData?.beamData);

  const options = [
    {
      label: "Nodes",
      checked: renderNodes,
      setter: setRenderNodes,
      icon: Share2Icon,
    },
    {
      label: "Floors",
      checked: renderFloorSlabs,
      setter: setRenderFloorSlabs,
      icon: LayersIcon,
    },
    {
      label: "X Slices",
      checked: renderXCrossSectionSlabs,
      setter: setRenderXCrossSectionSlabs,
      icon: Columns2Icon,
    },
    {
      label: "Y Slices",
      checked: renderYCrossSectionSlabs,
      setter: setRenderYCrossSectionSlabs,
      icon: Rows2Icon,
    },
    {
      label: "Corners",
      checked: showCornersOnly,
      setter: setShowCornersOnly,
      icon: MaximizeIcon,
    },
    {
      label: "Vertical",
      checked: renderVerticalConnections,
      setter: setRenderVerticalConnections,
      icon: MoveVerticalIcon,
    },
    {
      label: "Beams",
      checked: renderHorizontalConnections,
      setter: setRenderHorizontalConnections,
      icon: MoveHorizontalIcon,
      disabled: !hasBeamData,
      disabledReason: "Beam data not loaded",
    },
    {
      label: "Hinge",
      checked: true,
      setter: null,
      icon: WorkflowIcon,
      hidden: !isCurrentMetricHinge,
    },
  ];

  const { datasetStates: dataDatasetStates, requestDatasetLoad, retryDatasetLoad } = useAnimationData();

  const hingeDataAvailable = useMemo(() => dataDatasetStates["hingeData"].available, [dataDatasetStates]);
  const hingeDataState = useMemo(() => dataDatasetStates["hingeData"], [dataDatasetStates]);

  return (
    <>
      <div className="mb-1 flex items-center gap-1">
        <GridIcon size={12} className="text-muted-foreground" />
        <span className="text-foreground text-xs font-medium">Viewable Parts</span>
      </div>
      <div className="gap-y- grid grid-cols-4 justify-items-center gap-x-2">
        {options.map(
          ({ label, checked, setter, icon: Icon, disabled, hidden }) =>
            !hidden && (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <button
                    className={disabled ? "cursor-not-allowed opacity-50" : "group"}
                    key={label}
                    onClick={() => {
                      if (disabled) return;
                      setter?.(!checked);
                    }}
                    disabled={disabled}>
                    <div
                      className={`relative flex w-fit flex-col items-center justify-center gap-2 rounded-sm border p-2.5 px-3 text-center transition-colors ${checked ? "border-primary-foreground bg-primary text-primary-foreground" : "border-border bg-background group-hover:bg-muted group-hover:text-foreground dark:border-input dark:bg-input/30 dark:group-hover:bg-input/50"}`}>
                      <Icon className="size-4.5" />
                      {setter != null && (
                        <span
                          className={`bg-background absolute flex items-center justify-center rounded border transition-colors ${checked ? "border-primary-foreground bg-primary -right-2.5 -bottom-2.5 size-5" : "bg-input -right-2 -bottom-2 size-4"} `}>
                          {checked && <CheckIcon className="text-background size-3.5" />}
                        </span>
                      )}
                    </div>
                    <span className={"text-xs leading-tight"}>{label}</span>
                  </button>
                </TooltipTrigger>
                {disabled && (
                  <TooltipContent side="bottom" sideOffset={8} className="flex flex-col">
                    {hingeDataAvailable ? (
                      <>
                        You need to load hinge data to use this view mode.
                        <div className="w-full">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2">
                              {hingeDataState.stage === "ready" ? (
                                <>
                                  <CheckIcon size={11} /> Loaded
                                </>
                              ) : hingeDataState.stage === "error" ? (
                                "Failed"
                              ) : hingeDataState.selected ? (
                                hingeDataState.message
                              ) : (
                                "Available"
                              )}
                            </span>
                            <div className="inline-block items-center justify-between gap-2 text-[10px]">
                              {hingeDataState.stage === "error" ? (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  className="dark"
                                  onClick={() => retryDatasetLoad("hingeData")}>
                                  <span className="text-xs leading-tight">Retry</span>
                                </Button>
                              ) : hingeDataState.stage === "idle" || !hingeDataState.selected ? (
                                <Button
                                  variant="outline"
                                  size="xs"
                                  className="dark"
                                  onClick={() => (requestDatasetLoad("hingeData"), setter?.(!checked))}>
                                  <span className="text-xs leading-tight">Load hinge data</span>
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          <span className="flex items-center gap-2">{hingeDataState.error}</span>
                          {hingeDataState.stage === "fetching" ||
                          hingeDataState.stage === "parsing" ||
                          hingeDataState.stage === "queued" ? (
                            <div className="bg-muted mt-1 mb-1 h-1.5 overflow-hidden rounded-full">
                              <div
                                className="bg-warning h-full rounded-full transition-all"
                                style={{ width: `${hingeDataState.progress}%` }}
                              />
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>Hinge data is not available for this building</>
                    )}
                  </TooltipContent>
                )}
              </Tooltip>
            )
        )}
      </div>
    </>
  );
}
