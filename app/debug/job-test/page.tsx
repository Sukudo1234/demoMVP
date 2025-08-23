"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Page() {
  const [f,setF]=useState<File|null>(null);
  const [log,setLog]=useState<string[]>([]);
  const [jid,setJid]=useState<string>("");

  async function run() {
    if(!f) return alert("pick a small mp3/wav first");

    // 1) create job + get signed upload url
    const init = await fetch("/api/jobs/enhance/init", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ files:[{name:f.name, mime:f.type||"audio/wav"}], params:{} })
    }).then(r=>r.json());
    if(!init?.job_id) return alert("init failed");
    setJid(init.job_id);

    // 2) upload to Supabase Storage (inputs bucket)
    const u0 = init.uploads[0];
    const up = await supa.storage.from("inputs").uploadToSignedUrl(u0.path,u0.token,f);
    // @ts-ignore
    if(up.error) return alert("upload failed: "+up.error.message);

    // 3) confirm so the worker picks it
    await fetch("/api/jobs/submit",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ job_id:init.job_id, paths:[u0.path] })
    });

    // 4) live progress
    const es = new EventSource(`/api/jobs/events?id=${init.job_id}`);
    es.onmessage = (e)=>{
      try {
        const ev = JSON.parse(e.data);
        setLog(prev=>[...prev, ev.message || JSON.stringify(ev)]);
        if (ev.message === "Completed") es.close();
      } catch {}
    };
  }

  return (
    <div style={{maxWidth:720,margin:"40px auto",fontFamily:"ui-sans-serif"}}>
      <h1>Job test</h1>
      <p>Pick a small mp3/wav. Click Run. Watch worker logs and Supabase <code>outputs/</code>.</p>
      <input type="file" accept="audio/*,video/*" onChange={e=>setF(e.target.files?.[0]||null)}/>
      <button onClick={run} style={{marginLeft:12,padding:"6px 12px"}}>Run</button>
      {jid && <p>Job: <code>{jid}</code></p>}
      <pre style={{background:"#111",color:"#0f0",padding:12,marginTop:12,minHeight:120}}>{log.join("\n")}</pre>
    </div>
  );
}
