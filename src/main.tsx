import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource-variable/inter";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./styles.css";
import { SessionProvider } from "./lib/session";
import { ToastProvider, Spinner } from "./components/ui";
import { RouteError, NotFound } from "./pages/Errors";
import Landing from "./landing/Landing";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewProject = lazy(() => import("./pages/NewProject"));
const Settings = lazy(() => import("./pages/Settings"));
const Demo = lazy(() => import("./pages/Demo"));
const Legal = lazy(() => import("./pages/Legal"));
const Workspace = lazy(() => import("./workspace/Shell"));
const Overview = lazy(() => import("./workspace/Overview"));
const Discover = lazy(() => import("./workspace/Discover"));
const Research = lazy(() => import("./workspace/Research"));
const Position = lazy(() => import("./workspace/Position"));
const Voice = lazy(() => import("./workspace/Voice"));
const Naming = lazy(() => import("./workspace/Naming"));
const Visuals = lazy(() => import("./workspace/Visuals"));
const Challenge = lazy(() => import("./workspace/Challenge"));
const Consistency = lazy(() => import("./workspace/Consistency"));
const BrandKit = lazy(() => import("./workspace/BrandKit"));

const Fallback = () => (
  <div className="grid min-h-dvh place-items-center bg-paper text-ink/50">
    <Spinner size={20} />
  </div>
);

const router = createBrowserRouter([
  { path: "/", element: <Landing />, errorElement: <RouteError /> },
  { path: "/auth", element: <Auth />, errorElement: <RouteError /> },
  { path: "/demo", element: <Demo />, errorElement: <RouteError /> },
  { path: "/privacy", element: <Legal page="privacy" /> },
  { path: "/terms", element: <Legal page="terms" /> },
  { path: "/dashboard", element: <Dashboard />, errorElement: <RouteError /> },
  { path: "/settings", element: <Settings />, errorElement: <RouteError /> },
  { path: "/projects/new", element: <NewProject />, errorElement: <RouteError /> },
  {
    path: "/projects/:id",
    element: <Workspace />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Overview /> },
      { path: "discover", element: <Discover /> },
      { path: "research", element: <Research /> },
      { path: "position", element: <Position /> },
      { path: "voice", element: <Voice /> },
      { path: "naming", element: <Naming /> },
      { path: "visuals", element: <Visuals /> },
      { path: "challenge", element: <Challenge /> },
      { path: "consistency", element: <Consistency /> },
      { path: "brand-kit", element: <BrandKit /> },
      { path: "*", element: <Navigate to=".." relative="path" replace /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionProvider>
      <ToastProvider>
        <Suspense fallback={<Fallback />}>
          <RouterProvider router={router} />
        </Suspense>
      </ToastProvider>
    </SessionProvider>
  </StrictMode>,
);
