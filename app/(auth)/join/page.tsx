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
  // with a code, a member still gets the form: an invite can move them off a solo team
  if (
    session &&
    !code &&
    (await get(`select 1 from member where user_id = ?`, [session.user.id]))
  )
    redirect("/")
  const invite = code ? await checkInvite(code) : null

  return (
    <AuthShell invite={invite}>
      <JoinForm
        initialCode={code.toUpperCase()}
        initialInvite={invite}
        startNew={!!startNew}
        signedInAs={session?.user.name ?? null}
      />
    </AuthShell>
  )
}
