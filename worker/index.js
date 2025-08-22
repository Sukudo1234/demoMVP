/* minimal open-source worker (ffmpeg static) */
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

const supa = createClient(process.envSUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

async function log(job_id, message, data=null) {
  await supa.from("job_events").insert({ job_id, message, data }).throwOnError();
  console.log(`[${job_id}] ${message}`, data ?? "");
}

async function claim() {
  const { data } = await supa.from("jobs").select("*").eq("type","enhance").eq("status","queued").order("created_at").limit(1);
  if (!data?.length) return null;
  const job = data[0];
  await supa.from("jobs").update({ status:"running", updated_at: new Date().toISOString() }).eq("id", job.id);
  return job;
}

async function downloadInput(objPath) {
  // objPath is like "<jobId>/<filename>"
  const { data, error } = await supa.storage.from("inputs").download(objPath);
  if (error) throw error;
  const tmp = path.join(os.tmpdir(), `${Date.now()}-${path.basename(objPath)}`);
  await fs.writeFile(tmp, Buffer.from(await data.arrayBuffer()));
  return tmp;
}

function runFfmpeg(infile, outfile) {
  return new Promise((resolve, reject) => {
    const args = [
      "-y", "-i", infile,
      "-af", "highpass=f=80,deesser=i=6.0:m=0.6:fc=6000:fw=1.5,arnndn=m=rnnoise-models/rnnoise.rnnn,loudnorm=I=-24:TP=-2:LRA=11,alimiter=limit=0.95",
      "-ar", "48000", "-ac", "1",
      outfile
    ];
    const p = spawn(ffmpegPath, args);
    let out=""; p.stdout.on("data", d=> out+=d); p.stderr.on("data", d=> out+=d);
    p.on("close", code => code===0 ? resolve(out) : reject(new Error(out)));
  });
}

async function uploadOutput(jobId, localFile) {
  const obj = `outputs/${jobId}/${path.basename(localFile).replace(/\.[^.]+$/, "")}-enhanced.wav`;
  const buf = await fs.readFile(localFile);
  const { error } = await supa.storage.from("outputs").upload(obj, buf, { contentType:"audio/wav", upsert:true });
  if (error) throw error;
  // store only the object path (without bucket) for private buckets
  await supa.from("jobs").update({ result_url: obj }).eq("id", jobId);
  return obj;
}

async function once() {
  const job = await claim(); if (!job) return;
  try {
    await log(job.id, "Started", { files: job.input_urls });
    // job.input_urls must be raw object paths like "<jobId>/<file>"
    const outputs = [];
    for (const p of job.input_urls) {
      await log(job.id, "progress", { step:"download", path:p });
      const infile = await downloadInput(p);
      const outfile = path.join(os.tmpdir(), `${Date.now()}-out.wav`);
      await log(job.id, "progress", { step:"enhance" });
      await runFfmpeg(infile, outfile);
      await log(job.id, "progress", { step:"upload" });
      const outObj = await uploadOutput(job.id, outfile);
      outputs.push(outObj);
    }
    await supa.from("jobs").update({ status:"completed" }).eq("id", job.id);
    await log(job.id, "Completed", { outputs });
  } catch (e) {
    await supa.from("jobs").update({ status:"failed", error:String(e) }).eq("id", job.id);
    await log(job.id, "Failed", { error:String(e) });
  }
}

setInterval(once, 2000);
