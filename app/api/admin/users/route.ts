import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models/User";

export async function GET() {
  // Check auth
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token")?.value;
  const expectedToken = process.env.NEXTAUTH_SECRET || "fallback_secret_for_admin_token_123";

  if (!adminToken || adminToken !== expectedToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectToDatabase();
    
    // Get all users, sorted by most recently created
    const users = await User.find({})
      .select("-password -verifyToken -verifyTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry") // never send sensitive data
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
