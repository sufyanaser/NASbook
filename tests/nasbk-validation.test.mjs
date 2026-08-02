import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_IMPORT_FILE_BYTES,
  NASBK_FORMAT_VERSION,
  validateNasbkDocument,
} from "../dist/src/shared/nasbk.js";

test("NASBK validation accepts version 1 and normalizes optional fields", () => {
  const document = validateNasbkDocument(
    {
      format: "NASBK",
      formatVersion: 1,
      title: "Operator note",
      contentHtml: "<p>Ready</p>",
    },
    "2026-08-02T00:00:00.000Z",
  );

  assert.equal(document.formatVersion, NASBK_FORMAT_VERSION);
  assert.equal(document.contentText, "");
  assert.equal(document.metadata.isRtl, false);
  assert.equal(document.metadata.createdAt, "2026-08-02T00:00:00.000Z");
  assert.equal(MAX_IMPORT_FILE_BYTES, 10 * 1024 * 1024);
});

test("NASBK validation rejects unsupported or malformed documents", () => {
  assert.throws(
    () =>
      validateNasbkDocument({
        format: "NASBK",
        formatVersion: 2,
        title: "Future note",
        contentHtml: "<p>Unsupported</p>",
      }),
    /Unsupported NASBK formatVersion/,
  );
  assert.throws(
    () => validateNasbkDocument({ format: "NASBK", formatVersion: 1 }),
    /Invalid NASBK title/,
  );
});
