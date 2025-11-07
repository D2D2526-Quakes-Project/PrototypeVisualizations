import { useLocation } from "react-router";

export function NavigationBar({ routes }: { routes: { path: string; label: string }[] }) {
  const location = useLocation();

  return (
    <div className="p-4 px-6 flex gap-6 border-b-2 border-neutral-300">
      {routes.map((route) => (
        <a key={route.path} href={route.path} className={`text-xl ${location.pathname === route.path ? "font-bold" : "font-normal"}`}>
          {route.label}
        </a>
      ))}
    </div>
  );
}
