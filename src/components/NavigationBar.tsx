import { useLocation } from "react-router";

export function NavigationBar() {
  const location = useLocation();

  return (
    <div className="p-4 px-6 flex gap-6 border-b-2 border-neutral-300">
      <a href="/" className={`text-xl ${location.pathname === "/" ? "font-bold" : "font-normal"}`}>
        Quakes
      </a>
      <a href="/about" className={`text-xl ${location.pathname === "/about" ? "font-bold" : "font-normal"}`}>
        About
      </a>
    </div>
  );
}
