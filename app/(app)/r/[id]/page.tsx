import Link from "next/link"
import { LogLink } from "@/components/client"
import { notFound } from "next/navigation"
import { toggleWant } from "@/app/actions"
import {
  Avatar,
  firstName,
  fmtDate,
  ordinal,
  placeMeta,
  ScoreChip,
  Swatch,
} from "@/components/bits"
import { avg, fmt, rankings } from "@/lib/score"
import { getMe, loadTeam } from "@/lib/team"
import { cn } from "@/lib/utils"

const SORTS = {
  newest: "Newest",
  highest: "Highest",
  lowest: "Lowest",
} as const

export default async function RestaurantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ sort?: string }>
}) {
  const [{ id }, { sort: rawSort }] = await Promise.all([params, searchParams])
  const sort = (
    rawSort && rawSort in SORTS ? rawSort : "newest"
  ) as keyof typeof SORTS
  const me = await getMe()
  const team = await loadTeam(me.team.id)
  const r = team.restaurant.get(id)
  if (!r) notFound()

  const s = team.stats.get(id)
  const visits = team.visits.filter((v) => v.restaurant_id === id) // newest first
  const nth = new Map<string, number>() // visit id -> nth visit for that user
  const perUser = new Map<string, number>()
  for (const v of [...visits].reverse()) {
    perUser.set(v.user_id, (perUser.get(v.user_id) ?? 0) + 1)
    nth.set(v.id, perUser.get(v.user_id)!)
  }
  const sorted =
    sort === "newest"
      ? visits
      : [...visits].sort((a, b) =>
          sort === "highest" ? b.score - a.score : a.score - b.score
        )

  const ranked = rankings(team.stats)
  const rank = ranked.findIndex(([rid]) => rid === id) + 1
  const wanted = team.wants.some(
    (w) => w.user_id === me.user.id && w.restaurant_id === id
  )
  const breakdown = (["food", "value", "service", "vibe"] as const).map(
    (k) =>
      [k, avg(visits.flatMap((v) => (v[k] == null ? [] : [v[k]!])))] as const
  )
  const dishCounts = new Map<string, number>()
  for (const v of visits)
    for (const d of v.dishes) dishCounts.set(d, (dishCounts.get(d) ?? 0) + 1)
  const dishes = [...dishCounts].sort((a, b) => b[1] - a[1]).slice(0, 8)
  const latest = s ? [...s.latest.values()].map((v) => v.score) : []

  return (
    <div className="flex grow flex-col">
      <section className="flex flex-col gap-8 border-b border-line px-4 py-9 sm:px-12 md:flex-row md:items-start">
        <Swatch name={r.name} className="hidden size-45 rounded-2xl md:block" />
        <div className="flex min-w-0 grow flex-col gap-4">
          <p className="flex gap-2 label">
            <Link href="/" className="hover:text-ink">
              ← Feed
            </Link>
            {r.cuisine && <span>/ {r.cuisine}</span>}
          </p>
          <h1 className="font-display text-[clamp(40px,5vw,64px)]/[1] font-extrabold tracking-[-0.04em]">
            {r.name}
          </h1>
          <p className="text-[17px] text-mid">{placeMeta(r)}</p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <LogLink
              place={r.id}
              className="flex h-11 items-center rounded-[10px] bg-ink px-5 text-[15px] font-semibold text-white"
            >
              + Log a visit
            </LogLink>
            <form action={toggleWant}>
              <input type="hidden" name="restaurantId" value={r.id} />
              <button
                aria-pressed={wanted}
                className={cn(
                  "flex h-11 items-center gap-1.5 rounded-[10px] border-[1.5px] px-4 text-[15px] font-semibold",
                  wanted ? "border-heart text-heart" : "border-edge"
                )}
              >
                {wanted ? "♥" : "♡"} Want to go
              </button>
            </form>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([r.name, r.area].join(" "))}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center rounded-[10px] border-[1.5px] border-edge px-4 text-[15px] font-semibold"
            >
              Map
            </a>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-4 md:items-end">
          <p className="label">Team score</p>
          <ScoreChip
            score={s?.team}
            className="rounded-xl px-5 py-2 text-[72px]/[80px] tracking-[-0.04em]"
          />
          <p className="text-[15px] text-mid">
            {[
              rank && `#${rank} of ${ranked.length}`,
              `${visits.length} visit${visits.length === 1 ? "" : "s"}`,
              `${s?.latest.size ?? 0} of ${team.members.length} scored`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </section>

      <div className="flex grow flex-col lg:flex-row">
        <main className="min-w-0 grow px-4 py-8 sm:px-12">
          <div className="flex items-baseline justify-between border-b border-line pb-3">
            <h2 className="font-display text-2xl font-bold tracking-[-0.01em]">
              Team reviews
            </h2>
            <nav className="flex gap-1 text-[15px] text-mute">
              {Object.entries(SORTS).map(([k, label], i) => (
                <span key={k}>
                  {i > 0 && "· "}
                  <Link
                    href={`?sort=${k}`}
                    scroll={false}
                    className={cn(
                      "hover:text-ink",
                      k === sort && "font-semibold text-ink"
                    )}
                  >
                    {label}
                  </Link>
                </span>
              ))}
            </nav>
          </div>
          {visits.length === 0 && (
            <p className="py-8 text-mute">No one has scored {r.name} yet.</p>
          )}
          {sorted.map((v) => {
            const who = team.member.get(v.user_id)
            return (
              <article
                key={v.id}
                className="flex gap-4 border-b border-line py-4.5"
              >
                <Avatar id={v.user_id} name={who?.name ?? "?"} size={36} />
                <div className="flex min-w-0 grow flex-col gap-1">
                  <p className="text-sm text-mute">
                    <Link
                      href={`/diary?u=${v.user_id}`}
                      className="font-semibold text-ink hover:underline"
                    >
                      {v.user_id === me.user.id
                        ? "You"
                        : firstName(who?.name ?? "Former teammate")}
                    </Link>{" "}
                    · {fmtDate(v.date, { month: "short", day: "numeric" })} ·{" "}
                    {ordinal(nth.get(v.id)!)} visit
                  </p>
                  {v.review && (
                    <p className="text-[15px]/5.5 text-body">{v.review}</p>
                  )}
                  {v.dishes.length > 0 && (
                    <p className="text-[13px] text-mute">
                      Ordered {v.dishes.join(", ")}
                    </p>
                  )}
                </div>
                <ScoreChip score={v.score} className="h-fit text-xl/7" />
              </article>
            )
          })}
        </main>

        <aside className="flex shrink-0 flex-col gap-8 border-line px-4 py-8 sm:px-8 lg:w-95 lg:border-l">
          <section className="flex flex-col gap-3">
            <h2 className="label">Breakdown · team avg</h2>
            {breakdown.map(([k, val]) => (
              <div key={k} className="flex items-center gap-4">
                <span className="w-19 shrink-0 text-[15px] capitalize">
                  {k}
                </span>
                <span className="h-1.5 grow rounded-full bg-line">
                  <span
                    className="block h-full rounded-full bg-ink"
                    style={{ width: `${(val ?? 0) * 10}%` }}
                  />
                </span>
                <span className="w-8 text-right font-mono text-[13px]">
                  {fmt(val)}
                </span>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="label">Who scored</h2>
            <div className="flex flex-wrap gap-3">
              {team.members.map((m) => {
                const v = s?.latest.get(m.id)
                return (
                  <Link
                    key={m.id}
                    href={`/diary?u=${m.id}`}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <Avatar
                      id={m.id}
                      name={m.name}
                      size={36}
                      className={cn(
                        !v &&
                          "border border-dashed border-faint !bg-white text-mute"
                      )}
                    />
                    <span className="font-mono text-xs text-mid">
                      {v ? fmt(v.score) : "—"}
                    </span>
                  </Link>
                )
              })}
            </div>
            {latest.length >= 2 && (
              <p className="text-[13px] text-mute">
                Spread {fmt(Math.min(...latest))} – {fmt(Math.max(...latest))} ·{" "}
                {s!.spread <= 0.75
                  ? "the team mostly agrees"
                  : s!.spread <= 1.5
                    ? "some disagreement"
                    : "the team is split"}
              </p>
            )}
          </section>

          {dishes.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="label">Most-ordered dishes</h2>
              <div className="flex flex-wrap gap-1.5">
                {dishes.map(([d, n]) => (
                  <span
                    key={d}
                    className="rounded-md bg-fog px-2.5 py-1 text-[13px] text-mid"
                  >
                    {d} ×{n}
                  </span>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
