import Link from "next/link"
import { LogLink } from "@/components/client"
import { Avatar, placeMeta, ScoreChip, Swatch } from "@/components/bits"
import { getMe, loadTeam } from "@/lib/team"

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const q = ((await searchParams).q ?? "").trim().toLowerCase()
  const me = await getMe()
  const team = await loadTeam(me.team.id)
  const has = (s: string) => s.toLowerCase().includes(q)

  const places = q
    ? team.restaurants.filter((r) => has(`${r.name} ${r.cuisine} ${r.area}`))
    : []
  const dishes = new Map<string, Set<string>>() // dish -> restaurant ids
  if (q)
    for (const v of team.visits)
      for (const d of v.dishes)
        if (has(d))
          dishes.set(d, (dishes.get(d) ?? new Set()).add(v.restaurant_id))
  const people = q ? team.members.filter((m) => has(m.name)) : []
  const empty = !places.length && !dishes.size && !people.length

  return (
    <main className="flex grow flex-col gap-8 px-4 pt-9 pb-16 sm:px-12 xl:max-w-240">
      <h1 className="font-display text-[clamp(28px,3.5vw,40px)]/[1.2] font-extrabold tracking-[-0.03em]">
        {q ? <>Results for &ldquo;{q}&rdquo;</> : "Search"}
      </h1>
      {q && empty && (
        <p className="text-mid">
          Nothing matches.{" "}
          <LogLink className="font-semibold text-ink underline">
            Log a new place
          </LogLink>
        </p>
      )}

      {places.length > 0 && (
        <section>
          <h2 className="border-b border-line pb-3 label">Places</h2>
          {places.map((r) => (
            <Link
              key={r.id}
              href={`/r/${r.id}`}
              className="flex items-center gap-4 border-b border-line py-3 hover:bg-[#FAFAFA]"
            >
              <Swatch name={r.name} className="size-10 rounded-lg" />
              <span className="flex min-w-0 grow flex-col">
                <span className="font-semibold">{r.name}</span>
                <span className="text-[13px] text-mute">{placeMeta(r)}</span>
              </span>
              <ScoreChip
                score={team.stats.get(r.id)?.team}
                className="text-lg/6"
              />
            </Link>
          ))}
        </section>
      )}

      {dishes.size > 0 && (
        <section>
          <h2 className="border-b border-line pb-3 label">Dishes</h2>
          {[...dishes].map(([d, rids]) => (
            <div
              key={d}
              className="flex flex-wrap items-baseline gap-x-2 border-b border-line py-3"
            >
              <span className="font-semibold">{d}</span>
              <span className="text-mute">at</span>
              {[...rids].map((rid, i) => (
                <span key={rid}>
                  {i > 0 && ", "}
                  <Link
                    href={`/r/${rid}`}
                    className="underline underline-offset-2"
                  >
                    {team.restaurant.get(rid)!.name}
                  </Link>
                </span>
              ))}
            </div>
          ))}
        </section>
      )}

      {people.length > 0 && (
        <section>
          <h2 className="border-b border-line pb-3 label">Teammates</h2>
          {people.map((m) => (
            <Link
              key={m.id}
              href={`/diary?u=${m.id}`}
              className="flex items-center gap-3 border-b border-line py-3 hover:bg-[#FAFAFA]"
            >
              <Avatar id={m.id} name={m.name} />
              <span className="font-semibold">{m.name}</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  )
}
