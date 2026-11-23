// Creates app tables. Idempotent: run before every build/dev.
import { db, dbUrl, APP_SCHEMA } from "../lib/db"

for (const sql of APP_SCHEMA) await db.execute(sql)
// row counts in the build log: an empty prod DB here means data is being lost between deploys
const counts = await db.execute(
  `select (select count(*) from user) users, (select count(*) from team) teams, (select count(*) from member) members, (select count(*) from visit) visits`
)
console.log("migrated", dbUrl, JSON.stringify(counts.rows[0]))
