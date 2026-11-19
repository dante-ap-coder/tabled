// Creates Better Auth tables + app tables. Idempotent: run before every build/dev.
import { getMigrations } from "better-auth/db/migration"
import { auth } from "../lib/auth"
import { db, dbUrl, APP_SCHEMA } from "../lib/db"

const { runMigrations } = await getMigrations(auth.options)
await runMigrations()
for (const sql of APP_SCHEMA) await db.execute(sql)
console.log("migrated", dbUrl)
