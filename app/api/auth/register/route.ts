import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { isStudentEmail } from "@/lib/edu-domains";
import { sendVerificationEmail } from "@/lib/mail";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Auto-detect student emails during basic sign up
    const autoStudent = isStudentEmail(email);

    let verificationToken = undefined;
    let tokenExpiresAt = undefined;

    // MANDATORY OTP for students
    if (autoStudent) {
      verificationToken = crypto.randomBytes(3).toString("hex").toUpperCase();
      tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      isStudent: autoStudent,
      studentEmail: autoStudent ? email.toLowerCase() : undefined,
      emailVerified: !autoStudent, // NORMAL users are verified immediately, STUDENTS must enter OTP
      verificationToken,
      tokenExpiresAt,
    });

    if (autoStudent && verificationToken) {
      await sendVerificationEmail(email.toLowerCase(), verificationToken);
    }

    return NextResponse.json({ 
       success: true, 
       message: autoStudent ? "Verification code sent." : "User created successfully.",
       isStudent: autoStudent 
    });
  } catch (error) {
    console.error("register error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
