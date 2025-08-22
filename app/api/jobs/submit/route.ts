$P="C:\Projects\MVPApp\app\api\jobs\submit\route.ts"
@'
/* @ts-nocheck */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) throw new Error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE).");
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const { job_id, paths } = await req.json(); // ["inputs/<job>/<file>"]
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const urls = (paths as string[]).map(p => `${base}/storage/v1/object/public/${p}`);

    const supa = getClient();
    const { error } = await supa.from("jobs").update({
      input_urls: urls,
      status: "queued",
      updated_at: new Date().toISOString()
    }).eq("id", job_id);
    if (error) return NextResponse.json({ error }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
'@ | Set-Content $P -Encoding UTF8
