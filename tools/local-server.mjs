// node tools/local-server.mjs — quick stand-in for `wrangler dev` (in-memory D1 via node:sqlite) for testing without Cloudflare tools
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const { default: worker } = await import(ROOT + "/src/worker.js");
const sq = new DatabaseSync(":memory:");
sq.exec(fs.readFileSync(ROOT + "/schema.sql", "utf8"));
class Stmt { constructor(sql) { this.sql = sql; this.args = []; } bind(...a) { const s = new Stmt(this.sql); s.args = a.map(v => v === undefined ? null : v); return s; }
  _p() { return sq.prepare(this.sql); }
  async first() { return this._p().get(...this.args) ?? null; }
  async all() { return { results: this._p().all(...this.args) }; }
  async run() { const r = this._p().run(...this.args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; }
  _runSync() { if (/^\s*(SELECT)/i.test(this.sql)) return { results: this._p().all(...this.args) }; const r = this._p().run(...this.args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; } }
const DB = { prepare: sql => new Stmt(sql), batch: async stmts => { sq.exec("BEGIN"); try { const out = stmts.map(s => s._runSync()); sq.exec("COMMIT"); return out; } catch (e) { sq.exec("ROLLBACK"); throw e; } } };
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const ASSETS = { fetch: async req => { const u = new URL(req.url); let f = path.join(ROOT, "public", u.pathname); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, "public", "index.html");
  return new Response(fs.readFileSync(f), { headers: { "content-type": TYPES[path.extname(f)] || "application/octet-stream" } }); } };
const env = { DB, ASSETS, SETUP_CODE: process.env.SETUP_CODE || "test1234" };
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const r = new Request("http://localhost:8787" + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) });
  const out = await worker.fetch(r, env);
  const h = {}; out.headers.forEach((v, k) => h[k] = v);
  res.writeHead(out.status, h); res.end(Buffer.from(await out.arrayBuffer()));
}).listen(8787, () => console.log("ready"));
