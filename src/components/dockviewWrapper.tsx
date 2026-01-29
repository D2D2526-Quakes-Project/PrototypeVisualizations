import React from "react";
import { DockviewReact, themeLight } from "dockview";
import type { DockviewReadyEvent, IDockviewPanelProps, SerializedDockview } from "dockview";
import "dockview/dist/styles/dockview.css";

export interface DockviewWrapperProps {
  className?: string;
  onReady?: (event: DockviewReadyEvent) => void;
  components: Record<string, React.FC<IDockviewPanelProps<any>>>;
  initialLayout?: SerializedDockview;
  onLayoutChange?: (layout: SerializedDockview) => void;
  createDefaultLayout?: (api: any) => void;
}

export function DockviewWrapper({
  className,
  onReady,
  components,
  initialLayout,
  onLayoutChange,
  createDefaultLayout,
}: DockviewWrapperProps) {
  const handleReady = (event: DockviewReadyEvent) => {
    const api = event.api;

    // Load initial layout if provided
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

    // Setup layout change listener
    if (onLayoutChange) {
      api.onDidLayoutChange(() => {
        const layout = api.toJSON();
        onLayoutChange(layout);
      });
    }

    onReady?.(event);
  };

  return (
    <DockviewReact
      className={`dockview-theme-light ${className || ""}`}
      components={components}
      onReady={handleReady}
      theme={themeLight}
    />
  );
}
