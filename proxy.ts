import { withAuth } from "next-auth/middleware";

export default withAuth({
  // Matches the custom login page we created instead of the default NextAuth login page
  pages: {
    signIn: "/login",
  },
});

// The matcher configuration tells Next.js EXACTLY which URLs should trigger this proxy.
export const config = {
  matcher: [
    "/settings",
    "/settings/:path*"
  ],
};
