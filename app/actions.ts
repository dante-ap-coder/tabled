"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { db, get, id } from "@/lib/db"
import { isValidScore, rankings } from "@/lib/score"
import { getMe, getSession, loadTeam } from "@/lib/team"

const text = (v: FormDataEntryValue | null, max: number) =>
  String(v ?? "")
    .trim()
    .slice(0, max)

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

const normCode = (code: string) => code.trim().toUpperCase()

export type Invite = {
  team: string
  inviter: string
  members: number
  places: number
  since: string
  top: number | null
}

/** Public: lets the join screen show "✓ Valid" and the team's numbers. */
export async function checkInvite(code: string): Promise<Invite | null> {
  const t = await get<{
    id: string
    name: string
    created_at: number
    inviter: string | null
  }>(
    `select t.id, t.name, t.created_at, u.name as inviter from team t left join user u on u.id = t.created_by where t.code = ?`,
    [normCode(String(code))]
  )
  if (!t) return null
  const data = await loadTeam(t.id)
  return {
    team: t.name,
    inviter: t.inviter ?? "A teammate",
    members: data.members.length,
    places: data.stats.size,
    since: new Date(t.created_at).toLocaleDateString("en-US", {
      month: "long",
    }),
    top: rankings(data.stats)[0]?.[1].team ?? null,
  }
}

/** Called right after sign-up: join by invite code, or start a new team. */
export async function joinTeam(input: {
  code?: string
  teamName?: string
}): Promise<{ error: string }> {
  const session = await getSession()
  if (!session) return { error: "Please sign in first." }
  const userId = session.user.id
  if (await get(`select 1 from member where user_id = ?`, [userId]))
    redirect("/")

  let teamId: string
  if (input.code) {
    const t = await get<{ id: string }>(`select id from team where code = ?`, [
      normCode(input.code),
    ])
    if (!t) return { error: "That invite code doesn't match a team." }
    teamId = t.id
  } else {
    const name = text(input.teamName ?? "", 40)
    if (!name) return { error: "Give your team a name." }
    teamId = id()
    await db.execute({
      sql: `insert into team (id, name, code, created_by, created_at) values (?, ?, ?, ?, ?)`,
      args: [teamId, name, newCode(), userId, Date.now()],
    })
  }
  await db.execute({
    sql: `insert or ignore into member (user_id, team_id, joined_at) values (?, ?, ?)`,
    args: [userId, teamId, Date.now()],
  })
  redirect("/")
}

async function findOrCreateRestaurant(
  teamId: string,
  userId: string,
  fd: FormData
) {
  const name = text(fd.get("newName"), 80)
  if (!name) return null
  const existing = await get<{ id: string }>(
    `select id from restaurant where team_id = ? and name = ? collate nocase`,
    [teamId, name]
  )
  if (existing) return existing.id
  const price = Math.min(4, Math.max(1, Number(fd.get("price")) || 2))
  // on conflict: a teammate added the same place concurrently, so use theirs
  const row = await get<{ id: string }>(
    `insert into restaurant (id, team_id, name, cuisine, area, price, created_by, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)
     on conflict do update set name = name returning id`,
    [
      id(),
      teamId,
      name,
      text(fd.get("cuisine"), 40),
      text(fd.get("area"), 40),
      price,
      userId,
      Date.now(),
    ]
  )
  return row!.id
}

async function teamRestaurant(teamId: string, rid: string) {
  return !!(await get(`select 1 from restaurant where id = ? and team_id = ?`, [
    rid,
    teamId,
  ]))
}

function jsonList(v: FormDataEntryValue | null): string[] {
  try {
    const x = JSON.parse(String(v ?? "[]"))
    return Array.isArray(x)
      ? x.filter((s): s is string => typeof s === "string")
      : []
  } catch {
    return []
  }
}

export async function logVisit(
  _: unknown,
  fd: FormData
): Promise<{ error: string }> {
  const me = await getMe()
  const teamId = me.team.id

  const date = String(fd.get("date") ?? "").trim()
  const tomorrow = new Date(Date.now() + 864e5).toISOString().slice(0, 10)
  const realDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    new Date(Date.parse(date + "T00:00:00Z") || 0)
      .toISOString()
      .startsWith(date)
  if (!realDate || date > tomorrow)
    return { error: "Pick a valid date (not in the future)." }

  const score = Number(String(fd.get("score") ?? "").trim() || NaN)
  if (!isValidScore(score)) return { error: "Score must be 0–10 in 0.1 steps." }

  const part = (k: string) => {
    const raw = String(fd.get(k) ?? "").trim()
    if (!raw) return null
    const n = Number(raw)
    return isValidScore(n) ? n : NaN
  }
  const parts = ["food", "service", "vibe", "value"].map(part)
  if (parts.some((p) => Number.isNaN(p)))
    return { error: "Breakdown scores must be 0–10 in 0.1 steps." }

  const dishes = [
    ...new Set(
      jsonList(fd.get("dishes"))
        .map((d) => d.trim().slice(0, 40))
        .filter(Boolean)
    ),
  ].slice(0, 12)
  // restaurant last, so a rejected visit never creates a place
  let rid = text(fd.get("restaurantId"), 64)
  if (rid && !(await teamRestaurant(teamId, rid)))
    return { error: "Pick a place from your team's list." }
  if (!rid) rid = (await findOrCreateRestaurant(teamId, me.user.id, fd)) ?? ""
  if (!rid) return { error: "Pick a place or add a new one." }

  const team = await loadTeam(teamId)
  const companions = [...new Set(jsonList(fd.get("companions")))].filter(
    (u) => u !== me.user.id && team.member.has(u)
  )

  await db.execute({
    sql: `insert into visit (id, team_id, restaurant_id, user_id, date, score, food, service, vibe, value, review, dishes, companions, created_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id(),
      teamId,
      rid,
      me.user.id,
      date,
      score,
      ...parts,
      text(fd.get("review"), 2000),
      JSON.stringify(dishes),
      JSON.stringify(companions),
      Date.now(),
    ],
  })
  revalidatePath("/", "layout")
  redirect(`/r/${rid}`)
}

export async function toggleWant(fd: FormData) {
  const me = await getMe()
  const rid = text(fd.get("restaurantId"), 64)
  if (!(await teamRestaurant(me.team.id, rid))) return
  const del = await db.execute({
    sql: `delete from want where user_id = ? and restaurant_id = ?`,
    args: [me.user.id, rid],
  })
  if (!del.rowsAffected)
    await db.execute({
      sql: `insert into want (user_id, restaurant_id, created_at) values (?, ?, ?)`,
      args: [me.user.id, rid, Date.now()],
    })
  revalidatePath("/", "layout")
}

export async function addWant(fd: FormData) {
  const me = await getMe()
  const rid = await findOrCreateRestaurant(me.team.id, me.user.id, fd)
  if (!rid) return
  await db.execute({
    sql: `insert or ignore into want (user_id, restaurant_id, created_at) values (?, ?, ?)`,
    args: [me.user.id, rid, Date.now()],
  })
  revalidatePath("/", "layout")
}
