import { clearCache, clearProcessedCache } from "@/lib/dataLoader";
import { clearLayoutFromLocalStorage } from "@/features/3d/lib/layoutPersistence";
import { Link, useRouteError } from "react-router";

export function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  const getErrorInfo = () => {
    if (error && typeof error === "object" && "status" in error) {
      return {
        code: (error as { status: number }).status,
        message: error instanceof Error ? error.message : "An unknown error occurred",
      };
    }
    if (error instanceof Error) {
      return {
        code: null,
        message: error.message,
      };
    }
    return {
      code: null,
      message: "An unexpected error occurred",
    };
  };

  const { code, message } = getErrorInfo();

  return (
    <div className="bg-background flex h-screen w-full flex-col items-center justify-center gap-6 px-4">
      <div className="mb-8 text-6xl font-bold text-neutral-800">Quakes</div>
      <div className="flex flex-col items-center gap-2 text-center">
        {code && (
          <span className="text-muted-foreground text-[8rem] leading-none font-bold opacity-20 select-none">
            {code}
          </span>
        )}
        <h1 className="text-3xl font-semibold tracking-tight">{code ? `Error ${code}` : "Something went wrong"}</h1>
        <p className="text-muted-foreground max-w-md">{message}</p>
      </div>

      <div className="mt-4 flex gap-3">
        <Link
          to="/"
          className="focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap shadow transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
          Go back home
        </Link>
        <button
          className="focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-sm font-medium whitespace-nowrap shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          onClick={() => window.location.reload()}>
          Reload
        </button>
        <button
          className="focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-sm font-medium whitespace-nowrap shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          onClick={() => clearCache()}>
          Clear All Cache
        </button>
        <button
          className="focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-sm font-medium whitespace-nowrap shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          onClick={() => clearProcessedCache()}>
          Clear Computed Cache
        </button>
        <button
          className="focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-sm font-medium whitespace-nowrap shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          onClick={() => clearLayoutFromLocalStorage()}>
          Clear Saved Layout
        </button>
      </div>
    </div>
  );
}
