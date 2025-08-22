import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function POST(req: Request) {
  try {
    const { job_id, paths } = await req.json(); // ["inputs/<job>/<file>"]
    // Convert storage paths to public URLs
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const urls = (paths as string[]).map(p => `${base}/storage/v1/object/public/${p}`);

    const { error } = await supa.from("jobs").update({
      input_urls: urls,
      status: "queued",
      updated_at: new Date().toISOString()
    }).eq("id", job_id);
    if (error) return NextResponse.json({ error }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
