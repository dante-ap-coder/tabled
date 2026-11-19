"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { authClient } from "@/lib/auth-client"
import { AuthShell, Field, inputCls, primaryBtn } from "../shell"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  function submit(fd: FormData) {
    setError("")
    start(async () => {
      const { error } = await authClient.signIn.email({
        email: String(fd.get("email")).trim(),
        password: String(fd.get("password")),
      })
      if (error) return setError(error.message ?? "Couldn't sign you in.")
      router.replace("/")
      router.refresh()
    })
  }

  return (
    <AuthShell>
      <form action={submit} className="flex flex-col gap-9">
        <div className="flex flex-col gap-2.5">
          <p className="font-mono text-[13px]/4 tracking-[0.12em] text-mute uppercase">
            Welcome back
          </p>
          <h2 className="font-display text-[44px]/12 font-extrabold tracking-[-0.03em]">
            Pull up a chair
          </h2>
          <p className="text-[17px]/6.5 text-mid">
            Log in to see what the table ate.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <Field label="Work email">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputCls}
            />
          </Field>
          <Field label="Password">
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={inputCls}
            />
          </Field>
        </div>
        <div className="flex flex-col gap-3.5">
          {error && (
            <p role="alert" className="text-[15px] font-medium text-heart">
              {error}
            </p>
          )}
          <button disabled={pending} className={primaryBtn}>
            {pending ? "Logging in…" : "Log in →"}
          </button>
          <p className="flex justify-center gap-1.5 text-[15px] text-mute">
            New here?
            <Link
              href="/join"
              className="font-semibold text-ink underline underline-offset-2"
            >
              Join your team
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  )
}
