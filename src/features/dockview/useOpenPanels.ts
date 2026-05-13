import { useCallback, useRef, useSyncExternalStore } from "react";
import type { DockviewApi } from "dockview";
import { useDockviewApi } from "./DockviewApiContext";

export interface OpenPanels {
  nodeIds: number[];
  crossSectionIds: CrossSectionParams[];
  floorIds: string[];
}

export interface CrossSectionParams {
  crossSectionType: "X" | "Y";
  position: string;
}

const EMPTY: OpenPanels = { nodeIds: [], crossSectionIds: [], floorIds: [] };

function nodePanelId(nodeId: number): string {
  return `node-panel-${nodeId}`;
}

function floorPanelId(storyId: string): string {
  return `floor-panel-${storyId}`;
}

function crossSectionPanelId(section: CrossSectionParams): string {
  return `cross-section-panel-${section.crossSectionType}-${section.position}`;
}
function computePanels(api: DockviewApi | undefined | null): OpenPanels {
  if (!api) return EMPTY;

  const nodeSet = new Set<number>();
  const crossSectionSet = new Set<CrossSectionParams>();
  const floorSet = new Set<string>();

  for (const panel of api.panels) {
    const component = panel.api.component;
    const params = panel.params;
    if (!params) continue;

    if (component === "nodePanel") {
      nodeSet.add(params.nodeId);
    } else if (component === "crossSectionPanel") {
      crossSectionSet.add(params as CrossSectionParams);
    } else if (component === "floorPanel") {
      if (typeof params.storyId === "string") {
        floorSet.add(params.storyId);
      }
    }
  }

  return {
    nodeIds: Array.from(nodeSet),
    crossSectionIds: Array.from(crossSectionSet),
    floorIds: Array.from(floorSet),
  };
}

export function useOpenPanels(): OpenPanels & {
  openNodePanel: (nodeId: number) => void;
  closeNodePanel: (nodeId: number) => void;
  openFloorPanel: (storyId: string) => void;
  closeFloorPanel: (storyId: string) => void;
  openCrossSectionPanel: (params: CrossSectionParams) => void;
  closeCrossSectionPanel: (params: CrossSectionParams) => void;
} {
  const api = useDockviewApi();
  const lastRef = useRef<OpenPanels>(EMPTY);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!api) return () => {};
      const disposables = [
        api.onDidAddPanel(onStoreChange),
        api.onDidRemovePanel(onStoreChange),
        api.onDidLayoutChange(onStoreChange),
      ];
      return () => disposables.forEach((d) => d.dispose());
    },
    [api]
  );

  const getSnapshot = useCallback((): OpenPanels => {
    const next = computePanels(api);
    if (JSON.stringify(next) === JSON.stringify(lastRef.current)) return lastRef.current;
    lastRef.current = next;
    return next;
  }, [api]);

  const panels = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const openNodePanel = useCallback(
    (nodeId: number) => {
      if (!api) return;
      const panelId = nodePanelId(nodeId);
      const existing = api.getPanel(panelId);
      if (existing) {
        existing.api.setActive();
        return;
      }
      api.addPanel({
        id: panelId,
        component: "nodePanel",
        tabComponent: "nodeTab",
        title: `Node ${nodeId}`,
        params: { nodeId },
        position: { direction: "right" },
      });
    },
    [api]
  );

  const closeNodePanel = useCallback(
    (nodeId: number) => {
      if (!api) return;
      const panel = api.getPanel(nodePanelId(nodeId));
      if (panel) {
        api.removePanel(panel);
      }
    },
    [api]
  );

  const openFloorPanel = useCallback(
    (storyId: string) => {
      if (!api) return;
      const panelId = floorPanelId(storyId);
      const existing = api.getPanel(panelId);
      if (existing) {
        existing.api.setActive();
        return;
      }
      api.addPanel({
        id: panelId,
        component: "floorPanel",
        tabComponent: "floorTab",
        title: `Floor ${storyId}`,
        params: { storyId },
        position: { direction: "right" },
      });
    },
    [api]
  );

  const closeFloorPanel = useCallback(
    (storyId: string) => {
      if (!api) return;
      const panel = api.getPanel(floorPanelId(storyId));
      if (panel) {
        api.removePanel(panel);
      }
    },
    [api]
  );

  const openCrossSectionPanel = useCallback(
    (params: CrossSectionParams) => {
      if (!api) return;
      const panelId = crossSectionPanelId(params);
      const existing = api.getPanel(panelId);
      if (existing) {
        existing.api.setActive();
        return;
      }
      api.addPanel({
        id: panelId,
        component: "crossSectionPanel",
        tabComponent: "crossSectionTab",
        title: `Cross-Section ${params.crossSectionType}-${params.position}`,
        params,
        position: { direction: "right" },
      });
    },
    [api]
  );

  const closeCrossSectionPanel = useCallback(
    (params: CrossSectionParams) => {
      if (!api) return;
      const panel = api.getPanel(crossSectionPanelId(params));
      if (panel) {
        api.removePanel(panel);
      }
    },
    [api]
  );

  return {
    ...panels,
    openNodePanel,
    closeNodePanel,
    openFloorPanel,
    closeFloorPanel,
    openCrossSectionPanel,
    closeCrossSectionPanel,
  };
}
