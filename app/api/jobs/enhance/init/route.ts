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
    const { files, params } = await req.json();
    const db = supa();
    const { data: job, error } = await db.from("jobs")
      .insert({ type:"enhance", status:"queued", input_urls:[], params: params ?? {} })
      .select().single();
    if (error) return NextResponse.json({ error: String(error.message || error) }, { status: 500 });

    const uploads: { path:string; token:string }[] = [];
    for (const f of files as Array<{name:string}>) {
      const path = `${job.id}/${f.name}`;                 // OBJECT PATH ONLY
      const { data, error: e } = await db.storage.from("inputs").createSignedUploadUrl(path);
      if (e) return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
      uploads.push({ path, token: data.token });
    }
    return NextResponse.json({ job_id: job.id, uploads });
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
