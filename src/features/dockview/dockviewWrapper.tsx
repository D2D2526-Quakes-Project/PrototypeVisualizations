import type { DockviewApi, DockviewReadyEvent, IDockviewReactProps, SerializedDockview } from "dockview-react";
import { DockviewReact, themeLight } from "dockview-react";

export interface DockviewWrapperProps extends Omit<IDockviewReactProps, "onReady"> {
  className?: string;
  onReady?: (event: DockviewReadyEvent) => void;
  initialLayout?: SerializedDockview;
  onLayoutChange?: (layout: SerializedDockview) => void;
  createDefaultLayout?: (api: DockviewApi) => void;
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
      onReady={handleReady}
      theme={themeLight}
      {...props}
    />
  );
}
