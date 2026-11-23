// Creates app tables. Idempotent: run before every build/dev.
import { db, dbUrl, APP_SCHEMA } from "../lib/db"

for (const sql of APP_SCHEMA) await db.execute(sql)
console.log("migrated", dbUrl)
