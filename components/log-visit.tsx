"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { logVisit } from "@/app/actions"
import { fmt } from "@/lib/score"
import { Avatar, Swatch } from "./bits"

type Place = {
  id: string
  name: string
  meta: string
  team: number | null
  myLast: number | null
}
type NewPlace = { name: string; cuisine: string; area: string; price: string }
type Props = {
  draftKey: string
  places: Place[]
  teammates: { id: string; name: string }[]
  teamName: string
}

const noop = () => () => {}
const PARTS = ["food", "service", "vibe", "value"] as const
const today = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4)
    .toISOString()
    .slice(0, 10)
}

/** Opens whenever the URL has ?log=1 (blank) or ?log=<restaurantId>. */
export function LogVisit(props: Props) {
  const params = useSearchParams()
  const log = params.get("log")
  const router = useRouter()
  const path = usePathname()
  const close = () => {
    const next = new URLSearchParams(params)
    next.delete("log")
    router.replace(next.size ? `${path}?${next}` : path, { scroll: false })
  }
  // client-only: the modal reads a localStorage draft
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false
  )
  return log && mounted ? (
    <Modal key={log} initialId={log} onClose={close} {...props} />
  ) : null
}

function Modal({
  draftKey,
  places,
  teammates,
  teamName,
  initialId,
  onClose,
}: Props & { initialId: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => ref.current?.showModal(), [])

  const draft = initialId === "1" ? readDraft(draftKey) : null
  const [placeId, setPlaceId] = useState<string | null>(
    draft?.placeId ??
      (places.some((p) => p.id === initialId) ? initialId : null)
  )
  const [newPlace, setNewPlace] = useState<NewPlace | null>(
    draft?.newPlace ?? null
  )
  const [query, setQuery] = useState("")
  const place = places.find((p) => p.id === placeId)
  const [date, setDate] = useState(draft?.date ?? today())
  const [score, setScore] = useState<number>(draft?.score ?? place?.myLast ?? 7)
  const [parts, setParts] = useState<Record<string, string>>(draft?.parts ?? {})
  const [dishes, setDishes] = useState<string[]>(draft?.dishes ?? [])
  const [dish, setDish] = useState("")
  const [companions, setCompanions] = useState<string[]>(
    draft?.companions ?? []
  )
  const [review, setReview] = useState(draft?.review ?? "")
  const [state, action, pending] = useActionState(logVisit, null)

  const matches = query
    ? places
        .filter((p) =>
          (p.name + " " + p.meta).toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 6)
    : places.slice(0, 6)
  const exact = places.some(
    (p) => p.name.toLowerCase() === query.trim().toLowerCase()
  )

  const addDish = (raw = dish) => {
    const d = raw.replace(/,/g, "").trim()
    if (d && !dishes.includes(d) && dishes.length < 12)
      setDishes([...dishes, d])
    setDish("")
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-labelledby="log-title"
      className="m-auto w-[min(640px,calc(100vw-24px))] rounded-[20px] bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/45"
    >
      <form
        action={action}
        onSubmit={() => localStorage.removeItem(draftKey)}
        className="flex max-h-[90svh] flex-col"
      >
        <div className="flex items-center justify-between border-b border-line px-8 py-5">
          <h2
            id="log-title"
            className="font-display text-[28px] font-extrabold tracking-[-0.02em]"
          >
            Log a visit
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => ref.current?.close()}
            className="flex size-8 items-center justify-center rounded-full bg-fog"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path
                d="M2 2l10 10M12 2L2 12"
                stroke="#111"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto px-8 py-6">
          {/* Place + date */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 grow">
              {place || newPlace ? (
                <div className="flex flex-col gap-3 rounded-xl border-[1.5px] border-ink px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Swatch
                      name={place?.name ?? newPlace!.name}
                      className="size-9 rounded-lg"
                    />
                    <div className="min-w-0 grow">
                      <p className="truncate text-[15px] font-semibold">
                        {place?.name ?? newPlace!.name}
                      </p>
                      <p className="truncate text-xs text-mute">
                        {place ? place.meta || " " : "New place"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => (setPlaceId(null), setNewPlace(null))}
                      className="text-sm text-mid hover:text-ink"
                    >
                      Change
                    </button>
                  </div>
                  {newPlace && (
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input
                        aria-label="Cuisine"
                        placeholder="Cuisine"
                        maxLength={40}
                        value={newPlace.cuisine}
                        onChange={(e) =>
                          setNewPlace({ ...newPlace, cuisine: e.target.value })
                        }
                        className="h-9 min-w-0 rounded-lg bg-fog px-2.5 text-sm outline-none focus:ring-2 focus:ring-ink"
                      />
                      <input
                        aria-label="Neighborhood"
                        placeholder="Neighborhood"
                        maxLength={40}
                        value={newPlace.area}
                        onChange={(e) =>
                          setNewPlace({ ...newPlace, area: e.target.value })
                        }
                        className="h-9 min-w-0 rounded-lg bg-fog px-2.5 text-sm outline-none focus:ring-2 focus:ring-ink"
                      />
                      <select
                        aria-label="Price"
                        value={newPlace.price}
                        onChange={(e) =>
                          setNewPlace({ ...newPlace, price: e.target.value })
                        }
                        className="h-9 rounded-lg bg-fog px-2 text-sm"
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            {"$".repeat(n)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <input
                    autoFocus
                    aria-label="Restaurant"
                    placeholder="Where did you eat?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="h-14.5 w-full rounded-xl border-[1.5px] border-ink px-4 text-[15px] outline-none"
                  />
                  <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-lg">
                    {matches.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => (
                            setPlaceId(p.id),
                            p.myLast != null && setScore(p.myLast)
                          )}
                          className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-fog"
                        >
                          <Swatch name={p.name} className="size-7 rounded-md" />
                          <span className="grow truncate text-[15px] font-medium">
                            {p.name}
                          </span>
                          <span className="truncate text-xs text-mute">
                            {p.meta}
                          </span>
                        </button>
                      </li>
                    ))}
                    {query.trim() && !exact && (
                      <li>
                        <button
                          type="button"
                          onClick={() =>
                            setNewPlace({
                              name: query.trim().slice(0, 80),
                              cuisine: "",
                              area: "",
                              price: "2",
                            })
                          }
                          className="w-full rounded-lg px-2.5 py-2.5 text-left text-[15px] font-semibold hover:bg-fog"
                        >
                          + Add “{query.trim()}” as a new place
                        </button>
                      </li>
                    )}
                    {!query && !places.length && (
                      <li className="px-2.5 py-2 text-sm text-mute">
                        Type a name to add your first place.
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
            <label className="flex shrink-0 flex-col justify-center rounded-xl border-[1.5px] border-edge px-4 py-2 focus-within:border-ink">
              <span className="text-xs text-mute">Date</span>
              <input
                type="date"
                name="date"
                required
                value={date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
                className="text-[15px] font-semibold outline-none"
              />
            </label>
          </div>

          {/* Score */}
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <p className="label">Your score</p>
                <p className="text-sm text-body">
                  {place?.team != null
                    ? `Team avg is ${fmt(place.team)}.`
                    : "No team score yet."}
                  {place?.myLast != null &&
                    ` Your last score here was ${fmt(place.myLast)}.`}
                </p>
              </div>
              <output className="rounded-xl bg-sun px-4 py-1 font-display text-[52px]/[60px] font-extrabold tabular-nums">
                {score.toFixed(1)}
              </output>
            </div>
            <input
              type="range"
              name="score"
              min={0}
              max={10}
              step={0.1}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              aria-label="Your score"
              className="score-range"
              style={{ "--fill": `${score * 10}%` } as React.CSSProperties}
            />
            <div
              className="flex justify-between font-mono text-xs text-mute"
              aria-hidden
            >
              {Array.from({ length: 11 }, (_, i) => (
                <span key={i}>{i}</span>
              ))}
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex flex-col gap-2.5">
            <p className="label">
              Break it down{" "}
              <span className="tracking-normal normal-case">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {PARTS.map((k) => (
                <label
                  key={k}
                  className="flex h-12 items-center justify-between rounded-xl border-[1.5px] border-edge px-3.5 focus-within:border-ink"
                >
                  <span className="text-[15px] text-mid capitalize">{k}</span>
                  <input
                    name={k}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={10}
                    step={0.1}
                    placeholder="–"
                    value={parts[k] ?? ""}
                    onChange={(e) =>
                      setParts({ ...parts, [k]: e.target.value })
                    }
                    className="w-10 [appearance:textfield] text-right font-display text-xl font-extrabold outline-none placeholder:font-normal placeholder:text-dot [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Dishes + who came */}
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="flex grow flex-col gap-2.5">
              <p className="label">What you ordered</p>
              <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border-[1.5px] border-edge px-2.5 py-2 focus-within:border-ink">
                {dishes.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDishes(dishes.filter((x) => x !== d))}
                    className="rounded-md bg-ink px-2.5 py-1 text-sm text-white"
                    aria-label={`Remove ${d}`}
                  >
                    {d} ×
                  </button>
                ))}
                <input
                  value={dish}
                  maxLength={40}
                  onChange={(e) =>
                    e.target.value.includes(",")
                      ? addDish(e.target.value)
                      : setDish(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addDish()
                    }
                    if (e.key === "Backspace" && !dish)
                      setDishes(dishes.slice(0, -1))
                  }}
                  onBlur={() => addDish()}
                  aria-label="Add a dish"
                  placeholder="Add a dish…"
                  className="min-w-24 grow text-sm outline-none placeholder:text-faint"
                />
              </div>
            </div>
            {teammates.length > 0 && (
              <div className="flex shrink-0 flex-col gap-2.5 sm:max-w-50">
                <p className="label">Who came</p>
                <div className="flex flex-wrap gap-2">
                  {teammates.map((t) => {
                    const on = companions.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={on}
                        title={t.name}
                        onClick={() =>
                          setCompanions(
                            on
                              ? companions.filter((c) => c !== t.id)
                              : [...companions, t.id]
                          )
                        }
                        className={`rounded-full border-2 transition-opacity ${on ? "border-ink" : "border-transparent opacity-40 hover:opacity-80"}`}
                      >
                        <Avatar id={t.id} name={t.name} size={34} />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <label className="flex flex-col gap-2.5">
            <span className="label">Review</span>
            <textarea
              name="review"
              rows={3}
              maxLength={2000}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="What should the team know?"
              className="resize-none rounded-xl border-[1.5px] border-edge px-4 py-3 text-[15px]/5.5 outline-none focus:border-ink"
            />
          </label>
        </div>

        <input type="hidden" name="restaurantId" value={placeId ?? ""} />
        <input type="hidden" name="newName" value={newPlace?.name ?? ""} />
        <input type="hidden" name="cuisine" value={newPlace?.cuisine ?? ""} />
        <input type="hidden" name="area" value={newPlace?.area ?? ""} />
        <input type="hidden" name="price" value={newPlace?.price ?? ""} />
        <input type="hidden" name="dishes" value={JSON.stringify(dishes)} />
        <input
          type="hidden"
          name="companions"
          value={JSON.stringify(companions)}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-[#FAFAFA] px-8 py-4">
          <p className="flex items-center gap-2 text-[15px] text-mid">
            <span className="size-2 rounded-full bg-ok" /> Visible to {teamName}
          </p>
          {state?.error && (
            <p
              role="alert"
              className="order-last w-full text-sm font-medium text-heart"
            >
              {state.error}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(
                  draftKey,
                  JSON.stringify({
                    placeId,
                    newPlace,
                    date,
                    score,
                    parts,
                    dishes,
                    companions,
                    review,
                  })
                )
                ref.current?.close()
              }}
              className="h-11.5 px-4 text-[15px] font-semibold"
            >
              Save draft
            </button>
            <button
              disabled={pending || !(place || newPlace)}
              className="h-11.5 rounded-xl bg-ink px-6 text-[15px] font-semibold text-white disabled:opacity-40"
            >
              {pending ? "Posting…" : "Post score"}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}

function readDraft(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null")
  } catch {
    return null
  }
}
