import assert from "node:assert/strict";
import test from "node:test";
import { isSafeExternalUrl } from "../dist/src/shared/externalUrl.js";

test("external URL policy only permits web links", () => {
  assert.equal(isSafeExternalUrl("https://example.com/note"), true);
  assert.equal(isSafeExternalUrl("http://127.0.0.1:8080"), true);
  assert.equal(isSafeExternalUrl("file:///C:/Windows/System32/calc.exe"), false);
  assert.equal(isSafeExternalUrl("javascript:alert(1)"), false);
  assert.equal(isSafeExternalUrl("nasbook://open"), false);
  assert.equal(isSafeExternalUrl("not a URL"), false);
});
