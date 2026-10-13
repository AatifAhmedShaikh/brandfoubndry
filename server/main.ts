import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync, existsSync } from "node:fs";
import { anthropicProvider } from "./ai";
import { createApp } from "./app";
import { purgeGuests } from "./auth";
import { openDb } from "./db";

const db = openDb(process.env.DATABASE_PATH ?? "./data/brandfoundry.db");
purgeGuests(db);
const ai = anthropicProvider();
const app = createApp({ db, ai });

if (process.env.NODE_ENV === "production" && existsSync("./dist/index.html")) {
  const index = readFileSync("./dist/index.html", "utf8");
  app.use("/assets/*", serveStatic({ root: "./dist", onFound: (_p, c) => c.header("cache-control", "public, max-age=31536000, immutable") }));
  app.use("*", serveStatic({ root: "./dist" }));
  // SPA fallback for app routes only; missing files 404 instead of returning HTML.
  app.get("*", (c) => (c.req.path.startsWith("/assets/") || /\.[a-z0-9]+$/i.test(c.req.path) ? c.notFound() : c.html(index)));
}

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => {
  console.log(`BrandFoundry API on http://localhost:${port} · AI ${ai.configured ? `enabled (${ai.model})` : "not configured"}`);
});
