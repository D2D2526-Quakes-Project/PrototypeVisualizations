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
import { useProfileActions, useProfileData } from "@/state";
import { type DockviewApi, type SerializedDockview } from "dockview-react";
import { useCallback, useMemo } from "react";

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
  return (
    <div className={"flex min-h-0 flex-1 flex-col"}>
      <DockviewContainer />
    </div>
  );
}

function DockviewContainer() {
  const profileId = useProfileData((state) => state.profileId);
  const dockviewLayout = useProfileData((state) => state.dockviewLayout);
  const { setDockviewLayout } = useProfileActions();

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

  const createDefaultLayout = useCallback((api: DockviewApi) => {
    const mainCanvas = api.addPanel<MagicPanelParams>({
      id: "main-canvas",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      params: { panelType: "Main Canvas" },
      initialHeight: 760,
    });

    api.addPanel<MagicPanelParams>({
      id: "timeline",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      position: { referencePanel: mainCanvas, direction: "below" },
      params: { panelType: "Timeline" },
      initialHeight: 200,
    });

    const interstoryDriftPanel = api.addPanel<MagicPanelParams>({
      id: "corner-metric-chart",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      position: { referencePanel: mainCanvas, direction: "left" },
      params: { panelType: "Corner Metric Chart" },
      initialWidth: 300,
    });

    api.addPanel<MagicPanelParams>({
      id: "floor-displacement",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      position: { referencePanel: interstoryDriftPanel, direction: "within" },
      params: { panelType: "Floor Average Metric" },
    });

    api.addPanel<MagicPanelParams>({
      id: "floor-waveforms",
      component: "magicPanel",
      tabComponent: "magicPanelTab",
      position: { referencePanel: interstoryDriftPanel, direction: "within" },
      params: { panelType: "Floor Waveforms" },
    });

    interstoryDriftPanel.focus();
  }, []);

  return (
    <DockviewWrapper
      key={profileId}
      components={components}
      tabComponents={tabComponents}
      rightHeaderActionsComponent={MagicPanelHeaderActions}
      onLayoutChange={handleLayoutChange}
      initialLayout={dockviewLayout ?? undefined}
      createDefaultLayout={createDefaultLayout}
      className="flex-1"
      singleTabMode="fullwidth"
    />
  );
}
