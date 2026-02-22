import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import * as THREE from "three";
import { ErrorPage } from "./components/ErrorPage";
import { NavigationBar } from "./components/NavigationBar";
import { AnimationDataProvider } from "./lib/useAnimationData";
import "./index.css";
import {
  ViewDamageThreshold,
  ViewDataExplorer,
  ElevationSlice,
  FloorPlanTorsion,
  FloorTimeVolumePage,
  ViewNodeGrid,
  ViewSurface,
  ViewTemporalRibbons,
  View3d,
  ViewVolumes,
} from "./pages";
import { PlaybackProvider } from "./features/playback/PlaybackContext";
import { SliceSelectionProvider } from "./features/view-3d/contexts/visualization";
import { ViewProvider } from "./state";
import { TooltipProvider } from "./components/ui/tooltip";
import { Box, Database, Layers, Grid3x3, Waves, Gauge, Scissors, Rotate3D, Boxes, Timer } from "lucide-react";

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
                <SliceSelectionProvider>
                  <Outlet />
                </SliceSelectionProvider>
              </PlaybackProvider>
            </TooltipProvider>
          </AnimationDataProvider>
        </ViewProvider>
      </>
    ),
    errorElement: <ErrorPage />,
    children: [
      ...routes,
      {
        path: "/s/:shareId",
        element: <View3d />,
      },
    ],
  },
]);

THREE.ColorManagement.enabled = true;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="h-screen flex flex-col bg-neutral-200">
      <RouterProvider router={router} />
    </div>
  </StrictMode>,
);
