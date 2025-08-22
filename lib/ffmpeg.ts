import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";

export type Kind = "audio" | "video";

export type EnhanceSettings = {
  voiceGainDb: number;
  noisePercent: number;
  bgPercent: number;
  lufs: "-16" | "-14" | "-12";
  dehum: "Off" | "50Hz" | "60Hz" | "Auto";
  deess: number;
  mouth: number;
  crackle: number;
  plosive: number;
  dereverb: number;
  hpf: "Off" | "60Hz" | "80Hz";
  clipRepair: boolean;
  monoVoice: boolean;
  quality: "Fast" | "Balanced" | "Max";
};

type FilterSupport = {
  deesser: boolean;
  adeclick: boolean;
  adeclip: boolean;
  afftdn: boolean;
  anequalizer: boolean;
  loudnorm: boolean;
  highpass: boolean;
  lowpass: boolean;
  compand: boolean;
};

let cachedSupport: FilterSupport | null = null;

function run(args: string[]) {
  return new Promise<string>((resolve) => {
    const p = spawn(ffmpegPath as string, args);
    const bufs: Buffer[] = [];
    p.stdout?.on("data", (d) => bufs.push(Buffer.from(d)));
    p.stderr?.on("data", (d) => bufs.push(Buffer.from(d)));
    p.on("close", () => resolve(Buffer.concat(bufs).toString("utf8")));
  });
}

export async function detectFilters(): Promise<FilterSupport> {
  if (cachedSupport) return cachedSupport;
  const out = await run(["-hide_banner", "-filters"]);
  const has = (name: string) => new RegExp(`\\s${name}\\s`).test(out);
  cachedSupport = {
    deesser: has("deesser"),
    adeclick: has("adeclick"),
    adeclip: has("adeclip"),
    afftdn: has("afftdn") || has("anlmdn"),
    anequalizer: has("anequalizer") || has("equalizer"),
    loudnorm: has("loudnorm"),
    highpass: has("highpass"),
    lowpass: has("lowpass"),
    compand: has("compand"),
  };
  return cachedSupport!;
}

export function buildFilterChain(s: EnhanceSettings, sup: FilterSupport) {
  const af: string[] = [];

  // De‑hum (notch base + harmonics)
  if (s.dehum !== "Off" && sup.anequalizer) {
    const base = s.dehum === "Auto" ? 50 : parseInt(s.dehum, 10);
    [base, base * 2, base * 3, base * 4].forEach((f) => {
      af.push(`anequalizer=f=${f}:t=q:w=60:g=-20`);
    });
  }

  // HPF / plosives
  const hp = s.hpf === "60Hz" ? 60 : s.hpf === "80Hz" ? 80 : (s.plosive ? 70 + Math.round(s.plosive * 0.8) : 0);
  if (hp && sup.highpass) af.push(`highpass=f=${hp}`);

  // Denoise
  if (s.noisePercent > 0) {
    const nr = Math.round(6 + (s.noisePercent / 100) * 18); // 6..24 dB
    if (sup.afftdn) af.push(`afftdn=nr=${nr}`);
    else if (sup.compand) af.push(`compand=attacks=0.2:decays=0.6:points=-80/-80|-60/-60|-50/-40|-20/-10|0/0:soft-knee=6`);
  }

  // De‑ess
  if (s.deess > 0) {
    const atten = Math.round((s.deess / 100) * 12);
    if (sup.deesser) af.push(`deesser=f=7000:width=2000:mode=wide:th=0.5`);
    else if (sup.anequalizer) af.push(`anequalizer=f=8000:t=h:w=2000:g=-${atten}`);
  }

  // Click/crackle
  if ((s.mouth > 0 || s.crackle > 0) && sup.adeclick) af.push(`adeclick`);

  // Clipping repair
  if (s.clipRepair && sup.adeclip) af.push(`adeclip`);

  // Soft dereverb (gate‑ish)
  if (s.dereverb > 0 && sup.compand) {
    const thr = Math.round(-50 + (s.dereverb / 100) * 20); // -50..-30
    af.push(`compand=attacks=0.005:decays=0.25:points=-80/-80|${thr}/-60|-20/-10|0/0:soft-knee=3`);
  }

  // Gentle lowpass if crackle high
  if (s.crackle > 40 && sup.lowpass) {
    const lp = Math.round(18000 - (s.crackle - 40) * 120);
    af.push(`lowpass=f=${lp}`);
  }

  // Voice gain
  if (Math.abs(s.voiceGainDb) > 0.1) af.push(`volume=${s.voiceGainDb}dB`);

  // Loudness target
  if (sup.loudnorm) {
    const I = s.lufs === "-12" ? -12 : s.lufs === "-16" ? -16 : -14;
    af.push(`loudnorm=I=${I}:TP=-1.5:LRA=11`);
  }

  if (s.monoVoice) af.push(`aformat=channel_layouts=mono`);

  return af.join(",");
}

export async function processFile(inPath: string, outPath: string, kind: Kind, s: EnhanceSettings) {
  const sup = await detectFilters();
  const af = buildFilterChain(s, sup);

  const args: string[] = ["-y", "-i", inPath];
  if (af) args.push("-af", af);

  if (kind === "video") {
    args.push("-map", "0:v?", "-map", "0:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k");
  } else {
    args.push("-c:a", "aac", "-b:a", "192k");
  }

  await new Promise<void>((resolve, reject) => {
    const p = spawn(ffmpegPath as string, args);
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
  });
}
