/* @ts-nocheck */
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";

export async function GET(req) {
  const u = new URL(req.url);
  const id   = u.searchParams.get("id");      // job id
  const file = u.searchParams.get("file");    // "vocals.wav" | "bg.wav" | "enhanced.wav"
  if (!id || !file) return new Response("Bad request", { status: 400 });

  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
  const { data, error } = await supa.storage.from("outputs").createSignedUrl(`${id}/${file}`, 3600);
  if (error) return new Response(JSON.stringify({ error: String(error.message || error) }), { status: 500 });
  return new Response(JSON.stringify({ url: data.signedUrl }), { headers: { "Content-Type": "application/json" } });
}
