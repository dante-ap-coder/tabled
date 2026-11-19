import Link from "next/link"
import { addWant, toggleWant } from "@/app/actions"
import { Avatar, placeMeta, ScoreChip, Swatch } from "@/components/bits"
import { getMe, loadTeam } from "@/lib/team"

export default async function WantPage() {
  const me = await getMe()
  const team = await loadTeam(me.team.id)

  const byPlace = new Map<string, string[]>() // restaurant -> user ids who want it
  for (const w of team.wants)
    byPlace.set(w.restaurant_id, [
      ...(byPlace.get(w.restaurant_id) ?? []),
      w.user_id,
    ])
  const mine = [...byPlace].filter(([, users]) => users.includes(me.user.id))
  const teamList = [...byPlace].sort((a, b) => b[1].length - a[1].length)

  const row = (rid: string, users: string[], remove: boolean) => {
    const r = team.restaurant.get(rid)!
    const s = team.stats.get(rid)
    return (
      <div
        key={rid}
        className="flex items-center gap-4 border-b border-line py-3"
      >
        <Swatch name={r.name} className="size-10 rounded-lg" />
        <Link
          href={`/r/${rid}`}
          className="flex min-w-0 grow flex-col hover:underline"
        >
          <span className="truncate font-semibold">{r.name}</span>
          <span className="truncate text-[13px] text-mute">{placeMeta(r)}</span>
        </Link>
        <span className="hidden -space-x-1.5 sm:flex">
          {users.map((u) => (
            <Avatar
              key={u}
              id={u}
              name={team.member.get(u)?.name ?? "?"}
              size={26}
              className="ring-2 ring-white"
            />
          ))}
        </span>
        <span className="w-16 shrink-0 text-right font-mono text-xs text-heart">
          ♥ {users.length}
        </span>
        {s ? (
          <ScoreChip score={s.team} className="w-14 text-lg/6" />
        ) : (
          <span className="w-14 text-center font-mono text-xs text-mute">
            new
          </span>
        )}
        {remove && (
          <form action={toggleWant}>
            <input type="hidden" name="restaurantId" value={rid} />
            <button
              aria-label={`Remove ${r.name}`}
              className="size-8 rounded-full text-mute hover:bg-fog hover:text-ink"
            >
              ×
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <main className="flex grow flex-col gap-10 px-4 pt-9 pb-16 sm:px-12 xl:max-w-260">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[clamp(32px,4vw,44px)]/[1.2] font-extrabold tracking-[-0.03em]">
          Want to go
        </h1>
        <p className="text-[15px] text-mid">
          A list, not a score. Add places you want to try; the team&apos;s
          most-wanted is your next team lunch.
        </p>
      </div>

      <form action={addWant} className="flex flex-wrap gap-2">
        <input
          name="newName"
          required
          maxLength={80}
          placeholder="Place name"
          aria-label="Place name"
          className="h-11 min-w-0 grow rounded-[10px] border-[1.5px] border-edge px-3.5 outline-none focus:border-ink"
        />
        <input
          name="cuisine"
          maxLength={40}
          placeholder="Cuisine"
          aria-label="Cuisine"
          className="h-11 w-36 rounded-[10px] border-[1.5px] border-edge px-3.5 outline-none focus:border-ink"
        />
        <input
          name="area"
          maxLength={40}
          placeholder="Neighborhood"
          aria-label="Neighborhood"
          className="h-11 w-40 rounded-[10px] border-[1.5px] border-edge px-3.5 outline-none focus:border-ink"
        />
        <select
          name="price"
          defaultValue="2"
          aria-label="Price"
          className="h-11 rounded-[10px] border-[1.5px] border-edge px-2.5"
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {"$".repeat(n)}
            </option>
          ))}
        </select>
        <button className="h-11 rounded-[10px] bg-ink px-5 font-semibold text-white">
          Add to my list
        </button>
      </form>

      <section>
        <h2 className="border-b-[1.5px] border-ink pb-3 label">
          My list · {mine.length}
        </h2>
        {mine.length === 0 && (
          <p className="py-6 text-mute">
            Nothing yet. Tap ♡ Want to go on any restaurant, or add one above.
          </p>
        )}
        {mine.map(([rid, users]) => row(rid, users, true))}
      </section>

      <section id="team">
        <h2 className="border-b-[1.5px] border-ink pb-3 label">
          Team most wanted
        </h2>
        {teamList.length === 0 && (
          <p className="py-6 text-mute">No one has added anything yet.</p>
        )}
        {teamList.map(([rid, users]) => row(rid, users, false))}
      </section>
    </main>
  )
}
