import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider, useRouteError } from "react-router";
import * as THREE from "three";
import { NavigationBar } from "./components/NavigationBar";
import { AnimationDataProvider } from "./hooks/nodeDataHook";
import "./index.css";
import { ViewDamageThreshold } from "./pages/DamageThreshold/page";
import { ViewDataExplorer } from "./pages/DataExplorer/page";
import { ElevationSlice } from "./pages/ElevationSlice/page";
import { FloorPlanTorsion } from "./pages/FloorPlanTorsion/page";
import { ViewHamburger } from "./pages/Hamburger/page";
import { ViewNodeGrid } from "./pages/NodeGrid/page";
import { ViewSurface } from "./pages/Surface/page";
import { ViewTemporalRibbons } from "./pages/TemporalRibbons/page";
import { View3d } from "./pages/View3d/page";
import { ViewTexture } from "./pages/ViewTexture/page";

const routes = [
  { path: "/", label: "3D View", element: <View3d /> },
  { path: "/explorer", label: "Data Explorer", element: <ViewDataExplorer /> },
  { path: "/hamburger", label: "Hamburger", element: <ViewHamburger /> },
  { path: "/texture", label: "Texture", element: <ViewTexture /> },
  { path: "/surface", label: "Surface", element: <ViewSurface /> },
  { path: "/nodegrid", label: "Node Grid", element: <ViewNodeGrid /> },
  { path: "/ribbons", label: "Ribbons", element: <ViewTemporalRibbons /> },
  { path: "/threshold", label: "Thresholds", element: <ViewDamageThreshold /> },
  { path: "/slice", label: "Elevation Slice", element: <ElevationSlice /> },
  { path: "/torsion", label: "Floor Torsion", element: <FloorPlanTorsion /> },
];

const router = createBrowserRouter([
  {
    element: (
      <>
        <NavigationBar routes={routes} />
        <Outlet />
      </>
    ),
    errorElement: <ErrorPage />,
    children: routes,
  },
]);

THREE.ColorManagement.enabled = true;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AnimationDataProvider>
      <div className="h-screen flex flex-col bg-neutral-200">
        <RouterProvider router={router} />
      </div>
    </AnimationDataProvider>
  </StrictMode>
);

function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

  return (
    <div id="error-page" className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <p className="text-slate-500">
        <i>{errorMessage}</i>
      </p>
      <a href="/" className="bg-neutral-300 px-4 py-2 rounded-md">
        Go back home
      </a>
      <button className="bg-neutral-300 px-4 py-2 rounded-md" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}
