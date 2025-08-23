import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
const AUPH = "https://auphonic.com/api";

async function claimJob() {
  const { data: jobs } = await supa
    .from("jobs").select("*")
    .eq("type","enhance").eq("status","queued").limit(1);
  if (!jobs || !jobs.length) return null;
  const job = jobs[0];
  const { error } = await supa.from("jobs")
    .update({ status:"running", updated_at: new Date().toISOString() })
    .eq("id", job.id);
  if (error) return null;
  return job;
}

async function log(job_id, message, data=null) {
  await supa.from("job_events").insert({ job_id, message, data });
  console.log(`[${job_id}] ${message}`, data ? JSON.stringify(data).slice(0,200) : "");
}

async function once() {
  const job = await claim(); if (!job) return;
  try {
    await log(job.id, "Started");
    const outputs = [];

    for (const input of job.input_urls) {
      const res = await fetch(`${AUPH}/productions.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `bearer ${process.env.AUPHONIC_API_KEY}` },
        body: JSON.stringify({
          input_file: input,
          algorithms: {
            filtering: true,
            leveler: true,
            normloudness: true, loudnesstarget: -24,
            denoise: true, denoisemethod: "dynamic",
            deverbamount: 0,
            silence_cutter: true
          },
          output_files: [{ format: "wav" }]
        })
      });
      const prod = await res.json();
      const uuid = prod?.data?.uuid;
      if (!uuid) throw new Error("Auphonic production not created");

      let doneUrl = "";
      while (!doneUrl) {
        await new Promise(r=>setTimeout(r,3000));
        const st = await fetch(`${AUPH}/production/${uuid}.json`, {
          headers: { "Authorization": `bearer ${process.env.AUPHONIC_API_KEY}` }
        }).then(r=>r.json());
        await log(job.id, "progress", { status: st?.data?.status_string });
        if (st?.data?.status === "done") {
          const dl = st?.data?.output_files?.[0]?.download_url;
          if (!dl) throw new Error("Output URL missing");
          doneUrl = dl;
        } else if (st?.data?.status === "error") {
          throw new Error(st?.data?.error_message || "Auphonic error");
        }
      }

      const outPath = `outputs/${job.id}/${Date.now()}.wav`;
      const buf = Buffer.from(await (await fetch(doneUrl)).arrayBuffer());
      const { error: upErr } = await supa.storage.from("outputs")
        .upload(outPath, buf, { contentType: "audio/wav", upsert: true });
      if (upErr) throw upErr;

      const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${outPath}`;
      outputs.push(publicUrl);
    }
    await supa.from("jobs").update({ status:"completed" }).eq("id", job.id);
    await log(job.id, "Completed", { outputs });
  } catch (e) {
    await supa.from("jobs").update({ status:"failed", error:String(e) }).eq("id", job.id);
    await log(job.id, "Failed", { error:String(e) });
  }
}

setInterval(once, 2000);
