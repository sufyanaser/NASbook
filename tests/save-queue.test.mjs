import assert from "node:assert/strict";
import test from "node:test";
import { createLatestSaveQueue } from "../dist/src/shared/saveQueue.js";

function deferred() {
  let resolve;
  const promise = new Promise((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

test("save queue blocks callers until the active and latest queued writes finish", async () => {
  const gate = deferred();
  const queue = createLatestSaveQueue();
  const calls = [];

  const first = queue.request(async () => {
    calls.push("first:start");
    await gate.promise;
    calls.push("first:end");
    return true;
  });
  const skipped = queue.request(async () => {
    calls.push("skipped");
    return true;
  });
  const latest = queue.request(async () => {
    calls.push("latest");
    return true;
  });

  assert.equal(queue.isBusy(), true);
  gate.resolve();
  assert.equal(await first, true);
  assert.equal(await skipped, true);
  assert.equal(await latest, true);
  assert.deepEqual(calls, ["first:start", "first:end", "latest"]);
  assert.equal(queue.isBusy(), false);
});

test("save queue reports a terminal failure but allows a queued retry to recover", async () => {
  const queue = createLatestSaveQueue();
  assert.equal(await queue.request(async () => false), false);

  const gate = deferred();
  const first = queue.request(async () => {
    await gate.promise;
    return false;
  });
  const recovered = queue.request(async () => true);
  gate.resolve();

  assert.equal(await first, true);
  assert.equal(await recovered, true);
});
