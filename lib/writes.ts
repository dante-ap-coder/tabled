// Every change to a team's data. No Next imports, so tests run it against a real libSQL file.
import { all, db, get, id } from "./db"
import { isValidScore } from "./score"

const WORDS = [
  "FORK",
  "SPOON",
  "BASIL",
  "NOODLE",
  "TACO",
  "CURRY",
  "MISO",
  "PESTO",
  "RAMEN",
  "SALSA",
  "MANGO",
  "PICKLE",
  "BRISKET",
  "DUMPLING",
  "GINGER",
  "SESAME",
]
const CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
// word + 12 random chars ≈ 2^63 combos: unguessable, so checkInvite can stay public
function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(13))
  const tail = [...bytes.slice(1)]
    .map((b) => CODE_CHARS[b % CODE_CHARS.length])
    .join("")
  return `${WORDS[bytes[0]! % WORDS.length]}-${tail}`
}

export const normCode = (code: string) => code.trim().toUpperCase()

/**
 * Join the team behind an invite code. Someone alone on their own team (started one
 * by mistake) is moved over; someone on a team with other people stays put.
 */
export async function joinTeam(
  userId: string,
  code: string
): Promise<{ error?: string }> {
  const t = await get<{ id: string }>(`select id from team where code = ?`, [
    normCode(code),
  ])
  if (!t) return { error: "That invite code doesn't match a team." }
  // ponytail: a moved member's solo-team visits stay behind on the old team (kept, not
  // shown). Carry them over here if people start logging before they join.
  await db.execute({
    sql: `insert into member (user_id, team_id, joined_at) values (?, ?, ?)
          on conflict (user_id) do update set team_id = excluded.team_id, joined_at = excluded.joined_at
          where team_id <> excluded.team_id
            and (select count(*) from member m where m.team_id = member.team_id) = 1`,
    args: [userId, t.id, Date.now()],
  })
  const now = await get<{ team_id: string }>(
    `select team_id from member where user_id = ?`,
    [userId]
  )
  if (now?.team_id !== t.id)
    return { error: "You're already on a team with other people." }
  return {}
}

/** Start a new team with this user as its first member. No-op if they already have a team. */
export async function createTeam(
  userId: string,
  rawName: string
): Promise<{ error?: string }> {
  const name = rawName.trim().slice(0, 40)
  if (!name) return { error: "Give your team a name." }
  const teamId = id()
  const now = Date.now()
  await db.batch(
    [
      {
        sql: `insert into team (id, name, code, created_by, created_at)
              select ?, ?, ?, ?, ? where not exists (select 1 from member where user_id = ?)`,
        args: [teamId, name, newCode(), userId, now, userId],
      },
      {
        sql: `insert into member (user_id, team_id, joined_at) select ?, id, ? from team where id = ?`,
        args: [userId, now, teamId],
      },
    ],
    "write"
  )
  return {}
}

export type NewPlace = {
  name: string
  cuisine: string
  area: string
  price: number
}

const insertPlace = (teamId: string, userId: string, p: NewPlace) => ({
  // on conflict: a teammate already added this place, so theirs is used
  sql: `insert into restaurant (id, team_id, name, cuisine, area, price, created_by, created_at)
        values (?, ?, ?, ?, ?, ?, ?, ?) on conflict do nothing`,
  args: [
    id(),
    teamId,
    p.name,
    p.cuisine,
    p.area,
    Math.min(4, Math.max(1, Math.round(p.price) || 2)),
    userId,
    Date.now(),
  ],
})

export type VisitInput = {
  /** an existing place; wins over `newPlace` */
  restaurantId: string
  newPlace: NewPlace
  date: string
  score: number
  /** food, service, vibe, value */
  parts: (number | null)[]
  review: string
  dishes: string[]
  companions: string[]
}

/** Log a visit, adding the place if it is new. The place and the visit commit together. */
export async function logVisit(
  teamId: string,
  userId: string,
  v: VisitInput
): Promise<{ error: string } | { restaurantId: string }> {
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10)
  const realDate =
    /^\d{4}-\d{2}-\d{2}$/.test(v.date) &&
    new Date(Date.parse(v.date + "T00:00:00Z") || 0)
      .toISOString()
      .startsWith(v.date)
  if (!realDate || v.date > tomorrow)
    return { error: "Pick a valid date (not in the future)." }
  if (!isValidScore(v.score))
    return { error: "Score must be 0–10 in 0.1 steps." }
  if (
    v.parts.length !== 4 ||
    v.parts.some((p) => p !== null && !isValidScore(p))
  )
    return { error: "Breakdown scores must be 0–10 in 0.1 steps." }
  if (!v.restaurantId && !v.newPlace.name)
    return { error: "Pick a place or add a new one." }

  const dishes = [
    ...new Set(v.dishes.map((d) => d.trim().slice(0, 40)).filter(Boolean)),
  ].slice(0, 12)
  const members = await all<{ user_id: string }>(
    `select user_id from member where team_id = ?`,
    [teamId]
  )
  const companions = [...new Set(v.companions)].filter(
    (u) => u !== userId && members.some((m) => m.user_id === u)
  )

  // selecting from restaurant makes the visit insert its own "is this my team's place" check
  const visit = {
    sql: `insert into visit (id, team_id, restaurant_id, user_id, date, score, food, service, vibe, value, review, dishes, companions, created_at)
          select ?, r.team_id, r.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          from restaurant r where r.team_id = ? and ${v.restaurantId ? "r.id = ?" : "r.name = ? collate nocase"}
          returning restaurant_id`,
    args: [
      id(),
      userId,
      v.date,
      v.score,
      ...v.parts,
      v.review,
      JSON.stringify(dishes),
      JSON.stringify(companions),
      Date.now(),
      teamId,
      v.restaurantId || v.newPlace.name,
    ],
  }
  const res = await db.batch(
    v.restaurantId ? [visit] : [insertPlace(teamId, userId, v.newPlace), visit],
    "write"
  )
  const rid = res.at(-1)!.rows[0]?.restaurant_id
  if (!rid) return { error: "Pick a place from your team's list." }
  return { restaurantId: String(rid) }
}

/** Flip this user's "want to try" mark on one of their team's places. */
export async function toggleWant(
  teamId: string,
  userId: string,
  restaurantId: string
) {
  const del = await db.execute({
    sql: `delete from want where user_id = ? and restaurant_id = ?`,
    args: [userId, restaurantId],
  })
  if (del.rowsAffected) return
  // or ignore: a double tap must not fail on the second insert
  await db.execute({
    sql: `insert or ignore into want (user_id, restaurant_id, created_at)
          select ?, id, ? from restaurant where id = ? and team_id = ?`,
    args: [userId, Date.now(), restaurantId, teamId],
  })
}

/** Add a place (new or existing, by name) to this user's "want to try" list. */
export async function addWant(teamId: string, userId: string, p: NewPlace) {
  if (!p.name) return
  await db.batch(
    [
      insertPlace(teamId, userId, p),
      {
        sql: `insert or ignore into want (user_id, restaurant_id, created_at)
              select ?, id, ? from restaurant where team_id = ? and name = ? collate nocase`,
        args: [userId, Date.now(), teamId, p.name],
      },
    ],
    "write"
  )
}
