import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { type DB, id, now } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const COOKIE = "bf_session";
const SESSION_DAYS = 30;

export type User = { id: string; email: string | null; displayName: string; isGuest: boolean };
export type Env = { Variables: { user: User | null; db: DB } };

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [alg, salt, key] = stored.split("$");
  if (alg !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await scrypt(pw, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function createSession(c: Context<Env>, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  c.var.db.run("INSERT INTO sessions VALUES (?, ?, ?, ?)", sha(token), userId, now(), expires.toISOString());
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    expires,
  });
}

export function destroySession(c: Context<Env>) {
  const token = getCookie(c, COOKIE);
  if (token) c.var.db.run("DELETE FROM sessions WHERE token_hash = ?", sha(token));
  deleteCookie(c, COOKIE, { path: "/" });
}

type UserRow = { id: string; email: string | null; display_name: string; is_guest: number };
export const toUser = (r: UserRow): User => ({ id: r.id, email: r.email, displayName: r.display_name, isGuest: r.is_guest === 1 });

/** Resolves the session cookie to a user. Never throws for a bad or expired cookie. */
export const session: MiddlewareHandler<Env> = async (c, next) => {
  const token = getCookie(c, COOKIE);
  let user: User | null = null;
  if (token) {
    const row = c.var.db.get<UserRow>(
      "SELECT u.id, u.email, u.display_name, u.is_guest FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
      sha(token),
      now(),
    );
    if (row) {
      user = toUser(row);
      c.var.db.run("UPDATE users SET last_seen_at = ? WHERE id = ?", now(), row.id);
    }
  }
  c.set("user", user);
  await next();
};

export const requireUser: MiddlewareHandler<Env> = async (c, next) => {
  if (!c.var.user) return c.json({ error: "Sign in or start a project to continue.", code: "unauthenticated" }, 401);
  await next();
};

export function createGuest(c: Context<Env>) {
  const uid = id();
  c.var.db.run("INSERT INTO users (id, display_name, is_guest, created_at, last_seen_at) VALUES (?, '', 1, ?, ?)", uid, now(), now());
  createSession(c, uid);
  const user: User = { id: uid, email: null, displayName: "", isGuest: true };
  c.set("user", user);
  return user;
}

/** Simple in-memory brute-force guard for password login, keyed by email. */
const attempts = new Map<string, { n: number; until: number }>();
export function loginLocked(email: string) {
  const a = attempts.get(email);
  return !!a && a.n >= 5 && a.until > Date.now();
}
export function recordLogin(email: string, ok: boolean) {
  if (ok) return attempts.delete(email);
  const a = attempts.get(email);
  const fresh = !a || a.until < Date.now();
  attempts.set(email, { n: fresh ? 1 : a!.n + 1, until: Date.now() + 15 * 60_000 });
}

/** Removes abandoned guest accounts (and their projects) after 30 days of inactivity. */
export function purgeGuests(db: DB) {
  const cutoff = new Date(Date.now() - 30 * 864e5).toISOString();
  db.run("DELETE FROM users WHERE is_guest = 1 AND last_seen_at < ?", cutoff);
  db.run("DELETE FROM sessions WHERE expires_at < ?", now());
}
