import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch (err) {
    console.error("[keepalive] DB ping failed:", err);
    return NextResponse.json({ error: "DB ping failed" }, { status: 500 });
  }
}
