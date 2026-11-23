import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware"

// Refreshes Kinde tokens and sends signed-out visitors to /login.
export default withAuth({
  loginPage: "/login",
  publicPaths: ["/login", "/join"],
})

export const config = {
  matcher: ["/((?!_next|api/auth|.*\\..*).*)"],
}
