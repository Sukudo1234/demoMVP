export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const ok = {
    url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service: !!process.env.SUPABASE_SERVICE_ROLE,
  };
  return new Response(JSON.stringify(ok), { headers: { "content-type": "application/json" } });
}
