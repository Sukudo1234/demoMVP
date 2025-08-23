"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  PlusIcon, BellIcon, BoltIcon, FolderIcon, SparklesIcon, CubeIcon, ClockIcon,
  PlayIcon, PauseIcon, XMarkIcon, InformationCircleIcon
} from "@heroicons/react/24/solid"
import { createClient } from "@supabase/supabase-js"

/* ──────────────────────────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────────────────────────── */

type Kind = "audio" | "video"
type Monitor = "mix" | "vocals" | "background"

type FileItem = { id: string; file: File; sizeMB: number; kind: Kind }

type Controls = {
  voiceGainDb: number
  noisePercent: number
  bgPercent: number
  lufs: "-16" | "-14" | "-12"
  dehum: "Off" | "50Hz" | "60Hz" | "Auto"
  deess: number
  mouth: number
  crackle: number
  plosive: number
  dereverb: number
  hpf: "Off" | "60Hz" | "80Hz"
  clipRepair: boolean
  monoVoice: boolean
  quality: "Fast" | "Balanced" | "Max"
}

/* ──────────────────────────────────────────────────────────────────────────────
   Constants & helpers
────────────────────────────────────────────────────────────────────────────── */

const SLIDER_FILL = "#9AA7EC"
const filledTrack = (value: number, min = 0, max = 100) => {
  const pct = Math.round(((value - min) / (max - min)) * 100)
  return { background: `linear-gradient(90deg, ${SLIDER_FILL} ${pct}%, #E6E8F0 ${pct}%)` }
}
const db2lin = (db: number) => Math.pow(10, db / 20)

function assertEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  return { url, anon }
}
const supa = (() => {
  try {
    const { url, anon } = assertEnv()
    return createClient(url, anon)
  } catch {
    // create a dummy client to avoid runtime explosions; we’ll guard before use
    return null as any
  }
})()

/* ──────────────────────────────────────────────────────────────────────────────
   Audio graph – original media element
────────────────────────────────────────────────────────────────────────────── */

type Graph = {
  mediaEl?: HTMLMediaElement
  ctx?: AudioContext
  source?: MediaElementAudioSourceNode
  preGain?: GainNode
  notches?: BiquadFilterNode[]
  splitter?: ChannelSplitterNode
  gLPlus?: GainNode
  gRPlus?: GainNode
  gRMinus?: GainNode
  sumNode?: GainNode
  diffNode?: GainNode
  vHighpass?: BiquadFilterNode
  vDeEss?: BiquadFilterNode
  vMouthComp?: DynamicsCompressorNode
  vDereverbComp?: DynamicsCompressorNode
  vNoiseLo?: BiquadFilterNode
  vNoiseHi?: BiquadFilterNode
  vGain?: GainNode
  bNoiseLo?: BiquadFilterNode
  bNoiseHi?: BiquadFilterNode
  bGain?: GainNode
}
const graphRef = { current: {} as Graph }
const audioCtxRef = { current: null as AudioContext | null }
function ensureAudioContext(): AudioContext {
  if (!audioCtxRef.current) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    audioCtxRef.current = new AC()
  }
  return audioCtxRef.current!
}

function setupGraph(el: HTMLMediaElement) {
  const ctx = ensureAudioContext()
  const g: Graph = {}
  graphRef.current = g
  try { graphRef.current.source?.disconnect() } catch {}

  g.mediaEl = el
  g.ctx = ctx
  g.source = ctx.createMediaElementSource(el)
  g.preGain = ctx.createGain()
  g.source.connect(g.preGain)

  // dehum notches
  g.notches = []
  let upstream: AudioNode = g.preGain
  const addNotch = (freq: number) => {
    const notch = ctx.createBiquadFilter()
    notch.type = "notch"
    notch.frequency.value = freq
    notch.Q.value = 20
    upstream.connect(notch)
    upstream = notch
    g.notches!.push(notch)
  }
  ;[50, 100, 150, 200].forEach(addNotch)

  g.splitter = ctx.createChannelSplitter(2)
  upstream.connect(g.splitter)

  // sum (L+R) ~ vocals-ish
  g.gLPlus = ctx.createGain(); g.gLPlus.gain.value = 1
  g.gRPlus = ctx.createGain(); g.gRPlus.gain.value = 1
  g.sumNode = ctx.createGain()
  g.splitter.connect(g.gLPlus, 0)
  g.splitter.connect(g.gRPlus, 1)
  g.gLPlus.connect(g.sumNode)
  g.gRPlus.connect(g.sumNode)

  // diff (L-R) ~ background-ish
  g.gRMinus = ctx.createGain(); g.gRMinus.gain.value = -1
  g.diffNode = ctx.createGain()
  g.splitter.connect(g.diffNode, 0)
  g.splitter.connect(g.gRMinus, 1)
  g.gRMinus.connect(g.diffNode)

  // voice chain
  g.vHighpass = ctx.createBiquadFilter(); g.vHighpass.type = "highpass"; g.vHighpass.frequency.value = 60
  g.vDeEss = ctx.createBiquadFilter(); g.vDeEss.type = "highshelf"; g.vDeEss.frequency.value = 7000; g.vDeEss.gain.value = 0
  g.vMouthComp = ctx.createDynamicsCompressor(); g.vMouthComp.attack.value = 0.002; g.vMouthComp.release.value = 0.05; g.vMouthComp.ratio.value = 10
  g.vDereverbComp = ctx.createDynamicsCompressor(); g.vDereverbComp.attack.value = 0.005; g.vDereverbComp.release.value = 0.25; g.vDereverbComp.ratio.value = 8
  g.vNoiseLo = ctx.createBiquadFilter(); g.vNoiseLo.type = "lowshelf"; g.vNoiseLo.frequency.value = 120; g.vNoiseLo.gain.value = 0
  g.vNoiseHi = ctx.createBiquadFilter(); g.vNoiseHi.type = "highshelf"; g.vNoiseHi.frequency.value = 8000; g.vNoiseHi.gain.value = 0
  g.vGain = ctx.createGain(); g.vGain.gain.value = 1
  g.sumNode
    .connect(g.vHighpass)
    .connect(g.vDeEss)
    .connect(g.vMouthComp)
    .connect(g.vDereverbComp)
    .connect(g.vNoiseLo)
    .connect(g.vNoiseHi)
    .connect(g.vGain)

  // bg chain
  g.bNoiseLo = ctx.createBiquadFilter(); g.bNoiseLo.type = "lowshelf"; g.bNoiseLo.frequency.value = 150; g.bNoiseLo.gain.value = 0
  g.bNoiseHi = ctx.createBiquadFilter(); g.bNoiseHi.type = "highshelf"; g.bNoiseHi.frequency.value = 9000; g.bNoiseHi.gain.value = 0
  g.bGain = ctx.createGain(); g.bGain.gain.value = 1
  g.diffNode
    .connect(g.bNoiseLo)
    .connect(g.bNoiseHi)
    .connect(g.bGain)

  el.muted = true
}

function applyRouteOriginal(mode: "original" | "enhanced", monitor: Monitor) {
  const g = graphRef.current
  const ctx = ensureAudioContext()
  if (!g.source) return
  try { g.source.disconnect(ctx.destination) } catch {}
  try { g.vGain?.disconnect(ctx.destination) } catch {}
  try { g.bGain?.disconnect(ctx.destination) } catch {}

  if (mode === "original") {
    g.source.connect(ctx.destination)
    return
  }
  if (monitor === "mix") {
    g.vGain?.connect(ctx.destination); g.bGain?.connect(ctx.destination)
  } else if (monitor === "vocals") {
    g.vGain?.connect(ctx.destination)
  } else {
    g.bGain?.connect(ctx.destination)
  }
}

function updateGraphFromControlsOriginal(ctl: Controls) {
  const g = graphRef.current
  if (!g.ctx || !g.source) return
  g.vGain!.gain.value = db2lin(ctl.voiceGainDb)
  g.bGain!.gain.value = 1 - ctl.bgPercent / 100

  // high-pass + plosive
  const hp = ctl.hpf === "60Hz" ? 60 : ctl.hpf === "80Hz" ? 80 : (ctl.plosive ? 70 + Math.round(ctl.plosive * 0.8) : 60)
  g.vHighpass!.frequency.value = hp

  // de-ess
  g.vDeEss!.gain.value = -((ctl.deess / 100) * 12)

  // noise shelving
  const lowCut = -((ctl.noisePercent / 100) * 12)
  const hiCut = -((ctl.noisePercent / 100) * 9)
  g.vNoiseLo!.gain.value = lowCut; g.vNoiseHi!.gain.value = hiCut
  g.bNoiseLo!.gain.value = lowCut * 0.6; g.bNoiseHi!.gain.value = hiCut * 0.6

  // compressors
  g.vMouthComp!.threshold.value = -20 - (ctl.mouth / 100) * 10
  g.vDereverbComp!.threshold.value = -50 + (ctl.dereverb / 100) * 20

  // dehum notches
  const base = ctl.dehum === "Auto" ? 50 : ctl.dehum === "Off" ? 0 : parseInt(ctl.dehum, 10)
  if (g.notches && g.notches.length) {
    const freqs = base ? [base, base * 2, base * 3, base * 4] : [50, 100, 150, 200]
    g.notches.forEach((n, i) => {
      n.frequency.value = freqs[i] || freqs[freqs.length - 1]
      n.Q.value = base ? 20 : 0.001
    })
  }
}

/* ──────────────────────────────────────────────────────────────────────────────
   Stems player – plays worker outputs (vocals.wav, bg.wav)
────────────────────────────────────────────────────────────────────────────── */

type StemsPlayer = {
  ctx: AudioContext
  voc?: AudioBuffer
  bg?: AudioBuffer
  // chains
  vocGain: GainNode
  vocHPF: BiquadFilterNode
  vocDeEss: BiquadFilterNode
  vocLo: BiquadFilterNode
  vocHi: BiquadFilterNode
  vocMouth: DynamicsCompressorNode
  vocDereverb: DynamicsCompressorNode
  bgGain: GainNode
  bgLo: BiquadFilterNode
  bgHi: BiquadFilterNode
  out: GainNode
  // transport
  isPlaying: boolean
  offset: number
  startedAt: number
  sources: { voc?: AudioBufferSourceNode; bg?: AudioBufferSourceNode }
  play(): void
  pause(): void
  stop(): void
  setMonitor(m: Monitor): void
  applyCtl(c: Controls): void
  connect(node: AudioNode): void
}

function createStemsPlayer(voc?: AudioBuffer, bg?: AudioBuffer): StemsPlayer {
  const ctx = ensureAudioContext()
  const out = ctx.createGain(); out.gain.value = 1

  // vocals chain
  const vocHPF = ctx.createBiquadFilter(); vocHPF.type = "highpass"; vocHPF.frequency.value = 80
  const vocDeEss = ctx.createBiquadFilter(); vocDeEss.type = "highshelf"; vocDeEss.frequency.value = 7000; vocDeEss.gain.value = 0
  const vocMouth = ctx.createDynamicsCompressor(); vocMouth.attack.value = 0.002; vocMouth.release.value = 0.05; vocMouth.ratio.value = 10
  const vocDereverb = ctx.createDynamicsCompressor(); vocDereverb.attack.value = 0.005; vocDereverb.release.value = 0.25; vocDereverb.ratio.value = 8
  const vocLo = ctx.createBiquadFilter(); vocLo.type = "lowshelf"; vocLo.frequency.value = 120; vocLo.gain.value = 0
  const vocHi = ctx.createBiquadFilter(); vocHi.type = "highshelf"; vocHi.frequency.value = 8000; vocHi.gain.value = 0
  const vocGain = ctx.createGain(); vocGain.gain.value = 1
  vocHPF.connect(vocDeEss).connect(vocMouth).connect(vocDereverb).connect(vocLo).connect(vocHi).connect(vocGain).connect(out)

  // bg chain
  const bgLo = ctx.createBiquadFilter(); bgLo.type = "lowshelf"; bgLo.frequency.value = 150; bgLo.gain.value = 0
  const bgHi = ctx.createBiquadFilter(); bgHi.type = "highshelf"; bgHi.frequency.value = 9000; bgHi.gain.value = 0
  const bgGain = ctx.createGain(); bgGain.gain.value = 1
  bgLo.connect(bgHi).connect(bgGain).connect(out)

  const player: StemsPlayer = {
    ctx,
    voc,
    bg,
    vocGain, vocHPF, vocDeEss, vocLo, vocHi, vocMouth, vocDereverb,
    bgGain, bgLo, bgHi,
    out,
    isPlaying: false,
    offset: 0,
    startedAt: 0,
    sources: {},
    play() {
      if (player.isPlaying) return
      player.isPlaying = true
      player.startedAt = ctx.currentTime - player.offset

      if (player.voc) {
        const s = ctx.createBufferSource()
        s.buffer = player.voc
        s.connect(vocHPF)
        s.start(0, player.offset)
        player.sources.voc = s
      }
      if (player.bg) {
        const s = ctx.createBufferSource()
        s.buffer = player.bg
        s.connect(bgLo)
        s.start(0, player.offset)
        player.sources.bg = s
      }
    },
    pause() {
      if (!player.isPlaying) return
      player.isPlaying = false
      player.offset = ctx.currentTime - player.startedAt
      try { player.sources.voc?.stop() } catch {}
      try { player.sources.bg?.stop() } catch {}
      player.sources = {}
    },
    stop() {
      player.pause(); player.offset = 0
    },
    setMonitor(m: Monitor) {
      if (m === "mix") { player.vocGain.gain.value = player.vocGain.gain.value; player.bgGain.gain.value = player.bgGain.gain.value }
      if (m === "vocals") { player.vocGain.gain.value = 1; player.bgGain.gain.value = 0 }
      if (m === "background") { player.vocGain.gain.value = 0; player.bgGain.gain.value = 1 }
    },
    applyCtl(ctl: Controls) {
      player.vocGain.gain.value = db2lin(ctl.voiceGainDb)
      player.bgGain.gain.value = 1 - ctl.bgPercent / 100

      const hp = ctl.hpf === "60Hz" ? 60 : ctl.hpf === "80Hz" ? 80 : (ctl.plosive ? 70 + Math.round(ctl.plosive * 0.8) : 60)
      player.vocHPF.frequency.value = hp

      player.vocDeEss.gain.value = -((ctl.deess / 100) * 12)
      const lowCut = -((ctl.noisePercent / 100) * 12)
      const hiCut  = -((ctl.noisePercent / 100) * 9)
      player.vocLo.gain.value = lowCut
      player.vocHi.gain.value = hiCut
      player.bgLo.gain.value  = lowCut * 0.6
      player.bgHi.gain.value  = hiCut * 0.6

      player.vocMouth.threshold.value   = -20 - (ctl.mouth / 100) * 10
      player.vocDereverb.threshold.value = -50 + (ctl.dereverb / 100) * 20
    },
    connect(node: AudioNode) { out.connect(node) }
  }
  return player
}

/* ──────────────────────────────────────────────────────────────────────────────
   Page
────────────────────────────────────────────────────────────────────────────── */

export default function EnhanceAudioPage() {
  /* uploads */
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [drag, setDrag] = useState(false)

  /* modes */
  const [applyAll, setApplyAll] = useState<"all" | "one">("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  /* preview – original transport */
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState<"original" | "enhanced">("enhanced")
  const [monitor, setMonitor] = useState<Monitor>("mix")
  const [updatingPreview, setUpdatingPreview] = useState(false)

  /* stems */
  const stemsPlayerRef = useRef<StemsPlayer | null>(null)
  const [stemsReady, setStemsReady] = useState(false)

  /* controls */
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [ctl, setCtl] = useState<Controls>({
    voiceGainDb: 3, noisePercent: 60, bgPercent: 20, lufs: "-14", dehum: "Auto",
    deess: 30, mouth: 40, crackle: 20, plosive: 25, dereverb: 20,
    hpf: "Off", clipRepair: false, monoVoice: false, quality: "Balanced",
  })

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isProcessing) return
    let pct = 0
    const id = setInterval(() => {
      pct = Math.min(95, pct + Math.random() * 6 + 2)
      setProgress(Math.round(pct))
    }, 400)
    return () => clearInterval(id)
  }, [isProcessing])

  /* sections */
  const refAdd = useRef<HTMLDivElement>(null)
  const refAdjust = useRef<HTMLDivElement>(null)
  const refProcess = useRef<HTMLDivElement>(null)

  /* helpers */
  const onBrowse = () => { inputRef.current && (inputRef.current.value = "", inputRef.current.click()) }
  const onPick = (list: FileList | null) => {
    if (!list) return
    const arr: FileItem[] = Array.from(list).map((f) => ({
      id: `${f.name}-${f.lastModified}-${Math.random().toString(36).slice(2)}`,
      file: f,
      sizeMB: Math.round((f.size / (1024 * 1024)) * 10) / 10,
      kind: f.type?.startsWith("video") ? "video" : "audio",
    }))
    setFiles((prev) => [...prev, ...arr])
    if (!selectedId && arr.length > 0) setSelectedId(arr[0].id)
  }
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDrag(false); onPick(e.dataTransfer.files) }
  const removeFile = (id: string) => { setFiles((p) => p.filter((f) => f.id !== id)); if (selectedId === id) setSelectedId(files.find((f) => f.id !== id)?.id ?? null) }
  const clearAll = () => { setFiles([]); setSelectedId(null); setStemsReady(false); stemsPlayerRef.current?.stop() }

  const hasFiles = files.length > 0
  useEffect(() => { if (applyAll === "one" && hasFiles && !selectedId) setSelectedId(files[0].id) }, [applyAll, hasFiles, selectedId, files])

  const currentFile = applyAll === "all" ? files[0] : (files.find((f) => f.id === selectedId) || files[0])
  const currentSrc = useMemo(() => (currentFile ? URL.createObjectURL(currentFile.file) : undefined), [currentFile?.id])

  const mediaEl = () => currentFile?.kind === "video" ? videoRef.current : audioRef.current

  const togglePlay = async () => {
    const el = mediaEl(); if (!el) return
    const ctx = ensureAudioContext(); if (ctx.state === "suspended") { try { await ctx.resume() } catch {} }

    if (mode === "enhanced" && stemsReady) {
      const sp = stemsPlayerRef.current
      if (!sp) return
      if (playing) { sp.pause(); setPlaying(false) }
      else { sp.play(); setPlaying(true) }
      return
    }

    // original transport
    if (playing) { el.pause(); setPlaying(false) }
    else { try { await el.play(); setPlaying(true) } catch {} }
  }

  const onLoadedMedia = () => {
    const el = mediaEl(); if (!el) return
    setupGraph(el)
    updateGraphFromControlsOriginal(ctl)
    applyRouteOriginal(mode, monitor)
  }

  useEffect(() => {
    const el = mediaEl(); if (!el) return
    const onEnded = () => setPlaying(false)
    el.addEventListener("ended", onEnded)
    return () => el.removeEventListener("ended", onEnded)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile?.id])

  useEffect(() => {
    if (!hasFiles) return
    setUpdatingPreview(true)
    const t = setTimeout(() => setUpdatingPreview(false), 400)
    return () => clearTimeout(t)
  }, [ctl])

  // live update graphs
  useEffect(() => { stemsPlayerRef.current?.applyCtl(ctl); updateGraphFromControlsOriginal(ctl) }, [ctl])

  useEffect(() => {
    if (stemsReady && mode === "enhanced") {
      stemsPlayerRef.current?.setMonitor(monitor)
    } else {
      applyRouteOriginal(mode, monitor)
    }
  }, [mode, monitor, stemsReady])

  const count = files.length || 0
  const processLabel = applyAll === "all" ? `Process ${count} file${count > 1 ? "s" : ""}` : "Process this file"

  /* ───────────────────────── API: Process & Export (v2) ────────────────────── */

  async function decodeUrlToBuffer(url: string) {
    const ab = await fetch(url).then(r => r.arrayBuffer())
    const ctx = ensureAudioContext()
    return await ctx.decodeAudioData(ab)
  }

  async function processAndExportV2() {
    if (!files.length || isProcessing) return

    // environment sanity
    try { assertEnv() } catch (e: any) { alert(`Setup error: ${e?.message || e}`); return }

    setIsProcessing(true); setProgress(1)
    const fail = (msg: string) => { console.error(msg); alert(msg); setIsProcessing(false) }

    try {
      // 1) INIT
      const initRes = await fetch("/api/jobs/enhance/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: files.map(f => ({ name: f.file.name, mime: f.file.type || (f.kind === "video" ? "video/mp4" : "audio/wav") })),
          params: {
            hpf_hz: ctl.hpf === "60Hz" ? 60 : ctl.hpf === "80Hz" ? 80 : 80,
            voice_db: ctl.voiceGainDb,
            bg_db: -(ctl.bgPercent / 100) * 24,
          },
        }),
      })
      if (!initRes.ok) return fail(`INIT failed: ${await initRes.text()}`)
      const init = await initRes.json()
      if (!init?.job_id || !Array.isArray(init?.uploads)) return fail(`INIT payload invalid: ${JSON.stringify(init)}`)

      // 2) UPLOADs
      for (let i = 0; i < files.length; i++) {
        const u = init.uploads[i]; const f = files[i].file
        // @ts-ignore supabase-js signed upload helper
        const up = await supa.storage.from("inputs").uploadToSignedUrl(u.path, u.token, f)
        // @ts-ignore
        if (up?.error) return fail(`UPLOAD failed: ${up.error.message || up.error}`)
        setProgress(p => Math.min(90, p + Math.ceil(10 / files.length)))
      }

      // 3) SUBMIT
      const submitRes = await fetch("/api/jobs/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: init.job_id, paths: init.uploads.map((u: any) => u.path) }),
      })
      if (!submitRes.ok) return fail(`SUBMIT failed: ${await submitRes.text()}`)

      // 4) EVENTS (SSE)
      const es = new EventSource(`/api/jobs/events?id=${init.job_id}`)
      const cleanup = () => { try { es.close() } catch {} }

      es.onmessage = async (e) => {
        const ev = JSON.parse(e.data)
        if (ev.message === "progress") setProgress(p => Math.min(95, p + 2))
        if (ev.message === "Failed") { cleanup(); setIsProcessing(false); return fail(`Worker failed: ${ev?.data?.error || "unknown error"}`) }

        if (ev.message === "Completed") {
          cleanup(); setProgress(100); setIsProcessing(false)

          // auto-download enhanced of the first file
          const enhUrl = await fetch(`/api/jobs/asset?id=${init.job_id}&file=enhanced.wav`)
            .then(r => r.json()).then(j => j.url as string)
          const a = document.createElement("a")
          a.href = enhUrl; a.download = (files[0]?.file?.name || "enhanced").replace(/\.[^.]+$/, "") + ".enhanced.wav"
          document.body.appendChild(a); a.click(); a.remove()

          // load stems for preview
          try {
            const vocUrl = await fetch(`/api/jobs/asset?id=${init.job_id}&file=vocals.wav`).then(r => r.json()).then(j => j.url as string)
            const bgUrl  = await fetch(`/api/jobs/asset?id=${init.job_id}&file=bg.wav`).then(r => r.json()).then(j => j.url as string)
            const [vocBuf, bgBuf] = await Promise.all([decodeUrlToBuffer(vocUrl), decodeUrlToBuffer(bgUrl)])

            // build stems player
            const sp = createStemsPlayer(vocBuf, bgBuf)
            sp.connect(ensureAudioContext().destination)
            sp.applyCtl(ctl)
            sp.setMonitor(monitor)
            stemsPlayerRef.current?.stop()
            stemsPlayerRef.current = sp
            setStemsReady(true)
            setMode("enhanced")
            setMonitor("mix")
          } catch (e) {
            console.warn("Stems preview load failed:", e)
          }
        }
      }

      // safety timeout (3 min)
      setTimeout(() => {
        if (!isProcessing) return
        try { es.close() } catch {}
        setIsProcessing(false)
        alert("Timed out waiting for worker. Please try a shorter clip first.")
      }, 180_000)

    } catch (e: any) {
      return fail(`PROCESS failed: ${e?.message || e}`)
    }
  }

  /* ─────────────────────────────── UI ─────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-white flex">
      {/* left rail */}
      <aside className="w-20 flex flex-col items-center py-4 space-y-6 sticky top-0 h-screen bg-gradient-to-b from-white to-gray-50/50 border-r border-gray-100">
        <div className="w-11 h-11 bg-gradient-to-br from-[#5765F2] to-[#4955E2] rounded-2xl flex items-center justify-center shadow-md">
          <span className="text-white font-bold text-base">S</span>
        </div>
        <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        {[
          { icon: FolderIcon, label: "Projects" },
          { icon: SparklesIcon, label: "Tools" },
          { icon: CubeIcon, label: "Assets" },
          { icon: ClockIcon, label: "Calendar" },
        ].map(({ icon: Icon, label }, i) => (
          <Link key={i} href="/dashboard"
            className="group relative w-11 h-11 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center hover:bg-gradient-to-br hover:from-[#5765F2] hover:to-[#4955E2] hover:rounded-xl hover:shadow-lg hover:scale-105 transition-all">
            <Icon className="w-5 h-5 text-[#323339] group-hover:text-white transition-colors" />
            <span className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">{label}</span>
          </Link>
        ))}
      </aside>

      {/* main */}
      <div className="flex-1 flex flex-col">
        {/* top bar */}
        <header className="px-8 py-4 bg-gradient-to-r from-white to-gray-50/30 sticky top-0 z-40 border-b border-gray-100 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Link href="/dashboard" className="hover:underline">Home</Link>
              <span>/</span>
              <Link href="/dashboard" className="hover:underline">Tools</Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Enhance audio</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-xl hover:bg-gray-100 transition"><BellIcon className="w-5 h-5 text-[#323339]" /></button>
              <button className="p-2 rounded-xl hover:bg-gray-100 transition"><BoltIcon className="w-5 h-5 text-[#323339]" /></button>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-[#FBFAFB]">
          <div className="max-w-6xl mx-auto px-8 py-8">
            {/* step strip */}
            <div className="mb-6 flex items-center gap-2 text-xs text-gray-600">
              <StepDot active={!hasFiles} onClick={() => refAdd.current?.scrollIntoView({ behavior: "smooth" })}>Add files</StepDot>
              <span>•</span>
              <StepDot active={hasFiles} onClick={() => refAdjust.current?.scrollIntoView({ behavior: "smooth" })}>Adjust</StepDot>
              <span>•</span>
              <StepDot active={hasFiles} onClick={() => refProcess.current?.scrollIntoView({ behavior: "smooth" })}>Process & Export</StepDot>
            </div>

            <h1 className="text-3xl font-semibold text-gray-900">Enhance audio</h1>
            <p className="text-gray-600 mt-1">Clean up noise, lift voices, and match loudness. Works with audio or video.</p>

            {/* dropzone */}
            {!hasFiles && (
              <div
                ref={refAdd}
                className={`mt-8 w-full rounded-[1.5rem] border-2 border-dashed p-12 text-center transition-all duration-300 cursor-pointer ${
                  drag ? "border-[#5765F2] bg-[#F5F5FF]" : "border-gray-300 hover:border-[#5765F2] hover:bg-[#F8F8FF]"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={onBrowse}
                style={{ borderWidth: "3px" }}
              >
                <div className="mx-auto w-12 h-12 rounded-xl bg-white shadow flex items-center justify-center mb-3">
                  <PlusIcon className="w-5 h-5 text-[#5765F2]" />
                </div>
                <div className="text-gray-800 font-medium">Upload or drag & drop files to start</div>
                <div className="text-gray-500 text-sm mt-1">Audio: wav, mp3, m4a · Video: mp4, mov, mkv</div>
              </div>
            )}

            {/* with files */}
            {hasFiles && (
              <div ref={refAdjust} className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* preview + core controls */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePlay}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-black text-white hover:scale-105 transition"
                        aria-label={playing ? "Pause" : "Play"}
                      >
                        {playing ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                      </button>
                      <div className="text-sm text-gray-900 font-medium flex items-center gap-2">
                        Preview
                        {updatingPreview && <span className="inline-flex h-2 w-2 rounded-full bg-[#5765F2] animate-pulse" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MonitorToggle value={monitor} onChange={(v) => { setMonitor(v); stemsPlayerRef.current?.setMonitor(v) }} />
                      <SegmentedAB value={mode} onChange={(v) => setMode(v)} leftLabel="Original" rightLabel="Enhanced" />
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      {!currentSrc ? (
                        <div className="text-gray-500 text-sm">Select a file to preview</div>
                      ) : currentFile!.kind === "video" ? (
                        <video ref={videoRef} controls onLoadedMetadata={onLoadedMedia} className="w-full rounded-lg h-64 max-h-64 object-contain bg-black">
                          <source src={currentSrc} />
                        </video>
                      ) : (
                        <audio ref={audioRef} controls onLoadedMetadata={onLoadedMedia} className="w-full">
                          <source src={currentSrc} />
                        </audio>
                      )}
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={() => setCtl({
                          voiceGainDb: 4, noisePercent: 55, bgPercent: 25, lufs: "-14", dehum: "Auto",
                          deess: 28, mouth: 35, crackle: 15, plosive: 18, dereverb: 15,
                          hpf: "Off", clipRepair: false, monoVoice: false, quality: "Balanced",
                        })}
                        className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 hover:bg-gray-50"
                      >
                        Enhance with recommended
                      </button>
                    </div>

                    {/* core controls */}
                    <div className="mt-6 grid gap-6">
                      <NiceSlider label="Voice level" value={ctl.voiceGainDb} min={0} max={9} unit="dB" onChange={(v) => setCtl(s => ({ ...s, voiceGainDb: v }))} />
                      <NiceSlider label="Noise reduction" value={ctl.noisePercent} min={0} max={100} unit="%" onChange={(v) => setCtl(s => ({ ...s, noisePercent: v }))} />
                      <NiceSlider label="Background level" value={ctl.bgPercent} min={0} max={100} unit="%" onChange={(v) => setCtl(s => ({ ...s, bgPercent: v }))} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <RowSelect label="Loudness target" value={ctl.lufs} options={["-16","-14","-12"]} onChange={(v) => setCtl(s => ({ ...s, lufs: v as Controls["lufs"] }))} />
                        <RowSelect label="De-hum" value={ctl.dehum} options={["Off","50Hz","60Hz","Auto"]} onChange={(v) => setCtl(s => ({ ...s, dehum: v as Controls["dehum"] }))} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* files + advanced */}
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <div className="font-medium">Files ({files.length})</div>
                      <div className="flex items-center gap-4">
                        <button onClick={onBrowse} className="text-sm text-[#5765F2] hover:underline">Add more</button>
                        <button onClick={clearAll} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
                      </div>
                    </div>
                    <div className="px-4 pt-3 pb-2">
                      <ModeToggleCompact value={applyAll} onChange={setApplyAll} />
                    </div>
                    <ul className="divide-y divide-gray-100 max-h-56 overflow-auto">
                      {files.map((f) => {
                        const active = applyAll === "one" && f.id === selectedId
                        return (
                          <li key={f.id}
                              className={`px-4 py-2.5 flex items-center justify-between cursor-pointer ${active ? "bg-indigo-50/40" : ""}`}
                              onClick={() => applyAll === "one" && setSelectedId(f.id)}>
                            <div className="min-w-0">
                              <div className="text-sm text-gray-900 truncate">{f.file.name}</div>
                              <div className="text-[11px] text-gray-500">{f.kind.toUpperCase()} · {f.sizeMB} MB</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeFile(f.id) }}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800" aria-label="Remove file">
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <InformationCircleIcon className="w-4 h-4" />
                        {applyAll === "all" ? "Preview uses the first file" : <span className="truncate">Editing: <span className="font-medium text-gray-800">{currentFile?.file.name}</span></span>}
                      </div>
                    </div>
                  </div>

                  {/* advanced */}
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <button className="w-full px-4 py-3 text-left flex items-center justify-between" onClick={() => setAdvancedOpen(v => !v)}>
                      <div>
                        <div className="font-medium">Advanced enhancement</div>
                        <div className="text-xs text-gray-500">Fine-tune details when you need them.</div>
                      </div>
                      <svg className={`w-4 h-4 transition ${advancedOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" />
                      </svg>
                    </button>
                    {advancedOpen && (
                      <div className="px-4 pb-4 space-y-6">
                        <Group title="Clean artifacts">
                          <NiceSlider label="De-ess" value={ctl.deess} onChange={(v) => setCtl({ ...ctl, deess: v })} />
                          <NiceSlider label="Mouth de-click" value={ctl.mouth} onChange={(v) => setCtl({ ...ctl, mouth: v })} />
                          <NiceSlider label="De-crackle" value={ctl.crackle} onChange={(v) => setCtl({ ...ctl, crackle: v })} />
                        </Group>
                        <Group title="Room & tone">
                          <NiceSlider label="Plosive control" value={ctl.plosive} onChange={(v) => setCtl({ ...ctl, plosive: v })} />
                          <NiceSlider label="De-reverb" value={ctl.dereverb} onChange={(v) => setCtl({ ...ctl, dereverb: v })} />
                          <RowSelect label="High-pass filter" value={ctl.hpf} options={["Off","60Hz","80Hz"]} onChange={(v) => setCtl({ ...ctl, hpf: v as any })} />
                        </Group>
                        <Group title="Output & safety">
                          <RowSwitch label="Repair clipping" checked={ctl.clipRepair} onChange={(v) => setCtl({ ...ctl, clipRepair: v })} />
                          <RowSwitch label="Voice to mono" checked={ctl.monoVoice} onChange={(v) => setCtl({ ...ctl, monoVoice: v })} />
                          <RowSelect label="Quality vs speed" value={ctl.quality} options={["Fast","Balanced","Max"]} onChange={(v) => setCtl({ ...ctl, quality: v as any })} />
                        </Group>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* sticky footer */}
            <div ref={refProcess} className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-200 mt-8">
              <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">{hasFiles ? `${files.length} file${files.length > 1 ? "s" : ""} selected` : "No files selected"}</div>
                <div className="flex items-center gap-3">
                  <button onClick={clearAll} disabled={!hasFiles} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-50">Reset</button>
                  <button
                    onClick={processAndExportV2}
                    disabled={!hasFiles || isProcessing}
                    className="px-6 py-3 rounded-xl text-white text-base font-semibold shadow-[0_8px_24px_rgba(87,101,242,0.35)] disabled:opacity-50 bg-gradient-to-r from-[#5765F2] to-[#4955E2] hover:from-[#4955E2] hover:to-[#3845D2] transition"
                  >
                    {isProcessing ? "Processing…" : processLabel + " (v2)"}
                  </button>
                </div>
              </div>
            </div>

            {/* hidden input */}
            <input ref={inputRef} type="file" multiple accept="audio/*,video/*" hidden onChange={(e) => onPick(e.target.files)} />
          </div>

          {/* processing overlay */}
          {isProcessing && (
            <div className="fixed bottom-16 left-0 right-0 z-50">
              <div className="mx-auto max-w-6xl px-8">
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-[#5765F2]" style={{ width: progress + "%" }} />
                </div>
                <div className="mt-1 text-xs text-gray-600">Processing… keep this tab open. “Max” may take longer.</div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* minimal page-scoped styles */}
      <style jsx global>{`
        .nice-range { -webkit-appearance:none; appearance:none; width:100%; height:14px; border-radius:9999px; background:#e6e8f0; cursor:pointer; }
        .nice-range::-webkit-slider-runnable-track, .nice-range::-moz-range-track { height:14px; border-radius:9999px; background:transparent; }
        .nice-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:24px; height:24px; border-radius:9999px; background:#fff; border:3px solid ${SLIDER_FILL}; margin-top:-5px; box-shadow:0 3px 10px rgba(154,167,236,0.35); }
        .nice-range::-moz-range-thumb { width:24px; height:24px; border-radius:9999px; background:#fff; border:3px solid ${SLIDER_FILL}; box-shadow:0 3px 10px rgba(154,167,236,0.35); }
        .segmented-ab button { border:1px solid #E6E8F0; }
        .segmented-ab .active { background:linear-gradient(90deg,#5765F2,#4955E2); color:#fff; border-color:transparent; box-shadow:0 6px 18px rgba(87,101,242,0.25); }
      `}</style>
    </div>
  )
}

/* ────────────────────────── Small UI helpers ─────────────────────────────── */

function StepDot({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 ${active ? "text-gray-900" : "text-gray-400"}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${active ? "bg-[#5765F2]" : "bg-gray-300"}`} />
      {children}
    </button>
  )
}

function SegmentedAB({ value, onChange, leftLabel, rightLabel }: {
  value: "original" | "enhanced"; onChange: (v: "original" | "enhanced") => void; leftLabel: string; rightLabel: string
}) {
  return (
    <div className="segmented-ab inline-flex rounded-xl overflow-hidden">
      <button type="button" className={`px-3 py-1.5 text-sm ${value === "original" ? "active" : "bg-white text-gray-700"}`} onClick={() => onChange("original")} aria-pressed={value === "original"}>{leftLabel}</button>
      <button type="button" className={`px-3 py-1.5 text-sm ${value === "enhanced" ? "active" : "bg-white text-gray-700"}`} onClick={() => onChange("enhanced")} aria-pressed={value === "enhanced"}>{rightLabel}</button>
    </div>
  )
}

function MonitorToggle({ value, onChange }: { value: Monitor; onChange: (v: Monitor) => void }) {
  return (
    <div className="inline-flex bg-gray-100 rounded-lg p-1">
      {(["mix","vocals","background"] as Monitor[]).map((k, i) => (
        <button key={k} type="button"
          className={`px-3 py-1.5 text-sm rounded-md transition ${value === k ? "bg-white text-gray-900 ring-1 ring-[#5765F2]/30" : "text-gray-600"} ${i>0?"ml-1":""}`}
          onClick={() => onChange(k)} aria-pressed={value === k}
          title={k === "mix" ? "Full mix" : k === "vocals" ? "Vocals only" : "Background only"}>
          {k === "mix" ? "Mix" : k === "vocals" ? "Vocals" : "BG"}
        </button>
      ))}
    </div>
  )
}

function ModeToggleCompact({ value, onChange }: { value: "all" | "one"; onChange: (v: "all" | "one") => void }) {
  return (
    <div className="inline-flex bg-gray-100 rounded-lg p-1">
      <button type="button" className={`px-3 py-1.5 text-sm rounded-md transition ${value === "all" ? "bg-white text-gray-900 ring-1 ring-[#5765F2]/30" : "text-gray-600"}`} onClick={() => onChange("all")} aria-pressed={value === "all"}>Apply to all</button>
      <button type="button" className={`ml-1 px-3 py-1.5 text-sm rounded-md transition ${value === "one" ? "bg-white text-gray-900 ring-1 ring-[#5765F2]/30" : "text-gray-600"}`} onClick={() => onChange("one")} aria-pressed={value === "one"}>Per file</button>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="text-xs font-medium text-gray-600">{title}</div>
      {children}
    </div>
  )
}

function NiceSlider({ label, value, onChange, min = 0, max = 100, unit }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string
}) {
  const style = filledTrack(value, min, max)
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-800">{label}</div>
        <div className="text-xs text-gray-500">{value}{unit ? ` ${unit}` : ""}</div>
      </div>
      <input type="range" className="nice-range" style={style} min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Less</span><span>More</span></div>
    </div>
  )
}

function RowSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span className="text-gray-800 font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="ml-3 border border-gray-300 rounded-lg px-2 py-2 text-sm bg-white">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

function RowSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span className="text-gray-800 font-medium">{label}</span>
      <span className="relative inline-flex items-center">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-[#5765F2]" : "bg-gray-300"}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </span>
    </label>
  )
}
