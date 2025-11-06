import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router";
import { NavigationBar } from "./components/NavigationBar";
import { View3d } from "./pages/View3d/page";
import { AnimationDataProvider } from "./hooks/nodeDataHook";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <>
        <NavigationBar />
        <View3d />
      </>
    ),
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AnimationDataProvider>
      <div className="h-screen flex flex-col">
        <RouterProvider router={router} />
      </div>
    </AnimationDataProvider>
  </StrictMode>
);
