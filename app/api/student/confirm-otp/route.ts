import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otp, studentEmail } = await req.json();

    if (!otp || !studentEmail) {
      return NextResponse.json({ error: "Missing OTP or email." }, { status: 400 });
    }

    await connectToDatabase();
    
    // Find the current logged-in user
    const user = await User.findOne({
      email: session.user.email.toLowerCase(),
    });

    if (!user || user.verificationToken !== otp.toUpperCase()) {
      return NextResponse.json({ error: "Invalid OTP code." }, { status: 400 });
    }

    if (user.tokenExpiresAt && user.tokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "OTP code has expired. Please request a new one." }, { status: 400 });
    }

    // Success! Verify them.
    await User.findByIdAndUpdate(user._id, {
      isStudent: true,
      studentEmail: studentEmail.toLowerCase(),
      verificationToken: null,
      tokenExpiresAt: null,
    });

    return NextResponse.json({ success: true, message: "Verification successful!" });
  } catch (error) {
    console.error("confirm OTP error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
