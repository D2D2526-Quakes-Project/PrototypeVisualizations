import { Box } from "lucide-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import * as THREE from "three";
import { ErrorPage } from "./components/ErrorPage";
import { NavigationBar } from "./components/navigation-bar/NavigationBar";
import { ThemeProvider } from "./components/ThemeProvider";
import { TooltipProvider } from "./components/ui/tooltip";
import { AnimationDataProvider } from "./features/animation-data/AnimationDataProvider";
import { ExportProvider } from "./features/export/ExportProvider";
import { PlaybackKeyboardEvents } from "./features/playback/PlaybackKeyboardEvents";
import "./index.css";
import { App } from "./pages/App";
import "@/lib/echartsTheme";

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
              <ExportProvider>
                <NavigationBar />
                <PlaybackKeyboardEvents />
                <Outlet />
              </ExportProvider>
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
