import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import { NavigationBar } from "./components/NavigationBar";
import { View3d } from "./pages/View3d/page";
import { AnimationDataProvider } from "./hooks/nodeDataHook";
import { ViewHamburger } from "./pages/Hamburger/page";
import { ViewTexture } from "./pages/ViewTexture/page";

const routes = [
  { path: "/", label: "3D View", element: <View3d /> },
  { path: "/hamburger", label: "Hamburger", element: <ViewHamburger /> },
  { path: "/texture", label: "Texture", element: <ViewTexture /> },
];

const router = createBrowserRouter([
  {
    element: (
      <>
        <NavigationBar routes={routes} />
        <Outlet />
      </>
    ),
    children: routes,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AnimationDataProvider>
      <div className="h-screen flex flex-col bg-neutral-200">
        <RouterProvider router={router} />
      </div>
    </AnimationDataProvider>
  </StrictMode>
);
