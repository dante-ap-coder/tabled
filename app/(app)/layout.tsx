import Link from "next/link"
import { Suspense } from "react"
import { cookies } from "next/headers"
import { Avatar, Logo, placeMeta } from "@/components/bits"
import {
  CopyInvite,
  NavLinks,
  SearchBox,
  SignOut,
  LogLink,
} from "@/components/client"
import { LogVisit } from "@/components/log-visit"
import { avg, fmt } from "@/lib/score"
import { getMe, loadTeam } from "@/lib/team"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const me = await getMe()
  const team = await loadTeam(me.team.id)
  const mine = team.visits.filter((v) => v.user_id === me.user.id)
  const myPlaces = new Set(mine.map((v) => v.restaurant_id)).size
  const wantCount = team.wants.filter((w) => w.user_id === me.user.id).length

  const seen = Number((await cookies()).get("seen")?.value) || 0
  const fresh = seen
    ? team.visits.filter((v) => v.created_at > seen && v.user_id !== me.user.id)
        .length
    : 0

  const logPlaces = team.restaurants.map((r) => {
    const s = team.stats.get(r.id)
    return {
      id: r.id,
      name: r.name,
      meta: placeMeta(r),
      team: s?.team ?? null,
      myLast: s?.latest.get(me.user.id)?.score ?? null,
    }
  })
  const teammates = team.members
    .filter((m) => m.id !== me.user.id)
    .map(({ id, name }) => ({ id, name }))

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-62 shrink-0 flex-col justify-between border-r border-line px-5 py-7 lg:flex">
        <div className="flex flex-col gap-7">
          <Link href="/" className="px-2">
            <Logo />
          </Link>
          <TeamMenu team={me.team} members={team.members} />
          <NavLinks wantCount={wantCount} />
        </div>
        <div className="flex flex-col gap-4">
          <LogLink className="flex h-12 items-center justify-center rounded-[10px] bg-sun text-[15px] font-semibold transition-transform active:scale-[0.98]">
            + Log a visit
          </LogLink>
          <Link href="/diary" className="flex items-center gap-2.5 px-1">
            <Avatar id={me.user.id} name={me.user.name} />
            <span className="flex flex-col">
              <span className="text-sm/4.5 font-semibold">{me.user.name}</span>
              <span className="text-xs text-mute">
                {myPlaces} place{myPlaces === 1 ? "" : "s"} · avg{" "}
                {fmt(avg(mine.map((v) => v.score)))}
              </span>
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 grow flex-col">
        <header className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-10 lg:h-18 lg:flex-row lg:items-center lg:justify-between lg:py-0">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <Link href="/">
              <Logo />
            </Link>
            <span className="flex items-center gap-2">
              <TeamMenu team={me.team} members={team.members} />
              <LogLink className="rounded-lg bg-sun px-3 py-2 text-sm font-semibold whitespace-nowrap">
                + Log
              </LogLink>
            </span>
          </div>
          <SearchBox />
          <div className="lg:hidden">
            <NavLinks wantCount={wantCount} compact />
          </div>
          <p className="hidden text-sm text-mute lg:block">
            {fresh
              ? `${fresh} new score${fresh === 1 ? "" : "s"} since you last looked`
              : "You're all caught up"}
          </p>
        </header>
        {children}
      </div>

      <Suspense>
        <LogVisit
          draftKey={`tabled:draft:${me.user.id}:${me.team.id}`}
          places={logPlaces}
          teammates={teammates}
          teamName={me.team.name}
        />
      </Suspense>
    </div>
  )
}

function TeamMenu({
  team,
  members,
}: {
  team: { name: string; code: string }
  members: { id: string; name: string }[]
}) {
  return (
    <details className="relative">
      <summary className="flex list-none items-center justify-between rounded-[10px] bg-fog px-3 py-2.5">
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px]/4.5 font-semibold">{team.name}</span>
          <span className="text-xs text-mute">
            {members.length} member{members.length === 1 ? "" : "s"}
          </span>
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <path
            d="M5 6l3-3 3 3M5 10l3 3 3-3"
            fill="none"
            stroke="#6B6B6B"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div className="absolute top-full right-0 z-20 mt-2 flex w-64 flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-lg lg:inset-x-0 lg:w-auto">
        <p className="label">Invite code</p>
        <p className="font-mono text-lg tracking-[0.12em]">{team.code}</p>
        <CopyInvite code={team.code} />
        {members.length === 1 && (
          <Link href="/join" className="text-sm text-mid underline">
            Got an invite code? Join that team instead
          </Link>
        )}
        <div className="flex flex-wrap gap-1">
          {members.map((m) => (
            <Link key={m.id} href={`/diary?u=${m.id}`}>
              <Avatar id={m.id} name={m.name} size={26} />
            </Link>
          ))}
        </div>
        <hr className="border-line" />
        <SignOut />
      </div>
    </details>
  )
}
