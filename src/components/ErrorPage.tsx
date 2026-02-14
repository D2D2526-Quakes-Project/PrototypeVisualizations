import { clearCache } from "@/lib/dataLoader";
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
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="text-6xl font-bold text-neutral-800 mb-8">Quakes</div>
      <div className="flex flex-col items-center gap-2 text-center">
        {code && (
          <span className="text-[8rem] leading-none font-bold text-muted-foreground opacity-20 select-none">
            {code}
          </span>
        )}
        <h1 className="text-3xl font-semibold tracking-tight">{code ? `Error ${code}` : "Something went wrong"}</h1>
        <p className="max-w-md text-muted-foreground">{message}</p>
      </div>

      <div className="flex gap-3 mt-4">
        <Link
          to="/"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
          Go back home
        </Link>
        <button
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer"
          onClick={() => window.location.reload()}>
          Reload
        </button>
        <button
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 cursor-pointer"
          onClick={() => clearCache()}>
          Clear Cache
        </button>
      </div>
    </div>
  );
}
