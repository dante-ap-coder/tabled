import Link from "next/link"
import { firstName, price, ScoreChip, Swatch } from "@/components/bits"
import { AutoSelect } from "@/components/client"
import { avg, fmt, placeStats, rankings } from "@/lib/score"
import { getMe, loadTeam } from "@/lib/team"
import { cn } from "@/lib/utils"

const TIMES = {
  all: "All time",
  year: "This year",
  "90d": "Last 90 days",
} as const
const selectCls =
  "h-10 appearance-none rounded-[10px] border-[1.5px] border-edge bg-white pr-7 pl-3.5 text-[15px] font-medium"

const since = (time: keyof typeof TIMES) =>
  time === "year"
    ? `${new Date().getUTCFullYear()}-01-01`
    : time === "90d"
      ? new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)
      : ""

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ cuisine?: string; price?: string; time?: string }>
}) {
  const q = await searchParams
  const time = (
    q.time && q.time in TIMES ? q.time : "all"
  ) as keyof typeof TIMES
  const me = await getMe()
  const team = await loadTeam(me.team.id)

  const cutoff = since(time)
  const visits = team.visits.filter((v) => {
    const r = team.restaurant.get(v.restaurant_id)!
    return (
      v.date >= cutoff &&
      (!q.cuisine || r.cuisine === q.cuisine) &&
      (!q.price || r.price === Number(q.price))
    )
  })
  const stats = placeStats(visits)
  const ranked = rankings(stats)
  const cuisines = [
    ...new Set(team.restaurants.map((r) => r.cuisine).filter(Boolean)),
  ].sort()

  const critics = team.members
    .map((m) => {
      const mine = visits.filter((v) => v.user_id === m.id)
      return {
        ...m,
        avg: avg(mine.map((v) => v.score)),
        places: new Set(mine.map((v) => v.restaurant_id)).size,
      }
    })
    .filter((c) => c.avg != null)
    .sort((a, b) => b.avg! - a.avg!)

  return (
    <main className="flex grow flex-col gap-10 px-4 pt-9 pb-16 sm:px-12">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[clamp(32px,4vw,44px)]/[1.2] font-extrabold tracking-[-0.03em]">
            Team rankings
          </h1>
          <p className="text-[15px] text-mid">
            {stats.size} place{stats.size === 1 ? "" : "s"} · ranked by team
            average · min. 2 scores to qualify
          </p>
        </div>
        <form className="flex flex-wrap gap-2 [&_select]:bg-[url(/caret.svg)] [&_select]:bg-[right_12px_center] [&_select]:bg-no-repeat">
          <AutoSelect
            name="cuisine"
            defaultValue={q.cuisine ?? ""}
            aria-label="Cuisine"
            className={selectCls}
          >
            <option value="">All cuisines</option>
            {cuisines.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </AutoSelect>
          <AutoSelect
            name="price"
            defaultValue={q.price ?? ""}
            aria-label="Price"
            className={selectCls}
          >
            <option value="">Any price</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {price(n)}
              </option>
            ))}
          </AutoSelect>
          <AutoSelect
            name="time"
            defaultValue={time}
            aria-label="Time"
            className={selectCls}
          >
            {Object.entries(TIMES).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </AutoSelect>
          <noscript>
            <button className="h-10 rounded-[10px] bg-ink px-4 text-white">
              Apply
            </button>
          </noscript>
        </form>
      </div>

      <div className="flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 border-collapse text-left">
            <thead>
              <tr className="border-b-[1.5px] border-ink label [&>th]:pb-3 [&>th]:font-normal">
                <th className="w-14">#</th>
                <th>Place</th>
                <th>Cuisine</th>
                <th className="w-56">Scores</th>
                <th className="text-right">Spread</th>
                <th className="text-right">You</th>
                <th className="w-24 text-right">Team</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(([rid, s], i) => {
                const r = team.restaurant.get(rid)!
                return (
                  <tr key={rid} className="border-b border-line [&>td]:py-3.5">
                    <td className="font-display text-2xl font-extrabold">
                      {i + 1}
                    </td>
                    <td>
                      <Link
                        href={`/r/${rid}`}
                        className="flex items-center gap-3 hover:underline"
                      >
                        <Swatch name={r.name} className="size-10 rounded-lg" />
                        <span className="flex flex-col">
                          <span className="text-base font-semibold">
                            {r.name}
                          </span>
                          <span className="text-[13px] text-mute">
                            {[r.area, price(r.price)]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="text-[15px]">{r.cuisine}</td>
                    <td>
                      <div
                        className="relative h-3 w-50"
                        aria-label={`Scores: ${[...s.latest.values()].map((v) => fmt(v.score)).join(", ")}`}
                      >
                        <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-line" />
                        {[...s.latest.values()].map((v) => (
                          <span
                            key={v.user_id}
                            className="absolute top-1/2 size-3 -translate-1/2 rounded-full bg-[#555] opacity-85"
                            style={{ left: `${v.score * 10}%` }}
                          />
                        ))}
                      </div>
                    </td>
                    <td
                      className={cn(
                        "text-right font-mono text-[13px]",
                        s.spread >= 2 ? "text-heart" : "text-mid"
                      )}
                    >
                      ±{fmt(s.spread)}
                    </td>
                    <td className="text-right font-mono text-[13px]">
                      {fmt(s.latest.get(me.user.id)?.score)}
                    </td>
                    <td className="text-right">
                      <ScoreChip score={s.team} className="text-xl/7" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {ranked.length === 0 && (
          <p className="py-8 text-mute">
            Nothing qualifies yet. A place needs scores from 2+ teammates.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-6 pt-5 text-[13px] text-mid">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#555]" /> Each dot is one
            teammate&apos;s latest score on a 0–10 line
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-4 rounded-sm bg-sun" /> 8.0 and up
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-4 rounded-sm bg-sun-soft" /> 7.0–7.9
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-4 rounded-sm bg-line" /> below 7
          </span>
        </div>
      </div>

      {critics.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="label">The critics · average score given</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {critics.map((c, i) => {
              const top = i === 0
              const tough = i === critics.length - 1 && critics.length > 1
              return (
                <Link
                  key={c.id}
                  href={`/diary?u=${c.id}`}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl px-4 py-4",
                    top
                      ? "bg-ink text-white"
                      : tough
                        ? "border-[1.5px] border-ink"
                        : "bg-fog"
                  )}
                >
                  <span
                    className={cn(
                      "label",
                      top && "text-sun",
                      tough && "text-heart"
                    )}
                  >
                    {top
                      ? "Most generous"
                      : tough
                        ? "Toughest critic"
                        : `${c.places} places`}
                  </span>
                  <span className="flex items-baseline justify-between">
                    <span className="text-[17px] font-semibold">
                      {c.id === me.user.id ? "You" : firstName(c.name)}
                    </span>
                    <span className="font-display text-2xl font-extrabold">
                      {fmt(c.avg)}
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
