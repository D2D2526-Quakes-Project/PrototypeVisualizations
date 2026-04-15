import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import * as THREE from "three";
import { ErrorPage } from "./components/ErrorPage";
import { NavigationBar } from "./components/NavigationBar";
import { AnimationDataProvider } from "./lib/useAnimationData";
import "./index.css";
import { View3d } from "./pages";
import { PlaybackProvider } from "./features/playback/PlaybackContext";
import { SliceSelectionProvider } from "./features/view-3d/contexts/visualization";
import { ViewProvider } from "./state";
import { TooltipProvider } from "./components/ui/tooltip";
import { Box } from "lucide-react";

const routes = [
  {
    path: "/",
    label: "3D View",
    icon: Box,
    element: <View3d />,
  },
];

const router = createBrowserRouter([
  {
    element: (
      <>
        <ViewProvider>
          <AnimationDataProvider>
            <TooltipProvider>
              <NavigationBar />
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
    <div className="flex h-screen flex-col bg-neutral-200">
      <RouterProvider router={router} />
    </div>
  </StrictMode>
);
