"use strict";

const fs = require("fs");
const path = require("path");

/**
 * PM2 ecosystem for Momo's Next.js (production).
 * Uses system npm binary only (no Cursor/editor Node).
 *
 * Loads `.env` into the process environment so bootstrap/Cognito/DB secrets are
 * available even when Next's file loader behavior differs under PM2.
 *
 * Port: set PORT in environment or edit default below. nginx should proxy_pass here.
 */
const root = path.resolve(__dirname);

/** Minimal KEY=VALUE parser (no dotenv dependency). */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const dotEnv = loadEnvFile(path.join(root, ".env"));
const dotEnvProduction = loadEnvFile(path.join(root, ".env.production"));

module.exports = {
  apps: [
    {
      name: "momos-web",
      cwd: root,
      script: "/usr/bin/npm",
      args: "run start",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "800M",
      env: {
        ...dotEnv,
        ...dotEnvProduction,
        NODE_ENV: "production",
        PORT: process.env.PORT || dotEnv.PORT || dotEnvProduction.PORT || "3000",
        PATH: "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/usr/local/sbin",
      },
    },
  ],
};
