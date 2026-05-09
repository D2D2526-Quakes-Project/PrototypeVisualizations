import { Box } from "lucide-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import * as THREE from "three";
import { ErrorPage } from "./components/ErrorPage";
import { NavigationBar } from "./components/NavigationBar";
import { TooltipProvider } from "./components/ui/tooltip";
import { App } from "./pages/App";
import "./index.css";
import { AnimationDataProvider } from "./lib/useAnimationData";
import { PlaybackKeyboardEvents } from "./features/playback/PlaybackKeyboardEvents";

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
            {/* <ExportProvider>
                <ExportRenderModeProvider
                  value={{
                    showPanelHeaders: true,
                    showTransientUi: true,
                  }}> */}
            <NavigationBar />
            <PlaybackKeyboardEvents />
            <Outlet />
            {/* </ExportRenderModeProvider>
              </ExportProvider> */}
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
