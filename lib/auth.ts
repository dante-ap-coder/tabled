import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { LibsqlDialect } from "@libsql/kysely-libsql"
import { db } from "./db"

export const auth = betterAuth({
  appName: "project da",
  // ponytail: cast because kysely-libsql pins an older @libsql/client type; runtime API is the same.
  database: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dialect: new LibsqlDialect({ client: db as any }),
    type: "sqlite",
  },
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  session: { expiresIn: 60 * 60 * 24 * 30 },
  // database storage so limits hold across serverless instances
  rateLimit: { enabled: true, storage: "database" },
  plugins: [nextCookies()],
})
