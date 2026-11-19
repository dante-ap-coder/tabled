// Pure scoring rules (from the Paper user-flow board):
// - scores 0–10 in 0.5 steps
// - team score = average of each member's LATEST score for a place
// - a place needs 2+ scorers to appear in rankings

export type Visit = {
  id: string
  restaurant_id: string
  user_id: string
  date: string // YYYY-MM-DD
  created_at: number
  score: number
  food: number | null
  service: number | null
  vibe: number | null
  value: number | null
  review: string
  dishes: string[]
  companions: string[]
}

export type PlaceStats = {
  team: number | null
  latest: Map<string, Visit> // user_id -> latest visit
  visits: number
  spread: number // (max - min) / 2 of latest scores
}

const newer = (a: Visit, b: Visit) =>
  a.date > b.date || (a.date === b.date && a.created_at > b.created_at)

export const avg = (xs: number[]) =>
  xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null

export const round1 = (x: number) => Math.round(x * 10) / 10
export const fmt = (x: number | null | undefined) =>
  x == null ? "—" : round1(x).toFixed(1)

export const isValidScore = (x: number) =>
  Number.isFinite(x) && x >= 0 && x <= 10 && Number.isInteger(x * 2)

export function placeStats(visits: Visit[]) {
  const out = new Map<string, PlaceStats>()
  for (const v of visits) {
    let s = out.get(v.restaurant_id)
    if (!s)
      out.set(
        v.restaurant_id,
        (s = { team: null, latest: new Map(), visits: 0, spread: 0 })
      )
    s.visits++
    const cur = s.latest.get(v.user_id)
    if (!cur || newer(v, cur)) s.latest.set(v.user_id, v)
  }
  for (const s of out.values()) {
    const scores = [...s.latest.values()].map((v) => v.score)
    s.team = avg(scores)
    s.spread = (Math.max(...scores) - Math.min(...scores)) / 2
  }
  return out
}

export function rankings(stats: Map<string, PlaceStats>) {
  return [...stats]
    .filter(([, s]) => s.latest.size >= 2)
    .sort(([, a], [, b]) => b.team! - a.team! || b.latest.size - a.latest.size)
}

// chip color: 8.0 and up / 7.0–7.9 / below 7
export const scoreTone = (x: number | null | undefined) =>
  x == null ? "bg-fog" : x >= 8 ? "bg-sun" : x >= 7 ? "bg-sun-soft" : "bg-line"
