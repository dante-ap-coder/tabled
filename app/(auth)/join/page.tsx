import { redirect } from "next/navigation"
import { get } from "@/lib/db"
import { getSession } from "@/lib/team"
import { checkInvite } from "../../actions"
import { AuthShell } from "../shell"
import { JoinForm } from "./join-form"

export const metadata = { title: "Join your table · project da" }

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; new?: string }>
}) {
  const { code = "", new: startNew } = await searchParams
  const session = await getSession()
  const mine = session
    ? await get<{ size: number }>(
        `select (select count(*) from member where team_id = m.team_id) size from member m where m.user_id = ?`,
        [session.user.id]
      )
    : undefined
  // someone alone on their team can still take an invite; on a shared team there is nothing to do here
  if (mine && mine.size > 1 && !code) redirect("/")
  const invite = code ? await checkInvite(code) : null

  return (
    <AuthShell invite={invite}>
      <JoinForm
        initialCode={code.toUpperCase()}
        initialInvite={invite}
        startNew={!!startNew && !mine}
        canStartNew={!mine}
        signedInAs={session?.user.name ?? null}
      />
    </AuthShell>
  )
}
