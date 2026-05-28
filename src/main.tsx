import { Box } from "lucide-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import * as THREE from "three";
import { ErrorPage } from "./components/ErrorPage";
import { NavigationBar } from "./components/navigation-bar/NavigationBar";
import { TooltipProvider } from "./components/ui/tooltip";
import { PlaybackKeyboardEvents } from "./features/playback/PlaybackKeyboardEvents";
import "./index.css";
import { App } from "./pages/App";
import { ExportRenderModeContext } from "./features/export/renderMode";
import { AnimationDataProvider } from "./features/animation-data/AnimationDataProvider";
import { ThemeProvider } from "./components/ThemeProvider";

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
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
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
        </ThemeProvider>
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
    <div className="bg-muted dark:bg-background flex h-screen flex-col">
      <RouterProvider router={router} />
    </div>
  </StrictMode>
);
