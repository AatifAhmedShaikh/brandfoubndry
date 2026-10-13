import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export type DB = ReturnType<typeof openDb>;

/** Opens the database and applies pending SQL migrations in filename order. */
export function openDb(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const raw = new DatabaseSync(path);
  raw.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  raw.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
  const done = new Set(raw.prepare("SELECT name FROM schema_migrations").all().map((r) => r.name as string));
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    raw.exec("BEGIN");
    try {
      raw.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
      raw.prepare("INSERT INTO schema_migrations VALUES (?, ?)").run(file, new Date().toISOString());
      raw.exec("COMMIT");
    } catch (e) {
      raw.exec("ROLLBACK");
      throw e;
    }
  }

  const stmt = (sql: string) => raw.prepare(sql);
  return {
    raw,
    get: <T = Record<string, unknown>>(sql: string, ...p: SQLInputValue[]) => stmt(sql).get(...p) as T | undefined,
    all: <T = Record<string, unknown>>(sql: string, ...p: SQLInputValue[]) => stmt(sql).all(...p) as T[],
    run: (sql: string, ...p: SQLInputValue[]) => stmt(sql).run(...p),
    tx<T>(fn: () => T): T {
      raw.exec("BEGIN IMMEDIATE");
      try {
        const out = fn();
        raw.exec("COMMIT");
        return out;
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      }
    },
  };
}

export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
