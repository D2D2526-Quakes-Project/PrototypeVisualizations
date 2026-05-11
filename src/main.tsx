import { Box } from "lucide-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import * as THREE from "three";
import { ErrorPage } from "./components/ErrorPage";
import { NavigationBar } from "./components/NavigationBar";
import { TooltipProvider } from "./components/ui/tooltip";
import { PlaybackKeyboardEvents } from "./features/playback/PlaybackKeyboardEvents";
import "./index.css";
import { App } from "./pages/App";
import { ExportRenderModeContext } from "./features/export/renderMode";
import { AnimationDataProvider } from "./features/animation-data/AnimationDataProvider";

const routes = [
  {
    path: "/",
    label: "3D View",
    icon: Box,
    element: <App />,
  },
];

const router = createBrowserRouter([
  {
    element: (
      <>
        <TooltipProvider>
          <AnimationDataProvider>
            {/* <ExportProvider> */}
            <ExportRenderModeContext.Provider
              value={{
                showPanelHeaders: true,
                showTransientUi: true,
              }}>
              <NavigationBar />
              <PlaybackKeyboardEvents />
              <Outlet />
            </ExportRenderModeContext.Provider>
            {/*  </ExportProvider> */}
          </AnimationDataProvider>
        </TooltipProvider>
      </>
    ),
    errorElement: <ErrorPage />,
    children: [
      ...routes,
      {
        path: "/s/:shareId",
        element: <App />,
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
