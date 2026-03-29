import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { isStudentEmail } from "@/lib/edu-domains";

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

    await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      isStudent: autoStudent,
      studentEmail: autoStudent ? email.toLowerCase() : undefined,
    });

    return NextResponse.json({ success: true, message: "User created successfully." });
  } catch (error) {
    console.error("register error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
