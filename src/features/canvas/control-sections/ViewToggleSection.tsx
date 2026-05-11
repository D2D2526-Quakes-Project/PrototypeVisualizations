import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { useMetrics } from "@/features/metrics/useMetrics";
import { useProfileStore } from "@/state";
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

export function ViewToggleSection() {
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

  return (
    <>
      <div className="mb-1 flex items-center gap-1">
        <GridIcon size={12} className="text-neutral-500" />
        <span className="text-xs font-medium text-neutral-700">Viewable Parts</span>
      </div>
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
                      className={`relative flex w-fit flex-col items-center justify-center gap-2 rounded-sm border p-2.5 px-3 text-center transition-colors ${checked ? "border-primary-foreground bg-primary text-primary-foreground" : "border-border bg-background group-hover:bg-muted group-hover:text-foreground dark:border-input dark:bg-input/30 dark:group-hover:bg-input/50"}`}>
                      <Icon className="size-4.5" />
                      {setter != null && (
                        <span
                          className={`bg-background absolute -right-2.5 -bottom-2.5 flex size-5 items-center justify-center rounded border transition-colors ${checked ? "border-primary-foreground bg-primary" : "bg-input"} `}>
                          {checked && <CheckIcon className="size-4 text-white" />}
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
    </>
  );
}
