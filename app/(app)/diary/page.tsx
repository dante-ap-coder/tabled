import Link from "next/link"
import { LogLink } from "@/components/client"
import { notFound } from "next/navigation"
import {
  Avatar,
  firstName,
  fmtDate,
  ordinal,
  ScoreChip,
  Swatch,
} from "@/components/bits"
import { avg, fmt, round1 } from "@/lib/score"
import { getMe, loadTeam } from "@/lib/team"
import { cn } from "@/lib/utils"

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>
}) {
  const { u } = await searchParams
  const me = await getMe()
  const team = await loadTeam(me.team.id)
  const userId = u ?? me.user.id
  const person = team.member.get(userId)
  if (!person) notFound()
  const isMe = userId === me.user.id

  const visits = team.visits.filter((v) => v.user_id === userId) // newest first
  const places = new Set(visits.map((v) => v.restaurant_id))
  const myAvg = avg(visits.map((v) => v.score))

  const nth = new Map<string, number>()
  const perPlace = new Map<string, number>()
  for (const v of [...visits].reverse()) {
    perPlace.set(v.restaurant_id, (perPlace.get(v.restaurant_id) ?? 0) + 1)
    nth.set(v.id, perPlace.get(v.restaurant_id)!)
  }

  const cuisineCount = new Map<string, number>()
  for (const v of visits) {
    const c = team.restaurant.get(v.restaurant_id)!.cuisine
    if (c) cuisineCount.set(c, (cuisineCount.get(c) ?? 0) + 1)
  }
  const mostEaten = [...cuisineCount].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"

  // latest score per place -> top 4
  const latest = [...places].map((rid) =>
    team.stats.get(rid)!.latest.get(userId)!
  )
  const top4 = latest.sort((a, b) => b.score - a.score).slice(0, 4)

  // how they score vs the team on the same places
  const deltas = latest.map(
    (v) => v.score - team.stats.get(v.restaurant_id)!.team!
  )
  const delta = avg(deltas)
  const bins = Array.from(
    { length: 11 },
    (_, i) => visits.filter((v) => Math.floor(v.score) === i).length
  )
  const maxBin = Math.max(...bins, 1)
  const modeBin = bins.indexOf(maxBin)

  const critics = team.members
    .map((m) => ({
      id: m.id,
      avg: avg(
        team.visits.filter((v) => v.user_id === m.id).map((v) => v.score)
      ),
    }))
    .filter((c) => c.avg != null)
    .sort((a, b) => a.avg! - b.avg!)
  const persona =
    critics.length > 1 && critics[0]!.id === userId
      ? "the team's toughest critic"
      : critics.length > 1 && critics.at(-1)!.id === userId
        ? "the team's most generous scorer"
        : null

  const months = new Map<string, typeof visits>()
  for (const v of visits) {
    const k = v.date.slice(0, 7)
    months.set(k, [...(months.get(k) ?? []), v])
  }

  const name = isMe ? firstName(me.user.name) : firstName(person.name)
  const you = isMe ? "You" : name

  return (
    <div className="flex grow flex-col">
      <section className="flex flex-col gap-8 border-b border-line px-4 py-8 sm:px-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-6">
          <Avatar id={userId} name={person.name} size={88} />
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[clamp(32px,4vw,44px)]/[1.1] font-extrabold tracking-[-0.03em]">
              {name}&apos;s diary
            </h1>
            <p className="text-[15px] text-mid">
              {me.team.name} since{" "}
              {new Date(person.joined_at).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
              {persona && ` · ${persona}`}
            </p>
          </div>
        </div>
        <dl className="flex gap-10">
          {[
            [places.size, "Places"],
            [visits.length, "Visits"],
            [fmt(myAvg), "Avg given"],
            [mostEaten, "Most eaten"],
          ].map(([value, label]) => (
            <div key={label} className="flex flex-col items-end gap-1">
              <dd className="font-display text-[32px]/10 font-extrabold tracking-[-0.02em]">
                {value}
              </dd>
              <dt className="font-mono text-[11px] tracking-[0.12em] text-mute uppercase">
                {label}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex grow flex-col lg:flex-row">
        <main className="min-w-0 grow px-4 py-8 sm:px-12">
          {visits.length === 0 && (
            <p className="text-mute">
              {isMe ? (
                <>
                  Nothing logged yet.{" "}
                  <LogLink className="font-semibold text-ink underline">
                    Log your first visit
                  </LogLink>
                </>
              ) : (
                `${name} hasn't logged anything yet.`
              )}
            </p>
          )}
          {[...months].map(([month, list]) => (
            <section key={month} className="mb-8">
              <h2 className="border-b border-line pb-3 label">
                {fmtDate(month + "-01", { month: "long", year: "numeric" })}
              </h2>
              {list.map((v) => {
                const r = team.restaurant.get(v.restaurant_id)!
                const n = nth.get(v.id)!
                const withWho = v.companions
                  .map((c) => team.member.get(c)?.name)
                  .filter(Boolean)
                  .map((n) => firstName(n!))
                const detail = [
                  withWho.length ? `with ${withWho.join(", ")}` : "Solo",
                  v.dishes.join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ")
                return (
                  <Link
                    key={v.id}
                    href={`/r/${r.id}`}
                    className="flex items-center gap-5 border-b border-line py-3 hover:bg-[#FAFAFA]"
                  >
                    <span className="flex w-10 shrink-0 flex-col items-center">
                      <span className="font-display text-2xl/7 font-extrabold">
                        {Number(v.date.slice(8))}
                      </span>
                      <span className="font-mono text-[10px] tracking-widest text-mute uppercase">
                        {fmtDate(v.date, { weekday: "short" })}
                      </span>
                    </span>
                    <Swatch name={r.name} className="size-10 rounded-lg" />
                    <span className="flex min-w-0 grow flex-col">
                      <span className="truncate text-base font-semibold">
                        {r.name}
                      </span>
                      <span className="truncate text-[13px] text-mute">
                        {detail}
                      </span>
                    </span>
                    <span className="hidden w-24 shrink-0 text-sm text-mid sm:block">
                      {n > 1 ? `↻ ${ordinal(n)} visit` : "1st visit"}
                    </span>
                    <ScoreChip score={v.score} className="w-14 text-xl/7" />
                  </Link>
                )
              })}
            </section>
          ))}
        </main>

        <aside className="flex shrink-0 flex-col gap-9 border-line px-4 py-8 sm:px-8 lg:w-95 lg:border-l">
          <section className="flex flex-col gap-3">
            <h2 className="label">{isMe ? "My" : `${name}'s`} top 4</h2>
            <div className="grid grid-cols-4 gap-2">
              {top4.map((v) => {
                const r = team.restaurant.get(v.restaurant_id)!
                return (
                  <Link
                    key={v.id}
                    href={`/r/${r.id}`}
                    className="flex min-w-0 flex-col gap-1.5"
                  >
                    <Swatch
                      name={r.name}
                      className="aspect-[3/4] w-full rounded-lg"
                    />
                    <span className="truncate text-xs font-semibold">
                      {r.name}
                    </span>
                  </Link>
                )
              })}
              {isMe &&
                Array.from({ length: 4 - top4.length }, (_, i) => (
                  <LogLink key={i} className="flex flex-col gap-1.5">
                    <span className="flex aspect-[3/4] items-center justify-center rounded-lg border-[1.5px] border-dashed border-dot text-xl text-faint">
                      +
                    </span>
                    <span className="text-xs text-faint">Pick one</span>
                  </LogLink>
                ))}
            </div>
          </section>

          {visits.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="label">How {isMe ? "I" : name} score</h2>
              <div
                className="flex h-24 items-end gap-1.5"
                aria-label="Score histogram"
              >
                {bins.map((n, i) => (
                  <span
                    key={i}
                    title={`${i}: ${n}`}
                    className={cn(
                      "grow rounded-t-sm",
                      i === modeBin
                        ? "bg-ink"
                        : i >= 8 && n
                          ? "bg-sun"
                          : "bg-dot"
                    )}
                    style={{ height: `${Math.max(4, (n / maxBin) * 100)}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between font-mono text-xs text-mute">
                <span>0</span>
                <span>5</span>
                <span>10</span>
              </div>
              {delta != null && (
                <p className="text-[15px]/6 text-mid">
                  {you} score{isMe ? "" : "s"}{" "}
                  <b className="text-ink">
                    {Math.abs(round1(delta)) < 0.1
                      ? "right in line with"
                      : `${fmt(Math.abs(delta))} ${delta < 0 ? "lower" : "higher"} than`}
                  </b>{" "}
                  the team on average.
                  {!visits.some((v) => v.score === 10) &&
                    ` ${isMe ? "You've" : `${name} has`} never given a 10.`}
                </p>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
