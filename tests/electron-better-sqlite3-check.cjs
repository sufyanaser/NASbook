const Database = require("better-sqlite3");

const db = new Database(":memory:");
db.exec("CREATE TABLE healthcheck (id INTEGER PRIMARY KEY, name TEXT);");
db.prepare("INSERT INTO healthcheck (name) VALUES (?)").run("ok");
const row = db.prepare("SELECT name FROM healthcheck WHERE id = 1").get();
console.log(row.name);
db.close();
