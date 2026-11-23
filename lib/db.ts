import { createClient, type InValue } from "@libsql/client"

// Local: file:tabled.db. Production: Turso (TURSO_* vars come from the Vercel integration).
const env = process.env
export const dbUrl =
  env.DATABASE_URL ?? env.TURSO_DATABASE_URL ?? "file:tabled.db"
export const db = createClient({
  url: dbUrl,
  authToken: env.DATABASE_AUTH_TOKEN ?? env.TURSO_AUTH_TOKEN,
})

export async function all<T>(sql: string, args: InValue[] = []) {
  return (await db.execute({ sql, args })).rows as unknown as T[]
}

export async function get<T>(sql: string, args: InValue[] = []) {
  return (await all<T>(sql, args))[0] as T | undefined
}

export const id = () => crypto.randomUUID()

export const APP_SCHEMA = [
  // columns match the old Better Auth table so existing databases keep working
  `create table if not exists user (
    id text primary key, name text not null, email text not null unique,
    emailVerified integer not null default 1, image text,
    createdAt date not null, updatedAt date not null)`,
  `create table if not exists team (
    id text primary key, name text not null, code text not null unique,
    created_by text, created_at integer not null)`,
  `create table if not exists member (
    user_id text primary key references user(id) on delete cascade,
    team_id text not null references team(id), joined_at integer not null)`,
  `create table if not exists restaurant (
    id text primary key, team_id text not null references team(id),
    name text not null, cuisine text not null default '', area text not null default '',
    price integer not null default 2, created_by text, created_at integer not null,
    unique (team_id, name collate nocase))`,
  `create table if not exists visit (
    id text primary key, team_id text not null references team(id),
    restaurant_id text not null references restaurant(id),
    user_id text not null references user(id) on delete cascade,
    date text not null, score real not null check (score between 0 and 10),
    food real, service real, vibe real, value real,
    review text not null default '', dishes text not null default '[]',
    companions text not null default '[]', created_at integer not null)`,
  `create index if not exists visit_team on visit (team_id, date)`,
  `create index if not exists visit_restaurant on visit (restaurant_id)`,
  `create table if not exists want (
    user_id text not null references user(id) on delete cascade,
    restaurant_id text not null references restaurant(id),
    created_at integer not null, primary key (user_id, restaurant_id))`,
]
