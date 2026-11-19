import { cache } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "./auth"
import { all, get } from "./db"
import { placeStats, type Visit } from "./score"

export type Member = { id: string; name: string; joined_at: number }
export type Restaurant = {
  id: string
  name: string
  cuisine: string
  area: string
  price: number
  created_at: number
}

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
)

/** Signed-in user + their team. Redirects to /login or /join otherwise. */
export const getMe = cache(async () => {
  const session = await getSession()
  if (!session) redirect("/login")
  const m = await get<{
    team_id: string
    name: string
    code: string
  }>(
    `select m.team_id, t.name, t.code from member m join team t on t.id = m.team_id where m.user_id = ?`,
    [session.user.id]
  )
  if (!m) redirect("/join")
  return {
    user: session.user,
    team: { id: m.team_id, name: m.name, code: m.code },
  }
})

// ponytail: loads the whole team history per request and aggregates in JS.
// Fine for a lunch crew (thousands of visits); move aggregates to SQL past ~50k visits.
export const loadTeam = cache(async (teamId: string) => {
  const [members, restaurants, rows, wants] = await Promise.all([
    all<Member>(
      `select u.id, u.name, m.joined_at from member m join user u on u.id = m.user_id where m.team_id = ? order by m.joined_at`,
      [teamId]
    ),
    all<Restaurant>(
      `select id, name, cuisine, area, price, created_at from restaurant where team_id = ? order by name`,
      [teamId]
    ),
    all<
      Omit<Visit, "dishes" | "companions"> & {
        dishes: string
        companions: string
      }
    >(
      `select id, restaurant_id, user_id, date, created_at, score, food, service, vibe, value, review, dishes, companions
       from visit where team_id = ? order by date desc, created_at desc`,
      [teamId]
    ),
    all<{ user_id: string; restaurant_id: string }>(
      `select w.user_id, w.restaurant_id from want w join restaurant r on r.id = w.restaurant_id where r.team_id = ?`,
      [teamId]
    ),
  ])
  const visits: Visit[] = rows.map((r) => ({
    ...r,
    dishes: JSON.parse(r.dishes),
    companions: JSON.parse(r.companions),
  }))
  return {
    members,
    member: new Map(members.map((m) => [m.id, m])),
    restaurants,
    restaurant: new Map(restaurants.map((r) => [r.id, r])),
    visits,
    wants,
    stats: placeStats(visits),
  }
})

export type TeamData = Awaited<ReturnType<typeof loadTeam>>
