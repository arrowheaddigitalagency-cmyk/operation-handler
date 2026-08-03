#!/usr/bin/env node
/**
 * Hostinger Shared — SINGLE Node.js entry (must call listen() on PORT < 3s).
 *
 * Hostinger kills apps that don't listen on process.env.PORT quickly.
 * So THIS process owns PORT and reverse-proxies:
 *   /api/v1/*  → Nest  127.0.0.1:API_INTERNAL_PORT
 *   everything → Next  127.0.0.1:NEXT_INTERNAL_PORT
 *
 * Children never bind the public PORT (avoids double-start races).
 */
"use strict";

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const publicPort = Number(process.env.PORT || 3000);
let apiPort = Number(process.env.API_INTERNAL_PORT || 4000);
let nextPort = Number(process.env.NEXT_INTERNAL_PORT || 3001);
const apiHost = "127.0.0.1";
const nextHost = "127.0.0.1";

const MAX_RESTARTS = Number(process.env.LAUNCHER_MAX_RESTARTS || 5);
const RESTART_WINDOW_MS = Number(process.env.LAUNCHER_RESTART_WINDOW_MS || 60_000);
const RESTART_BASE_DELAY_MS = Number(process.env.LAUNCHER_RESTART_DELAY_MS || 1_000);
const SHUTDOWN_GRACE_MS = Number(process.env.LAUNCHER_SHUTDOWN_GRACE_MS || 8_000);
const API_READY_ATTEMPTS = Number(process.env.LAUNCHER_API_READY_ATTEMPTS || 120);
const NEXT_READY_ATTEMPTS = Number(process.env.LAUNCHER_NEXT_READY_ATTEMPTS || 120);
const READY_INTERVAL_MS = Number(process.env.LAUNCHER_API_READY_INTERVAL_MS || 500);

const webServerJs = path.join(
  root,
  "apps",
  "web",
  ".next",
  "standalone",
  "apps",
  "web",
  "server.js",
);
const apiMainJs = path.join(root, "apps", "api", "dist", "main.js");
const standaloneRoot = path.join(root, "apps", "web", ".next", "standalone");

/** @type {Map<string, { proc: import("child_process").ChildProcess | null, restarts: number[], spec: object }>} */
const registry = new Map();
let shuttingDown = false;
let exitCode = 0;
let killTimer = null;
let forceExitTimer = null;
let apiReady = false;
let nextReady = false;

function log(...args) {
  console.log("[hostinger-single]", ...args);
}
function logErr(...args) {
  console.error("[hostinger-single]", ...args);
}

function fail(msg) {
  logErr(msg);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function resolvePorts() {
  if (apiPort === publicPort) apiPort = publicPort + 1010;
  if (nextPort === publicPort || nextPort === apiPort) nextPort = apiPort + 1;
}

function clearTimers() {
  if (killTimer) clearTimeout(killTimer);
  if (forceExitTimer) clearTimeout(forceExitTimer);
  killTimer = null;
  forceExitTimer = null;
}

function killChild(entry, signal) {
  const proc = entry.proc;
  if (!proc || proc.killed || proc.exitCode !== null) return;
  try {
    proc.kill(signal);
  } catch (err) {
    logErr(`kill ${signal} failed:`, err instanceof Error ? err.message : err);
  }
}

function shutdown(code, reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  exitCode = code;
  logErr(`shutdown code=${code} reason=${reason}`);
  for (const [, entry] of registry) killChild(entry, "SIGTERM");
  killTimer = setTimeout(() => {
    for (const [name, entry] of registry) {
      if (entry.proc && entry.proc.exitCode === null) {
        logErr(`SIGKILL ${name}`);
        killChild(entry, "SIGKILL");
      }
    }
  }, SHUTDOWN_GRACE_MS);
  forceExitTimer = setTimeout(() => process.exit(exitCode), SHUTDOWN_GRACE_MS + 2000);
}

function maybeFinishShutdown() {
  if (!shuttingDown) return;
  const alive = [...registry.values()].some(
    (e) => e.proc && e.proc.exitCode === null && !e.proc.killed,
  );
  if (!alive) {
    clearTimers();
    process.exit(exitCode);
  }
}

function recordRestart(name) {
  const entry = registry.get(name);
  if (!entry) return false;
  const now = Date.now();
  entry.restarts = entry.restarts.filter((t) => now - t < RESTART_WINDOW_MS);
  if (entry.restarts.length >= MAX_RESTARTS) return false;
  entry.restarts.push(now);
  return true;
}

function register(name, spec) {
  registry.set(name, { proc: null, restarts: [], spec });
}

function spawnChild(name) {
  const entry = registry.get(name);
  if (!entry || shuttingDown) return;

  const { command, args, env, cwd } = entry.spec;
  log(`starting ${name}: ${command} ${args.join(" ")}`);

  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
    windowsHide: true,
    detached: false,
  });
  entry.proc = child;

  child.on("error", (err) => {
    logErr(`${name} spawn error:`, err.message);
    if (!shuttingDown) shutdown(1, `${name}-spawn-error`);
  });

  child.on("exit", (code, signal) => {
    entry.proc = null;
    if (name === "api") apiReady = false;
    if (name === "web") nextReady = false;
    logErr(`${name} exited code=${code} signal=${signal}`);
    if (shuttingDown) {
      maybeFinishShutdown();
      return;
    }
    if (!recordRestart(name)) {
      shutdown(code || 1, `${name}-restart-limit`);
      return;
    }
    const attempt = entry.restarts.length;
    const delay = Math.min(RESTART_BASE_DELAY_MS * 2 ** (attempt - 1), 15_000);
    log(`restarting ${name} in ${delay}ms (attempt ${attempt}/${MAX_RESTARTS})`);
    setTimeout(() => {
      if (shuttingDown) return;
      spawnChild(name);
      if (name === "api") {
        waitHttpOk(() => `http://${apiHost}:${apiPort}/api/v1/health`, API_READY_ATTEMPTS)
          .then(() => {
            apiReady = true;
            log("API healthy again");
          })
          .catch(() => shutdown(1, "api-ready-after-restart-failed"));
      }
      if (name === "web") {
        waitHttpOk(() => `http://${nextHost}:${nextPort}/`, NEXT_READY_ATTEMPTS)
          .then(() => {
            nextReady = true;
            log("Next healthy again");
          })
          .catch(() => shutdown(1, "next-ready-after-restart-failed"));
      }
    }, delay);
  });
}

function waitHttpOk(urlFn, attempts) {
  return new Promise((resolve, reject) => {
    let left = attempts;
    let settled = false;
    const done = (fn, val) => {
      if (settled) return;
      settled = true;
      fn(val);
    };
    const tick = () => {
      if (shuttingDown) return done(reject, new Error("shutdown"));
      const req = http.get(urlFn(), (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) return done(resolve);
        retry();
      });
      req.on("error", retry);
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      left -= 1;
      if (left <= 0) return done(reject, new Error(`health timeout: ${urlFn()}`));
      setTimeout(tick, READY_INTERVAL_MS);
    };
    tick();
  });
}

function proxyRequest(req, res, targetHost, targetPort) {
  const headers = { ...req.headers, host: `${targetHost}:${targetPort}` };
  const opts = {
    hostname: targetHost,
    port: targetPort,
    path: req.url,
    method: req.method,
    headers,
  };
  const preq = http.request(opts, (pres) => {
    res.writeHead(pres.statusCode || 502, pres.headers);
    pres.pipe(res);
  });
  preq.on("error", (err) => {
    logErr("proxy error:", err.message);
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad Gateway");
  });
  req.pipe(preq);
}

function createGateway() {
  const server = http.createServer((req, res) => {
    const url = req.url || "/";

    if (!apiReady || !nextReady) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<!doctype html><html><body style=\"font-family:sans-serif;padding:2rem;background:#0b0f14;color:#e8eef5\">" +
          "<h1>Cars Compound is starting…</h1>" +
          `<p>API: ${apiReady ? "ok" : "booting"} · Web: ${nextReady ? "ok" : "booting"}</p>` +
          "<p>Refresh in a few seconds.</p></body></html>",
      );
      return;
    }

    if (url === "/api/v1/health" || url.startsWith("/api/v1/")) {
      return proxyRequest(req, res, apiHost, apiPort);
    }
    return proxyRequest(req, res, nextHost, nextPort);
  });

  // Best-effort WebSocket upgrade proxy (Next HMR not used in prod; keep safe)
  server.on("upgrade", (req, socket, head) => {
    if (!nextReady) {
      socket.destroy();
      return;
    }
    const headers = { ...req.headers, host: `${nextHost}:${nextPort}` };
    const preq = http.request({
      hostname: nextHost,
      port: nextPort,
      path: req.url,
      method: "GET",
      headers,
    });
    preq.on("upgrade", (pres, psocket, phead) => {
      socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n` +
          Object.keys(pres.headers)
            .map((k) => `${k}: ${pres.headers[k]}`)
            .join("\r\n") +
          "\r\n\r\n",
      );
      if (phead && phead.length) socket.write(phead);
      psocket.pipe(socket);
      socket.pipe(psocket);
    });
    preq.on("error", () => socket.destroy());
    preq.end();
  });

  return server;
}

process.on("SIGINT", () => shutdown(0, "SIGINT"));
process.on("SIGTERM", () => shutdown(0, "SIGTERM"));
process.on("uncaughtException", (err) => {
  logErr("uncaughtException", err);
  shutdown(1, "uncaughtException");
});
process.on("unhandledRejection", (err) => {
  logErr("unhandledRejection", err);
  shutdown(1, "unhandledRejection");
});

async function main() {
  if (!fs.existsSync(apiMainJs)) fail(`API entry missing: ${apiMainJs}`);
  if (!fs.existsSync(webServerJs)) fail(`Web entry missing: ${webServerJs}`);

  resolvePorts();

  // CRITICAL for Hostinger: listen on PORT immediately (< 3s)
  const gateway = createGateway();
  await new Promise((resolve, reject) => {
    gateway.once("error", reject);
    gateway.listen(publicPort, "0.0.0.0", () => {
      log(`gateway listening on 0.0.0.0:${publicPort} (Hostinger public PORT)`);
      resolve();
    });
  });

  register("api", {
    command: process.execPath,
    args: [apiMainJs],
    env: {
      PORT: String(apiPort),
      HOST: apiHost,
      ENABLE_WORKER: "false",
    },
    cwd: root,
  });

  register("web", {
    command: process.execPath,
    args: [webServerJs],
    env: {
      PORT: String(nextPort),
      HOSTNAME: nextHost,
      API_URL: `http://${apiHost}:${apiPort}`,
    },
    cwd: standaloneRoot,
  });

  spawnChild("api");
  spawnChild("web");

  try {
    await waitHttpOk(() => `http://${apiHost}:${apiPort}/api/v1/health`, API_READY_ATTEMPTS);
    apiReady = true;
    log(`API healthy on http://${apiHost}:${apiPort}`);
  } catch (err) {
    logErr(err instanceof Error ? err.message : err);
    logErr("Check DATABASE_URL, JWT_SECRET, CRON_SECRET, Prisma mysql");
    shutdown(1, "api-never-ready");
    return;
  }

  try {
    await waitHttpOk(() => `http://${nextHost}:${nextPort}/`, NEXT_READY_ATTEMPTS);
    nextReady = true;
    log(`Next healthy on http://${nextHost}:${nextPort}`);
  } catch (err) {
    logErr(err instanceof Error ? err.message : err);
    shutdown(1, "next-never-ready");
    return;
  }

  log(`Ready — public https → :${publicPort} → Nest :${apiPort} + Next :${nextPort}`);
}

main().catch((err) => {
  logErr(err);
  process.exit(1);
});
