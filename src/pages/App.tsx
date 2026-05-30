import { useAnimationData } from "@/features/animation-data/useAnimationData";
import { DockviewWrapper } from "@/features/dockview/dockviewWrapper";
import {
  MagicPanel,
  MagicPanelHeaderActions,
  MagicPanelTab,
  type MagicPanelParams,
} from "@/features/dockview/MagicPanel";
import { CrossSectionPanel, CrossSectionTab } from "@/features/panels/CrossSectionPanel";
import { FloorPanel, FloorTab } from "@/features/panels/FloorPanel";
import { NodePanel, NodeTab } from "@/features/panels/NodePanel";
import { debounce } from "@/lib/utils";
import { useFlushOnUnload, useProfileActions, useProfileData } from "@/state";
import { BUILT_IN_PROFILE_DEFINITIONS } from "@/state/default";
import { type DockviewApi, type SerializedDockview } from "dockview-react";
import { useCallback, useEffect, useMemo } from "react";

const components = {
  nodePanel: NodePanel,
  magicPanel: MagicPanel,
  floorPanel: FloorPanel,
  crossSectionPanel: CrossSectionPanel,
};

const tabComponents = {
  nodeTab: NodeTab,
  floorTab: FloorTab,
  magicPanelTab: MagicPanelTab,
  crossSectionTab: CrossSectionTab,
};

export function App() {
  useFlushOnUnload();

  return (
    <div className={"flex min-h-0 flex-1 flex-col"} data-export-workspace>
      <DockviewContainer />
      <ProfileDatasetEffect />
    </div>
  );
}

function DockviewContainer() {
  const profileId = useProfileData((state) => state.profileId);
  const dockviewLayout = useProfileData((state) => state.dockviewLayout);
  const { setDockviewLayout } = useProfileActions();
  const { animationData } = useAnimationData();
  const storyOrder = animationData.metadata.storyOrder;

  const debouncedSave = useMemo(
    () => debounce((layout: SerializedDockview) => setDockviewLayout(layout), 1000),
    [setDockviewLayout]
  );

  const handleLayoutChange = useCallback(
    (layout: SerializedDockview) => {
      debouncedSave(layout);
    },
    [debouncedSave]
  );

  const createDefaultLayout = useCallback(
    (api: DockviewApi) => {
      if (profileId === "displacements") {
        createDisplacementsLayout(api);
      } else if (profileId === "hinges") {
        createHingesPreviewLayout(api, storyOrder);
      } else if (profileId === "shear") {
        createShearLayout(api);
      } else if (profileId === "story-drifts") {
        createStoryDriftsLayout(api);
      } else {
        createDefaultLayout_(api);
      }
    },
    [profileId, storyOrder]
  );

  return (
    <DockviewWrapper
      key={profileId}
      components={components}
      tabComponents={tabComponents}
      rightHeaderActionsComponent={MagicPanelHeaderActions}
      onLayoutChange={handleLayoutChange}
      initialLayout={dockviewLayout ?? undefined}
      createDefaultLayout={createDefaultLayout}
    />
  );
}

function ProfileDatasetEffect() {
  const profileId = useProfileData((state) => state.profileId);
  const { datasetStates, requestDatasetLoad } = useAnimationData();
  const { setActiveProfile } = useProfileActions();

  useEffect(() => {
    if (!datasetStates) return;

    const def = BUILT_IN_PROFILE_DEFINITIONS.find((d) => d.profileId === profileId);
    if (def && def.requiredDatasets.length > 0 && def.profileId !== "default") {
      const hasMissing = def.requiredDatasets.some((key) => datasetStates[key]?.available === false);
      if (hasMissing) {
        setActiveProfile("default");
        return;
      }
    }

    if (!def) return;
    for (const key of def.requiredDatasets) {
      const state = datasetStates[key];
      if (state?.available && state.stage !== "fetching" && state.stage !== "parsing" && state.stage !== "ready") {
        requestDatasetLoad(key);
      }
    }
  }, [profileId, datasetStates, requestDatasetLoad, setActiveProfile]);

  return null;
}

function createDefaultLayout_(api: DockviewApi) {
  const mainCanvas = api.addPanel<MagicPanelParams>({
    id: "main-canvas",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    params: { panelType: "Main Canvas", isPrimary: true },
  });
  mainCanvas.group.locked = true;

  const timelinePanel = api.addPanel<MagicPanelParams>({
    id: "timeline",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: mainCanvas, direction: "below" },
    params: { panelType: "Timeline" },
    initialHeight: 220,
  });

  api.addPanel<MagicPanelParams>({
    id: "statistic-panel",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: timelinePanel, direction: "right" },
    params: { panelType: "Statistics" },
    initialWidth: 500,
  });

  const cornerMetricPanel = api.addPanel<MagicPanelParams>({
    id: "corner-metric-chart",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: mainCanvas, direction: "left" },
    params: { panelType: "Corner Metric Chart" },
    initialWidth: 500,
  });

  api.addPanel<MagicPanelParams>({
    id: "floor-displacement",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: cornerMetricPanel, direction: "within" },
    params: { panelType: "Floor Average Metric" },
  });

  api.addPanel<MagicPanelParams>({
    id: "floor-waveforms",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: cornerMetricPanel, direction: "within" },
    params: { panelType: "Floor Waveforms" },
  });

  cornerMetricPanel.focus();
}

function createDisplacementsLayout(api: DockviewApi) {
  const primaryCanvas = api.addPanel<MagicPanelParams>({
    id: "main-canvas-primary",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    params: { panelType: "Main Canvas", isPrimary: true },
  });
  primaryCanvas.group.locked = true;

  api.addPanel<MagicPanelParams>({
    id: "timeline",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: primaryCanvas, direction: "below" },
    params: { panelType: "Timeline" },
    initialHeight: 220,
  });

  const side = api.addPanel<MagicPanelParams>({
    id: "floor-displacement",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: primaryCanvas, direction: "left" },
    params: { panelType: "Floor Average Metric" },
    initialWidth: 500,
  });

  api.addPanel<MagicPanelParams>({
    id: "floor-waveforms",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: side, direction: "within" },
    params: { panelType: "Floor Waveforms" },
    inactive: true,
  });

  api.addPanel<MagicPanelParams>({
    id: "main-canvas-secondary",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: primaryCanvas, direction: "right" },
    params: { panelType: "Main Canvas", isPrimary: false },
    initialWidth: 400,
  });

  primaryCanvas.focus();
}

function createHingesPreviewLayout(api: DockviewApi, storyOrder: string[]) {
  const primaryCanvas = api.addPanel<MagicPanelParams>({
    id: "main-canvas-primary",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    params: { panelType: "Main Canvas", isPrimary: true },
    initialHeight: 760,
  });
  primaryCanvas.group.locked = true;

  api.addPanel<MagicPanelParams>({
    id: "hinge-distribution",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: primaryCanvas, direction: "left" },
    params: { panelType: "Hinge Distribution" },
    initialWidth: 400,
  });

  if (storyOrder.length >= 2) {
    const top75 = storyOrder[Math.floor(storyOrder.length * 0.75)];
    const top25 = storyOrder[Math.floor(storyOrder.length * 0.25)];

    const topFloor = api.addPanel<{ storyId: string }>({
      id: "floor-" + top75,
      component: "floorPanel",
      tabComponent: "floorTab",
      position: { referencePanel: primaryCanvas, direction: "right" },
      params: { storyId: top75 },
      maximumWidth: 300,
    });

    api.addPanel<{ storyId: string }>({
      id: "floor-" + top25,
      component: "floorPanel",
      tabComponent: "floorTab",
      position: { referencePanel: topFloor, direction: "below" },
      params: { storyId: top25 },
      maximumWidth: 300,
    });
  }

  primaryCanvas.focus();
}

function createShearLayout(api: DockviewApi) {
  const primaryCanvas = api.addPanel<MagicPanelParams>({
    id: "main-canvas-primary",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    params: { panelType: "Main Canvas", isPrimary: true },
  });
  primaryCanvas.group.locked = true;

  api.addPanel<MagicPanelParams>({
    id: "floor-average",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: primaryCanvas, direction: "left" },
    params: { panelType: "Floor Average Metric" },
  });

  primaryCanvas.focus();
}

function createStoryDriftsLayout(api: DockviewApi) {
  const primaryCanvas = api.addPanel<MagicPanelParams>({
    id: "main-canvas-primary",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    params: { panelType: "Main Canvas", isPrimary: true },
  });
  primaryCanvas.group.locked = true;

  const cornerMetricPanel = api.addPanel<MagicPanelParams>({
    id: "corner-metric-chart",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: primaryCanvas, direction: "left" },
    params: { panelType: "Corner Metric Chart" },
    initialWidth: 500,
  });

  api.addPanel<MagicPanelParams>({
    id: "floor-waveforms",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: cornerMetricPanel, direction: "within" },
    params: { panelType: "Floor Waveforms" },
  });

  api.addPanel<MagicPanelParams>({
    id: "floor-average",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: cornerMetricPanel, direction: "within" },
    params: { panelType: "Floor Average Metric" },
  });

  api.addPanel<MagicPanelParams>({
    id: "timeline",
    component: "magicPanel",
    tabComponent: "magicPanelTab",
    position: { referencePanel: primaryCanvas, direction: "below" },
    params: { panelType: "Timeline" },
    initialHeight: 220,
  });

  cornerMetricPanel.focus();
}
