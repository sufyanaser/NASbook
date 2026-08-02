import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

async function source(path) {
  return readFile(join(root, path), "utf8");
}

test("packaged Windows builds check, download, and install updates on safe exit", async () => {
  const updaterSource = await source("electron/main/updateService.ts");
  const mainSource = await source("electron/main/index.ts");

  assert.match(updaterSource, /app\.isPackaged/);
  assert.match(updaterSource, /import \* as electronUpdater from "electron-updater"/);
  assert.doesNotMatch(updaterSource, /import electronUpdater from "electron-updater"/);
  assert.match(updaterSource, /process\.platform !== "win32"/);
  assert.match(updaterSource, /autoUpdater\.autoDownload = true/);
  assert.match(updaterSource, /autoUpdater\.autoInstallOnAppQuit = true/);
  assert.match(updaterSource, /autoUpdater\.checkForUpdates\(\)/);
  assert.doesNotMatch(updaterSource, /quitAndInstall/);
  assert.match(mainSource, /initializeUpdateService\(\)/);
  assert.match(mainSource, /disposeUpdateService\(\)/);
});

test("release configuration publishes GitHub updater metadata with V07", async () => {
  const packageJson = JSON.parse(await source("package.json"));
  const workflowSource = await source(".github/workflows/github-release.yml");

  assert.equal(packageJson.version, "7.0.0");
  assert.equal(packageJson.releaseLabel, "V07");
  assert.equal(packageJson.build.appId, "com.nasfm.notesbook");
  assert.deepEqual(packageJson.build.publish, [
    {
      provider: "github",
      owner: "sufyanaser",
      repo: "NASbook",
      releaseType: "release",
    },
  ]);
  assert.match(workflowSource, /latest\.yml/);
  assert.match(workflowSource, /\.blockmap/);
  assert.match(workflowSource, /NASbook-Setup-\$label\.exe/);
});
