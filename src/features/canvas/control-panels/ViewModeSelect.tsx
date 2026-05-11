import { useAnimationData } from "@/lib/animation-data/useAnimationData";
import {
  CheckIcon,
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
import { useProfileStore } from "@/state";

export function ViewModeSelect() {
  const { animationData } = useAnimationData();
  const renderNodes = useProfileStore((s) => s.renderNodes);
  const setRenderNodes = useProfileStore((s) => s.setRenderNodes);
  const renderFloorSlabs = useProfileStore((s) => s.renderFloorSlabs);
  const setRenderFloorSlabs = useProfileStore((s) => s.setRenderFloorSlabs);
  const renderXCrossSectionSlabs = useProfileStore((s) => s.renderXCrossSectionSlabs);
  const setRenderXCrossSectionSlabs = useProfileStore((s) => s.setRenderXCrossSectionSlabs);
  const renderYCrossSectionSlabs = useProfileStore((s) => s.renderYCrossSectionSlabs);
  const setRenderYCrossSectionSlabs = useProfileStore((s) => s.setRenderYCrossSectionSlabs);
  const showCornersOnly = useProfileStore((s) => s.showCornersOnly);
  const setShowCornersOnly = useProfileStore((s) => s.setShowCornersOnly);
  const renderVerticalConnections = useProfileStore((s) => s.renderVerticalConnections);
  const setRenderVerticalConnections = useProfileStore((s) => s.setRenderVerticalConnections);
  const renderHorizontalConnections = useProfileStore((s) => s.renderHorizontalConnections);
  const setRenderHorizontalConnections = useProfileStore((s) => s.setRenderHorizontalConnections);

  const currentMetric = useProfileStore((s) => s.currentMetric);
  const renderHingeNodes = isHingeMetric(currentMetric);

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
      hidden: !renderHingeNodes,
    },
  ];

  return (
    <div className="gap-y- grid grid-cols-4 justify-items-center gap-x-2">
      {options.map(
        ({ label, checked, setter, icon: Icon, disabled, hidden }) =>
          !hidden && (
            <Tooltip key={label} disableHoverableContent>
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
                    className={`relative flex w-fit flex-col items-center justify-center gap-2 rounded-sm border p-2 px-2.5 text-center transition-colors ${checked ? "border-primary-foreground bg-primary text-primary-foreground" : "border-input group-hover:bg-input/80 text-muted-foreground"}`}>
                    <Icon className="size-4" />
                    {setter != null && (
                      <span
                        className={`bg-background absolute -right-1.75 -bottom-1.75 flex h-4 w-4 items-center justify-center rounded border transition-colors ${checked ? "border-primary-foreground bg-primary" : "bg-input"} `}>
                        {checked && <CheckIcon className="size-3.5 text-white" />}
                      </span>
                    )}
                  </div>
                  <span className={"text-xs leading-tight"}>{label}</span>
                </button>
              </TooltipTrigger>
              {disabled && (
                <TooltipContent side="bottom" sideOffset={8}>
                  You need to load beam data to use this view mode.
                </TooltipContent>
              )}
            </Tooltip>
          )
      )}
    </div>
  );
}
