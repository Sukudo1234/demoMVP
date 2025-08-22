import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: any) {
  const id = context?.params?.id as string;

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!
  );

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode("retry: 1000\n\n"));
      let lastId = 0;

      const t = setInterval(async () => {
        const { data, error } = await supa
          .from("job_events")
          .select("*")
          .gt("id", lastId)
          .eq("job_id", id)
          .order("id", { ascending: true })
          .limit(50);

        if (error) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ level:"error", message:String(error) })}\n\n`));
          return;
        }

        if (data?.length) {
          lastId = Number(data[data.length - 1].id);
          for (const ev of data) {
            controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
          }
        }
      }, 1000);

      // auto-close after 15 minutes
      setTimeout(() => { clearInterval(t); controller.close(); }, 15 * 60 * 1000);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive"
    }
  });
}