import { Link, useRouteError } from "react-router";

export function ErrorPage() {
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
      <Link to="/" className="bg-neutral-300 px-4 py-2 rounded-md">
        Go back home
      </Link>
      <button className="bg-neutral-300 px-4 py-2 rounded-md" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}
