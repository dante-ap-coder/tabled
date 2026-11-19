"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Feed" },
  { href: "/rankings", label: "Team rankings" },
  { href: "/want", label: "Want to go" },
  { href: "/diary", label: "My diary" },
]

export function NavLinks({
  wantCount,
  compact,
}: {
  wantCount: number
  compact?: boolean
}) {
  const path = usePathname()
  const active = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href)
  return (
    <nav
      className={cn(
        "flex",
        compact ? "gap-1 overflow-x-auto" : "flex-col gap-0.5"
      )}
    >
      {NAV.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          className={cn(
            "flex h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-[15px] font-medium whitespace-nowrap text-mid transition-colors hover:bg-fog",
            active(href) && "bg-ink font-semibold text-white hover:bg-ink"
          )}
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-sm",
              active(href) ? "bg-sun" : "bg-dot",
              compact && "hidden"
            )}
          />
          <span className="grow">{label}</span>
          {href === "/want" && wantCount > 0 && (
            <span
              className={cn(
                "font-mono text-xs",
                active(href) ? "text-white/70" : "text-mute"
              )}
            >
              {wantCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}

export function SearchBox() {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  return (
    <form
      action="/search"
      role="search"
      className="flex h-10.5 w-full max-w-105 items-center gap-2.5 rounded-[10px] bg-fog px-3.5 focus-within:ring-2 focus-within:ring-ink"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        aria-hidden
        className="shrink-0"
      >
        <circle
          cx="11"
          cy="11"
          r="7"
          fill="none"
          stroke="#6B6B6B"
          strokeWidth="2"
        />
        <path
          d="M20 20l-4-4"
          fill="none"
          stroke="#6B6B6B"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <input
        ref={ref}
        name="q"
        aria-label="Search"
        placeholder="Search restaurants, dishes, teammates"
        className="min-w-0 grow bg-transparent text-[15px] outline-none placeholder:text-faint"
      />
      <kbd className="hidden rounded-sm border border-dot px-1.5 py-0.5 font-mono text-[11px] text-mute sm:block">
        ⌘K
      </kbd>
    </form>
  )
}

/** Remembers when you last saw the feed, for "N new scores since you last looked". */
export function MarkSeen() {
  useEffect(() => {
    document.cookie = `seen=${Date.now()}; path=/; max-age=31536000; samesite=lax`
  }, [])
  return null
}

export function SignOut() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut()
        for (const k of Object.keys(localStorage))
          if (k.startsWith("tabled:")) localStorage.removeItem(k)
        router.replace("/login")
        router.refresh()
      }}
      className="text-left text-sm font-medium text-mid hover:text-ink"
    >
      Sign out
    </button>
  )
}

export function CopyInvite({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(
          `${location.origin}/join?code=${code}`
        )
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="h-9 rounded-lg bg-ink px-3 text-sm font-semibold text-white"
    >
      {copied ? "Copied ✓" : "Copy invite link"}
    </button>
  )
}

/** <select> that submits its GET form on change (rankings filters, review sort). */
export function AutoSelect(props: React.ComponentProps<"select">) {
  return (
    <select
      {...props}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    />
  )
}

/** Opens the log-visit modal while keeping the current page and its query (diary user, filters). */
export function LogLink({
  place = "1",
  ...props
}: { place?: string } & Omit<React.ComponentProps<typeof Link>, "href">) {
  const params = new URLSearchParams(useSearchParams())
  params.set("log", place)
  return <Link {...props} href={`${usePathname()}?${params}`} scroll={false} />
}
