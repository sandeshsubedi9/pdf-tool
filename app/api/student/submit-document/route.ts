import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models/User";
import { StudentVerification } from "@/lib/models/StudentVerification";
import { sendAdminVerificationRequestEmail } from "@/lib/mail";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("document") as File | null;
    const institutionName = (formData.get("institutionName") as string)?.trim();
    const documentType = formData.get("documentType") as string;

    if (!file || !institutionName || !documentType) {
      return NextResponse.json(
        { error: "Missing required fields: document, institutionName, documentType." },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a JPG, PNG, WebP, or PDF." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 10 MB limit." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Prevent duplicate pending submissions
    if (user.verificationStatus === "pending") {
      return NextResponse.json(
        { error: "You already have a pending verification request. Please wait for admin review." },
        { status: 400 }
      );
    }

    // Save file securely to a private disk path (NOT public!)
    const uploadDir = path.join(process.cwd(), "storage", "verifications");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const ext = ALLOWED_TYPES[file.type];
    const safeEmail = session.user.email.replace(/[^a-z0-9]/gi, "_");
    const filename = `${safeEmail}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Save verification record to DB, pointing to secure API
    const verification = await StudentVerification.create({
      userId: user._id,
      userEmail: session.user.email.toLowerCase(),
      userName: user.name || session.user.name || "",
      institutionName,
      documentType,
      documentUrl: `/api/admin/document-preview?file=${filename}`, // New secure route
      documentMimeType: file.type,
      status: "pending",
      submittedAt: new Date(),
    });

    // Update user status
    await User.findByIdAndUpdate(user._id, { verificationStatus: "pending" });

    // Notify admin by email
    await sendAdminVerificationRequestEmail({
      userName: user.name || "Student",
      userEmail: session.user.email,
      institutionName,
      documentType,
      verificationId: verification._id.toString(),
    });

    return NextResponse.json({
      success: true,
      message: "Your document has been submitted. We'll review it within 24–48 hours.",
    });
  } catch (error) {
    console.error("submit-document error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
