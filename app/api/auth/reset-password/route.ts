import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    await connectToDatabase();

    // STRICT CHECK: The OTP must match exactly the email provided. 
    // This prevents someone from using their own code to reset someone else's email.
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      verificationToken: otp.toUpperCase(),
     });

    if (!user) {
      return NextResponse.json({ error: "Invalid reset code for this email." }, { status: 400 });
    }
    
    // Check expiry
    if (user.tokenExpiresAt && user.tokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 });
    }

    // Success - Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      verificationToken: null,
      tokenExpiresAt: null,
    });

    return NextResponse.json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
