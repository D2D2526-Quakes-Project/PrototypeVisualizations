import { InterstoryDriftChart } from "@/features/view-3d/panels/InterstoryDriftChart";
import { MainCanvasPanel } from "@/features/view-3d/panels/MainCanvasPanel";
import { HistogramChart } from "@/features/view-3d/panels/HistogramChart";
import { PeakValuesPanel } from "@/features/view-3d/panels/PeakValuesPanel";
import { DataTablePanel } from "@/features/view-3d/panels/DataTablePanel";
import { FloorDisplacementChart } from "@/features/view-3d/panels/FloorDisplacementChart";
import { StatisticsPanel } from "@/features/view-3d/panels/StatisticsPanel";
import { VelocityTimeChart } from "@/features/view-3d/panels/VelocityTimeChart";
import { RotationTimeChart } from "@/features/view-3d/panels/RotationTimeChart";
import { StoryDriftHeatmap } from "@/features/view-3d/panels/StoryDriftHeatmap";
import { PeakResponseTimePanel } from "@/features/view-3d/panels/PeakResponseTimePanel";
import { DamageThresholdPanel } from "@/features/view-3d/panels/DamageThresholdPanel";
import { VelocityDistributionPanel } from "@/features/view-3d/panels/VelocityDistributionPanel";
import { AccelerationDistributionPanel } from "@/features/view-3d/panels/AccelerationDistributionPanel";
import { HingeDistributionPanel } from "@/features/view-3d/panels/HingeDistributionPanel";
import { HingeHotspotsPanel } from "@/features/view-3d/panels/HingeHotspotsPanel";
import { FloorTorsionMapPanel } from "@/features/view-3d/panels/FloorTorsionMapPanel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { IDockviewHeaderActionsProps, IDockviewPanelHeaderProps, IDockviewPanelProps } from "dockview";
import { Timeline } from "./Timeline";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  ChevronDown,
  Columns,
  Flame,
  Gauge,
  LineChart,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelTop,
  Plus,
  RotateCw,
  ShieldAlert,
  Table,
  X,
} from "lucide-react";
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
  "Rotation Time": RotationTimeChart,
  "Velocity Distribution": VelocityDistributionPanel,
  "Acceleration Distribution": AccelerationDistributionPanel,
  "Hinge Distribution": HingeDistributionPanel,
  "Hinge Hotspots": HingeHotspotsPanel,
  "Floor Torsion Map": FloorTorsionMapPanel,
  "Story Drift Heatmap": StoryDriftHeatmap,
  "Peak Response Time": PeakResponseTimePanel,
  "Damage Threshold": DamageThresholdPanel,
} as const;

type PanelType = keyof typeof PanelCatalog;

type PanelCategory = "Canvas" | "Time Series" | "Distributions" | "Threshold / Damage" | "Summaries" | "Tables / Data";

type PanelDefinition = {
  category: PanelCategory;
  icon: LucideIcon;
  description: string;
};

const PANEL_DEFINITIONS: Record<PanelType, PanelDefinition> = {
  Timeline: { category: "Time Series", icon: LineChart, description: "Playback timeline and overlays" },
  "Interstory Drift Chart": { category: "Time Series", icon: LineChart, description: "Per-story drift traces" },
  "Main Canvas": { category: "Canvas", icon: PanelTop, description: "3D structure viewport" },
  "Histogram Chart": { category: "Distributions", icon: BarChart3, description: "Threshold exceedance by position" },
  "Peak Values": { category: "Summaries", icon: Gauge, description: "Peak values for selected nodes" },
  "Data Table": { category: "Tables / Data", icon: Table, description: "Raw node values table" },
  "Floor Displacement": { category: "Time Series", icon: LineChart, description: "Floor average displacement traces" },
  Statistics: { category: "Summaries", icon: Activity, description: "Simulation and current-frame stats" },
  "Velocity Time": { category: "Time Series", icon: LineChart, description: "Velocity channels over time" },
  "Rotation Time": { category: "Time Series", icon: LineChart, description: "Rotation channels over time" },
  "Velocity Distribution": {
    category: "Distributions",
    icon: BarChart3,
    description: "Velocity histogram distribution",
  },
  "Acceleration Distribution": {
    category: "Distributions",
    icon: BarChart3,
    description: "Acceleration histogram distribution",
  },
  "Hinge Distribution": { category: "Distributions", icon: BarChart3, description: "Static hinge metric histogram" },
  "Hinge Hotspots": { category: "Threshold / Damage", icon: Flame, description: "Static hinge hotspot ranking" },
  "Floor Torsion Map": {
    category: "Summaries",
    icon: RotateCw,
    description: "Top-down rotation preview per floor",
  },
  "Story Drift Heatmap": {
    category: "Threshold / Damage",
    icon: ShieldAlert,
    description: "Drift heatmap by story/time",
  },
  "Peak Response Time": { category: "Threshold / Damage", icon: Gauge, description: "When peaks happen in response" },
  "Damage Threshold": {
    category: "Threshold / Damage",
    icon: ShieldAlert,
    description: "Threshold evaluation summary",
  },
};

const PANEL_CATEGORY_ORDER: PanelCategory[] = [
  "Canvas",
  "Time Series",
  "Distributions",
  "Threshold / Damage",
  "Summaries",
  "Tables / Data",
];

const FEATURED_PANEL_TYPES: PanelType[] = ["Main Canvas", "Data Table"];

function getPanelsByCategory(): Array<{ category: PanelCategory; items: PanelType[] }> {
  return PANEL_CATEGORY_ORDER.map((category) => ({
    category,
    items: (Object.keys(PanelCatalog) as PanelType[]).filter(
      (panelType) =>
        PANEL_DEFINITIONS[panelType].category === category && !FEATURED_PANEL_TYPES.includes(panelType),
    ),
  })).filter((group) => group.items.length > 0);
}

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
  const [pickerOpen, setPickerOpen] = useState(false);

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

  const handlePanelChange = (newPanelType: PanelType) => {
    props.api.updateParameters({ panelType: newPanelType });
    setPickerOpen(false);
  };

  return (
    <div className="flex z-10 h-full w-full items-center bg-neutral-200/80">
      {showPanelPicker ? (
        <PanelTypePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          value={currentPanelType}
          onChange={handlePanelChange}
        />
      ) : (
        <span className="px-4 py-0 text-sm font-medium text-neutral-700 flex items-center gap-1.5">
          {(() => {
            const Icon = PANEL_DEFINITIONS[currentPanelType].icon;
            return <Icon className="size-3.5 text-neutral-500" />;
          })()}
          {currentPanelType}
        </span>
      )}
    </div>
  );
};

function PanelTypePicker({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: PanelType;
  onChange: (panelType: PanelType) => void;
}) {
  const selected = PANEL_DEFINITIONS[value];
  const SelectedIcon = selected.icon;
  const groupedPanels = getPanelsByCategory();
  const featuredPanels = FEATURED_PANEL_TYPES;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mx-2 h-6 max-w-[19rem] min-w-0 px-2 text-sm font-medium text-neutral-700 cursor-pointer border-b border-neutral-400 hover:border-neutral-500 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 inline-flex items-center gap-1.5"
          title="Choose panel type">
          <SelectedIcon className="size-3.5 text-neutral-500 shrink-0" />
          <span className="truncate">{value}</span>
          <ChevronDown
            className={`size-3.5 text-neutral-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(38rem,95vw)] p-2">
        <div className="mb-2 px-1">
          <div className="text-xs font-semibold text-neutral-700">Panel Picker</div>
          <div className="text-[10px] text-neutral-500">Quick access + compact grouped browser</div>
        </div>

        <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {featuredPanels.map((panelType) => {
            const meta = PANEL_DEFINITIONS[panelType];
            const Icon = meta.icon;
            const isActive = panelType === value;

            return (
              <div key={`${panelType}-featured`} className="rounded-md border border-neutral-200 bg-neutral-50/70 p-1.5">
                <div className="px-1 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500 font-semibold">
                  {meta.category}
                </div>
                <button
                  type="button"
                  onClick={() => onChange(panelType)}
                  title={meta.description}
                  className={`mt-1 w-full rounded-md px-2 py-1.5 text-left transition-colors border ${
                    isActive
                      ? "bg-white border-amber-300 shadow-sm"
                      : "bg-white/80 border-transparent hover:bg-white hover:border-neutral-200"
                  }`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`size-3.5 shrink-0 ${isActive ? "text-amber-600" : "text-neutral-500"}`} />
                    <span className={`text-xs font-medium ${isActive ? "text-neutral-900" : "text-neutral-700"}`}>
                      {panelType}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[56vh] overflow-auto pr-1">
          {groupedPanels.map((group) => (
            <div key={group.category} className="rounded-md border border-neutral-200/80 bg-white p-1.5">
              <div className="px-1 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500 font-semibold">
                {group.category}
              </div>
              <div className="mt-1 space-y-0.5">
                {group.items.map((panelType) => {
                  const meta = PANEL_DEFINITIONS[panelType];
                  const Icon = meta.icon;
                  const isActive = panelType === value;

                  return (
                    <button
                      key={panelType}
                      type="button"
                      onClick={() => onChange(panelType)}
                      title={meta.description}
                      className={`w-full rounded-md px-2 py-1.5 text-left transition-colors border ${
                        isActive
                          ? "bg-white border-amber-300 shadow-sm"
                          : "bg-white/80 border-transparent hover:bg-white hover:border-neutral-200"
                      }`}>
                      <div className="flex items-center gap-2">
                        <Icon className={`size-3.5 shrink-0 ${isActive ? "text-amber-600" : "text-neutral-500"}`} />
                        <span className={`text-xs font-medium ${isActive ? "text-neutral-900" : "text-neutral-700"}`}>
                          {panelType}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
