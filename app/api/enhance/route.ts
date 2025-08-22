// app/api/enhance/route.ts
import { NextRequest } from "next/server"
import { promises as fs } from "fs"
import { createWriteStream } from "node:fs"          // ESM-safe fs stream
import path from "path"
import os from "os"
import { spawn } from "child_process"
import ffmpegPath from "ffmpeg-static"
import archiver from "archiver"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

type FormFile = { arrayBuffer: () => Promise<ArrayBuffer>; name: string; type?: string }
type Kind = "audio" | "video"

type Controls = Partial<{
  voiceGainDb: number
  noisePercent: number
  bgPercent: number
  lufs: "-16" | "-14" | "-12" | string
  dehum: "Off" | "50Hz" | "60Hz" | "Auto" | string
  deess: number
  mouth: number
  crackle: number
  plosive: number
  dereverb: number
  hpf: "Off" | "60Hz" | "80Hz" | string
  clipRepair: boolean
  monoVoice: boolean
  quality: "Fast" | "Balanced" | "Max" | string
}>

export async function GET() {
  return new Response("ok", { status: 200 })
}

export async function POST(req: NextRequest) {
  try {
    if (!ffmpegPath) {
      return new Response(JSON.stringify({ error: "ffmpeg binary not found" }), { status: 500 })
    }

    const form = await req.formData()
    const settingsStr = form.get("settings") as string | null
    const rawFiles = form.getAll("files")
    const files: FormFile[] = rawFiles
      .filter((x: any) => x && typeof x.arrayBuffer === "function" && typeof x.name === "string")
      .map((x) => x as FormFile)

    if (!settingsStr || !files.length) {
      return new Response(JSON.stringify({ error: "missing settings or files" }), { status: 400 })
    }

    const ctl = JSON.parse(String(settingsStr || "{}")) as Controls

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "sukudo-"))
    const outs: { path: string; name: string }[] = []

    try {
      // process sequentially (safer on user machines)
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        const inBuf = Buffer.from(await f.arrayBuffer())
        const inPath = path.join(tmp, `${i}-${f.name}`)
        await fs.writeFile(inPath, inBuf)

        const ext = path.extname(f.name).toLowerCase()
        const base = path.basename(f.name, ext)
        const kind: Kind =
          (f.type || "").startsWith("video") || [".mp4", ".mov", ".mkv", ".webm"].includes(ext) ? "video" : "audio"
        const outExt = kind === "video" ? ".mp4" : ".m4a"
        const outPath = path.join(tmp, `${base}.enhanced${outExt}`)

        let ok = false, stderr = ""
        if (String(ctl.quality || "").toLowerCase() === "max") {
          try {
            const wavPath = path.join(tmp, base + ".wav")
            await extractToWav(inPath, wavPath)
            const sepDir = path.join(tmp, "sep")
            try { await fs.mkdir(sepDir) } catch {}
            const sep = await runDemucs(wavPath, sepDir)
            if (sep.ok) {
              const mix = await runFfmpegMix(kind, kind === "video" ? inPath : null, sep.vocals, sep.bg, outPath, ctl)
              ok = mix.ok; stderr = mix.stderr
            } else {
              const res = await runFfmpeg(inPath, outPath, kind, ctl); ok = res.ok; stderr = res.stderr
            }
          } catch (e: any) {
            const res = await runFfmpeg(inPath, outPath, kind, ctl); ok = res.ok; stderr = res.stderr
          }
        } else {
          const res = await runFfmpeg(inPath, outPath, kind, ctl); ok = res.ok; stderr = res.stderr
        }
        if (!ok) {
          return new Response(JSON.stringify({ error: stderr || "processing failed" }), { status: 500 })
        }
        outs.push({ path: outPath, name: `${base}.enhanced${outExt}` })
      }

      // single file → return directly
      if (outs.length === 1) {
        const b = await fs.readFile(outs[0].path)
        const body = new Uint8Array(b.buffer, b.byteOffset, b.byteLength) // BodyInit-friendly
        return new Response(body as any, {
          headers: {
            "Content-Type": outs[0].name.endsWith(".mp4") ? "video/mp4" : "audio/mp4",
            "Content-Disposition": `attachment; filename="${outs[0].name}"`,
            "Cache-Control": "no-store",
          },
        })
      }

      // multiple → zip
      const zipPath = path.join(tmp, "enhanced.zip")
      await new Promise<void>((resolve, reject) => {
        const out = createWriteStream(zipPath)
        const zip = archiver("zip", { zlib: { level: 9 } })
        out.on("close", resolve)
        zip.on("error", reject)
        zip.pipe(out)
        outs.forEach((o) => zip.file(o.path, { name: o.name }))
        zip.finalize()
      })

      const z = await fs.readFile(zipPath)
      const zipBody = new Uint8Array(z.buffer, z.byteOffset, z.byteLength)
      return new Response(zipBody as any, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="sukudo-enhanced.zip"',
          "Cache-Control": "no-store",
        },
      })
    } finally {
      try { await fs.rm(tmp, { recursive: true, force: true }) } catch {}
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500 })
  }
}



/* --------------------- optional: Demucs-based separation -------------------- */

async function trySpawn(cmd: string, args: string[]): Promise<{ ok: boolean; stderr: string }> {
  return new Promise((resolve) => {
    try {
      const proc = spawn(cmd, args, { windowsHide: true })
      const stderrChunks: string[] = []
      proc.stderr.on("data", (d) => stderrChunks.push(String(d)))
      proc.on("error", (e) => resolve({ ok: false, stderr: String(e) }))
      proc.on("close", (code) => resolve({ ok: code === 0, stderr: stderrChunks.join("") }))
    } catch (e: any) {
      resolve({ ok: false, stderr: String(e?.message || e) })
    }
  })
}

async function demucsAvailable(): Promise<{ cmd: string[] } | null> {
  let ok = await trySpawn("demucs", ["--version"])
  if (ok.ok) return { cmd: ["demucs"] }
  ok = await trySpawn("python", ["-m", "demucs", "--version"])
  if (ok.ok) return { cmd: ["python", "-m", "demucs"] }
  ok = await trySpawn("py", ["-m", "demucs", "--version"])
  if (ok.ok) return { cmd: ["py", "-m", "demucs"] }
  return null
}

async function extractToWav(inPath: string, outWav: string) {
  const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", inPath, "-ac", "2", "-ar", "48000", "-vn", outWav]
  const { ok, stderr } = await run(ffmpegPath as string, args)
  if (!ok) throw new Error("ffmpeg extract failed: " + stderr)
}

async function runDemucs(inWav: string, outDir: string) {
  const avail = await demucsAvailable()
  if (!avail) return { ok: false, vocals: "", bg: "", stderr: "demucs not installed" }
  const modelArgs = ["--two-stems=vocals", "-n", "htdemucs", "-j", "2", "-o", outDir, inWav]
  const { ok, stderr } = await run(avail.cmd[0], avail.cmd.slice(1).concat(modelArgs))
  if (!ok) return { ok, vocals: "", bg: "", stderr }
  // demucs creates folder outDir/htdemucs/<basename>/ with vocals.wav & no_vocals.wav
  const base = path.basename(inWav).replace(/\.[^.]+$/, "")
  const searchDir = path.join(outDir, "htdemucs")
  // find deepest dir that matches
  let vocals = "", bg = ""
  try {
    const subdirs = await fs.readdir(searchDir)
    for (const sd of subdirs) {
      const p = path.join(searchDir, sd)
      const st = await fs.stat(p)
      if (st.isDirectory()) {
  const f1 = path.join(p, `${base}`, "vocals.wav")
  const f2 = path.join(p, `${base}`, "no_vocals.wav")
        // Some versions output directly in folder without nested base
        const g1 = path.join(p, "vocals.wav")
        const g2 = path.join(p, "no_vocals.wav")
        try {
          await fs.access(f1); vocals = f1
        } catch { try { await fs.access(g1); vocals = g1 } catch {} }
        try {
          await fs.access(f2); bg = f2
        } catch { try { await fs.access(g2); bg = g2 } catch {} }
      }
    }
  } catch {}
  return { ok: Boolean(vocals && bg), vocals, bg, stderr: "" }
}

async function runFfmpegMix(kind: Kind, videoIn: string | null, vocals: string, bg: string, outPath: string, c: Controls) {
  const voiceGain = db(c.voiceGainDb, 3)
  const noise = clamp01(c.noisePercent, 50)
  const bgPct = clamp01(c.bgPercent, 20)
  const lufs = String(c.lufs || "-14")
  const dehum = String(c.dehum || "Auto")
  const deessAmt = clamp01(c.deess, 30)
  const mouth = clamp01(c.mouth, 30)
  const plosive = clamp01(c.plosive, 20)
  const dereverb = clamp01(c.dereverb, 20)
  const hpf = String(c.hpf || "Off")

  const hpFreq = hpf === "60Hz" ? 60 : hpf === "80Hz" ? 80 : 70 + Math.round(plosive * 0.8)
  const nf = -10 - Math.round((noise / 100) * 16)
  const deessGain = -(deessAmt / 100) * 10
  const sideScale = (100 - bgPct) / 100

  const baseHum = 50
  const hum =
    dehum === "Auto"
      ? `anequalizer=f=${baseHum}:t=q:w=50:g=-20, ` +
        `anequalizer=f=${baseHum*2}:t=q:w=40:g=-18, ` +
        `anequalizer=f=${baseHum*3}:t=q:w=30:g=-14, ` +
        `anequalizer=f=${baseHum*4}:t=q:w=25:g=-10, `
      : dehum === "Off"
      ? ""
      : `anequalizer=f=${parseInt(dehum,10)}:t=q:w=40:g=-25,
         anequalizer=f=${parseInt(dehum,10)*2}:t=q:w=30:g=-18,
         anequalizer=f=${parseInt(dehum,10)*3}:t=q:w=20:g=-14,
         anequalizer=f=${parseInt(dehum,10)*4}:t=q:w=15:g=-10,`

  const compand = `compand=attacks=0:points=-80/-80|-50/-50|-30/-30|-20/-22|-12/-14|-6/-8|0/-2:soft-knee=6:gain=0`

  // Build filter: [1:a]=vocals, [2:a]=bg
  const filter = `
    [1:a] aformat=channel_layouts=stereo,
          highpass=f=${hpFreq},
          ${hum}
          afftdn=nr=${Math.abs(nf)},
          deesser=i=dual:frequency=6500:width_type=q:width=1:threshold=0.05:ratio=6,
          firequalizer=gain_entry='entry(7000,${deessGain});entry(12000,${deessGain})',
          ${compand},
          volume=${Math.pow(10, voiceGain / 20)} [V];

    [2:a] aformat=channel_layouts=stereo,
          lowshelf=f=150:g=-${(noise/100)*8},
          highshelf=f=9000:g=-${(noise/100)*6},
          volume=${sideScale} [B];

    [V][B] amix=inputs=2:normalize=0 [MIX];

    [MIX] loudnorm=I=${lufs}:TP=-1.2:LRA=11, alimiter=limit=-1.0 [aout]
  `.replace(/\s+/g, " ")

  const args: string[] = ["-y", "-hide_banner", "-loglevel", "error"]
  if (videoIn && kind === "video") {
    args.push("-i", videoIn)
  }
  args.push("-i", vocals, "-i", bg, "-filter_complex", filter)

  if (videoIn && kind === "video") {
    args.push("-map", "0:v?", "-c:v", "copy", "-map", "[aout]", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outPath)
  } else {
    args.push("-map", "[aout]", "-c:a", "aac", "-b:a", "160k", outPath)
  }

  const { ok, stderr } = await run(ffmpegPath as string, args)
  return { ok, stderr }
}

async function run(cmd: string, args: string[]) {
  const stderrChunks: string[] = []
  const proc = spawn(cmd, args, { windowsHide: true })
  proc.stderr.on("data", (d) => stderrChunks.push(String(d)))
  const exit = await new Promise<number>((resolve) => proc.on("close", resolve))
  const stderr = stderrChunks.join("")
  return { ok: exit === 0, stderr: tail(stderr, 40) }
}

/* ---------------------------- ffmpeg glue ---------------------------- */

function db(val?: number, def = 0) {
  if (typeof val !== "number" || Number.isNaN(val)) return def
  return Math.max(-60, Math.min(24, val))
}
function clamp01(x?: number, def = 0) {
  if (typeof x !== "number" || Number.isNaN(x)) return def
  return Math.max(0, Math.min(100, x))
}

function buildFilter(kind: Kind, c: Controls): string {
  const voiceGain = db(c.voiceGainDb, 3)
  const noise = clamp01(c.noisePercent, 50)
  const bg = clamp01(c.bgPercent, 20)
  const lufs = String(c.lufs || "-14")
  const dehum = String(c.dehum || "Auto")
  const deessAmt = clamp01(c.deess, 30)
  const mouth = clamp01(c.mouth, 30)
  const plosive = clamp01(c.plosive, 20)
  const dereverb = clamp01(c.dereverb, 20)
  const hpf = String(c.hpf || "Off")

  const hpFreq = hpf === "60Hz" ? 60 : hpf === "80Hz" ? 80 : 70 + Math.round(plosive * 0.8)
  const nf = -10 - Math.round((noise / 100) * 16)
  const deessGain = -(deessAmt / 100) * 10
  const sideScale = (100 - bg) / 100
  const baseHum = dehum === "Auto" ? 50 : dehum === "Off" ? 0 : parseInt(dehum, 10) || 50

  const hum = baseHum > 0
    ? `anequalizer=f=${baseHum}:t=q:w=40:g=-25,
       anequalizer=f=${baseHum*2}:t=q:w=30:g=-18,
       anequalizer=f=${baseHum*3}:t=q:w=20:g=-14,
       anequalizer=f=${baseHum*4}:t=q:w=15:g=-10,`
    : ""

  const compand =
    `compand=attacks=0:points=-80/-80|-50/-50|-30/-30|-20/-22|-12/-14|-6/-8|0/-2:soft-knee=6:gain=0`

  const chain = `
    [0:a] aformat=channel_layouts=stereo,
          highpass=f=${hpFreq},
          ${hum}
          afftdn=nr=${Math.abs(nf)},
          deesser=i=dual:frequency=6500:width_type=q:width=1:threshold=0.05:ratio=6,
          firequalizer=gain_entry='entry(7000,${deessGain});entry(12000,${deessGain})',
          ${compand},
          volume=${Math.pow(10, voiceGain / 20)},
          asplit=3[a0][aL][aS];

    [aL] pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1 [MID];
    [aS] pan=stereo|c0=0.5*c0-0.5*c1|c1=0.5*c1-0.5*c0, volume=${sideScale} [SIDE];

    [MID][SIDE] amix=inputs=2:normalize=0 [MIX];

    [MIX] loudnorm=I=${lufs}:TP=-1.2:LRA=11:print_format=summary,
          alimiter=limit=-1.0 [aout]
  `.replace(/\s+/g, " ")

  return chain
}

async function runFfmpeg(inPath: string, outPath: string, kind: Kind, ctl: Controls) {
  const args: string[] = [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", inPath,
    "-filter_complex", buildFilter(kind, ctl),
  ]

  if (kind === "video") {
    args.push(
      "-map", "0:v?", "-c:v", "copy",      // keep video
      "-map", "[aout]", "-c:a", "aac", "-b:a", "192k",
      "-movflags", "+faststart",
      outPath
    )
  } else {
    args.push("-map", "[aout]", "-c:a", "aac", "-b:a", "160k", outPath)
  }

  const stderrChunks: string[] = []
  const proc = spawn(ffmpegPath as string, args, { windowsHide: true })
  proc.stderr.on("data", (d) => stderrChunks.push(String(d)))
  const exit = await new Promise<number>((resolve) => proc.on("close", resolve))
  const stderr = stderrChunks.join("")
  return { ok: exit === 0, stderr: tail(stderr, 40) }
}

function tail(s: string, lines = 40) {
  const arr = s.split(/\r?\n/).filter(Boolean)
  return arr.slice(-lines).join("\n")
}
