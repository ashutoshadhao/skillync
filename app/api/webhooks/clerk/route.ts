import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing CLERK_WEBHOOK_SECRET" }, { status: 500 });
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const { type: eventType } = evt;

  if (eventType === "user.created") {
    const { id, first_name, last_name, email_addresses } = evt.data;
    const name = [first_name, last_name].filter(Boolean).join(" ") || null;
    const email = email_addresses?.[0]?.email_address || null;

    await db.insert(users).values({
      clerkId: id,
      name,
      email,
    }).onConflictDoNothing();
  }

  if (eventType === "user.updated") {
    const { id, first_name, last_name, email_addresses } = evt.data;
    const name = [first_name, last_name].filter(Boolean).join(" ") || null;
    const email = email_addresses?.[0]?.email_address || null;

    await db
      .update(users)
      .set({ name, email })
      .where(eq(users.clerkId, id));
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      await db.delete(users).where(eq(users.clerkId, id));
    }
  }

  return NextResponse.json({ received: true });
}
