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

async function assertPortsFree() {
  const apiOk = await canListen(apiHost, apiPort);
  if (!apiOk) {
    fail(`API port ${apiHost}:${apiPort} is already in use`);
  }
  const webOk = await canListen("0.0.0.0", publicPort);
  if (!webOk) {
    fail(`Public PORT ${publicPort} is already in use`);
  }
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
  await assertPortsFree();

  const apiUrl = `http://${apiHost}:${apiPort}`;

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

  register("web", {
    command: process.execPath,
    args: [webServerJs],
    env: {
      PORT: publicPort,
      HOSTNAME: "0.0.0.0",
      // Standalone rewrites are mostly build-time; keep runtime aligned
      API_URL: apiUrl,
    },
    cwd: standaloneRoot,
  });

  spawnChild("api");

  try {
    await waitForApi();
  } catch (err) {
    logErr(err instanceof Error ? err.message : err);
    shutdown(1, "api-never-ready");
    return;
  }

  log(`API healthy on ${apiUrl}`);
  spawnChild("web");
  log(`Web public on 0.0.0.0:${publicPort} (rewrites /api/v1 → ${apiUrl})`);
}

main().catch((err) => {
  logErr(err);
  process.exit(1);
});
