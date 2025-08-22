$P="C:\Projects\MVPApp\app\api\jobs\enhance\init\route.ts"
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
    const { files, params } = await req.json(); // files = [{name,mime}]
    const supa = getClient();

    const { data: job, error } = await supa.from("jobs").insert({
      type: "enhance",
      status: "queued",
      input_urls: [],
      params
    }).select().single();
    if (error) return NextResponse.json({ error }, { status: 500 });

    const uploads: { path: string; token: string }[] = [];
    for (const f of files as Array<{name:string;mime?:string}>) {
      const path = `inputs/${job.id}/${f.name}`;
      const { data, error: e } = await supa.storage.from("inputs").createSignedUploadUrl(path);
      if (e) return NextResponse.json({ error: e }, { status: 500 });
      uploads.push({ path, token: data.token });
    }
    return NextResponse.json({ job_id: job.id, uploads });
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
'@ | Set-Content $P -Encoding UTF8
