import { useState } from "react";
import type { DockviewApi } from "dockview-react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PanelTypePickerMenu, type PanelType } from "./MagicPanel";

type Edge = "left" | "right" | "top" | "bottom";

const DIRECTION: Record<Edge, "left" | "right" | "above" | "below"> = {
  left: "left",
  right: "right",
  top: "above",
  bottom: "below",
};

const POPOVER_SIDE: Record<Edge, "left" | "right" | "top" | "bottom"> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

function EdgeZone({ edge, api }: { edge: Edge; api: DockviewApi }) {
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);

  const defaultType: PanelType = (api.activePanel?.params?.panelType as PanelType | undefined) ?? "Timeline";

  const handleSelect = (type: PanelType) => {
    api.addPanel({
      id: `panel-${Date.now()}`,
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: type,
      position: { direction: DIRECTION[edge] },
      params: { panelType: type },
    });
    setOpen(false);
  };

  const isHorizontal = edge === "top" || edge === "bottom";

  const hiddenSlide =
    edge === "left"
      ? "-translate-x-2"
      : edge === "right"
        ? "translate-x-2"
        : edge === "top"
          ? "-translate-y-2"
          : "translate-y-2";

  const slide =
    edge === "left"
      ? "translate-x-3"
      : edge === "right"
        ? "-translate-x-3"
        : edge === "top"
          ? "translate-y-3"
          : "-translate-y-3";

  const zonePosition = isHorizontal
    ? `inset-x-0 h-4 ${edge === "top" ? "top-0" : "bottom-0"}`
    : `inset-y-0 w-4 ${edge === "left" ? "left-0" : "right-0"}`;

  return (
    <div
      className={`absolute z-10 flex items-center justify-center ${isHorizontal ? "flex-row" : "flex-col"} ${zonePosition}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            size="icon-lg"
            className={`bg-background ring-foreground/10 hover:bg-accent rounded-full shadow-sm ring-1 transition-all duration-200 hover:shadow-md ${hovered || open ? `scale-100 opacity-100 ${slide}` : `${hiddenSlide} scale-75 opacity-0`}`}
            aria-label={`Add panel to the ${edge}`}>
            <Plus className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side={POPOVER_SIDE[edge]} align="center" className="z-50 w-48 p-1">
          <PanelTypePickerMenu value={defaultType} onChange={handleSelect} onRequestClose={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function EdgeAddPanelZones({ api }: { api: DockviewApi | null }) {
  if (!api) return null;

  return (
    <>
      <EdgeZone edge="left" api={api} />
      <EdgeZone edge="right" api={api} />
      <EdgeZone edge="top" api={api} />
      <EdgeZone edge="bottom" api={api} />
    </>
  );
}
