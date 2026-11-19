import { expect, test } from "bun:test"
import { isValidScore, placeStats, rankings, type Visit } from "./score"

const v = (r: string, u: string, date: string, score: number): Visit => ({
  id: `${r}${u}${date}`,
  restaurant_id: r,
  user_id: u,
  date,
  created_at: 0,
  score,
  food: null,
  service: null,
  vibe: null,
  value: null,
  review: "",
  dishes: [],
  companions: [],
})

test("team score uses each member's latest score; rankings need 2+ scorers", () => {
  const stats = placeStats([
    v("basil", "maya", "2026-01-01", 4),
    v("basil", "maya", "2026-03-01", 9), // latest wins
    v("basil", "sam", "2026-02-01", 8),
    v("pot", "sam", "2026-02-01", 10), // only one scorer
  ])
  expect(stats.get("basil")!.team).toBe(8.5)
  expect(stats.get("basil")!.visits).toBe(3)
  expect(stats.get("basil")!.spread).toBe(0.5)
  expect(rankings(stats).map(([id]) => id)).toEqual(["basil"])
})

test("scores are 0–10 in 0.5 steps", () => {
  expect([0, 7.5, 10].every(isValidScore)).toBe(true)
  expect([-0.5, 10.5, 7.3, NaN].filter(isValidScore)).toEqual([])
})
