export type Mode = "original" | "mix" | "vocals" | "bg" | "enhanced";

export class EnhancePreview {
  private ctx: AudioContext | null = null;
  private buffers: { orig?: AudioBuffer; voc?: AudioBuffer; bg?: AudioBuffer; enh?: AudioBuffer } = {};
  private nodes = { voiceDb: 0, bgDb: -12, hpfHz: 80 };

  async setBuffers(b: Partial<typeof this.buffers>) { this.buffers = { ...this.buffers, ...b }; }
  setNodes(n: Partial<typeof this.nodes>) { this.nodes = { ...this.nodes, ...n }; }

  async decodeUrl(url: string) {
    const ctx = await this.ensureCtx();
    const ab = await fetch(url).then(r=>r.arrayBuffer());
    return await ctx.decodeAudioData(ab.slice(0));
  }
  async decodeFile(file: File) {
    const ctx = await this.ensureCtx();
    const ab = await file.arrayBuffer();
    return await ctx.decodeAudioData(ab.slice(0));
  }

  stop() { this.ctx?.close(); this.ctx = null; }

  async play(mode: Mode) {
    this.stop();
    const ctx = await this.ensureCtx();
    const hpf = ctx.createBiquadFilter(); hpf.type = "highpass"; hpf.frequency.value = this.nodes.hpfHz;
    const master = ctx.createGain(); master.gain.value = 1;
    hpf.connect(master).connect(ctx.destination);

    const add = (buf?: AudioBuffer, db = 0) => {
      if (!buf) return;
      const s = ctx.createBufferSource(); s.buffer = buf;
      const g = ctx.createGain(); g.gain.value = Math.pow(10, db/20);
      s.connect(g).connect(hpf); s.start();
    };

    if (mode === "original") add(this.buffers.orig, 0);
    else if (mode === "enhanced") add(this.buffers.enh, 0);
    else if (mode === "vocals") add(this.buffers.voc, this.nodes.voiceDb);
    else if (mode === "bg") add(this.buffers.bg, this.nodes.bgDb);
    else { add(this.buffers.voc, this.nodes.voiceDb); add(this.buffers.bg, this.nodes.bgDb); }
  }

  private async ensureCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return this.ctx!;
  }
}
