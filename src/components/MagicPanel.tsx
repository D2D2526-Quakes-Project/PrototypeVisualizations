import { InterstoryDriftChart } from "@/pages/View3d/InterstoryDriftChart";
import { MainCanvasPanel } from "@/pages/View3d/MainCanvasPanel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { IDockviewPanelHeaderProps, IDockviewPanelProps } from "dockview";
import { Timeline } from "./Timeline";
import { Columns, Maximize2, Minimize2, MoreHorizontal, X } from "lucide-react";
import { useState } from "react";

const PanelCatalog = {
  Timeline: Timeline,
  // SmallTimeline: SmallTimeline,
  "Interstory Drift Chart": InterstoryDriftChart,
  "Main Canvas": MainCanvasPanel,
} as const;

type PanelType = keyof typeof PanelCatalog;

export const MagicPanel = (props: IDockviewPanelProps<{ panelType: PanelType }>) => {
  const currentPanelType = props.params.panelType;
  const CurrentComponent = PanelCatalog[currentPanelType];

  return (
    <div className="h-full w-full relative">
      <div className="h-full w-full">
        {/* Dynamically render the selected component and pass dock props */}
        <CurrentComponent {...props} />
      </div>
    </div>
  );
};

export const MagicPanelTab = (props: IDockviewPanelHeaderProps<{ panelType: PanelType }>) => {
  const currentPanelType = props.params.panelType;
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(() => props.api.isMaximized());

  const handlePanelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPanelType = event.target.value as PanelType;
    props.api.updateParameters({ panelType: newPanelType });
  };

  const handleSplitHorizontal = () => {
    // Split the panel to the right (side by side - creates horizontal layout)
    props.containerApi.addPanel({
      id: `panel-${Date.now()}`,
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Panel",
      position: { referencePanel: props.api.id, direction: "right" },
      params: { panelType: currentPanelType },
    });
  };

  const handleSplitVertical = () => {
    // Split the panel below (stacked - creates vertical layout)
    props.containerApi.addPanel({
      id: `panel-${Date.now()}`,
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Panel",
      position: { referencePanel: props.api.id, direction: "below" },
      params: { panelType: currentPanelType },
    });
  };

  const handleClose = () => {
    props.api.close();
  };

  const handleMaximize = () => {
    props.api.maximize();
    setIsMaximized(true);
  };

  const handleMinimize = () => {
    props.api.exitMaximized();
    setIsMaximized(false);
  };

  return (
    <div className="flex z-10 justify-between w-full border-b-2 border-neutral-300 bg-neutral-200/80 backdrop-blur-sm px-2 py-1.5 items-center">
      <select
        value={currentPanelType}
        onChange={handlePanelChange}
        className="bg-transparent border-b border-neutral-400 px-2 py-0.5 text-sm font-medium text-neutral-700 cursor-pointer hover:border-neutral-500 transition-colors outline-none focus:ring-1 focus:ring-neutral-400">
        {Object.keys(PanelCatalog).map((panelType) => (
          <option key={panelType} value={panelType}>
            {panelType}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleSplitHorizontal}
          title="Split horizontally (side by side)">
          <Columns />
        </Button>

        <Button variant="ghost" size="icon-xs" onClick={handleSplitVertical} title="Split vertically (stacked)">
          <Columns className="rotate-90" />
        </Button>

        <Button variant="ghost" size="icon-xs" onClick={handleClose} title="Close panel">
          <X />
        </Button>

        {isMaximized ? (
          <Button variant="ghost" size="icon-xs" onClick={handleMinimize} title="Restore">
            <Minimize2 />
          </Button>
        ) : (
          <Popover open={isMoreOpen} onOpenChange={setIsMoreOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon-xs" title="More options">
                <MoreHorizontal />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="end">
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    handleMaximize();
                    setIsMoreOpen(false);
                  }}>
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Maximize
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    handleSplitHorizontal();
                    setIsMoreOpen(false);
                  }}>
                  <Columns className="mr-2 h-4 w-4" />
                  Split Right
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    handleSplitVertical();
                    setIsMoreOpen(false);
                  }}>
                  <Columns className="mr-2 h-4 w-4 rotate-90" />
                  Split Down
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};
