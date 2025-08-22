'use client'
import React, { useRef, useState } from 'react'

export default function EnhanceTester() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [log, setLog] = useState('')

  async function ping() {
    try {
      const r = await fetch('/api/enhance')
      const t = await r.text()
      setLog(`GET /api/enhance -> ${r.status} ${t}`)
    } catch (e: any) {
      setLog('GET failed: ' + (e?.message || String(e)))
    }
  }

  async function submit() {
    const input = inputRef.current
    if (!input || !input.files || input.files.length === 0) {
      setLog('Pick files first')
      return
    }

    const fd = new FormData()
    fd.append('settings', JSON.stringify({
      voiceGainDb: 3, noisePercent: 50, bgPercent: 20, lufs: '-14',
      dehum: 'Auto', deess: 25, mouth: 30, crackle: 10, plosive: 10,
      dereverb: 10, hpf: 'Off', clipRepair: false, monoVoice: false, quality: 'Balanced'
    }))
    Array.from(input.files).forEach(f => fd.append('files', f, f.name))

    const r = await fetch('/api/enhance', { method: 'POST', body: fd })
    setLog(prev => prev + `\nPOST /api/enhance -> ${r.status} ${r.headers.get('content-type')}`)

    if (r.ok) {
      const b = await r.blob()
      const url = URL.createObjectURL(b)
      const a = document.createElement('a')
      const isZip = (r.headers.get('content-type') || '').includes('zip')
      a.href = url
      a.download = isZip ? 'sukudo-enhanced.zip' : 'enhanced.m4a'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } else {
      try {
        const msg = await r.text()    // ✅ await first
        setLog(prev => prev + '\n' + msg)
      } catch {
        // ignore
      }
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Inter, system-ui' }}>
      <h2>Enhance backend tester</h2>
      <div style={{ display: 'flex', gap: 12, margin: '12px 0' }}>
        <button onClick={ping}>Ping API</button>
        <input ref={inputRef} type="file" multiple accept="audio/*,video/*" />
        <button onClick={submit}>Process</button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f7', padding: 12, borderRadius: 8 }}>
        {log}
      </pre>
    </div>
  )
}
