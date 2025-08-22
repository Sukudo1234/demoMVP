import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode("retry: 1000\n\n"));
      let lastId = 0;
      const t = setInterval(async () => {
        const { data, error } = await supa
          .from("job_events")
          .select("*")
          .gt("id", lastId)
          .eq("job_id", params.id)
          .order("id", { ascending: true })
          .limit(50);
        if (error) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ level:"error", message:String(error) })}\n\n`));
          return;
        }
        if (data?.length) {
          lastId = data[data.length - 1].id as number;
          for (const ev of data) controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
        }
      }, 1000);
      setTimeout(() => { clearInterval(t); controller.close(); }, 15*60*1000);
    }
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}