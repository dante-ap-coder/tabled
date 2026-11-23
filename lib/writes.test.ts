import { expect, test } from "bun:test"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { VisitInput } from "./writes"

// db.ts reads DATABASE_URL at import, so point it at a scratch file first
process.env.DATABASE_URL = `file:${join(tmpdir(), `tabled-test-${crypto.randomUUID()}.db`)}`
const { all, db, get, migrate } = await import("./db")
const w = await import("./writes")
await migrate()
await migrate() // second run is a no-op

const user = async (name: string) => {
  await db.execute({
    sql: `insert into user (id, name, email, createdAt, updatedAt) values (?, ?, ?, '', '')`,
    args: [name, name, `${name}@x.test`],
  })
  return name
}
const teamOf = async (u: string) =>
  (
    await get<{ team_id: string }>(
      `select team_id from member where user_id = ?`,
      [u]
    )
  )?.team_id
const codeOf = async (teamId: string) =>
  (await get<{ code: string }>(`select code from team where id = ?`, [teamId]))!
    .code
const visit = (over: Partial<VisitInput>): VisitInput => ({
  restaurantId: "",
  newPlace: { name: "", cuisine: "", area: "", price: 2 },
  date: "2026-11-20",
  score: 8.4,
  parts: [null, null, null, null],
  review: "",
  dishes: [],
  companions: [],
  ...over,
})

const ana = await user("ana")
const ben = await user("ben")
const cy = await user("cy")

test("migrate records each step once", async () => {
  expect(await all(`select id from migration`)).toHaveLength(1)
})

test("membership: create, join, move off a solo team, never leave a shared one", async () => {
  expect(await w.createTeam(ana, "  ")).toEqual({
    error: "Give your team a name.",
  })
  expect(await w.createTeam(ana, "Lunch Club")).toEqual({})
  const lunch = (await teamOf(ana))!
  await w.createTeam(ana, "Again") // already on a team: nothing new
  expect(await all(`select id from team`)).toHaveLength(1)

  expect((await w.joinTeam(ben, "nope")).error).toMatch(/doesn't match/)
  // ben starts his own team by mistake, then opens ana's invite link
  await w.createTeam(ben, "Oops")
  expect(await teamOf(ben)).not.toBe(lunch)
  expect(await w.joinTeam(ben, (await codeOf(lunch)).toLowerCase())).toEqual({})
  expect(await teamOf(ben)).toBe(lunch)
  expect(await w.joinTeam(ben, await codeOf(lunch))).toEqual({}) // own team: fine

  // cy's invite must not pull ana or ben out of a team that has other people
  await w.createTeam(cy, "Solo")
  const solo = (await teamOf(cy))!
  expect((await w.joinTeam(ana, await codeOf(solo))).error).toMatch(
    /already on a team/
  )
  expect(await teamOf(ana)).toBe(lunch)
})

test("logVisit: place and visit commit together, team-scoped", async () => {
  const lunch = (await teamOf(ana))!
  const solo = (await teamOf(cy))!
  const place = { name: "Noodle Bar", cuisine: "Thai", area: "", price: 9 }

  // a rejected visit never creates the place
  expect(
    await w.logVisit(lunch, ana, visit({ newPlace: place, score: 11 }))
  ).toHaveProperty("error")
  expect(await all(`select id from restaurant`)).toHaveLength(0)

  const a = await w.logVisit(
    lunch,
    ana,
    visit({ newPlace: place, companions: [ben, cy, ana] })
  )
  const b = await w.logVisit(
    lunch,
    ben,
    visit({ newPlace: { ...place, name: "noodle bar" } })
  )
  if ("error" in a || "error" in b)
    throw new Error("expected both visits to save")
  expect(b.restaurantId).toBe(a.restaurantId) // same place, any casing
  expect(await all(`select price from restaurant`)).toEqual([
    { price: 4 },
  ] as never)
  const saved = await get<{ companions: string }>(
    `select companions from visit where user_id = ?`,
    [ana]
  )
  expect(saved!.companions).toBe(JSON.stringify([ben])) // teammates only, not self

  // another team cannot log against this place by id
  expect(
    await w.logVisit(solo, cy, visit({ restaurantId: a.restaurantId }))
  ).toEqual({
    error: "Pick a place from your team's list.",
  })
  expect(await w.logVisit(lunch, ana, visit({}))).toHaveProperty("error")
  expect(
    await w.logVisit(
      lunch,
      ana,
      visit({ restaurantId: a.restaurantId, date: "2026-02-30" })
    )
  ).toHaveProperty("error")
  expect(await all(`select id from visit`)).toHaveLength(2)
})

test("updateVisit: owner edits any field but the place; nobody else can", async () => {
  const lunch = (await teamOf(ana))!
  const solo = (await teamOf(cy))!
  const v = (await get<{ id: string; restaurant_id: string }>(
    `select id, restaurant_id from visit where user_id = ?`,
    [ana]
  ))!
  const edit = visit({
    date: "2026-11-01",
    score: 6.2,
    parts: [7, null, 5.5, null],
    review: "Went downhill",
    dishes: ["Pad see ew ", "Pad see ew"],
    companions: [cy], // cy is on another team, so this clears the saved [ben]
  })
  expect(await w.updateVisit(lunch, ana, v.id, edit)).toEqual({
    restaurantId: v.restaurant_id,
  })
  expect(
    await get(
      `select date, score, food, service, vibe, value, review, dishes, companions, restaurant_id from visit where id = ?`,
      [v.id]
    )
  ).toEqual({
    date: "2026-11-01",
    score: 6.2,
    food: 7,
    service: null,
    vibe: 5.5,
    value: null,
    review: "Went downhill",
    dishes: JSON.stringify(["Pad see ew"]),
    companions: JSON.stringify([]),
    restaurant_id: v.restaurant_id,
  } as never)

  // a teammate, another team, or a bad score can't change it
  const denied = { error: "You can only edit your own visits." }
  expect(await w.updateVisit(lunch, ben, v.id, visit({ score: 1 }))).toEqual(
    denied
  )
  expect(await w.updateVisit(solo, ana, v.id, visit({ score: 1 }))).toEqual(
    denied
  )
  expect(
    await w.updateVisit(lunch, ana, v.id, visit({ score: 10.05 }))
  ).toHaveProperty("error")
  expect(
    (await get<{ score: number }>(`select score from visit where id = ?`, [
      v.id,
    ]))!.score
  ).toBe(6.2)
})

test("wants: toggle on and off, add by name, team-scoped", async () => {
  const lunch = (await teamOf(ana))!
  const solo = (await teamOf(cy))!
  const rid = (await get<{ id: string }>(`select id from restaurant`))!.id
  const wants = (u: string) =>
    all(`select restaurant_id from want where user_id = ?`, [u])

  await w.toggleWant(solo, cy, rid) // not cy's team's place
  expect(await wants(cy)).toHaveLength(0)
  await w.toggleWant(lunch, ana, rid)
  expect(await wants(ana)).toHaveLength(1)
  await w.toggleWant(lunch, ana, rid)
  expect(await wants(ana)).toHaveLength(0)

  await w.addWant(lunch, ana, {
    name: "NOODLE BAR",
    cuisine: "",
    area: "",
    price: 2,
  })
  await w.addWant(lunch, ana, {
    name: "Taco Cart",
    cuisine: "",
    area: "",
    price: 1,
  })
  await w.addWant(lunch, ana, {
    name: "Taco Cart",
    cuisine: "",
    area: "",
    price: 1,
  })
  expect(await wants(ana)).toHaveLength(2)
  expect(
    await all(`select id from restaurant where team_id = ?`, [lunch])
  ).toHaveLength(2)
})
