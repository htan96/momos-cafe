"use strict";

const path = require("path");

/**
 * PM2 ecosystem for Momo's Next.js (production).
 * Uses system npm binary only (no Cursor/editor Node).
 *
 * Port: set PORT in environment or edit default below. nginx should proxy_pass here.
 */
const root = path.resolve(__dirname);

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
        NODE_ENV: "production",
        PORT: "3000",
        PATH: "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/usr/local/sbin",
      },
    },
  ],
};
