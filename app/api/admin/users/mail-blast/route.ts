import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sendMarketingReminderEmail } from "@/lib/mail";

export async function POST(req: Request) {
  // Check auth
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token")?.value;
  const expectedToken = process.env.NEXTAUTH_SECRET || "fallback_secret_for_admin_token_123";

  if (!adminToken || adminToken !== expectedToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { emails } = await req.json();

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "No emails provided" }, { status: 400 });
    }

    // Call the mail service
    await sendMarketingReminderEmail(emails);

    return NextResponse.json({ success: true, message: `Successfully blasted email to ${emails.length} users.` }, { status: 200 });
  } catch (error) {
    console.error("Error triggering mail blast:", error);
    return NextResponse.json({ error: "Failed to send mass email" }, { status: 500 });
  }
}
