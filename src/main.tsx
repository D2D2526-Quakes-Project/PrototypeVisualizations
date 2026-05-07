import { Box } from "lucide-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import * as THREE from "three";
import { ErrorPage } from "./components/ErrorPage";
import { NavigationBar } from "./components/NavigationBar";

import { TooltipProvider } from "./components/ui/tooltip";
import { PlaybackProvider } from "./features/playback/PlaybackKeyboardEvents";
import { View3d } from "./features/3d/page";
import "./index.css";
import { AnimationDataProvider } from "./lib/useAnimationData";
import { StateProvider } from "./state/StateProvider";

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
          <AnimationDataProvider>
            <StateProvider>
              {/* <ExportProvider>
                <ExportRenderModeProvider
                  value={{
                    showPanelHeaders: true,
                    showTransientUi: true,
                  }}> */}
              <NavigationBar />
              <PlaybackProvider>
                <Outlet />
              </PlaybackProvider>
              {/* </ExportRenderModeProvider>
              </ExportProvider> */}
            </StateProvider>
          </AnimationDataProvider>
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
