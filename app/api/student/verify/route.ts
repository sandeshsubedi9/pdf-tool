import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models/User";
import { isStudentEmail } from "@/lib/edu-domains";
import { sendVerificationEmail } from "@/lib/mail";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { studentEmail } = await req.json();

    if (!studentEmail || !isStudentEmail(studentEmail)) {
      return NextResponse.json({ error: "Invalid student email domain." }, { status: 400 });
    }

    await connectToDatabase();
    
    // Generate a secure 6-digit code or hex token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour token life
    
    // Update the currently logged-in user with the pending verification
    await User.findOneAndUpdate(
      { email: session.user.email },
      {
        verificationToken: token,
        tokenExpiresAt: expiresAt,
      }
    );

    // Build the confirmation link
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const confirmLink = `${baseUrl}/api/student/confirm?token=${token}&email=${encodeURIComponent(session.user.email)}&student=${encodeURIComponent(studentEmail)}`;

    // Send the email
    await sendVerificationEmail(studentEmail, token.substring(0,6).toUpperCase(), confirmLink);

    return NextResponse.json({ success: true, message: "Verification email sent!" });
  } catch (error) {
    console.error("verify email error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
