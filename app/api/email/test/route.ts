import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { users, emailConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendTestEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { smtpHost, smtpPort, smtpUser, smtpPass, fromEmail } = body;

  if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
    return NextResponse.json({ error: "All SMTP fields are required" }, { status: 400 });
  }

  // Get user
  const user = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  if (!user.length) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const userId = user[0].id;
  const email = user[0].email!;

  try {
    await sendTestEmail(
      { smtp_host: smtpHost, smtp_port: smtpPort || 587, smtp_user: smtpUser, smtp_pass: smtpPass, from_email: fromEmail },
      email
    );

    // Save verified config
    await db
      .insert(emailConfigs)
      .values({
        userId,
        smtpHost,
        smtpPort: smtpPort || 587,
        smtpUser,
        smtpPass,
        fromEmail,
        isVerified: true,
      })
      .onConflictDoUpdate({
        target: emailConfigs.userId,
        set: {
          smtpHost,
          smtpPort: smtpPort || 587,
          smtpUser,
          smtpPass,
          fromEmail,
          isVerified: true,
        },
      });

    return NextResponse.json({ success: true, message: "Test email sent! Check your inbox." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: `Email failed: ${message}` }, { status: 500 });
  }
}
