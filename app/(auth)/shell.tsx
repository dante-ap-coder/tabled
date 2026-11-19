import { Logo } from "@/components/bits"
import { fmt } from "@/lib/score"
import type { Invite } from "../actions"

export function AuthShell({
  invite,
  children,
}: {
  invite?: Invite | null
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-[52%] max-w-190 shrink-0 flex-col justify-between bg-ink px-18 py-14 lg:flex">
        <Logo dark big />
        <div className="flex flex-col gap-7">
          <h1 className="font-display text-[clamp(64px,6.6vw,96px)]/[0.94] font-extrabold tracking-[-0.03em] text-white">
            Every table,
            <br />
            scored by
            <br />
            <span className="text-sun">your crew.</span>
          </h1>
          <p className="max-w-115 text-[19px]/7.25 text-[#B5B5B5]">
            Log the places your team eats, score them 0–10, and settle the
            &quot;where should we go&quot; debate with data.
          </p>
        </div>
        <div className="flex h-15 gap-10">
          {invite && (
            <>
              <Stat value={invite.places} label="Places scored" />
              <Stat value={invite.members} label="Teammates" />
              {invite.top != null && (
                <Stat value={fmt(invite.top)} label="Current #1" accent />
              )}
            </>
          )}
        </div>
      </aside>
      <main className="flex grow flex-col justify-center gap-9 px-6 py-12 sm:px-16 xl:px-28">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-114">{children}</div>
      </main>
    </div>
  )
}

function Stat({
  value,
  label,
  accent,
}: {
  value: React.ReactNode
  label: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className={`font-display text-[32px]/10 font-extrabold ${accent ? "text-sun" : "text-white"}`}
      >
        {value}
      </div>
      <div className="font-mono text-xs/4 tracking-widest text-faint uppercase">
        {label}
      </div>
    </div>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm/4.5 font-semibold">{label}</span>
      {children}
    </label>
  )
}

export const inputCls =
  "h-13 w-full rounded-xl border-[1.5px] border-edge px-4 text-[17px] outline-none placeholder:text-faint focus:border-ink"

export const primaryBtn =
  "flex h-14 w-full items-center justify-center rounded-xl bg-ink text-[17px] font-semibold text-white disabled:opacity-60"
