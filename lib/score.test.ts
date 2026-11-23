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

test("scores are 0–10 in 0.1 steps", () => {
  expect([0, 7.5, 9.6, 9.7, 1.1, 0.3, 10].every(isValidScore)).toBe(true)
  expect(
    [-0.1, 10.1, 7.35, 9.75, 9.70000000001, NaN].filter(isValidScore)
  ).toEqual([])
})

test("team averages of tenths don't drift", () => {
  const v = (r: string, u: string, score: number) =>
    ({
      id: r + u,
      restaurant_id: r,
      user_id: u,
      date: "2026-01-01",
      created_at: 0,
      score,
    }) as Visit
  const stats = placeStats([
    v("a", "x", 7.1),
    v("a", "y", 9.2),
    v("b", "x", 7.2),
    v("b", "y", 9.1),
  ])
  expect(stats.get("a")!.team).toBe(stats.get("b")!.team)
})
