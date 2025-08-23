"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  PlusIcon,
  BellIcon,
  BoltIcon,
  FolderIcon,
  SparklesIcon,
  CubeIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid"

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Kind = "audio" | "video"
type Monitor = "mix" | "vocals" | "background"

type FileItem = { id: string; file: File; sizeMB: number; kind: Kind }

type Controls = {
  voiceGainDb: number
  noisePercent: number
  bgPercent: number
  lufs: "-16" | "-14" | "-12"
  dehum: "Off" | "50Hz" | "60Hz" | "Auto"

  // Advanced – all act on the vocal path
  deess: number       // sibilance tame
  mouth: number       // micro-click tame via fast comp
  crackle: number     // high-band smooth
  dereverb: number    // soft gate/expander feel
  hpf: "Off" | "60Hz" | "80Hz"
  clipRepair: boolean
  monoVoice: boolean
  quality: "Fast" | "Balanced" | "Max"
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const SLIDER_FILL = "#9AA7EC"
const filledTrack = (value: number, min = 0, max = 100) => {
  const pct = Math.round(((value - min) / (max - min)) * 100)
  return { background: `linear-gradient(90deg, ${SLIDER_FILL} ${pct}%, #E6E8F0 ${pct}%)` }
}
const db2lin = (db: number) => Math.pow(10, db / 20)

function AC(): AudioContext {
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
  return new Ctx()
}

/* -------------------------------------------------------------------------- */
/* Audio Graph                                                                */
/* -------------------------------------------------------------------------- */

type G = {
  ctx: AudioContext
  mediaEl: HTMLMediaElement
  src: MediaElementAudioSourceNode

  pre: GainNode              // input trim
  // M/S (center/side) matrix
  Ltap: GainNode
  Rtap: GainNode
  Msum: GainNode
  Ssum: GainNode
  Mscale: GainNode
  Sscale: GainNode

  // Vocal chain (M path)
  vHPF: BiquadFilterNode
  vDeEss: BiquadFilterNode      // high-shelf down
  vMouthComp: DynamicsCompressorNode
  vCrackleSmooth: BiquadFilterNode // gentle lowpass on “crackle”
  vDereverbComp: DynamicsCompressorNode
  vNoiseLo: BiquadFilterNode
  vNoiseHi: BiquadFilterNode
  vGain: GainNode

  // Background chain (S path)
  bSpeechNotch1: BiquadFilterNode // remove speech band from BG
  bSpeechNotch2: BiquadFilterNode
  bLowShelf: BiquadFilterNode
  bHiShelf: BiquadFilterNode
  bGain: GainNode

  // Buses
  originalBus: GainNode     // raw original monitor
  enhancedBus: GainNode     // result of M/B chains
  outLimiter: DynamicsCompressorNode
  finalBus: GainNode

  // state
  currentMode: "original" | "enhanced"
  currentMonitor: Monitor
}

/**
 * Disconnect helper – tries everywhere but never throws.
 */
function safeDisconnect(n?: AudioNode | null) {
  try { n?.disconnect() } catch {}
}

/**
 * Build a fresh graph from a media element.
 * We never connect anything directly to destination;
 * everything flows into `finalBus` -> ctx.destination.
 */
function buildGraph(mediaEl: HTMLMediaElement): G {
  const ctx = AC()
  const src = ctx.createMediaElementSource(mediaEl)

  const pre = ctx.createGain()
  pre.gain.value = 1
  src.connect(pre)

  // NOTE: Avoid ChannelSplitter pitfalls (mono/stereo differences across browsers).
  // We “tap” into the same pre node twice then create the M/S with gains.
  const Ltap = ctx.createGain()
  const Rtap = ctx.createGain()
  pre.connect(Ltap)
  pre.connect(Rtap)

  // Mid/Side
  const Msum = ctx.createGain()  // L + R
  const Ssum = ctx.createGain()  // L - R
  Ltap.connect(Msum)                     // +1
  Rtap.connect(Msum)                     // +1
  Ltap.connect(Ssum)                     // +1
  const Rneg = ctx.createGain()         // -1
  Rneg.gain.value = -1
  Rtap.connect(Rneg)
  Rneg.connect(Ssum)

  const Mscale = ctx.createGain()
  const Sscale = ctx.createGain()
  Mscale.gain.value = 0.5
  Sscale.gain.value = 0.5
  Msum.connect(Mscale)
  Ssum.connect(Sscale)

  // ----- Vocal chain (Mid) -----
  const vHPF = ctx.createBiquadFilter(); vHPF.type = "highpass"; vHPF.frequency.value = 60
  const vDeEss = ctx.createBiquadFilter(); vDeEss.type = "highshelf"; vDeEss.frequency.value = 7000; vDeEss.gain.value = 0
  const vMouthComp = ctx.createDynamicsCompressor(); vMouthComp.attack.value = 0.002; vMouthComp.release.value = 0.06; vMouthComp.ratio.value = 10
  const vCrackleSmooth = ctx.createBiquadFilter(); vCrackleSmooth.type = "lowpass"; vCrackleSmooth.frequency.value = 20000
  const vDereverbComp = ctx.createDynamicsCompressor(); vDereverbComp.attack.value = 0.005; vDereverbComp.release.value = 0.25; vDereverbComp.ratio.value = 6
  const vNoiseLo = ctx.createBiquadFilter(); vNoiseLo.type = "lowshelf"; vNoiseLo.frequency.value = 120; vNoiseLo.gain.value = 0
  const vNoiseHi = ctx.createBiquadFilter(); vNoiseHi.type = "highshelf"; vNoiseHi.frequency.value = 8000; vNoiseHi.gain.value = 0
  const vGain = ctx.createGain(); vGain.gain.value = 1

  Mscale
    .connect(vHPF)
    .connect(vDeEss)
    .connect(vMouthComp)
    .connect(vCrackleSmooth)
    .connect(vDereverbComp)
    .connect(vNoiseLo)
    .connect(vNoiseHi)
    .connect(vGain)

  // ----- Background chain (Side) -----
  // tame remaining speech with notches around 1.8k and 3 kHz
  const bSpeechNotch1 = ctx.createBiquadFilter(); bSpeechNotch1.type = "notch"; bSpeechNotch1.frequency.value = 1800; bSpeechNotch1.Q.value = 2
  const bSpeechNotch2 = ctx.createBiquadFilter(); bSpeechNotch2.type = "notch"; bSpeechNotch2.frequency.value = 3000; bSpeechNotch2.Q.value = 2
  const bLowShelf = ctx.createBiquadFilter(); bLowShelf.type = "lowshelf"; bLowShelf.frequency.value = 150; bLowShelf.gain.value = 0
  const bHiShelf = ctx.createBiquadFilter(); bHiShelf.type = "highshelf"; bHiShelf.frequency.value = 9000; bHiShelf.gain.value = 0
  const bGain = ctx.createGain(); bGain.gain.value = 1

  Sscale
    .connect(bSpeechNotch1)
    .connect(bSpeechNotch2)
    .connect(bLowShelf)
    .connect(bHiShelf)
    .connect(bGain)

  // ----- Buses -----
  const originalBus = ctx.createGain(); originalBus.gain.value = 0 // default to enhanced
  const enhancedBus = ctx.createGain(); enhancedBus.gain.value = 1

  // raw path (for “Original” A/B)
  pre.connect(originalBus)

  // enhanced is sum of vGain + bGain
  vGain.connect(enhancedBus)
  bGain.connect(enhancedBus)

  // Output limiter + final
  const outLimiter = ctx.createDynamicsCompressor()
  outLimiter.threshold.value = -2
  outLimiter.ratio.value = 20
  outLimiter.attack.value = 0.005
  outLimiter.release.value = 0.2

  const finalBus = ctx.createGain()
  originalBus.connect(finalBus)
  enhancedBus.connect(finalBus)
  finalBus.connect(outLimiter)
  outLimiter.connect(ctx.destination)

  const g: G = {
    ctx, mediaEl, src,
    pre,
    Ltap, Rtap, Msum, Ssum, Mscale, Sscale,
    vHPF, vDeEss, vMouthComp, vCrackleSmooth, vDereverbComp, vNoiseLo, vNoiseHi, vGain,
    bSpeechNotch1, bSpeechNotch2, bLowShelf, bHiShelf, bGain,
    originalBus, enhancedBus, outLimiter, finalBus,
    currentMode: "enhanced",
    currentMonitor: "mix",
  }
  ;(mediaEl as any).__graph = g
  return g
}

function setMode(g: G, mode: "original" | "enhanced") {
  g.currentMode = mode
  g.originalBus.gain.value  = (mode === "original") ? 1 : 0
  g.enhancedBus.gain.value  = (mode === "enhanced") ? 1 : 0
}

function setMonitor(g: G, mon: Monitor, ctl: Controls) {
  // Use gains so no reconnect pops.
  g.currentMonitor = mon
  const vBase = db2lin(ctl.voiceGainDb)
  const bBase = 1 - ctl.bgPercent / 100

  if (mon === "mix") {
    g.vGain.gain.value = vBase
    g.bGain.gain.value = bBase
  } else if (mon === "vocals") {
    g.vGain.gain.value = vBase
    g.bGain.gain.value = 0
  } else { // background
    g.vGain.gain.value = 0
    g.bGain.gain.value = bBase
  }
}

function updateFromControls(g: G, ctl: Controls) {
  // output balance depends on monitor
  setMonitor(g, g.currentMonitor, ctl)

  // high pass / plosive
  const hp = ctl.hpf === "Off" ? (ctl.mouth > 0 ? 65 : 50) : (ctl.hpf === "60Hz" ? 60 : 80)
  g.vHPF.frequency.value = hp

  // de-ess
  g.vDeEss.gain.value = -((ctl.deess / 100) * 10)

  // mouth clicks – faster, stronger compression as slider goes up
  g.vMouthComp.threshold.value = -18 - (ctl.mouth / 100) * 12
  g.vMouthComp.ratio.value = 6 + (ctl.mouth / 100) * 10
  g.vMouthComp.attack.value = 0.002
  g.vMouthComp.release.value = 0.05 + (ctl.mouth / 100) * 0.1

  // crackle smoothing – lower the lowpass cutoff as the value rises (subtle)
  const crackleHz = 20000 - (ctl.crackle / 100) * 5000
  g.vCrackleSmooth.frequency.value = Math.max(4000, crackleHz)

  // dereverb – softer gate/expander feel with a comp
  g.vDereverbComp.threshold.value = -45 + (ctl.dereverb / 100) * 20
  g.vDereverbComp.ratio.value = 4 + (ctl.dereverb / 100) * 4

  // basic noise reduction using shelves
  const lowCut = -((ctl.noisePercent / 100) * 12)
  const hiCut = -((ctl.noisePercent / 100) * 9)
  g.vNoiseLo.gain.value = lowCut
  g.vNoiseHi.gain.value = hiCut
  // background noise shaping (lighter)
  g.bLowShelf.gain.value = lowCut * 0.6
  g.bHiShelf.gain.value = hiCut * 0.6

  // background level follows slider via monitor setter
  // vGain follows voiceGain via monitor setter as well

  // de-hum – apply to pre as tiny series of notches when enabled
  // (cheap “simulation”; we just duck 50/60 and harmonics inside pre -> original)
  // For simplicity we bypass here; hum handling is usually done in the worker.
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function EnhanceAudioPage() {
  /* upload */
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [drag, setDrag] = useState(false)

  /* modes */
  const [applyAll, setApplyAll] = useState<"all" | "one">("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  /* preview */
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [mode, setModeUI] = useState<"original" | "enhanced">("enhanced")
  const [monitor, setMonitorUI] = useState<Monitor>("mix")
  const [updatingPreview, setUpdatingPreview] = useState(false)

  /* controls */
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [ctl, setCtl] = useState<Controls>({
    voiceGainDb: 4,
    noisePercent: 55,
    bgPercent: 25,
    lufs: "-14",
    dehum: "Auto",
    deess: 28,
    mouth: 35,
    crackle: 15,
    dereverb: 15,
    hpf: "Off",
    clipRepair: false,
    monoVoice: false,
    quality: "Balanced",
  })

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (!isProcessing) return
    let pct = 0
    const id = setInterval(() => {
      pct = Math.min(95, pct + Math.random() * 6 + 2)
      setProgress(Math.round(pct))
    }, 400)
    return () => clearInterval(id)
  }, [isProcessing])

  /* step anchors */
  const refAdd = useRef<HTMLDivElement>(null)
  const refAdjust = useRef<HTMLDivElement>(null)
  const refProcess = useRef<HTMLDivElement>(null)

  /* helpers */
  const onBrowse = () => {
    if (!inputRef.current) return
    ;(inputRef.current as HTMLInputElement).value = ""
    inputRef.current.click()
  }
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
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false); onPick(e.dataTransfer.files)
  }
  const removeFile = (id: string) => {
    setFiles((p) => p.filter((f) => f.id !== id))
    if (selectedId === id) setSelectedId(files.find((f) => f.id !== id)?.id ?? null)
  }
  const clearAll = () => { setFiles([]); setSelectedId(null) }

  const hasFiles = files.length > 0
  useEffect(() => { if (applyAll === "one" && hasFiles && !selectedId) setSelectedId(files[0].id) }, [applyAll, hasFiles, selectedId, files])

  const currentFile = applyAll === "all" ? files[0] : (files.find((f) => f.id === selectedId) || files[0])
  const currentSrc = useMemo(() => (currentFile ? URL.createObjectURL(currentFile.file) : undefined), [currentFile?.id])
  const mediaEl = () => currentFile?.kind === "video" ? videoRef.current : audioRef.current

  const ensureGraph = () => {
    const el = mediaEl()
    if (!el) return null
    const existing = (el as any).__graph as G | undefined
    if (existing) return existing
    const g = buildGraph(el)
    // default route
    setMode(g, mode)
    setMonitor(g, monitor, ctl)
    return g
  }

  const togglePlay = async () => {
    const el = mediaEl(); if (!el) return
    let g = ensureGraph()
    if (!g) g = buildGraph(el)
    if (g.ctx.state === "suspended") { try { await g.ctx.resume() } catch {} }
    if (playing) { el.pause(); setPlaying(false) } else { try { await el.play(); setPlaying(true) } catch {} }
  }

  const onLoadedMedia = () => {
    const el = mediaEl(); if (!el) return
    // Tear down previous context if a different media element reuses the page
    const old = (el as any).__graph as G | undefined
    if (old) {
      // nothing – we reuse
    } else {
      buildGraph(el)
    }
    // initial patch
    const g = (el as any).__graph as G
    setMode(g, mode)
    setMonitor(g, monitor, ctl)
    updateFromControls(g, ctl)
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
    const t = setTimeout(() => setUpdatingPreview(false), 300)
    return () => clearTimeout(t)
  }, [ctl])

  useEffect(() => {
    const el = mediaEl(); if (!el) return
    const g = (el as any).__graph as G | undefined
    if (!g) return
    updateFromControls(g, ctl)
  }, [ctl])

  useEffect(() => {
    const el = mediaEl(); if (!el) return
    const g = (el as any).__graph as G | undefined
    if (!g) return
    setMode(g, mode)
  }, [mode, currentFile?.id])

  useEffect(() => {
    const el = mediaEl(); if (!el) return
    const g = (el as any).__graph as G | undefined
    if (!g) return
    setMonitor(g, monitor, ctl)
  }, [monitor, currentFile?.id])

  const count = files.length || 0
  const processLabel = applyAll === "all" ? `Process ${count} file${count > 1 ? "s" : ""} (v2)` : "Process 1 file (v2)"

  /* ------------------------------------------------------------------------ */
  /* Process & Export                                                         */
  /* ------------------------------------------------------------------------ */

  async function processAndExportV2() {
    if (!files.length || isProcessing) return
    setServerError(null)
    setIsProcessing(true)
    try {
      const fd = new FormData()
      fd.append("settings", JSON.stringify(ctl))
      files.forEach((f) => fd.append("files", f.file, f.file.name))

      // Keep the API path identical to your project.
      const res = await fetch("/api/enhance-v2", { method: "POST", body: fd })
      if (!res.ok) {
        const msg = await res.text().catch(() => "")
        throw new Error(msg || `Server error: ${res.status}`)
      }

      // Either a ZIP (multi) or a single file stream.
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const isZip = res.headers.get("content-type")?.includes("zip")
      a.href = url
      a.download = isZip
        ? "sukudo-enhanced.zip"
        : files[0].file.name.replace(/\.[^.]+$/, "") + (files[0].kind === "video" ? ".enhanced.mp4" : ".enhanced.m4a")
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    } catch (e: any) {
      console.error(e)
      setServerError(e?.message || "Processing failed.")
      alert(`Processing failed.\n${e?.message || ""}`)
    } finally {
      try { setProgress(100) } catch {}
      setIsProcessing(false)
    }
  }

  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

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
          <Link
            key={i}
            href="/dashboard"
            className="group relative w-11 h-11 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center hover:bg-gradient-to-br hover:from-[#5765F2] hover:to-[#4955E2] hover:rounded-xl hover:shadow-lg hover:scale-105 transition-all"
          >
            <Icon className="w-5 h-5 text-[#323339] group-hover:text-white transition-colors" />
            <span className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
              {label}
            </span>
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
                      <MonitorToggle
                        value={monitor}
                        onChange={(v) => {
                          setMonitorUI(v)
                          // Switching monitor implies Enhanced monitoring
                          setModeUI("enhanced")
                          const el = mediaEl(); if (!el) return
                          const g = (el as any).__graph as G | undefined
                          if (g) { setMode(g, "enhanced") }
                        }}
                      />
                      <SegmentedAB value={mode} onChange={(v) => setModeUI(v)} leftLabel="Original" rightLabel="Enhanced" />
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
                        onClick={() => {
                          setCtl({
                            voiceGainDb: 4, noisePercent: 55, bgPercent: 25, lufs: "-14", dehum: "Auto",
                            deess: 28, mouth: 35, crackle: 15, dereverb: 15,
                            hpf: "Off", clipRepair: false, monoVoice: false, quality: "Balanced",
                          })
                          // auto back to mix after reset
                          setMonitorUI("mix")
                        }}
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
                          <li key={f.id} className={`px-4 py-2.5 flex items-center justify-between cursor-pointer ${active ? "bg-indigo-50/40" : ""}`} onClick={() => applyAll === "one" && setSelectedId(f.id)}>
                            <div className="min-w-0">
                              <div className="text-sm text-gray-900 truncate">{f.file.name}</div>
                              <div className="text-[11px] text-gray-500">{f.kind.toUpperCase()} · {f.sizeMB} MB</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeFile(f.id) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800" aria-label="Remove file">
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

                  {/* advanced – auto-solo vocals on change */}
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
                          <NiceSlider label="De-ess" value={ctl.deess} onChange={(v) => { setCtl({ ...ctl, deess: v }); setMonitorUI("vocals") }} />
                          <NiceSlider label="Mouth de-click" value={ctl.mouth} onChange={(v) => { setCtl({ ...ctl, mouth: v }); setMonitorUI("vocals") }} />
                          <NiceSlider label="De-crackle" value={ctl.crackle} onChange={(v) => { setCtl({ ...ctl, crackle: v }); setMonitorUI("vocals") }} />
                        </Group>
                        <Group title="Room & tone">
                          <NiceSlider label="De-reverb" value={ctl.dereverb} onChange={(v) => { setCtl({ ...ctl, dereverb: v }); setMonitorUI("vocals") }} />
                          <RowSelect label="High-pass filter" value={ctl.hpf} options={["Off","60Hz","80Hz"]} onChange={(v) => { setCtl({ ...ctl, hpf: v as any }); setMonitorUI("vocals") }} />
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
                  <button onClick={processAndExportV2} disabled={!hasFiles || isProcessing} className="px-6 py-3 rounded-xl text-white text-base font-semibold shadow-[0_8px_24px_rgba(87,101,242,0.35)] disabled:opacity-50 bg-gradient-to-r from-[#5765F2] to-[#4955E2] hover:from-[#4955E2] hover:to-[#3845D2] transition">
                    {isProcessing ? "Processing…" : processLabel}
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
                <div className="mt-1 text-xs text-gray-600">Processing… please keep this tab open. Quality “Max” may take longer.</div>
                {!!serverError && <div className="mt-1 text-xs text-red-600">Error: {serverError}</div>}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* minimal styles */}
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

/* -------------------------------------------------------------------------- */
/* UI Helpers                                                                 */
/* -------------------------------------------------------------------------- */

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
      <button type="button" className={`px-3 py-1.5 text-sm ${value === "original" ? "active" : "bg-white text-gray-700"}`} onClick={() => onChange("original")} aria-pressed={value === "original"} title="Press C to compare">{leftLabel}</button>
      <button type="button" className={`px-3 py-1.5 text-sm ${value === "enhanced" ? "active" : "bg-white text-gray-700"}`} onClick={() => onChange("enhanced")} aria-pressed={value === "enhanced"} title="Press C to compare">{rightLabel}</button>
    </div>
  )
}

function MonitorToggle({ value, onChange }: { value: Monitor; onChange: (v: Monitor) => void }) {
  return (
    <div className="inline-flex bg-gray-100 rounded-lg p-1">
      {(["mix","vocals","background"] as Monitor[]).map((k, i) => (
        <button key={k} type="button" className={`px-3 py-1.5 text-sm rounded-md transition ${value === k ? "bg-white text-gray-900 ring-1 ring-[#5765F2]/30" : "text-gray-600"} ${i>0?"ml-1":""}`} onClick={() => onChange(k)} aria-pressed={value === k} title={k === "mix" ? "Full mix" : k === "vocals" ? "Vocals only" : "Background only"}>
          {k === "mix" ? "Mix" : k === "vocals" ? "Vocals" : "BG"}
        </button>
      ))}
    </div>
  )
}

function ModeToggleCompact({ value, onChange }: { value: "all" | "one"; onChange: (v: "all" | "one") => void }) {
  return (
    <div className="inline-flex bg-gray-100 rounded-lg p-1">
      <button type="button" className={`px-3 py-1.5 text-sm rounded-md transition ${value === "all" ? "bg-white text-gray-900 ring-1 ring-[#5765F2]/30" : "text-gray-600"}`} onClick={() => onChange("all")} aria-pressed={value === "all"} title="One set of settings for every file">Apply to all</button>
      <button type="button" className={`ml-1 px-3 py-1.5 text-sm rounded-md transition ${value === "one" ? "bg-white text-gray-900 ring-1 ring-[#5765F2]/30" : "text-gray-600"}`} onClick={() => onChange("one")} aria-pressed={value === "one"} title="Tune each file separately">Per file</button>
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
