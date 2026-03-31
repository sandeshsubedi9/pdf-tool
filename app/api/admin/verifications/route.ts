import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import { StudentVerification } from "@/lib/models/StudentVerification";
import { User } from "@/lib/models/User";
import { sendStudentVerificationDecisionEmail } from "@/lib/mail";

const ADMIN_EMAILS = ["sandeshsubedi2020@gmail.com"]; // Add your admin emails here

// GET: List all verification requests
export async function GET(req: NextRequest) {
  try {
    const adminToken = req.cookies.get("admin_token")?.value;
    const expectedToken = process.env.NEXTAUTH_SECRET || "fallback_secret_for_admin_token_123";

    if (!adminToken || adminToken !== expectedToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status"); // "pending" | "approved" | "rejected" | null

    const query: Record<string, string> = {};
    if (statusFilter && ["pending", "approved", "rejected"].includes(statusFilter)) {
      query.status = statusFilter;
    }

    const verifications = await StudentVerification.find(query)
      .sort({ submittedAt: -1 })
      .lean();

    return NextResponse.json({ verifications });
  } catch (error) {
    console.error("admin verifications GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH: Approve or reject a verification request
export async function PATCH(req: NextRequest) {
  try {
    const adminToken = req.cookies.get("admin_token")?.value;
    const expectedToken = process.env.NEXTAUTH_SECRET || "fallback_secret_for_admin_token_123";

    if (!adminToken || adminToken !== expectedToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { verificationId, action, adminNote } = await req.json();

    if (!verificationId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    await connectToDatabase();

    const verification = await StudentVerification.findById(verificationId);
    if (!verification) {
      return NextResponse.json({ error: "Verification request not found." }, { status: 404 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    // Update verification record
    verification.status = newStatus;
    verification.adminNote = adminNote || "";
    verification.reviewedAt = new Date();
    await verification.save();

    // Update the user record accordingly
    if (action === "approve") {
      await User.findByIdAndUpdate(verification.userId, {
        isStudent: true,
        verificationStatus: "approved",
      });
    } else {
      await User.findByIdAndUpdate(verification.userId, {
        isStudent: false,
        verificationStatus: "rejected",
      });
    }

    // Notify the student by email
    await sendStudentVerificationDecisionEmail({
      to: verification.userEmail,
      userName: verification.userName || "Student",
      approved: action === "approve",
      adminNote: adminNote || "",
    });

    return NextResponse.json({
      success: true,
      message: `Verification ${newStatus}.`,
    });
  } catch (error) {
    console.error("admin verifications PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
