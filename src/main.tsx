import { Box } from "lucide-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import * as THREE from "three";
import { ErrorPage } from "./components/ErrorPage";
import { NavigationBar } from "./components/NavigationBar";

import { TooltipProvider } from "./components/ui/tooltip";
import { ExportProvider } from "./features/export/ExportProvider";
import { ExportRenderModeProvider } from "./features/export/renderMode";
import { View3d } from "./features/view-3d/page";
import { PlaybackProvider } from "./features/playback/PlaybackContext";
import { CrossSectionSelectionProvider } from "./features/view-3d/contexts/visualization/CrossSectionSelectionContext";
import "./index.css";
import { AnimationDataProvider } from "./lib/useAnimationData";
import { ViewProvider } from "./state/ViewProvider";

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
        <TooltipProvider>
          <ViewProvider>
            <AnimationDataProvider>
              <ExportProvider>
                <ExportRenderModeProvider
                  value={{
                    showPanelHeaders: true,
                    showTransientUi: true,
                  }}>
                  <NavigationBar />
                  <PlaybackProvider>
                    <CrossSectionSelectionProvider>
                      <Outlet />
                    </CrossSectionSelectionProvider>
                  </PlaybackProvider>
                </ExportRenderModeProvider>
              </ExportProvider>
            </AnimationDataProvider>
          </ViewProvider>
        </TooltipProvider>
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
