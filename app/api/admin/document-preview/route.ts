import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import path from "path";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

const ADMIN_EMAILS = ["sandeshsubedi2020@gmail.com"];

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(req: NextRequest) {
  try {
    const adminToken = req.cookies.get("admin_token")?.value;
    const expectedToken = process.env.NEXTAUTH_SECRET || "fallback_secret_for_admin_token_123";

    if (!adminToken || adminToken !== expectedToken) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("file");

    if (!filename || filename.includes("..") || filename.includes("/")) {
      return new NextResponse("Invalid filename", { status: 400 });
    }

    const filePath = path.join(process.cwd(), "storage", "verifications", filename);

    if (!existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    // Set Cache-Control so the browser caches the preview but checks auth once
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Document preview error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
