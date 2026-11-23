"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { checkInvite, joinTeam, type Invite } from "../../actions"
import { Field, inputCls, primaryBtn } from "../shell"

export function JoinForm(props: {
  initialCode: string
  initialInvite: Invite | null
  startNew: boolean
  /** false for someone who already has a team: they can only take an invite */
  canStartNew: boolean
  signedInAs: string | null
}) {
  const [mode, setMode] = useState<"invite" | "new">(
    props.startNew ? "new" : "invite"
  )
  const [code, setCode] = useState(props.initialCode)
  // preview is only trusted for the exact code that produced it
  const [preview, setPreview] = useState({
    code: props.initialCode,
    invite: props.initialInvite,
  })
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  // live "✓ Valid" check, debounced
  useEffect(() => {
    if (mode !== "invite" || code.trim().length < 6) return
    const t = setTimeout(
      () => checkInvite(code).then((invite) => setPreview({ code, invite })),
      300
    )
    return () => clearTimeout(t)
  }, [code, mode])
  const invite = preview.code === code ? preview.invite : null
  const codeOk = mode === "invite" && !!invite

  function submit(fd: FormData) {
    setError("")
    start(async () => {
      if (mode === "invite" && !(await checkInvite(code)))
        return setError("That invite code doesn't match a team.")
      if (!props.signedInAs) {
        // sign up with Kinde, then land back here with the code filled in
        const back = mode === "invite" ? `/join?code=${code}` : "/join?new=1"
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- API route, needs a full navigation
        location.href = `/api/auth/register?post_login_redirect_url=${encodeURIComponent(back)}`
        return
      }
      const res = await joinTeam(
        mode === "invite" ? { code } : { teamName: String(fd.get("teamName")) }
      )
      if (res?.error) setError(res.error)
    })
  }

  const heading =
    mode === "new"
      ? {
          kicker: "Start a table",
          title: "New team",
          body: "You'll get an invite code to share with your crew.",
        }
      : codeOk
        ? {
            kicker: "You've been invited",
            title: `Join ${invite!.team}`,
            body: `${invite!.inviter} invited you. ${invite!.members} teammate${invite!.members === 1 ? " has" : "s have"} scored ${invite!.places} place${invite!.places === 1 ? "" : "s"} since ${invite!.since}.`,
          }
        : {
            kicker: "Join your table",
            title: "Join your team",
            body: "Enter the invite code a teammate shared with you.",
          }

  return (
    <form action={submit} className="flex flex-col gap-9">
      <div className="flex flex-col gap-2.5">
        <p className="font-mono text-[13px]/4 tracking-[0.12em] text-mute uppercase">
          {heading.kicker}
        </p>
        <h2 className="font-display text-[44px]/12 font-extrabold tracking-[-0.03em]">
          {heading.title}
        </h2>
        <p className="text-[17px]/6.5 text-mid">{heading.body}</p>
      </div>

      <div className="flex flex-col gap-4">
        {props.signedInAs && (
          <p className="text-[15px] text-mid">
            Signed in as <b className="text-ink">{props.signedInAs}</b>.
          </p>
        )}
        {mode === "invite" ? (
          <Field label="Invite code">
            <div className="relative">
              <input
                name="code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="FORK-XXXXXX"
                autoComplete="off"
                spellCheck={false}
                className={`${inputCls} pr-20 font-mono text-lg tracking-[0.18em]`}
              />
              {codeOk && (
                <span className="absolute top-1/2 right-4 -translate-y-1/2 text-[13px] font-semibold text-ok">
                  ✓ Valid
                </span>
              )}
            </div>
          </Field>
        ) : (
          <Field label="Team name">
            <input
              name="teamName"
              required
              maxLength={40}
              placeholder="Lunch Club"
              className={inputCls}
            />
          </Field>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        {error && (
          <p role="alert" className="text-[15px] font-medium text-heart">
            {error}
          </p>
        )}
        <button disabled={pending} className={primaryBtn}>
          {pending
            ? "Setting the table…"
            : mode === "new"
              ? "Create the table →"
              : "Join the table →"}
        </button>
        <p className="flex flex-wrap justify-center gap-1.5 text-[15px] text-mute">
          {props.canStartNew && (
            <>
              {mode === "invite" ? "No code?" : "Have a code?"}
              <button
                type="button"
                onClick={() => (
                  setMode(mode === "invite" ? "new" : "invite"),
                  setError("")
                )}
                className="font-semibold text-ink underline underline-offset-2"
              >
                {mode === "invite" ? "Start a new team" : "Join with an invite"}
              </button>
            </>
          )}
          {!props.signedInAs && (
            <>
              <span className="mx-1">·</span>
              <Link
                href="/login"
                className="font-semibold text-ink underline underline-offset-2"
              >
                Log in
              </Link>
            </>
          )}
        </p>
      </div>
    </form>
  )
}
