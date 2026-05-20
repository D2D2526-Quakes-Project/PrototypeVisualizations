import type { DockviewApi, DockviewReadyEvent, IDockviewReactProps, SerializedDockview } from "dockview-react";
import { DockviewReact, themeLight } from "dockview-react";

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

  return (
    <DockviewReact
      className={`dockview-theme-light ${className || ""}`}
      onReady={handleReady}
      theme={themeLight}
      {...props}
    />
  );
}
