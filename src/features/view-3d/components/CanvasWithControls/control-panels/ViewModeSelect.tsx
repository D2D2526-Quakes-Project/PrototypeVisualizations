import { useViewStore } from "@/state";
import { useAnimationData } from "@/lib/useAnimationData";
import {
  Columns2Icon,
  LayersIcon,
  MaximizeIcon,
  MoveHorizontalIcon,
  MoveVerticalIcon,
  Rows2Icon,
  Share2Icon,
  WorkflowIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isHingeMetric } from "@/lib/metrics";

export function ViewModeSelect() {
  const { animationData } = useAnimationData();
  const renderNodes = useViewStore((s) => s.renderNodes);
  const setRenderNodes = useViewStore((s) => s.setRenderNodes);
  const renderFloorSlabs = useViewStore((s) => s.renderFloorSlabs);
  const setRenderFloorSlabs = useViewStore((s) => s.setRenderFloorSlabs);
  const renderXCrossSectionSlabs = useViewStore((s) => s.renderXCrossSectionSlabs);
  const setRenderXCrossSectionSlabs = useViewStore((s) => s.setRenderXCrossSectionSlabs);
  const renderYCrossSectionSlabs = useViewStore((s) => s.renderYCrossSectionSlabs);
  const setRenderYCrossSectionSlabs = useViewStore((s) => s.setRenderYCrossSectionSlabs);
  const showCornersOnly = useViewStore((s) => s.showCornersOnly);
  const setShowCornersOnly = useViewStore((s) => s.setShowCornersOnly);
  const renderVerticalConnections = useViewStore((s) => s.renderVerticalConnections);
  const setRenderVerticalConnections = useViewStore((s) => s.setRenderVerticalConnections);
  const renderHorizontalConnections = useViewStore((s) => s.renderHorizontalConnections);
  const setRenderHorizontalConnections = useViewStore((s) => s.setRenderHorizontalConnections);

  const currentMetric = useViewStore((s) => s.currentMetric);
  const renderHingeNodes = isHingeMetric(currentMetric);

  const hasBeamData = Boolean(animationData?.beamData);

  const options = [
    {
      label: "Nodes",
      value: renderNodes,
      setter: setRenderNodes,
      icon: Share2Icon,
    },
    {
      label: "Floors",
      value: renderFloorSlabs,
      setter: setRenderFloorSlabs,
      icon: LayersIcon,
    },
    {
      label: "X Slices",
      value: renderXCrossSectionSlabs,
      setter: setRenderXCrossSectionSlabs,
      icon: Columns2Icon,
    },
    {
      label: "Y Slices",
      value: renderYCrossSectionSlabs,
      setter: setRenderYCrossSectionSlabs,
      icon: Rows2Icon,
    },
    {
      label: "Corners",
      value: showCornersOnly,
      setter: setShowCornersOnly,
      icon: MaximizeIcon,
    },
    {
      label: "Vertical",
      value: renderVerticalConnections,
      setter: setRenderVerticalConnections,
      icon: MoveVerticalIcon,
    },
    {
      label: "Beams",
      value: renderHorizontalConnections,
      setter: setRenderHorizontalConnections,
      icon: MoveHorizontalIcon,
      disabled: !hasBeamData,
      disabledReason: "Beam data not loaded",
    },
    {
      label: "Hinge",
      value: true,
      setter: null,
      icon: WorkflowIcon,
      hidden: !renderHingeNodes,
    },
  ];

  return (
    <div className="gap-y- grid grid-cols-4 justify-items-center gap-x-2">
      {options.map(
        ({ label, value, setter, icon: Icon, disabled, hidden }) =>
          !hidden && (
            <button
              className="cursor-pointer"
              key={label}
              onClick={() => {
                if (disabled) return;
                setter?.(!value);
              }}
              disabled={disabled}>
              <Tooltip key={label} disableHoverableContent>
                <TooltipTrigger asChild>
                  <div
                    className={`relative flex w-fit flex-col items-center justify-center gap-2 rounded-sm border p-2 px-3 text-center transition-colors ${value ? "border-blue-400 text-blue-400" : disabled ? "border-border cursor-not-allowed text-neutral-300" : "border-border text-muted-foreground hover:border-border/80"}`}>
                    <Icon className="size-4" />
                    {setter != null && (
                      <span
                        className={`bg-background absolute -right-1.75 -bottom-1.75 flex h-4 w-4 items-center justify-center rounded-[4px] border-[1.5px] transition-colors ${value ? "border-blue-400 bg-blue-400" : "border-border"} `}>
                        {value && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <polyline
                              points="2,5 4,7.5 8,3"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                {disabled && (
                  <TooltipContent side="bottom" sideOffset={8}>
                    You need to load beam data to use this view mode.
                  </TooltipContent>
                )}
              </Tooltip>
              <span className={`text-[11px] leading-tight ${disabled ? "text-neutral-300" : ""}`}>{label}</span>
            </button>
          )
      )}
    </div>
  );
}
