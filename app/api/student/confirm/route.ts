import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models/User";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const studentEmail = searchParams.get("student");

    if (!token || !email || !studentEmail) {
      return new NextResponse("Invalid link (missing parameters).", { status: 400 });
    }

    await connectToDatabase();
    
    // Find the user with matching email and token
    const user = await User.findOne({
      email: email.toLowerCase(),
      verificationToken: token,
      tokenExpiresAt: { $gt: new Date() }, // Ensure token is not expired
    });

    if (!user) {
      return new NextResponse("Link is invalid or has expired. Please request a new one.", { status: 400 });
    }

    // Success! Verify them.
    await User.findByIdAndUpdate(user._id, {
      isStudent: true,
      studentEmail: studentEmail.toLowerCase(),
      verificationToken: null,
      tokenExpiresAt: null,
    });

    // Optionally redirect to a success page
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(`${baseUrl}?verified=true`);
  } catch (error) {
    console.error("confirm email error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
