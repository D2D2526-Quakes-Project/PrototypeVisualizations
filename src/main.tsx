import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import * as THREE from "three";
import { ErrorPage } from "./components/ErrorPage";
import { NavigationBar } from "./components/NavigationBar";
import { AnimationDataProvider } from "./hooks/nodeDataHook";
import "./index.css";
import { ViewDamageThreshold } from "./pages/DamageThreshold/page";
import { ViewDataExplorer } from "./pages/DataExplorer/page";
import { ElevationSlice } from "./pages/ElevationSlice/page";
import { FloorPlanTorsion } from "./pages/FloorPlanTorsion/page";
import FloorTimeVolumePage from "./pages/FloorTimeVolume/page";
import { ViewHamburger } from "./pages/Hamburger/page";
import { ViewNodeGrid } from "./pages/NodeGrid/page";
import { ViewTexture } from "./pages/ViewTexture/page";
import { ViewSurface } from "./pages/Surface/page";
import { ViewTemporalRibbons } from "./pages/TemporalRibbons/page";
import { View3d } from "./pages/View3d/page";

import { ViewVolumes } from "./pages/ViewVolumes/page";
import { PlaybackProvider } from "./components/playback/PlaybackContext";
import { ColorProvider, ViewModeProvider, ExplodedViewProvider, SliceSelectionProvider, NodeVisibilityProvider } from "./contexts/visualization";
import { TooltipProvider } from "./components/ui/tooltip";

const routes = [
  {
    path: "/",
    label: "3D View",
    element: <View3d />,
  },
  {
    path: "/explorer",
    label: "Data Explorer",
    element: <ViewDataExplorer />,
  },
  {
    path: "/hamburger",
    label: "Hamburger",
    element: <ViewHamburger />,
  },
  {
    path: "/surface",
    label: "Surface",
    element: <ViewSurface />,
  },
  {
    path: "/nodegrid",
    label: "Node Grid",
    element: <ViewNodeGrid />,
  },
  {
    path: "/texture",
    label: "Texture",
    element: <ViewTexture />,
  },
  {
    path: "/ribbons",
    label: "Ribbons",
    element: <ViewTemporalRibbons />,
  },
  {
    path: "/threshold",
    label: "Thresholds",
    element: <ViewDamageThreshold />,
  },
  {
    path: "/slice",
    label: "Elevation Slice",
    element: <ElevationSlice />,
  },
  {
    path: "/torsion",
    label: "Floor Torsion",
    element: <FloorPlanTorsion />,
  },
  {
    path: "/volumes",
    label: "Volumes",
    element: <ViewVolumes />,
  },
  {
    path: "/timevolumes",
    label: "Time Volumes",
    element: <FloorTimeVolumePage />,
  },
];

const router = createBrowserRouter([
  {
    element: (
      <>
        <AnimationDataProvider>
          <TooltipProvider>
            <NavigationBar routes={routes} />
            <PlaybackProvider>
              <ColorProvider>
                <ViewModeProvider>
                  <ExplodedViewProvider>
                    <SliceSelectionProvider>
                      <NodeVisibilityProvider>
                        <Outlet />
                      </NodeVisibilityProvider>
                    </SliceSelectionProvider>
                  </ExplodedViewProvider>
                </ViewModeProvider>
              </ColorProvider>
            </PlaybackProvider>
          </TooltipProvider>
        </AnimationDataProvider>
      </>
    ),
    errorElement: <ErrorPage />,
    children: routes,
  },
]);

THREE.ColorManagement.enabled = true;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="h-screen flex flex-col bg-neutral-200">
      <RouterProvider router={router} />
    </div>
    ,
  </StrictMode>,
);
