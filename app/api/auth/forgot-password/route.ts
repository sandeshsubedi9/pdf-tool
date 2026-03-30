import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models/User";
import { sendPasswordResetEmail } from "@/lib/mail";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Check if account exists
    if (!user) {
      return NextResponse.json({ error: "No account found with this email." }, { status: 404 });
    }

    // Check if it's a Google-only account (no password)
    if (!user.password && user.email) {
      return NextResponse.json({ error: "This account uses Google Login. Please sign in with Google." }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await User.findByIdAndUpdate(user._id, {
      verificationToken: otp,
      tokenExpiresAt: expiresAt,
    });

    await sendPasswordResetEmail(email.toLowerCase(), otp);

    return NextResponse.json({ success: true, message: "Code sent to your inbox!" });
  } catch (error) {
    console.error("Forgot password request error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
