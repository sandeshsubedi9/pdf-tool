import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

// Yes! We use withAuth to wrap the ENTIRE proxy function.
// This beautifully allows us to handle both NextAuth protected routes AND our custom Admin routes in one single file.
export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // 1. ADVANCED ROUTE PROTECTION: The Admin Portal
    if (pathname.startsWith("/admin")) {
      const adminToken = req.cookies.get("admin_token")?.value;
      const expectedToken = process.env.NEXTAUTH_SECRET || "fallback_secret_for_admin_token_123";
      
      const isAuthenticated = adminToken && adminToken === expectedToken;

      // If they are on the login page but ARE authenticated, send them to the dashboard 
      if (pathname === "/admin/login" && isAuthenticated) {
        return NextResponse.redirect(new URL("/admin/verifications", req.url));
      }

      // If they are on any other admin page and ARE NOT authenticated, send them to login
      if (pathname !== "/admin/login" && !isAuthenticated) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    // Otherwise, let the request proceed naturally
    return NextResponse.next();
  },
  {
    // 2. BASIC ROUTE PROTECTION: Normal Users
    // This tells NextAuth which routes require a default User Login.
    callbacks: {
      authorized: ({ req, token }) => {
        // If the route is an admin route, we handled auth manually above, so skip NextAuth verification here
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return true;
        }
        
        // For any other protected route (like /settings), require a standard NextAuth token
        return !!token;
      },
    },
    // Matches the custom login page we created instead of the default NextAuth login page
    pages: {
      signIn: "/login",
    },
  }
);

// The matcher configuration tells the router EXACTLY which URLs should trigger this proxy.
export const config = {
  matcher: [
    // Protect normal user settings
    "/settings",
    "/settings/:path*",
    
    // Protect the admin dashboard routes completely
    "/admin/:path*",
  ],
};
