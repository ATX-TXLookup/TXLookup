// Durable run storage for the admin console + fallback path.
// Backends: Vercel KV (if KV_URL is set and `@vercel/kv` is resolvable) or
// file-based at `data/runs/{hash}.json` for local dev. We deliberately do
// NOT add @vercel/kv to package.json yet — install it when wiring prod.

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type SavedRun = {
  hash: string;
  query: string;
  plan: unknown;
  events: unknown[];
  answer: string;
  citation: unknown;
  durationMs: number;
  tokenTotal: number;
  status: "good" | "bad" | "pending";
  savedAt: number;
};

const FILE_DIR = path.join(process.cwd(), "data", "runs");
const INDEX_FILE = path.join(FILE_DIR, "_index.json");

export function hashQuery(query: string): string {
  const n = query.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(n).digest("hex").slice(0, 16);
}

type KvLike = {
  set: (k: string, v: unknown) => Promise<unknown>;
  get: <T>(k: string) => Promise<T | null>;
  zadd: (k: string, ...args: unknown[]) => Promise<unknown>;
  zrange: <T>(k: string, s: number, e: number, o?: unknown) => Promise<T[]>;
};

let _kv: KvLike | null | undefined;
async function getKv(): Promise<KvLike | null> {
  if (_kv !== undefined) return _kv;
  if (!process.env.KV_URL) return (_kv = null);
  try {
    // Hide the specifier from webpack so the build passes without the dep.
    const spec = ["@vercel", "kv"].join("/");
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const dyn = new Function("s", "return import(s)") as (s: string) => Promise<unknown>;
    const mod = (await dyn(spec).catch(() => null)) as { kv: KvLike } | null;
    if (!mod?.kv) {
      console.warn("[run-archive] KV_URL set but @vercel/kv missing — using file fallback");
      return (_kv = null);
    }
    return (_kv = mod.kv);
  } catch (e) {
    console.warn("[run-archive] KV unavailable:", e instanceof Error ? e.message : String(e));
    return (_kv = null);
  }
}

async function ensureDir() { await fs.mkdir(FILE_DIR, { recursive: true }); }

async function readIndex(): Promise<string[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(INDEX_FILE, "utf8")) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

async function fileSave(run: SavedRun): Promise<void> {
  await ensureDir();
  await fs.writeFile(path.join(FILE_DIR, `${run.hash}.json`), JSON.stringify(run, null, 2), "utf8");
  const idx = await readIndex();
  await fs.writeFile(INDEX_FILE, JSON.stringify([run.hash, ...idx.filter((h) => h !== run.hash)], null, 2), "utf8");
}

async function fileLoad(hash: string): Promise<SavedRun | null> {
  try { return JSON.parse(await fs.readFile(path.join(FILE_DIR, `${hash}.json`), "utf8")) as SavedRun; }
  catch { return null; }
}

async function fileList(limit: number): Promise<SavedRun[]> {
  const out: SavedRun[] = [];
  for (const h of (await readIndex()).slice(0, limit)) {
    const r = await fileLoad(h);
    if (r) out.push(r);
  }
  return out;
}

export async function saveRun(
  query: string, plan: unknown, events: unknown[], answer: string,
  citation: unknown, durationMs: number, tokenTotal: number,
): Promise<SavedRun> {
  const run: SavedRun = {
    hash: hashQuery(query), query, plan, events, answer, citation,
    durationMs, tokenTotal, status: "pending", savedAt: Date.now(),
  };
  const kv = await getKv();
  if (kv) {
    try {
      await kv.set(`run:${run.hash}`, run);
      await kv.zadd("runs:index", { score: run.savedAt, member: run.hash });
      return run;
    } catch (e) { console.warn("[run-archive] kv save failed:", e); }
  }
  await fileSave(run);
  return run;
}

export async function findRun(query: string): Promise<SavedRun | null> {
  return getRun(hashQuery(query));
}

export async function getRun(hash: string): Promise<SavedRun | null> {
  const kv = await getKv();
  if (kv) {
    try { const r = await kv.get<SavedRun>(`run:${hash}`); if (r) return r; }
    catch (e) { console.warn("[run-archive] kv read failed:", e); }
  }
  return fileLoad(hash);
}

export async function listRuns(limit = 50): Promise<SavedRun[]> {
  const kv = await getKv();
  if (kv) {
    try {
      const hashes = await kv.zrange<string>("runs:index", 0, limit - 1, { rev: true });
      const out: SavedRun[] = [];
      for (const h of hashes) { const r = await kv.get<SavedRun>(`run:${h}`); if (r) out.push(r); }
      return out;
    } catch (e) { console.warn("[run-archive] kv list failed:", e); }
  }
  return fileList(limit);
}

export async function markRun(
  hash: string, status: "good" | "bad" | "pending",
): Promise<SavedRun | null> {
  const kv = await getKv();
  if (kv) {
    try {
      const r = await kv.get<SavedRun>(`run:${hash}`);
      if (!r) return null;
      const next = { ...r, status };
      await kv.set(`run:${hash}`, next);
      return next;
    } catch (e) { console.warn("[run-archive] kv mark failed:", e); }
  }
  const r = await fileLoad(hash);
  if (!r) return null;
  const next: SavedRun = { ...r, status };
  await ensureDir();
  await fs.writeFile(path.join(FILE_DIR, `${hash}.json`), JSON.stringify(next, null, 2), "utf8");
  return next;
}
