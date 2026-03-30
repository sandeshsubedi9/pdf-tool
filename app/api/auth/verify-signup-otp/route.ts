import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      verificationToken: otp.toUpperCase(),
     });

    if (!user) {
      return NextResponse.json({ error: "Invalid OTP code." }, { status: 400 });
    }
    
    // Check expiry
    if (user.tokenExpiresAt && user.tokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "OTP has expired. Please sign up again." }, { status: 400 });
    }

    // Success - Mark as verified and student
    await User.findByIdAndUpdate(user._id, {
      isStudent: true,
      emailVerified: true,
      verificationToken: null,
      tokenExpiresAt: null,
    });

    return NextResponse.json({ success: true, message: "Email verified successfully!" });
  } catch (error) {
    console.error("Student signup verify error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
