import { useViewStore } from "@/state";
import { Columns2Icon, LayersIcon, MaximizeIcon, Rows2Icon, Share2Icon } from "lucide-react";

export function ViewModeSelect() {
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
  ];

  return (
    <div className="grid grid-cols-5 gap-2 p-1">
      {options.map(({ label, value, setter, icon: Icon }) => (
        <button className="" key={label} onClick={() => setter(!value)}>
          <div
            className={`relative flex flex-col items-center justify-center gap-2 rounded border p-2 text-center transition-colors ${value ? "border-blue-400 text-blue-400" : "border-border text-muted-foreground hover:border-border/80"}`}>
            <Icon className="size-4" />
            <span
              className={`bg-background absolute -right-[7px] -bottom-[7px] flex h-4 w-4 items-center justify-center rounded-[4px] border-[1.5px] transition-colors ${value ? "border-blue-400 bg-blue-400" : "border-border"} `}>
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
          </div>
          <span className="text-[11px] leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );
}
