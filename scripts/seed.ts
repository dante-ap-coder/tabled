// Dev-only demo data matching the Paper mockups. Log in with your own Kinde account, then join FORK-DEMO42.
import { db, dbUrl, get, id } from "../lib/db"

if (!dbUrl.startsWith("file:"))
  throw new Error("seed only runs against a local file: database")
if (await get(`select 1 from team where code = 'FORK-DEMO42'`)) {
  console.log("already seeded")
  process.exit(0)
}

const people = [
  "Maya Ortiz",
  "Jonah Reyes",
  "Sam K.",
  "Priya Nair",
  "Leo Tran",
  "Ana Brooks",
]
const u: Record<string, string> = {}
for (const name of people) {
  const email = `${name.split(" ")[0]!.toLowerCase()}@demo.tabled`
  const uid = id()
  const now = new Date().toISOString()
  await db.execute({
    sql: `insert into user (id, name, email, emailVerified, createdAt, updatedAt) values (?, ?, ?, 1, ?, ?)`,
    args: [uid, name, email, now, now],
  })
  u[name.split(" ")[0]!] = uid
}

const teamId = id()
const t0 = new Date("2026-03-02").getTime()
await db.execute({
  sql: `insert into team values (?, 'Lunch Club', 'FORK-DEMO42', ?, ?)`,
  args: [teamId, u.Maya!, t0],
})
for (const [i, uid] of Object.values(u).entries())
  await db.execute({
    sql: `insert into member values (?, ?, ?)`,
    args: [uid, teamId, t0 + i * 864e5],
  })

const places: [string, string, string, number][] = [
  ["Salt & Ember", "Korean BBQ", "Mission", 3],
  ["Little Basil", "Thai", "Tenderloin", 2],
  ["Nori Noodle Bar", "Ramen", "Hayes Valley", 2],
  ["Ferro Pizzeria", "Pizza", "North Beach", 2],
  ["Verde Taqueria", "Mexican", "Mission", 1],
  ["The Copper Pot", "Ramen", "SoMa", 1],
  ["Midnight Broth", "Ramen", "Mission", 2],
  ["Olive & Fig", "Mediterranean", "Marina", 2],
]
const r: Record<string, string> = {}
for (const [name, cuisine, area, price] of places) {
  r[name] = id()
  await db.execute({
    sql: `insert into restaurant values (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [r[name]!, teamId, name, cuisine, area, price, u.Maya!, t0],
  })
}

type V = [
  string,
  string,
  string,
  number,
  string,
  string[],
  string[],
  (number | null)[]?,
]
const visits: V[] = [
  [
    "Salt & Ember",
    "Priya",
    "2026-11-13",
    9.4,
    "First of us to go. Galbi was unreal. Book the back room for the team dinner.",
    ["Galbi", "Kimchi pancake"],
    ["Maya"],
    [10, 9, 9, 8],
  ],
  [
    "Salt & Ember",
    "Maya",
    "2026-11-14",
    9.5,
    "Believe the hype.",
    ["Galbi"],
    [],
    [10, 9, 9, 8],
  ],
  [
    "Salt & Ember",
    "Jonah",
    "2026-11-14",
    9.2,
    "Pricey but worth it once a quarter.",
    ["Pork belly"],
    [],
  ],
  [
    "Little Basil",
    "Sam",
    "2026-10-12",
    8.0,
    "Spicy means spicy. Great value for the portion size. Loud inside.",
    ["Khao soi"],
    [],
    [9, 8, 7, 9],
  ],
  [
    "Little Basil",
    "Jonah",
    "2026-10-29",
    8.5,
    "Khao soi is the move. Service gets slammed at 12:30, so go at 11:45.",
    ["Khao soi"],
    [],
    [9, 8, 8, 9],
  ],
  [
    "Little Basil",
    "Priya",
    "2026-11-02",
    9.2,
    "Every curry is a winner.",
    ["Rabbit curry", "Larb"],
    ["Maya"],
  ],
  [
    "Little Basil",
    "Leo",
    "2026-11-05",
    8.3,
    "Solid. Get the larb.",
    ["Larb"],
    [],
  ],
  [
    "Little Basil",
    "Maya",
    "2026-11-17",
    9.0,
    "Rabbit curry still undefeated. Go with 4+ people so you can order the whole left side of the menu.",
    ["Rabbit curry", "Khao soi"],
    ["Jonah", "Priya"],
    [9, 8, 8, 9],
  ],
  [
    "Little Basil",
    "Sam",
    "2026-11-18",
    8.5,
    "Khao soi was even better than I remembered. Went at 11:45 like Jonah said and got a table right away.",
    ["Khao soi", "Larb"],
    ["Jonah", "Priya"],
    [9, 8, 7, 9],
  ],
  [
    "Nori Noodle Bar",
    "Sam",
    "2026-11-10",
    9.0,
    "Spicy miso is a hug.",
    ["Spicy miso", "Karaage"],
    ["Maya"],
  ],
  [
    "Nori Noodle Bar",
    "Maya",
    "2026-11-10",
    8.0,
    "Good, not life-changing.",
    ["Shoyu"],
    ["Sam"],
  ],
  ["Nori Noodle Bar", "Leo", "2026-10-20", 8.0, "", ["Spicy miso"], []],
  [
    "Ferro Pizzeria",
    "Sam",
    "2026-11-03",
    7.0,
    "Margherita was fine.",
    ["Margherita"],
    ["Jonah"],
  ],
  [
    "Ferro Pizzeria",
    "Jonah",
    "2026-11-16",
    7.5,
    "Crust is a 10, toppings a 6. Skip the hot honey, get the clam pie.",
    ["Clam pie", "Caesar"],
    [],
  ],
  [
    "Ferro Pizzeria",
    "Priya",
    "2026-10-01",
    9.0,
    "Clam pie forever.",
    ["Clam pie"],
    [],
  ],
  [
    "Verde Taqueria",
    "Sam",
    "2026-11-06",
    8.0,
    "Team lunch! Al pastor is legit.",
    ["Al pastor", "Elote"],
    ["Maya", "Jonah", "Priya", "Leo"],
  ],
  ["Verde Taqueria", "Maya", "2026-11-06", 7.5, "", ["Carnitas"], ["Sam"]],
  ["Verde Taqueria", "Jonah", "2026-11-06", 7.6, "", ["Al pastor"], ["Sam"]],
  [
    "The Copper Pot",
    "Sam",
    "2026-11-15",
    4.0,
    "45 minute wait, lukewarm broth. The gyoza were fine. Never again.",
    ["Shoyu ramen", "Gyoza"],
    [],
  ],
  ["The Copper Pot", "Maya", "2026-09-15", 4.5, "Meh.", ["Tonkotsu"], []],
  ["The Copper Pot", "Priya", "2026-09-20", 7.0, "I liked it?", ["Gyoza"], []],
]
let ts = new Date("2026-09-01").getTime()
for (const [place, who, date, score, review, dishes, comp, bd] of visits) {
  const [food, service, vibe, value] = bd ?? [null, null, null, null]
  ts += 36e5
  await db.execute({
    sql: `insert into visit (id, team_id, restaurant_id, user_id, date, score, food, service, vibe, value, review, dishes, companions, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id(),
      teamId,
      r[place]!,
      u[who]!,
      date,
      score,
      food!,
      service!,
      vibe!,
      value!,
      review,
      JSON.stringify(dishes),
      JSON.stringify(comp.map((c) => u[c]!)),
      new Date(date).getTime() + (ts % 864e5),
    ],
  })
}
const wants: [string, string][] = [
  ["Maya", "Midnight Broth"],
  ["Jonah", "Midnight Broth"],
  ["Sam", "Midnight Broth"],
  ["Leo", "Midnight Broth"],
  ["Priya", "Olive & Fig"],
  ["Sam", "Olive & Fig"],
  ["Ana", "Olive & Fig"],
]
for (const [who, place] of wants)
  await db.execute({
    sql: `insert into want values (?, ?, ?)`,
    args: [u[who]!, r[place]!, Date.now()],
  })
console.log(
  "seeded Lunch Club · log in, then join with invite code FORK-DEMO42"
)
