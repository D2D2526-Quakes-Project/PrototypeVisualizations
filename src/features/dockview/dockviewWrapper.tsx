import type {
  DockviewApi,
  DockviewReadyEvent,
  DockviewTheme,
  IDockviewReactProps,
  SerializedDockview,
} from "dockview-react";
import { DockviewReact, themeLightSpaced } from "dockview-react";
import { useState } from "react";
import { EdgeAddPanelZones } from "./EdgeAddPanelZones";

export interface DockviewWrapperProps extends Omit<IDockviewReactProps, "onReady"> {
  className?: string;
  onReady?: (event: DockviewReadyEvent) => void;
  initialLayout?: SerializedDockview;
  onLayoutChange?: (layout: SerializedDockview) => void;
  createDefaultLayout?: (api: DockviewApi) => void;
}

function isMainCanvasPanel(panel: { params?: Record<string, unknown> }): boolean {
  return panel.params?.panelType === "Main Canvas";
}

function ensurePrimaryCanvas(api: DockviewApi): void {
  const canvasPanels = api.panels.filter(isMainCanvasPanel);
  const primaryPanels = canvasPanels.filter((p) => p.params?.isPrimary === true);

  if (primaryPanels.length === 0 && canvasPanels.length > 0) {
    canvasPanels[0]!.api.updateParameters({
      ...canvasPanels[0]!.params,
      isPrimary: true,
    });
  } else if (primaryPanels.length > 1) {
    for (let i = 1; i < primaryPanels.length; i++) {
      primaryPanels[i]!.api.updateParameters({
        ...primaryPanels[i]!.params,
        isPrimary: false,
      });
    }
  }
}

export function DockviewWrapper({
  className,
  onReady,
  initialLayout,
  onLayoutChange,
  createDefaultLayout,
  ...props
}: DockviewWrapperProps) {
  const [api, setApi] = useState<DockviewApi | null>(null);
  const handleReady = (event: DockviewReadyEvent) => {
    const api = event.api;

    if (initialLayout) {
      try {
        api.fromJSON(initialLayout);
      } catch (error) {
        console.warn("Failed to load initial layout:", error);
        createDefaultLayout?.(api);
      }
    } else {
      createDefaultLayout?.(api);
    }

    ensurePrimaryCanvas(api);
    setApi(api);

    if (onLayoutChange) {
      api.onDidLayoutChange(() => {
        const layout = api.toJSON();
        onLayoutChange(layout);
      });
    }

    api.onDidAddPanel((panel) => {
      if (isMainCanvasPanel(panel)) {
        const hasPrimary = api.panels.some(
          (p) => p.id !== panel.id && isMainCanvasPanel(p) && p.params?.isPrimary === true
        );
        panel.api.updateParameters({
          ...panel.params,
          isPrimary: !hasPrimary,
        });
      }
    });

    api.onDidRemovePanel((panel) => {
      if (isMainCanvasPanel(panel) && panel.params?.isPrimary === true) {
        ensurePrimaryCanvas(api);
      }
    });

    onReady?.(event);
  };

  //   .dockview-theme-overrides {
  //   /* --dv-sash-border-radius: "0px"; */
  //   /* --dv-tab-border-radius: "5px"; */
  //   /* --dv-border-radius: "9px"; */
  //   /* --dv-tabs-and-actions-container-font-size: "10px"; */
  //   /* --dv-tabs-and-actions-container-height: "36px"; */
  //   /* --dv-spacing-padding: "5px"; */
  //   /* --dv-sash-color: "#ededed"; */
  //   --dv-active-sash-color: "#000000";
  //   --dv-drag-over-background-color: "#000000";
  // }

  const theme: DockviewTheme = {
    ...themeLightSpaced,
  };

  return (
    <div className="relative flex-1">
      <style>{`
        .dockview-theme-light-spaced {
          --dv-sash-color: rgba(0, 0, 0, 0.1);
          --dv-active-sash-color: rgba(0, 0, 0, 0.25);
          --dv-drag-over-background-color: rgba(0, 0, 0, 0.25);
          --dv-active-sash-transition-delay: 0s;
          --dv-border-radius: var(--radius);
          --dv-activegroup-visiblepanel-tab-background-color: transparent;
          --dv-inactivegroup-visiblepanel-tab-background-color: transparent;
          --dv-activegroup-hiddenpanel-tab-background-color: transparent;
          --dv-inactivegroup-hiddenpanel-tab-background-color: transparent;
          --dv-tabs-and-actions-container-height: fit-content;
          --dv-group-view-background-color: var(--muted)
          --dv-spacing-padding: var(--radius);
        }
        .dv-tab {
          margin: 0;
          padding: 0;
        }
        .dockview-theme-light-spaced .dv-groupview .dv-tabs-and-actions-container {
          padding: 0;
        }
        .dv-groupview {
          border: var(--border) 1px solid;
        }
        .dv-split-view-container.dv-vertical > .dv-sash-container > .dv-sash{
          display: flex;
          justify-content: center;
          height: 8px;
          margin-top: -2px;
          background: transparent;
          
          &::before {
            content: "";
            width: 4rem;
            height: 4px;
            margin-top: 2px;
            background: var(--dv-sash-color);
            border-radius: 24px;
            transition: background-color 400ms ease;
          }

          &:hover {
            background: transparent;
          }
          &:hover::before {
            width: 100%;
            background: var(--dv-active-sash-color);
          }
        }
        .dv-split-view-container.dv-horizontal > .dv-sash-container > .dv-sash{
          display: flex;
          flex-direction: column;
          justify-content: center;
          width: 8px;
          margin-left: -2px;
          background: transparent;
          
          &::before {
            content: "";
            height: 4rem;
            width: 4px;
            margin-left: 2px;
            background: var(--dv-sash-color);
            border-radius: 24px;
            transition: background-color 400ms ease;
          }

          &:hover {
            background: transparent;
          }
          &:hover::before {
            height: 100%;
            background: var(--dv-active-sash-color);
          }
        }
        .dv-split-view-container .dv-sash-container .dv-sash {
          z-index: 1;
        }
        .dv-drop-target-container {
          --dv-transition-duration: 100ms;
        }
      `}</style>
      <DockviewReact
        className={className}
        onReady={handleReady}
        theme={theme}
        {...props}
        singleTabMode="fullwidth"
        disableTabsOverflowList={true}
        disableFloatingGroups={true}
        disableAutoResizing={true}
      />
      <EdgeAddPanelZones api={api} />
    </div>
  );
}
