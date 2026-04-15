import { useAnimationData } from "@/lib/useAnimationData";
import { useViewStore, useViewStoreRaw, type CrossSectionSelectionState } from "@/state";
import type { DockviewApi } from "dockview";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";

export type CrossSectionType = "X" | "Y" | "Z";

export interface CrossSection extends CrossSectionSelectionState {
  type: CrossSectionType;
}

interface CrossSectionDockContextType {
  openCrossSectionPanel: (storyId: string) => void;
}

export const CrossSectionDockContext = createContext<CrossSectionDockContextType | undefined>(undefined);

export function useCrossSectionDock() {
  const context = useContext(CrossSectionDockContext);
  if (!context) {
    throw new Error("useCrossSectionDock must be used within CrossSectionDockProvider");
  }
  return context;
}

interface CrossSectionSelectionContextType {
  selectedCrossSection: CrossSection | null;
  hoveredCrossSection: CrossSection | null;
  selectCrossSection: (crossSection: CrossSection) => void;
  deselectCrossSection: () => void;
  setHovered: (crossSection: CrossSection | null) => void;
  setDockviewApi: (api: DockviewApi) => void;
  openCrossSectionPanel: (storyId: string) => void;
}

const CrossSectionSelectionContext = createContext<CrossSectionSelectionContextType | undefined>(undefined);

let dockviewApiRef: DockviewApi | null = null;
let disposePanelSubscription: (() => void) | null = null;

export function useCrossSectionSelection() {
  const context = useContext(CrossSectionSelectionContext);
  if (!context) {
    throw new Error("useCrossSectionSelection must be used within CrossSectionSelectionProvider");
  }
  return context;
}

export function CrossSectionSelectionProvider({ children }: { children: ReactNode }) {
  const { animationData } = useAnimationData();
  const store = useViewStoreRaw();

  const selectedCrossSection = useViewStore((s) => s.selectedCrossSection);
  const hoveredCrossSection = useViewStore((s) => s.hoveredCrossSection);
  const crossSectionEnabled = useViewStore((s) => s.crossSectionEnabled);
  const setCrossSectionEnabled = useViewStore((s) => s.setCrossSectionEnabled);
  const selectCrossSectionStore = useViewStore((s) => s.selectCrossSection);
  const deselectCrossSectionStore = useViewStore((s) => s.deselectCrossSection);
  const setHoveredCrossSectionStore = useViewStore((s) => s.setHoveredCrossSection);

  const setDockviewApi = useCallback(
    (api: DockviewApi) => {
      dockviewApiRef = api;

      if (disposePanelSubscription) {
        disposePanelSubscription();
      }

      const disposable = api.onDidRemovePanel((panel) => {
        if (panel.id.startsWith("crossSection-panel-")) {
          store.getState().deselectCrossSection();
        }
      });

      disposePanelSubscription = () => disposable.dispose();
    },
    [store]
  );

  const openCrossSectionPanel = useCallback((storyId: string) => {
    if (!dockviewApiRef) return;

    const panelId = `crossSection-panel-${storyId}`;
    const existingPanel = dockviewApiRef.getPanel(panelId);

    if (existingPanel) {
      existingPanel.focus();
      return;
    }

    dockviewApiRef.addPanel({
      id: panelId,
      component: "floorPanel",
      tabComponent: "floorTab",
      title: `Floor ${storyId}`,
      params: { storyId },
      maximumWidth: 300,
      position: { direction: "right" },
    });
  }, []);

  const selectCrossSection = useCallback(
    (crossSection: CrossSection) => {
      selectCrossSectionStore(crossSection);
      if (crossSection.type === "floor" && crossSection.storyId) {
        openCrossSectionPanel(crossSection.storyId);
      }
    },
    [openCrossSectionPanel, selectCrossSectionStore]
  );

  const deselectCrossSection = useCallback(() => {
    deselectCrossSectionStore();
  }, [deselectCrossSectionStore]);

  const setHovered = useCallback(
    (crossSection: CrossSection | null) => {
      setHoveredCrossSectionStore(crossSection);
    },
    [setHoveredCrossSectionStore]
  );

  const value = useMemo<CrossSectionSelectionContextType>(
    () => ({
      selectedCrossSection: selectedCrossSection as CrossSection | null,
      hoveredCrossSection: hoveredCrossSection as CrossSection | null,
      selectCrossSection,
      deselectCrossSection,
      setHovered,
      setDockviewApi,
      openCrossSectionPanel,
    }),
    [
      selectedCrossSection,
      hoveredCrossSection,
      selectCrossSection,
      deselectCrossSection,
      setHovered,
      setDockviewApi,
      openCrossSectionPanel,
    ]
  );

  useEffect(() => {
    return () => {
      if (disposePanelSubscription) {
        disposePanelSubscription();
        disposePanelSubscription = null;
      }
      dockviewApiRef = null;
    };
  }, []);

  return <CrossSectionSelectionContext.Provider value={value}>{children}</CrossSectionSelectionContext.Provider>;
}
