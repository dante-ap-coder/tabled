import { cn } from "@/lib/utils"
import { fmt, scoreTone } from "@/lib/score"

const AVATAR = [
  "#F4B6A6",
  "#BFD7EA",
  "#A9D3C5",
  "#E3C8F0",
  "#F5E1A4",
  "#C9DDB0",
]
const SWATCH = [
  "#E9C46A",
  "#C8553D",
  "#7A8B99",
  "#3D3D3D",
  "#DDA445",
  "#6A994E",
  "#B5838D",
  "#457B9D",
]

const hash = (s: string) =>
  [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?"

export const firstName = (name: string) => name.split(/\s+/)[0] || name
export const price = (n: number) => "$".repeat(Math.max(1, n))
export const placeMeta = (r: {
  cuisine: string
  area: string
  price: number
}) => [r.cuisine, r.area, price(r.price)].filter(Boolean).join(" · ")

const DAY = { timeZone: "UTC" } as const
export const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { ...DAY, ...opts })

export const ordinal = (n: number) =>
  n +
  (n % 100 >= 11 && n % 100 <= 13
    ? "th"
    : (["th", "st", "nd", "rd"][n % 10] ?? "th"))

export function Avatar({
  id,
  name,
  size = 32,
  className,
}: {
  id: string
  name: string
  size?: number
  className?: string
}) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink",
        className
      )}
      style={{
        background: AVATAR[hash(id) % AVATAR.length],
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.36),
      }}
    >
      {initials(name)}
    </span>
  )
}

export function Swatch({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn("block shrink-0 rounded-xl", className)}
      style={{ background: SWATCH[hash(name.toLowerCase()) % SWATCH.length] }}
    />
  )
}

export function ScoreChip({
  score,
  className,
}: {
  score: number | null | undefined
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-lg px-2.5 py-1 text-center font-display font-extrabold text-ink tabular-nums",
        scoreTone(score),
        className
      )}
    >
      {fmt(score)}
    </span>
  )
}

export function Logo({ dark, big }: { dark?: boolean; big?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex items-center justify-center rounded-[7px] bg-sun font-display font-extrabold text-ink",
          big ? "size-9 rounded-lg text-[21px]" : "size-7.5 text-[17px]"
        )}
      >
        P
      </span>
      <span
        className={cn(
          "font-display font-extrabold tracking-[-0.02em]",
          dark ? "text-white" : "text-ink",
          big ? "text-2xl" : "text-[21px]"
        )}
      >
        project da
      </span>
    </span>
  )
}
