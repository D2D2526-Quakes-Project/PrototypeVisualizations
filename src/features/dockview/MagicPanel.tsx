import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DatasetLoadState } from "@/features/animation-data/data-loading/loadingTypes";
import { MainCanvasPanel } from "@/features/panels/MainCanvasPanel";
import type { BuildingAnimationData } from "@/lib/types";

import type { IDockviewHeaderActionsProps, IDockviewPanelHeaderProps, IDockviewPanelProps } from "dockview";
import type { LucideIcon } from "lucide-react";
import {
  ChartBarIncreasingIcon,
  ChartColumnIcon,
  ChartGanttIcon,
  CircleDotDashed,
  Columns,
  Grid2X2Icon,
  LineChart,
  Minimize2,
  MoreHorizontal,
  Plus,
  Rotate3DIcon,
  SheetIcon,
  X,
  XIcon,
} from "lucide-react";
import { useEffect, useId, useState } from "react";

import { useAnimationData } from "../animation-data/useAnimationData";
import { CornerMetricChart } from "../panels/CornerMetricChart";
import { DataExplorerPanel } from "../panels/DataExplorerPanel";
import { FloorAverageMetricChart } from "../panels/FloorAverageMetricChart";
import { HingeDistributionPanel } from "../panels/HingeDistributionPanel";
import { StatisticsPanel } from "../panels/StatisticsPanel";
import { Timeline } from "../timeline/Timeline";
import { DockviewApiProvider } from "./DockviewApiContext";

type PanelCategory = "Canvas" | "Core Analysis" | "Supporting Analysis" | "Distributions" | "Tables / Data";

export type PanelType = keyof typeof PANEL_DEFINITIONS;
export type MagicPanelParams = { panelType: PanelType };

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
  | "shearData"
  | "displacementRot"
  | "velocityLin"
  | "velocityRot"
  | "accelerationLin"
  | "accelerationRot";

function check<T extends Record<string, PanelDefinition>>(obj: T): T {
  return obj;
}

const PANEL_DEFINITIONS = check({
  Timeline: {
    component: Timeline,
    category: "Core Analysis",
    icon: LineChart,
    description: "Playback timeline and overlays",
    requiredOptionalData: [],
    optionalEnhancementData: ["velocityLin", "accelerationLin", "displacementRot"],
  },
  "Corner Metric Chart": {
    component: CornerMetricChart,
    category: "Core Analysis",
    icon: ChartBarIncreasingIcon,
    description: "Per-story corner values for a selected metric",
    requiredOptionalData: [],
    optionalEnhancementData: ["velocityLin", "accelerationLin", "displacementRot", "velocityRot", "accelerationRot"],
  },
  "Main Canvas": {
    component: MainCanvasPanel,
    category: "Canvas",
    icon: Rotate3DIcon,
    description: "3D structure viewport",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
  "Data Explorer": {
    component: DataExplorerPanel,
    category: "Tables / Data",
    icon: SheetIcon,
    description: "Current values, peaks, and sortable node explorer",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
  "Floor Average Metric": {
    component: FloorAverageMetricChart,
    category: "Core Analysis",
    icon: ChartGanttIcon,
    description: "Average Metrics for a Floor",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
  "Hinge Distribution": {
    component: HingeDistributionPanel,
    category: "Distributions",
    icon: ChartColumnIcon,
    description: "Global static hinge rotation histogram",
    requiredOptionalData: ["hingeData", "beamData"],
    optionalEnhancementData: [],
  },
  // "ISD Threshold": {
  //   component: ISDThresholdPanel,
  //   category: "Core Analysis",
  //   icon: ShieldAlert,
  //   description: "Threshold evaluation summary",
  //   requiredOptionalData: [],
  //   optionalEnhancementData: [],
  // },
  Statistics: {
    component: StatisticsPanel,
    category: "Core Analysis",
    icon: Grid2X2Icon,
    description: "Simulation overview",
    requiredOptionalData: [],
    optionalEnhancementData: [],
  },
});

const PANEL_DATA_LABELS: Record<PanelDataKey, string> = {
  beamData: "beam connectivity data",
  hingeData: "hinge data",
  shearData: "shear data",
  displacementRot: "rotational displacement data",
  velocityLin: "linear velocity data",
  velocityRot: "rotational velocity data",
  accelerationLin: "linear acceleration data",
  accelerationRot: "rotational acceleration data",
};

const PANEL_CATEGORY_ORDER: PanelCategory[] = [
  "Canvas",
  "Core Analysis",
  "Supporting Analysis",
  "Tables / Data",
  "Distributions",
];

function getPanelsByCategory(): Array<{ category: PanelCategory; items: PanelType[] }> {
  return PANEL_CATEGORY_ORDER.map((category) => ({
    category,
    items: (Object.keys(PANEL_DEFINITIONS) as PanelType[]).filter(
      (panelType) => PANEL_DEFINITIONS[panelType].category === category
    ),
  })).filter((group) => group.items.length > 0);
}

function isPanelType(value: unknown): value is PanelType {
  return typeof value === "string" && value in PANEL_DEFINITIONS;
}

function joinHumanList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
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

function getPanelAvailabilityInfo(
  panelType: PanelType,
  animationData: BuildingAnimationData | null,
  loading: boolean,
  datasetStates?: Partial<Record<PanelDataKey, DatasetLoadState>>
) {
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
  const missingStates = missing
    .map((key) => datasetStates?.[key])
    .filter((state): state is DatasetLoadState => Boolean(state));

  return {
    isAvailable: false,
    descriptorText,
    disabledReason: `This panel is not available because it requires ${joinHumanList(missingLabels)}, but ${missing.length === 1 ? "it is" : "they are"} not loaded.`,
    optionalNotice: null as string | null,
    missingStates,
  };
}

function UnknownPanel() {
  return <div>Panel not found</div>;
}

export const MagicPanel = (props: IDockviewPanelProps<MagicPanelParams>) => {
  const currentPanelType = props.params.panelType;
  const panelType = PANEL_DEFINITIONS[currentPanelType];
  const CurrentComponent = panelType ? panelType.component : UnknownPanel;
  const { animationData, loading, datasetStates, requestDatasetLoad, retryDatasetLoad } = useAnimationData();
  const availability = getPanelAvailabilityInfo(
    currentPanelType,
    loading ? null : animationData,
    loading,
    datasetStates
  );

  return (
    <DockviewApiProvider api={props.containerApi}>
      <div
        className="relative h-full w-full"
        data-export-panel-root="true"
        data-export-panel-id={props.api.id}
        data-export-panel-title={currentPanelType}>
        {availability.isAvailable ? (
          <div className="h-full w-full">
            <CurrentComponent {...props} />
          </div>
        ) : (
          <PanelUnavailableState
            panelType={currentPanelType}
            disabledReason={availability.disabledReason}
            missingStates={availability.missingStates ?? []}
            onLoad={requestDatasetLoad}
            onRetry={retryDatasetLoad}
          />
        )}
      </div>
    </DockviewApiProvider>
  );
};

export const MagicPanelTab = (props: IDockviewPanelHeaderProps<MagicPanelParams>) => {
  const currentPanelType = props.params.panelType;
  const isActive = props.api.isActive;
  const isTabGroup = props.api.group.panels.length > 1;
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

  return (
    <div
      className={`group z-10 flex h-full w-full cursor-grab items-center gap-1 p-3 py-0 transition-colors ${
        isActive ? "bg-amber-50/90 text-amber-900" : "bg-neutral-200/80"
      }`}>
      <span
        className={`flex items-center gap-1.5 text-sm font-medium ${isActive ? "text-amber-900" : "text-neutral-700"}`}>
        {(() => {
          const Icon = PANEL_DEFINITIONS[currentPanelType].icon;
          return <Icon className={`size-3.5 ${isActive ? "text-amber-700" : "text-neutral-500"}`} />;
        })()}
        {currentPanelType}
      </span>
      {isTabGroup && (
        // <Button
        //   variant="secondary"
        //   size="icon-xs"
        //   className="absolute right-1 mr-1 h-5 w-5 opacity-0 group-hover:opacity-100"
        //   onClick={(e) => {
        //     e.stopPropagation();
        //     props.api.close();
        //   }}>
        //   <X />
        // </Button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            props.api.close();
          }}
          className="rounded p-1 transition-colors hover:bg-white/50"
          title="Close">
          <XIcon className="size-3" />
        </button>
      )}
    </div>
  );
};

function PanelTypePickerMenu({
  value,
  onChange,
  onRequestClose,
}: {
  value: PanelType;
  onChange: (panelType: PanelType) => void;
  onRequestClose?: () => void;
}) {
  const groupedPanels = getPanelsByCategory();
  const { animationData, loading, datasetStates } = useAnimationData();
  const titleId = useId();

  return (
    <div className="max-h-[70vh] overflow-y-auto" aria-labelledby={titleId}>
      <div className="flex flex-col gap-1 pr-1">
        {groupedPanels.map((group) => (
          <div key={group.category} className="">
            {group.items.length > 1 && (
              <div className="px-1 py-0.5 text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">
                {group.category}
              </div>
            )}
            <div className="">
              {group.items.map((panelType) => {
                const meta = PANEL_DEFINITIONS[panelType];
                const Icon = meta.icon;
                const isActive = panelType === value;
                const availability = getPanelAvailabilityInfo(
                  panelType,
                  loading ? null : animationData,
                  loading,
                  datasetStates
                );
                const hasMissingOptionalEnhancements = availability.isAvailable && Boolean(availability.optionalNotice);
                const buttonTitle = [meta.description, availability.descriptorText, availability.optionalNotice]
                  .filter(Boolean)
                  .join("\n");

                const button = (
                  <Button
                    key={panelType}
                    variant="ghost"
                    size="sm"
                    className={`flex w-full justify-start ${isActive ? "bg-linear-90 from-amber-100 via-amber-50" : !availability.isAvailable && "opacity-45"}`}
                    onClick={() => {
                      if (!availability.isAvailable) return;
                      onChange(panelType);
                      onRequestClose?.();
                    }}
                    disabled={!availability.isAvailable}
                    title={availability.isAvailable ? buttonTitle : undefined}>
                    <Icon className={isActive ? "text-amber-600" : "text-neutral-500"} />
                    <div className={"min-w-0 flex-1 text-left"}>{panelType}</div>
                    {hasMissingOptionalEnhancements ? (
                      <CircleDotDashed className="mt-0.5 size-3.5 shrink-0 text-amber-500" aria-hidden="true" />
                    ) : null}
                  </Button>
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
                    <TooltipContent side="right" className="max-w-xs flex-col">
                      <div className="font-medium">{panelType}</div>
                      {availability.disabledReason ? <div className="mt-0.5">{availability.disabledReason}</div> : null}
                      <div className="text-[11px] opacity-90">{availability.descriptorText}</div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
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
      params: { panelType: activePanelType },
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
  const showPanelPicker = activePanel.api.isActive || activePanel.api.group.panels.length === 1;

  // const handleMaximize = () => {
  //   activePanel.api.maximize();
  // };

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

      {!isTabGroup && (
        <Button variant="ghost" size="icon-xs" onClick={handleClose} title="Close panel">
          <X />
        </Button>
      )}

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
          <PopoverContent className={"w-48 p-1"} align="end">
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
              <div className="grid grid-cols-2 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => {
                    handleSplitHorizontal();
                    setIsMoreOpen(false);
                  }}>
                  <Columns className="mr-2 h-4 w-4" />
                  Right
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
                  Down
                </Button>
              </div>
              {showPanelPicker ? (
                <>
                  <div className="mx-1 my-1 h-px bg-neutral-200" />
                  <PanelTypePickerMenu
                    value={activePanelType}
                    onChange={(newPanelType) => {
                      activePanel.api.updateParameters({ panelType: newPanelType });
                    }}
                    onRequestClose={() => setIsMoreOpen(false)}
                  />
                </>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

function PanelUnavailableState({
  panelType,
  disabledReason,
  missingStates,
  onLoad,
  onRetry,
}: {
  panelType: PanelType;
  disabledReason: string | null;
  missingStates: DatasetLoadState[];
  onLoad: (key: PanelDataKey) => void;
  onRetry: (key: PanelDataKey) => void;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-2 text-center text-base font-semibold text-neutral-900">{panelType}</div>
        <div className="mb-5 text-center text-sm text-neutral-600">{disabledReason}</div>
        <div className="space-y-4">
          {missingStates.map((state) => {
            const isBusy = state.stage === "queued" || state.stage === "fetching" || state.stage === "parsing";
            return (
              <div key={state.key}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-neutral-800">{state.label}</span>
                  <span className="text-[10px] text-neutral-500">{state.message}</span>
                </div>
                {isBusy ? (
                  <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-500">
                  <span>{state.error ?? (state.selected ? "Background load active" : "Dataset not selected yet")}</span>
                  {state.stage === "error" ? (
                    <Button size="xs" variant="outline" onClick={() => onRetry(state.key as PanelDataKey)}>
                      Retry
                    </Button>
                  ) : isBusy ? (
                    <span>Loading…</span>
                  ) : (
                    <Button size="xs" variant="outline" onClick={() => onLoad(state.key as PanelDataKey)}>
                      Load In Background
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
