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
import {
  ColorProvider,
  ViewModeProvider,
  ExplodedViewProvider,
  SliceSelectionProvider,
  NodeVisibilityProvider,
  ThresholdProvider,
} from "./contexts/visualization";
import { ViewProvider } from "./stores";
import { TooltipProvider } from "./components/ui/tooltip";
import {
  Box,
  Database,
  LayoutGrid,
  Layers,
  Grid3x3,
  Image,
  Waves,
  Gauge,
  Scissors,
  Rotate3D,
  Boxes,
  Timer,
} from "lucide-react";

const routes = [
  {
    path: "/",
    label: "3D View",
    icon: Box,
    element: <View3d />,
  },
  {
    path: "/explorer",
    label: "Data Explorer",
    icon: Database,
    element: <ViewDataExplorer />,
  },
  {
    path: "/hamburger",
    label: "Hamburger",
    icon: LayoutGrid,
    element: <ViewHamburger />,
  },
  {
    path: "/surface",
    label: "Surface",
    icon: Layers,
    element: <ViewSurface />,
  },
  {
    path: "/nodegrid",
    label: "Node Grid",
    icon: Grid3x3,
    element: <ViewNodeGrid />,
  },
  {
    path: "/texture",
    label: "Texture",
    icon: Image,
    element: <ViewTexture />,
  },
  {
    path: "/ribbons",
    label: "Ribbons",
    icon: Waves,
    element: <ViewTemporalRibbons />,
  },
  {
    path: "/threshold",
    label: "Thresholds",
    icon: Gauge,
    element: <ViewDamageThreshold />,
  },
  {
    path: "/slice",
    label: "Elevation Slice",
    icon: Scissors,
    element: <ElevationSlice />,
  },
  {
    path: "/torsion",
    label: "Floor Torsion",
    icon: Rotate3D,
    element: <FloorPlanTorsion />,
  },
  {
    path: "/volumes",
    label: "Volumes",
    icon: Boxes,
    element: <ViewVolumes />,
  },
  {
    path: "/timevolumes",
    label: "Time Volumes",
    icon: Timer,
    element: <FloorTimeVolumePage />,
  },
];

const router = createBrowserRouter([
  {
    element: (
      <>
        <ViewProvider>
          <AnimationDataProvider>
            <TooltipProvider>
              <NavigationBar routes={routes} />
              <PlaybackProvider>
                <ThresholdProvider>
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
                </ThresholdProvider>
              </PlaybackProvider>
            </TooltipProvider>
          </AnimationDataProvider>
        </ViewProvider>
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
