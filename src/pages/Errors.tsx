import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { FoundryMark } from "@/components/Brand";

function Frame({ code, title, body }: { code: string; title: string; body: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 text-paper">
      <div className="max-w-lg">
        <FoundryMark size={40} />
        <p className="eyebrow mt-8 text-paper/40">{code}</p>
        <h1 className="mt-3 text-5xl leading-none font-semibold tracking-[-0.04em]">{title}</h1>
        <p className="mt-5 text-[16px] leading-relaxed text-paper/60">{body}</p>
        <div className="mt-8 flex gap-2">
          <Link to="/dashboard" className="btn btn-volt">
            Your projects
          </Link>
          <Link to="/" className="btn btn-line text-paper">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export function NotFound() {
  return <Frame code="404" title="Nothing cast here." body="This page doesn't exist, or the project belongs to another account." />;
}

export function RouteError() {
  const err = useRouteError();
  if (isRouteErrorResponse(err) && err.status === 404) return <NotFound />;
  console.error(err);
  return <Frame code="Error" title="Something broke." body="The page hit an unexpected error. Your saved work is safe on the server. Reload the page or go back to your projects." />;
}
