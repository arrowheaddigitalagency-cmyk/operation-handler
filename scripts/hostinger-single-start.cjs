#!/usr/bin/env node
/**
 * Hostinger Shared — SINGLE Node.js Web App supervisor (no PM2).
 *
 * Children:
 *   - Nest API  → 127.0.0.1:API_INTERNAL_PORT (loopback only)
 *   - Next Web  → 0.0.0.0:PORT (Hostinger public)
 *
 * Reliability:
 *   - Waits for Nest /health before starting Next (no rewrite race)
 *   - Restarts a crashed child with backoff (bounded); then exits so Hostinger
 *     can restart the whole app
 *   - SIGTERM/SIGINT: SIGTERM children → grace → SIGKILL → exit
 *   - Port conflict detection (public vs internal)
 *   - stdio inherit → Hostinger captures logs
 *   - detached:false → children stay in same process group (no intentional orphans)
 */
"use strict";

const { spawn } = require("child_process");
const http = require("http");
const net = require("net");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const publicPort = String(process.env.PORT || "3000");
let apiPort = String(process.env.API_INTERNAL_PORT || "4000");
const apiHost = "127.0.0.1";

const MAX_RESTARTS = Number(process.env.LAUNCHER_MAX_RESTARTS || 5);
const RESTART_WINDOW_MS = Number(process.env.LAUNCHER_RESTART_WINDOW_MS || 60_000);
const RESTART_BASE_DELAY_MS = Number(process.env.LAUNCHER_RESTART_DELAY_MS || 1_000);
const SHUTDOWN_GRACE_MS = Number(process.env.LAUNCHER_SHUTDOWN_GRACE_MS || 8_000);
const API_READY_ATTEMPTS = Number(process.env.LAUNCHER_API_READY_ATTEMPTS || 90);
const API_READY_INTERVAL_MS = Number(process.env.LAUNCHER_API_READY_INTERVAL_MS || 500);

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

function resolveApiPort() {
  if (apiPort === publicPort) {
    const fallback = String(Number(publicPort) + 1010 || 4010);
    logErr(
      `PORT conflict avoided: API_INTERNAL_PORT=${apiPort} equals public PORT=${publicPort}; using ${fallback}`,
    );
    apiPort = fallback === publicPort ? "14000" : fallback;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function canListen(host, port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(Number(port), host);
  });
}

async function waitUntilPortFree(host, port, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    if (await canListen(host, port)) return true;
    log(`waiting for ${host}:${port} to free (${i + 1}/${attempts})...`);
    await sleep(500);
  }
  return false;
}

async function quickHealthOk() {
  return new Promise((resolve) => {
    const req = http.get(`http://${apiHost}:${apiPort}/api/v1/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Hostinger often double-starts the entry during deploy/restart.
 * Wait for old Nest to die, reuse if healthy, or bump port — never hard-fail immediately.
 */
async function resolveApiListen() {
  if (await canListen(apiHost, apiPort)) {
    return { spawnApi: true };
  }

  log(`API port ${apiHost}:${apiPort} busy — waiting for previous instance...`);
  if (await waitUntilPortFree(apiHost, apiPort, 40)) {
    return { spawnApi: true };
  }

  if (await quickHealthOk()) {
    log(`Reusing healthy Nest already on ${apiHost}:${apiPort} (skip spawn)`);
    return { spawnApi: false };
  }

  for (let i = 1; i <= 8; i++) {
    const candidate = String(Number(apiPort) + i);
    if (candidate === publicPort) continue;
    if (await canListen(apiHost, candidate)) {
      log(`Switching API_INTERNAL_PORT ${apiPort} → ${candidate}`);
      apiPort = candidate;
      return { spawnApi: true };
    }
  }

  fail(`No free API port available near ${apiPort}`);
}

/** Hold Hostinger public PORT immediately so nginx does not 504 while Nest boots. */
function startPlaceholder() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<!doctype html><html><body style=\"font-family:sans-serif;padding:2rem;background:#0b0f14;color:#e8eef5\">" +
          "<h1>Cars Compound is starting…</h1>" +
          "<p>API is booting. Refresh in a few seconds.</p>" +
          "</body></html>",
      );
    });
    server.once("error", reject);
    server.listen(Number(publicPort), "0.0.0.0", () => {
      log(`placeholder listening on 0.0.0.0:${publicPort} (prevents nginx 504 during Nest boot)`);
      resolve(server);
    });
  });
}

function stopPlaceholder(server) {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
    // force close hung keep-alives
    setTimeout(() => resolve(), 2000).unref?.();
  });
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

  for (const [, entry] of registry) {
    killChild(entry, "SIGTERM");
  }

  killTimer = setTimeout(() => {
    for (const [name, entry] of registry) {
      if (entry.proc && entry.proc.exitCode === null) {
        logErr(`SIGKILL ${name} after grace ${SHUTDOWN_GRACE_MS}ms`);
        killChild(entry, "SIGKILL");
      }
    }
  }, SHUTDOWN_GRACE_MS);

  forceExitTimer = setTimeout(() => {
    logErr("forced exit after shutdown grace");
    process.exit(exitCode);
  }, SHUTDOWN_GRACE_MS + 2_000);
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
  if (entry.restarts.length >= MAX_RESTARTS) {
    return false;
  }
  entry.restarts.push(now);
  return true;
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
    logErr(`${name} exited code=${code} signal=${signal}`);

    if (shuttingDown) {
      maybeFinishShutdown();
      return;
    }

    // Unexpected death — try bounded restart; else exit for Hostinger full restart
    if (!recordRestart(name)) {
      logErr(
        `${name} exceeded ${MAX_RESTARTS} restarts in ${RESTART_WINDOW_MS}ms — exiting for Hostinger restart`,
      );
      shutdown(code || 1, `${name}-restart-limit`);
      return;
    }

    const attempt = entry.restarts.length;
    const delay = Math.min(RESTART_BASE_DELAY_MS * 2 ** (attempt - 1), 15_000);
    log(`restarting ${name} in ${delay}ms (attempt ${attempt}/${MAX_RESTARTS})`);
    setTimeout(() => {
      if (shuttingDown) return;
      spawnChild(name);
      // Next can keep running while API restarts; verify health before declaring OK
      if (name === "api") {
        waitForApi()
          .then(() => log(`API healthy again on http://${apiHost}:${apiPort}`))
          .catch((err) => {
            logErr(err instanceof Error ? err.message : err);
            shutdown(1, "api-ready-after-restart-failed");
          });
      }
    }, delay);
  });
}

function register(name, spec) {
  registry.set(name, { proc: null, restarts: [], spec });
}

function waitForApi() {
  return new Promise((resolve, reject) => {
    let left = API_READY_ATTEMPTS;
    let settled = false;

    const done = (fn, val) => {
      if (settled) return;
      settled = true;
      fn(val);
    };

    const tick = () => {
      if (shuttingDown) return done(reject, new Error("shutdown during API wait"));

      const req = http.get(`http://${apiHost}:${apiPort}/api/v1/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) return done(resolve);
        retry();
      });
      req.on("error", retry);
      req.setTimeout(2_000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      left -= 1;
      if (left <= 0) {
        return done(
          reject,
          new Error(`API health check timed out after ${API_READY_ATTEMPTS} attempts`),
        );
      }
      setTimeout(tick, API_READY_INTERVAL_MS);
    };

    tick();
  });
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
  if (!fs.existsSync(apiMainJs)) {
    fail(`API entry missing: ${apiMainJs} — run hostinger-single-build first`);
  }
  if (!fs.existsSync(webServerJs)) {
    fail(
      `Web entry missing: ${webServerJs} — run hostinger-single-build first (Linux Hostinger build creates server.js)`,
    );
  }

  resolveApiPort();
  const { spawnApi } = await resolveApiListen();

  // Bind public PORT first — Hostinger/nginx 504 if nothing listens during Nest boot
  let placeholder = null;
  try {
    placeholder = await startPlaceholder();
  } catch (err) {
    logErr(`Public PORT ${publicPort} busy — waiting for previous web/placeholder...`);
    if (!(await waitUntilPortFree("0.0.0.0", publicPort, 40))) {
      fail(`Cannot bind public PORT ${publicPort}: ${err instanceof Error ? err.message : err}`);
    }
    placeholder = await startPlaceholder();
  }

  const apiUrl = `http://${apiHost}:${apiPort}`;

  if (spawnApi) {
    register("api", {
      command: process.execPath,
      args: [apiMainJs],
      env: {
        PORT: apiPort,
        HOST: apiHost,
        ENABLE_WORKER: "false",
      },
      cwd: root,
    });
    spawnChild("api");
  } else {
    log("API child not spawned (reusing existing healthy process)");
  }

  register("web", {
    command: process.execPath,
    args: [webServerJs],
    env: {
      PORT: publicPort,
      HOSTNAME: "0.0.0.0",
      API_URL: apiUrl,
    },
    cwd: standaloneRoot,
  });

  try {
    await waitForApi();
  } catch (err) {
    logErr(err instanceof Error ? err.message : err);
    logErr("Nest failed to become healthy — check DATABASE_URL, JWT_SECRET, CRON_SECRET, Prisma mysql");
    await stopPlaceholder(placeholder);
    shutdown(1, "api-never-ready");
    return;
  }

  log(`API healthy on ${apiUrl}`);
  await stopPlaceholder(placeholder);
  await sleep(400);
  spawnChild("web");
  log(`Web public on 0.0.0.0:${publicPort} (rewrites /api/v1 → ${apiUrl})`);
}

main().catch((err) => {
  logErr(err);
  process.exit(1);
});
