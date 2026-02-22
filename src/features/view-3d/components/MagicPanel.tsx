import { InterstoryDriftChart } from "@/features/view-3d/panels/InterstoryDriftChart";
import { MainCanvasPanel } from "@/features/view-3d/panels/MainCanvasPanel";
import { HistogramChart } from "@/features/view-3d/panels/HistogramChart";
import { PeakValuesPanel } from "@/features/view-3d/panels/PeakValuesPanel";
import { DataTablePanel } from "@/features/view-3d/panels/DataTablePanel";
import { FloorDisplacementChart } from "@/features/view-3d/panels/FloorDisplacementChart";
import { StatisticsPanel } from "@/features/view-3d/panels/StatisticsPanel";
import { VelocityTimeChart } from "@/features/view-3d/panels/VelocityTimeChart";
import { StoryDriftHeatmap } from "@/features/view-3d/panels/StoryDriftHeatmap";
import { PeakResponseTimePanel } from "@/features/view-3d/panels/PeakResponseTimePanel";
import { DamageThresholdPanel } from "@/features/view-3d/panels/DamageThresholdPanel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { IDockviewHeaderActionsProps, IDockviewPanelHeaderProps, IDockviewPanelProps } from "dockview";
import { Timeline } from "./Timeline";
import { Columns, Maximize2, Minimize2, MoreHorizontal, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

const PanelCatalog = {
  Timeline: Timeline,
  "Interstory Drift Chart": InterstoryDriftChart,
  "Main Canvas": MainCanvasPanel,
  "Histogram Chart": HistogramChart,
  "Peak Values": PeakValuesPanel,
  "Data Table": DataTablePanel,
  "Floor Displacement": FloorDisplacementChart,
  Statistics: StatisticsPanel,
  "Velocity Time": VelocityTimeChart,
  "Story Drift Heatmap": StoryDriftHeatmap,
  "Peak Response Time": PeakResponseTimePanel,
  "Damage Threshold": DamageThresholdPanel,
} as const;

type PanelType = keyof typeof PanelCatalog;

function isPanelType(value: unknown): value is PanelType {
  return typeof value === "string" && value in PanelCatalog;
}

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
  const [, setRenderTick] = useState(0);

  useEffect(() => {
    const bump = () => setRenderTick((value) => value + 1);

    const subscriptions = [
      props.api.onDidActiveChange(bump),
      props.api.onDidGroupChange(bump),
      props.api.onDidParametersChange(bump),
      props.containerApi.onDidLayoutChange(bump),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.dispose());
    };
  }, [props.api, props.containerApi]);

  const showPanelPicker = props.tabLocation === "header" && (props.api.isActive || props.api.group.panels.length === 1);

  const handlePanelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPanelType = event.target.value as PanelType;
    props.api.updateParameters({ panelType: newPanelType });
  };

  return (
    <div className="flex z-10 h-full w-full items-center bg-neutral-200/80">
      {showPanelPicker ? (
        <select
          value={currentPanelType}
          onChange={handlePanelChange}
          className="mx-2 h-6 bg-transparent border-b border-neutral-400 px-2 py-0 text-sm font-medium text-neutral-700 cursor-pointer hover:border-neutral-500 transition-colors outline-none focus:ring-1 focus:ring-neutral-400">
          {Object.keys(PanelCatalog).map((panelType) => (
            <option key={panelType} value={panelType}>
              {panelType}
            </option>
          ))}
        </select>
      ) : (
        <span className="px-4 py-0 text-sm font-medium text-neutral-700">{currentPanelType}</span>
      )}
    </div>
  );
};

export const MagicPanelHeaderActions = (props: IDockviewHeaderActionsProps) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const activePanel = props.activePanel;
  const activePanelType = isPanelType(activePanel?.params?.panelType) ? activePanel.params.panelType : null;
  const isTabGroup = props.panels.length > 1;

  if (!activePanel || !activePanelType || activePanel.api.tabComponent !== "magicPanelTab") {
    return null;
  }

  const handleDuplicateAsTab = () => {
    props.containerApi.addPanel({
      id: `panel-${Date.now()}`,
      component: activePanel.api.component,
      tabComponent: activePanel.api.tabComponent,
      title: activePanel.title ?? "Panel",
      position: { referencePanel: activePanel.id },
      params: activePanel.params,
    });
  };

  const handleSplitHorizontal = () => {
    props.containerApi.addPanel({
      id: `panel-${Date.now()}`,
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Panel",
      position: { referencePanel: activePanel.id, direction: "right" },
      params: { panelType: activePanelType },
    });
  };

  const handleSplitVertical = () => {
    props.containerApi.addPanel({
      id: `panel-${Date.now()}`,
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      title: "Panel",
      position: { referencePanel: activePanel.id, direction: "below" },
      params: { panelType: activePanelType },
    });
  };

  const handleClose = () => {
    activePanel.api.close();
  };

  const isMaximized = activePanel.api.isMaximized();

  const handleMaximize = () => {
    activePanel.api.maximize();
  };

  const handleMinimize = () => {
    activePanel.api.exitMaximized();
  };

  return (
    <div className="flex h-full items-center gap-0.5">
      {isTabGroup && (
        <Button variant="ghost" size="icon-xs" className="ml-1" onClick={handleDuplicateAsTab} title="Duplicate as tab">
          <Plus />
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon-xs"
        className={isTabGroup ? "" : "ml-1"}
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
        <Button variant="ghost" size="icon-xs" className="mr-1" onClick={handleMinimize} title="Restore">
          <Minimize2 />
        </Button>
      ) : (
        <Popover open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-xs" className="mr-1" title="More options">
              <MoreHorizontal />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="end">
            <div className="flex flex-col gap-0.5">
              {!isTabGroup && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    handleDuplicateAsTab();
                    setIsMoreOpen(false);
                  }}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Tab
                </Button>
              )}
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
  );
};
