// import { useViewStore, useViewStoreRaw, type CrossSectionSelectionState } from "@/state";
// import type { DockviewApi } from "dockview";
// import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";

// export type CrossSectionType = "X" | "Y" | "Z";

// export interface CrossSection extends CrossSectionSelectionState {
//   type: CrossSectionType;
// }

// interface CrossSectionSelectionContextType {
//   selectedCrossSection: CrossSection | null;
//   hoveredCrossSection: CrossSection | null;
//   selectCrossSection: (crossSection: CrossSection) => void;
//   deselectCrossSection: () => void;
//   setHovered: (crossSection: CrossSection | null) => void;
//   setDockviewApi: (api: DockviewApi) => void;
//   openCrossSectionPanel: (crossSection: CrossSection) => void;
// }

// const CrossSectionSelectionContext = createContext<CrossSectionSelectionContextType | undefined>(undefined);

// let dockviewApiRef: DockviewApi | null = null;
// let disposePanelSubscription: (() => void) | null = null;

// export function useCrossSectionSelection() {
//   const context = useContext(CrossSectionSelectionContext);
//   if (!context) {
//     throw new Error("useCrossSectionSelection must be used within CrossSectionSelectionProvider");
//   }
//   return context;
// }

// export function CrossSectionSelectionProvider({ children }: { children: ReactNode }) {
//   // const { animationData } = useAnimationData();
//   const store = useViewStoreRaw();

//   const selectedCrossSection = useViewStore((s) => s.selectedCrossSection);
//   const hoveredCrossSection = useViewStore((s) => s.hoveredCrossSection);
//   const selectCrossSectionStore = useViewStore((s) => s.selectCrossSection);
//   const deselectCrossSectionStore = useViewStore((s) => s.deselectCrossSection);
//   const setHoveredCrossSectionStore = useViewStore((s) => s.setHoveredCrossSection);

//   const setDockviewApi = useCallback(
//     (api: DockviewApi) => {
//       dockviewApiRef = api;

//       if (disposePanelSubscription) {
//         disposePanelSubscription();
//       }

//       const disposable = api.onDidRemovePanel((panel) => {
//         if (panel.id.startsWith("crossSection-panel-")) {
//           store.getState().deselectCrossSection();
//         }
//       });

//       disposePanelSubscription = () => disposable.dispose();
//     },
//     [store]
//   );

//   const openCrossSectionPanel = useCallback((crossSection: CrossSection) => {
//     if (!dockviewApiRef) return;

//     const isFloor = crossSection.type === "Z";
//     const isXSection = crossSection.type === "X";
//     const isYSection = crossSection.type === "Y";

//     if (!isFloor && !isXSection && !isYSection) return;

//     let panelId: string;
//     let panelTitle: string;
//     let component: string;
//     let tabComponent: string;
//     let params: { storyId?: string; crossSectionType?: "X" | "Y"; position?: number; nodeIds?: number[] };

//     if (isFloor) {
//       panelId = `crossSection-panel-${crossSection.storyId}`;
//       panelTitle = `Floor ${crossSection.storyId}`;
//       component = "floorPanel";
//       tabComponent = "floorTab";
//       params = { storyId: crossSection.storyId };
//     } else {
//       const pos = Number(crossSection.value);
//       panelId = `crossSection-panel-${crossSection.type}-${pos}`;
//       panelTitle = `${crossSection.type} Section ${pos}`;
//       component = "crossSectionPanel";
//       tabComponent = "crossSectionTab";
//       params = {
//         crossSectionType: crossSection.type as "X" | "Y",
//         position: pos,
//         nodeIds: crossSection.nodeIds,
//       };
//     }

//     const existingPanel = dockviewApiRef.getPanel(panelId);

//     if (existingPanel) {
//       existingPanel.focus();
//       return;
//     }

//     dockviewApiRef.addPanel({
//       id: panelId,
//       component,
//       tabComponent,
//       title: panelTitle,
//       params,
//       maximumWidth: 300,
//       position: { direction: "right" },
//     });
//   }, []);

//   const selectCrossSection = useCallback(
//     (crossSection: CrossSection) => {
//       selectCrossSectionStore(crossSection);
//       if (
//         (crossSection.type === "Z" && crossSection.storyId) ||
//         crossSection.type === "X" ||
//         crossSection.type === "Y"
//       ) {
//         openCrossSectionPanel(crossSection);
//       }
//     },
//     [openCrossSectionPanel, selectCrossSectionStore]
//   );

//   const deselectCrossSection = useCallback(() => {
//     deselectCrossSectionStore();
//   }, [deselectCrossSectionStore]);

//   const setHovered = useCallback(
//     (crossSection: CrossSection | null) => {
//       setHoveredCrossSectionStore(crossSection);
//     },
//     [setHoveredCrossSectionStore]
//   );

//   const value = useMemo<CrossSectionSelectionContextType>(
//     () => ({
//       selectedCrossSection: selectedCrossSection as CrossSection | null,
//       hoveredCrossSection: hoveredCrossSection as CrossSection | null,
//       selectCrossSection,
//       deselectCrossSection,
//       setHovered,
//       setDockviewApi,
//       openCrossSectionPanel,
//     }),
//     [
//       selectedCrossSection,
//       hoveredCrossSection,
//       selectCrossSection,
//       deselectCrossSection,
//       setHovered,
//       setDockviewApi,
//       openCrossSectionPanel,
//     ]
//   );

//   useEffect(() => {
//     return () => {
//       if (disposePanelSubscription) {
//         disposePanelSubscription();
//         disposePanelSubscription = null;
//       }
//       dockviewApiRef = null;
//     };
//   }, []);

//   return <CrossSectionSelectionContext.Provider value={value}>{children}</CrossSectionSelectionContext.Provider>;
// }
