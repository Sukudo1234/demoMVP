/* @ts-nocheck */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function supa() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const { job_id, paths } = await req.json();           // ["<jobId>/<file>"]
    const db = supa();
    const { error } = await db.from("jobs")
      .update({ input_urls: paths, status:"queued", updated_at: new Date().toISOString() })
      .eq("id", job_id);
    if (error) return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
