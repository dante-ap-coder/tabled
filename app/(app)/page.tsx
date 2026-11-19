import Link from "next/link"
import {
  Avatar,
  fmtDate,
  placeMeta,
  ScoreChip,
  Swatch,
} from "@/components/bits"
import { MarkSeen, LogLink } from "@/components/client"
import { fmt, rankings } from "@/lib/score"
import { getMe, loadTeam } from "@/lib/team"
import { cn } from "@/lib/utils"

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ me?: string }>
}) {
  const justMe = !!(await searchParams).me
  const me = await getMe()
  const team = await loadTeam(me.team.id)

  const firstVisit = new Map<string, string>() // restaurant -> earliest visit id
  for (const v of team.visits) firstVisit.set(v.restaurant_id, v.id) // visits are newest-first
  const feed = team.visits
    .filter((v) => !justMe || v.user_id === me.user.id)
    .slice(0, 60)

  const top5 = rankings(team.stats).slice(0, 5)
  const wantCounts = new Map<string, number>()
  for (const w of team.wants)
    wantCounts.set(w.restaurant_id, (wantCounts.get(w.restaurant_id) ?? 0) + 1)
  const mostWanted = [...wantCounts]
    .filter(([rid]) => !team.stats.has(rid))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div className="flex grow flex-col xl:flex-row">
      <MarkSeen />
      <main className="min-w-0 grow px-4 pt-9 pb-16 sm:px-12">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
          <h1 className="font-display text-[clamp(32px,4vw,44px)]/[1.2] font-extrabold tracking-[-0.03em]">
            What the table ate
          </h1>
          <div className="flex gap-1.5">
            {[
              ["Everyone", "/", !justMe],
              ["Just me", "/?me=1", justMe],
            ].map(([label, href, on]) => (
              <Link
                key={label as string}
                href={href as string}
                className={cn(
                  "rounded-full px-3.5 py-1.75 text-[13px]/4 font-medium",
                  on ? "bg-ink font-semibold text-white" : "bg-fog"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {feed.length === 0 && (
          <div className="flex flex-col items-start gap-4 border-t border-line py-12">
            <p className="text-[17px] text-mid">
              {justMe
                ? "You haven't logged anything yet."
                : "Nobody has scored a place yet. Be the first."}
            </p>
            <LogLink className="rounded-[10px] bg-sun px-5 py-3 text-[15px] font-semibold">
              + Log a visit
            </LogLink>
          </div>
        )}

        {feed.map((v) => {
          const r = team.restaurant.get(v.restaurant_id)!
          const who = team.member.get(v.user_id)
          const first = firstVisit.get(v.restaurant_id) === v.id
          return (
            <article
              key={v.id}
              className="flex gap-5 border-t border-line py-5.5"
            >
              <Link href={`/r/${r.id}`} className="hidden sm:block">
                <Swatch name={r.name} className="size-24" />
              </Link>
              <div className="flex min-w-0 grow flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm text-mute">
                  <Avatar id={v.user_id} name={who?.name ?? "?"} size={22} />
                  <span>
                    <Link
                      href={`/diary?u=${v.user_id}`}
                      className="font-semibold text-ink hover:underline"
                    >
                      {v.user_id === me.user.id
                        ? "You"
                        : (who?.name ?? "Former teammate")}
                    </Link>{" "}
                    scored ·{" "}
                    {fmtDate(v.date, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <Link
                    href={`/r/${r.id}`}
                    className="font-display text-2xl/7.5 font-bold tracking-[-0.01em] hover:underline"
                  >
                    {r.name}
                  </Link>
                  <span className="text-sm text-mute">{placeMeta(r)}</span>
                </div>
                {v.review && (
                  <p className="text-[15px]/5.5 text-body">
                    &ldquo;{v.review}&rdquo;
                  </p>
                )}
                {v.dishes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {v.dishes.map((d) => (
                      <span
                        key={d}
                        className="rounded-md bg-fog px-2.25 py-0.75 text-xs text-mid"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex w-21 shrink-0 flex-col items-end gap-1.5">
                <ScoreChip score={v.score} className="text-3xl/9" />
                <span className="font-mono text-xs whitespace-nowrap text-mute">
                  {first
                    ? "first score"
                    : `team ${fmt(team.stats.get(r.id)?.team)}`}
                </span>
              </div>
            </article>
          )
        })}
      </main>

      <aside className="flex shrink-0 flex-col gap-9 border-line px-4 py-10 sm:px-8 xl:w-85 xl:border-l">
        <section className="flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between">
            <h2 className="label">Team top 5</h2>
            <Link
              href="/rankings"
              className="text-[13px] font-semibold underline underline-offset-2"
            >
              All rankings
            </Link>
          </div>
          {top5.length === 0 && (
            <p className="text-sm text-mute">
              Places show up here once 2+ teammates score them.
            </p>
          )}
          {top5.map(([rid, s], i) => (
            <Link
              key={rid}
              href={`/r/${rid}`}
              className="flex items-center gap-3 hover:underline"
            >
              <span
                className={cn(
                  "w-5 shrink-0 font-display text-[17px] font-extrabold",
                  i > 2 && "text-faint"
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  "grow truncate text-[15px]",
                  i === 0 ? "font-semibold" : "font-medium"
                )}
              >
                {team.restaurant.get(rid)!.name}
              </span>
              <ScoreChip
                score={s.team}
                className="w-11 rounded-[5px] px-1.5 py-0.5 text-right text-[15px]/4.5"
              />
            </Link>
          ))}
        </section>

        <section className="flex flex-col gap-3.5">
          <h2 className="label">Most wanted, unscored</h2>
          {mostWanted.length === 0 && (
            <p className="text-sm text-mute">
              Add places to your Want to go list.
            </p>
          )}
          {mostWanted.map(([rid, n]) => {
            const r = team.restaurant.get(rid)!
            return (
              <Link
                key={rid}
                href={`/r/${rid}`}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold">
                    {r.name}
                  </span>
                  <span className="truncate text-[13px] text-mute">
                    {[r.cuisine, r.area].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-heart">
                  ♥ {n} want
                </span>
              </Link>
            )
          })}
          <Link
            href="/want"
            className="flex h-10 items-center justify-center rounded-[10px] border-[1.5px] border-ink text-sm font-semibold"
          >
            Plan a team lunch
          </Link>
        </section>
      </aside>
    </div>
  )
}
