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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAnimationData } from "@/lib/useAnimationData";
import type { BuildingAnimationData } from "@/lib/types";
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

type PanelCategory = "Canvas" | "Time Series" | "Distributions" | "Threshold / ISD" | "Summaries" | "Tables / Data";

type PanelType = keyof typeof PANEL_DEFINITIONS;

type PanelDefinition = {
  component: React.ComponentType<IDockviewPanelProps>;
  category: PanelCategory;
  icon: LucideIcon;
  description: string;
  requiredOptionalData: PanelDataKey[];
  optionalEnhancementData: PanelDataKey[];
};

type PanelDataKey =
  | "beamData"
  | "hingeData"
  | "displacementRot"
  | "velocityLin"
  | "velocityRot"
  | "accelerationLin"
  | "accelerationRot";

const PANEL_DEFINITIONS: Record<string, PanelDefinition> = {
  Timeline: {
    component: Timeline,
    category: "Time Series",
    icon: LineChart,
    description: "Playback timeline and overlays",
    requiredOptionalData: [],
    optionalEnhancementData: ["velocityLin", "accelerationLin", "displacementRot"],
  },
  "Interstory Drift Chart": {
    component: InterstoryDriftChart,
    category: "Time Series",
    icon: LineChart,
    description: "Per-story drift traces",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
  "Main Canvas": {
    component: MainCanvasPanel,
    category: "Canvas",
    icon: PanelTop,
    description: "3D structure viewport",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
  "Histogram Chart": {
    component: HistogramChart,
    category: "Distributions",
    icon: BarChart3,
    description: "Threshold exceedance by position",
    requiredOptionalData: [],
    optionalEnhancementData: ["velocityLin", "accelerationLin"],
  },
  "Peak Values": {
    component: PeakValuesPanel,
    category: "Summaries",
    icon: Gauge,
    description: "Peak values for selected nodes",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
  "Data Table": {
    component: DataTablePanel,
    category: "Tables / Data",
    icon: Table,
    description: "Raw node values table",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
  "Floor Displacement": {
    component: FloorDisplacementChart,
    category: "Time Series",
    icon: LineChart,
    description: "Floor average displacement traces",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
  Statistics: {
    component: StatisticsPanel,
    category: "Summaries",
    icon: Activity,
    description: "Simulation and current-frame stats",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
  "Velocity Time": {
    component: VelocityTimeChart,
    category: "Time Series",
    icon: LineChart,
    description: "Velocity channels over time",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
  "Rotation Time": {
    component: RotationTimeChart,
    category: "Time Series",
    icon: LineChart,
    description: "Rotation channels over time",
    requiredOptionalData: ["velocityRot"],
    optionalEnhancementData: [],
  },
  "Velocity Distribution": {
    component: VelocityDistributionPanel,
    category: "Distributions",
    icon: BarChart3,
    description: "Velocity histogram distribution",
    requiredOptionalData: ["velocityLin"],
    optionalEnhancementData: [],
  },
  "Acceleration Distribution": {
    component: AccelerationDistributionPanel,
    category: "Distributions",
    icon: BarChart3,
    description: "Acceleration histogram distribution",
    requiredOptionalData: ["accelerationLin"],
    optionalEnhancementData: [],
  },
  "Hinge Distribution": {
    component: HingeDistributionPanel,
    category: "Distributions",
    icon: BarChart3,
    description: "Static hinge metric histogram",
    requiredOptionalData: ["hingeData"],
    optionalEnhancementData: ["beamData"],
  },
  "Hinge Hotspots": {
    component: HingeHotspotsPanel,
    category: "Threshold / ISD",
    icon: Flame,
    description: "Static hinge hotspot ranking",
    requiredOptionalData: ["hingeData"],
    optionalEnhancementData: ["beamData"],
  },
  "Floor Torsion Map": {
    component: FloorTorsionMapPanel,
    category: "Summaries",
    icon: RotateCw,
    description: "Top-down rotation preview per floor",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
  "Story Drift Heatmap": {
    component: StoryDriftHeatmap,
    category: "Threshold / ISD",
    icon: ShieldAlert,
    description: "Drift heatmap by story/time",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
  "Peak Response Time": {
    component: PeakResponseTimePanel,
    category: "Threshold / ISD",
    icon: Gauge,
    description: "When peaks happen in response",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
  "Damage Threshold": {
    component: DamageThresholdPanel,
    category: "Threshold / ISD",
    icon: ShieldAlert,
    description: "Threshold evaluation summary",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
} as const;

const PANEL_DATA_LABELS: Record<PanelDataKey, string> = {
  beamData: "beam connectivity data",
  hingeData: "hinge data",
  displacementRot: "rotational displacement data",
  velocityLin: "linear velocity data",
  velocityRot: "rotational velocity data",
  accelerationLin: "linear acceleration data",
  accelerationRot: "rotational acceleration data",
};

const PANEL_CATEGORY_ORDER: PanelCategory[] = [
  "Canvas",
  "Tables / Data",
  "Time Series",
  "Distributions",
  "Threshold / ISD",
  "Summaries",
];

function getPanelsByCategory(): Array<{ category: PanelCategory; items: PanelType[] }> {
  return PANEL_CATEGORY_ORDER.map((category) => ({
    category,
    items: (Object.keys(PANEL_DEFINITIONS) as PanelType[]).filter(
      (panelType) => PANEL_DEFINITIONS[panelType].category === category,
    ),
  })).filter((group) => group.items.length > 0);
}

function isPanelType(value: unknown): value is PanelType {
  return typeof value === "string" && value in PANEL_DEFINITIONS;
}

function joinHumanList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function getPanelDisplayName(panelType: PanelType): string {
  if (panelType === "Damage Threshold") return "ISD Threshold";
  return panelType;
}

function getPanelRequirementDescriptorText(panelType: PanelType): string {
  const { requiredOptionalData, optionalEnhancementData } = PANEL_DEFINITIONS[panelType];
  const parts = ["Data: core simulation data"];

  if (requiredOptionalData.length > 0) {
    parts.push(`Requires: ${joinHumanList(requiredOptionalData.map((key) => PANEL_DATA_LABELS[key]))}`);
  }

  if (optionalEnhancementData.length > 0) {
    parts.push(`Optional: ${joinHumanList(optionalEnhancementData.map((key) => PANEL_DATA_LABELS[key]))}`);
  }

  return parts.join(" | ");
}

function getMissingPanelDataRequirements(panelType: PanelType, animationData: BuildingAnimationData): PanelDataKey[] {
  return PANEL_DEFINITIONS[panelType].requiredOptionalData.filter((key) => !animationData[key]);
}

function getMissingOptionalEnhancementData(panelType: PanelType, animationData: BuildingAnimationData): PanelDataKey[] {
  return PANEL_DEFINITIONS[panelType].optionalEnhancementData.filter((key) => !animationData[key]);
}

function getPanelAvailabilityInfo(panelType: PanelType, animationData: BuildingAnimationData | null, loading: boolean) {
  const descriptorText = getPanelRequirementDescriptorText(panelType);
  const optionalEnhancementData = PANEL_DEFINITIONS[panelType].optionalEnhancementData;

  if (loading || !animationData) {
    return {
      isAvailable: false,
      descriptorText,
      disabledReason: "This panel is not available yet because simulation data is still loading.",
      optionalNotice: optionalEnhancementData.length
        ? `Optional enhancements: ${joinHumanList(optionalEnhancementData.map((key) => PANEL_DATA_LABELS[key]))}.`
        : null,
    };
  }

  const missing = getMissingPanelDataRequirements(panelType, animationData);
  if (missing.length === 0) {
    const missingOptional = getMissingOptionalEnhancementData(panelType, animationData);
    const optionalNotice =
      missingOptional.length > 0
        ? `This panel is available, but additional detail requires ${joinHumanList(missingOptional.map((key) => PANEL_DATA_LABELS[key]))}, and ${missingOptional.length === 1 ? "it is" : "they are"} not loaded.`
        : optionalEnhancementData.length > 0
          ? `Optional enhancements are loaded: ${joinHumanList(optionalEnhancementData.map((key) => PANEL_DATA_LABELS[key]))}.`
          : null;

    return { isAvailable: true, descriptorText, disabledReason: null as string | null, optionalNotice };
  }

  const missingLabels = missing.map((key) => PANEL_DATA_LABELS[key]);
  return {
    isAvailable: false,
    descriptorText,
    disabledReason: `This panel is not available because it requires ${joinHumanList(missingLabels)}, but ${missing.length === 1 ? "it is" : "they are"} not loaded.`,
    optionalNotice: null as string | null,
  };
}

export const MagicPanel = (props: IDockviewPanelProps<{ panelType: PanelType }>) => {
  const currentPanelType = props.params.panelType;
  const CurrentComponent = PANEL_DEFINITIONS[currentPanelType].component;

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
  const isActive = props.api.isActive;
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
    <div
      className={`flex z-10 h-full w-full items-center transition-colors ${
        isActive ? "bg-amber-100 text-amber-900" : "bg-neutral-200/80"
      }`}>
      {showPanelPicker ? (
        <PanelTypePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          value={currentPanelType}
          onChange={handlePanelChange}
        />
      ) : (
        <span className={`px-4 py-0 text-sm font-medium flex items-center gap-1.5 ${isActive ? "text-amber-900" : "text-neutral-700"}`}>
          {(() => {
            const Icon = PANEL_DEFINITIONS[currentPanelType].icon;
            return <Icon className={`size-3.5 ${isActive ? "text-amber-700" : "text-neutral-500"}`} />;
          })()}
          {getPanelDisplayName(currentPanelType)}
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
  const { animationData, loading } = useAnimationData();

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mx-2 h-6 max-w-72 min-w-0 px-2 text-sm font-medium text-neutral-700 cursor-pointer border-b border-neutral-400 hover:border-neutral-500 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 inline-flex items-center gap-1.5"
          title="Choose panel type">
          <SelectedIcon className="size-3.5 text-neutral-500 shrink-0" />
          <span className="truncate">{getPanelDisplayName(value)}</span>
          <ChevronDown
            className={`size-3.5 text-neutral-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(30rem,92vw)] max-h-[70vh] overflow-y-auto p-2">
        <div className="mb-2 px-1">
          <div className="text-xs font-semibold text-neutral-700">Panel Picker</div>
          <div className="text-[10px] text-neutral-500">Compact grouped browser</div>
        </div>

        <div className="grid grid-cols-1 gap-2 pr-1">
          {groupedPanels.map((group) => (
            <div key={group.category} className="rounded-md border border-neutral-200/80 bg-white p-1.5">
              {group.items.length > 1 && (
                <div className="px-1 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500 font-semibold">
                  {group.category}
                </div>
              )}
              <div className="mt-1 space-y-0.5">
                {group.items.map((panelType) => {
                  const meta = PANEL_DEFINITIONS[panelType];
                  const Icon = meta.icon;
                  const isActive = panelType === value;
                  const availability = getPanelAvailabilityInfo(panelType, loading ? null : animationData, loading);
                  const buttonTitle = [meta.description, availability.descriptorText, availability.optionalNotice]
                    .filter(Boolean)
                    .join("\n");

                  const button = (
                    <button
                      key={panelType}
                      type="button"
                      onClick={() => {
                        if (availability.isAvailable) onChange(panelType);
                      }}
                      disabled={!availability.isAvailable}
                      title={availability.isAvailable ? buttonTitle : undefined}
                      className={`w-full rounded-md px-2 py-1.5 text-left transition-colors border ${
                        isActive
                          ? "bg-white border-amber-300 shadow-sm"
                          : "bg-white/80 border-transparent hover:bg-white hover:border-neutral-200"
                      } ${availability.isAvailable ? "opacity-100" : "opacity-45 border-dashed border-neutral-300 cursor-not-allowed pointer-events-none"}`}>
                      <div className="flex items-start gap-2">
                        <Icon
                          className={`mt-0.5 size-3.5 shrink-0 ${isActive ? "text-amber-600" : "text-neutral-500"}`}
                        />
                        <div className="min-w-0">
                          <div className={`text-xs font-medium ${isActive ? "text-neutral-900" : "text-neutral-700"}`}>
                            {getPanelDisplayName(panelType)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );

                  if (availability.isAvailable && !availability.optionalNotice) {
                    return button;
                  }

                  return (
                    <Tooltip key={`${panelType}-${availability.isAvailable ? "optional" : "disabled"}`}>
                      <TooltipTrigger asChild>
                        <span className="block" tabIndex={0}>
                          {button}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="font-medium">{getPanelDisplayName(panelType)}</div>
                        {availability.disabledReason ? (
                          <div className="mt-0.5">{availability.disabledReason}</div>
                        ) : null}
                        {availability.optionalNotice ? (
                          <div className="mt-0.5">{availability.optionalNotice}</div>
                        ) : null}
                        <div className="mt-1 text-[11px] opacity-90">{availability.descriptorText}</div>
                      </TooltipContent>
                    </Tooltip>
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
