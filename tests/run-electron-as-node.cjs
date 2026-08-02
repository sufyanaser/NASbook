const { spawnSync } = require("node:child_process");
const path = require("node:path");
const electronPath = require("electron");

const checkPath = path.resolve("tests", "electron-runtime-check.cjs");
const result = spawnSync(electronPath, [checkPath], {
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
  },
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
