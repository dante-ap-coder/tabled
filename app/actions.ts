"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { get } from "@/lib/db"
import { rankings } from "@/lib/score"
import { getMe, getSession, loadTeam } from "@/lib/team"
import * as writes from "@/lib/writes"

const text = (v: FormDataEntryValue | null, max: number) =>
  String(v ?? "")
    .trim()
    .slice(0, max)

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
    [writes.normCode(String(code))]
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
  const res = input.code
    ? await writes.joinTeam(session.user.id, input.code)
    : await writes.createTeam(session.user.id, input.teamName ?? "")
  if (res.error) return { error: res.error }
  revalidatePath("/", "layout")
  redirect("/")
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

const newPlace = (fd: FormData): writes.NewPlace => ({
  name: text(fd.get("newName"), 80),
  cuisine: text(fd.get("cuisine"), 40),
  area: text(fd.get("area"), 40),
  price: Number(fd.get("price")),
})

export async function logVisit(
  _: unknown,
  fd: FormData
): Promise<{ error: string }> {
  const me = await getMe()
  const num = (k: string) => Number(String(fd.get(k) ?? "").trim() || NaN)
  const res = await writes.logVisit(me.team.id, me.user.id, {
    restaurantId: text(fd.get("restaurantId"), 64),
    newPlace: newPlace(fd),
    date: String(fd.get("date") ?? "").trim(),
    score: num("score"),
    parts: ["food", "service", "vibe", "value"].map((k) =>
      String(fd.get(k) ?? "").trim() ? num(k) : null
    ),
    review: text(fd.get("review"), 2000),
    dishes: jsonList(fd.get("dishes")),
    companions: jsonList(fd.get("companions")),
  })
  if ("error" in res) return res
  revalidatePath("/", "layout")
  redirect(`/r/${res.restaurantId}`)
}

export async function toggleWant(fd: FormData) {
  const me = await getMe()
  await writes.toggleWant(
    me.team.id,
    me.user.id,
    text(fd.get("restaurantId"), 64)
  )
  revalidatePath("/", "layout")
}

export async function addWant(fd: FormData) {
  const me = await getMe()
  await writes.addWant(me.team.id, me.user.id, newPlace(fd))
  revalidatePath("/", "layout")
}
