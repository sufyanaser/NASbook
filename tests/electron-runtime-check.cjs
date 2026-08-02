const assert = require("node:assert/strict");
const Database = require("better-sqlite3");

const database = new Database(":memory:");
database.exec("CREATE TABLE runtime_check (value TEXT NOT NULL)");
database.prepare("INSERT INTO runtime_check (value) VALUES (?)").run("ready");
const row = database.prepare("SELECT value FROM runtime_check").get();
database.close();

assert.equal(row.value, "ready");
console.log(
  JSON.stringify({
    node: process.versions.node,
    modules: process.versions.modules,
    electron: process.versions.electron,
    betterSqlite3: "ready",
  }),
);
