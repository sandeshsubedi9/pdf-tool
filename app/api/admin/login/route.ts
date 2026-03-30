import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    // Use environment variable or fallback for development
    const adminPassword = process.env.ADMIN_PANEL_PASSWORD || "admin123";

    if (password !== adminPassword) {
      return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
    }

    // Set an HttpOnly cookie for the admin session
    const response = NextResponse.json({ success: true, message: "Logged in successfully" });
    
    // Simple secure cookie - hardcoded hash just to mark the session securely on the client
    // In production, you'd use a real JWT or crypto hash here tied to an env secret
    const adminToken = process.env.NEXTAUTH_SECRET || "fallback_secret_for_admin_token_123";
    
    response.cookies.set("admin_token", adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
