import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { StudentVerification } from "@/lib/models/StudentVerification";
import { User } from "@/lib/models/User";
import { sendStudentVerificationDecisionEmail } from "@/lib/mail";
import path from "path";
import { existsSync } from "fs";
import { unlink } from "fs/promises";


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

// DELETE: Manually delete a verification record and its file
export async function DELETE(req: NextRequest) {
  try {
    const adminToken = req.cookies.get("admin_token")?.value;
    const expectedToken = process.env.NEXTAUTH_SECRET || "fallback_secret_for_admin_token_123";

    if (!adminToken || adminToken !== expectedToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const verificationId = searchParams.get("id");

    if (!verificationId) {
      return NextResponse.json({ error: "Verification ID required." }, { status: 400 });
    }

    await connectToDatabase();

    const verification = await StudentVerification.findById(verificationId);
    if (!verification) {
      return NextResponse.json({ error: "Verification not found." }, { status: 404 });
    }

    // Delete the file from disk
    try {
      const filename = verification.documentUrl.split("file=")[1];
      if (filename) {
        const filePath = path.join(process.cwd(), "storage", "verifications", filename);
        if (existsSync(filePath)) {
          await unlink(filePath);
        }
      }
    } catch (err) {
      console.error("Failed to delete file from disk:", err);
    }

    // Delete from DB
    await StudentVerification.findByIdAndDelete(verificationId);

    // Optionally reset user status if needed
    await User.findByIdAndUpdate(verification.userId, {
      verificationStatus: "none",
      isStudent: false
    });

    return NextResponse.json({ success: true, message: "Verification deleted." });
  } catch (error) {
    console.error("admin verifications DELETE error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
