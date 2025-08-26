// app/tools/enhance-audio-v2/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { initEnhanceJob, uploadToSignedUrl, submitJob, signAsset, type InitUpload } from '@/lib/jobsClient';
import { useJobSSE } from '@/hooks/useJobSSE';

type Stage = 'empty' | 'uploading' | 'preparing' | 'preview' | 'queued' | 'processing' | 'completed' | 'failed';

export default function EnhanceAudioV2Page() {
  const [stage, setStage] = useState<Stage>('empty');
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [uploadPct, setUploadPct] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<{ [k: string]: string | null }>({});
  const [paths, setPaths] = useState<string[]>([]);
  const [busy, setBusy] = useState<boolean>(false);

  const { events, status, outputs, done } = useJobSSE(jobId);

  useEffect(() => {
    if (stage === 'queued') setStage('processing');
    if (status === 'completed') setStage('completed');
    if (status === 'failed') setStage('failed');
  }, [status, stage]);

  // File handling
  const pickRef = useRef<HTMLInputElement>(null);

  const onPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStage('uploading');
    setError(null);
    // create local preview URL
    const u = URL.createObjectURL(f);
    setObjectUrl(u);
  }, []);

  // Upload -> init + upload to signed URL + submit
  const startUpload = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    try {
      // 1) init job
      const { job_id, uploads } = await initEnhanceJob([file.name]);
      setJobId(job_id);
      // 2) upload to signed url
      const { path, token } = uploads[0] as InitUpload;
      await uploadToSignedUrl(path, token, file);
      setPaths([path]);
      setUploadPct(100);
      // 3) submit job for processing
      await submitJob(job_id, [path]);
      setStage('queued');
    } catch (e: any) {
      console.error(e);
      setError(String(e.message || e));
      setStage('failed');
    } finally {
      setBusy(false);
    }
  }, [file]);

  // when file selected, kick off upload immediately
  useEffect(() => {
    if (stage === 'uploading' && file) {
      startUpload();
    }
  }, [stage, file, startUpload]);

  // Prepare preview (decode happens in <audio>, we just switch states)
  useEffect(() => {
    if (stage === 'uploading') return;
    if (file && objectUrl && (stage === 'queued' || stage === 'processing' || stage === 'preview' || stage === 'completed')) {
      setStage(prev => (prev === 'uploading' ? 'preparing' : prev));
      const t = setTimeout(() => setStage(prev => prev === 'preparing' ? 'preview' : prev), 300);
      return () => clearTimeout(t);
    }
  }, [file, objectUrl, stage]);

  // On completion, try discover asset links via /api/jobs/asset first; else fall back to outputs from logs
  const [checkedAssets, setCheckedAssets] = useState<boolean>(false);
  useEffect(() => {
    if (!jobId || !done || checkedAssets) return;
    (async () => {
      const enhanced = await signAsset(jobId, 'enhanced.wav');
      const vocals   = await signAsset(jobId, 'vocals.wav');
      const bg       = await signAsset(jobId, 'bg.wav');
      const video    = await signAsset(jobId, 'enhanced.mp4');
      const map: { [k: string]: string | null } = {};
      if (enhanced) map['Enhanced Mix (WAV)'] = enhanced;
      if (vocals)   map['Vocals only (WAV)'] = vocals;
      if (bg)       map['Background only (WAV)'] = bg;
      if (video)    map['Enhanced Video (MP4)'] = video;
      if (!Object.keys(map).length && outputs?.length) {
        outputs.forEach((u, i) => { map[`Result ${i+1}`] = u; });
      }
      setAssets(map);
      setCheckedAssets(true);
    })();
  }, [jobId, done, outputs, checkedAssets]);

  const canExport = stage === 'preview' || stage === 'completed';
  const isBusy = busy || stage === 'uploading' || stage === 'queued' || stage === 'processing';

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Enhance audio (v2 job flow)</h1>
        <Link href="/tools/enhance-audio" className="text-sm underline">Back to original page</Link>
      </div>

      {/* File picker */}
      <div className="rounded-2xl border border-gray-300 p-6">
        <div className="flex items-center gap-3">
          <input type="file" accept="audio/*,video/*" ref={pickRef} onChange={onPick} className="hidden" />
          <button
            onClick={() => pickRef.current?.click()}
            disabled={isBusy}
            className={`rounded-lg px-4 py-2 text-white ${isBusy ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {file ? 'Replace file' : 'Browse file'}
          </button>
          {file && <span className="text-sm text-gray-600">{file.name} • {(file.size/1024/1024).toFixed(1)} MB</span>}
          {stage === 'uploading' && <span className="ml-auto text-sm">Uploading…</span>}
          {stage === 'queued' && <span className="ml-auto text-sm">Queued…</span>}
          {stage === 'processing' && <span className="ml-auto text-sm">Exporting…</span>}
          {stage === 'completed' && <span className="ml-auto text-sm text-green-700">Export ready</span>}
          {stage === 'failed' && <span className="ml-auto text-sm text-red-600">Export failed</span>}
        </div>

        {/* Microcopy line */}
        <p className="mt-3 text-sm text-gray-700">
          {stage === 'empty' && 'Audio or video. Large files are supported and resume if interrupted.'}
          {stage === 'uploading' && 'Uploading to secure storage… You can keep previewing the local file meanwhile.'}
          {stage === 'preparing' && 'Preparing fast preview…'}
          {stage === 'preview' && 'Fast preview is ON. Final export will use studio-grade processing for higher quality.'}
          {stage === 'queued' && 'Export queued — we will start shortly.'}
          {stage === 'processing' && 'Working on it… You can keep previewing while we export.'}
          {stage === 'completed' && 'Export ready — choose what to download.'}
          {stage === 'failed' && (error ? `Export failed — ${error}` : 'Export failed.')}
        </p>

        {/* Simple preview */}
        {objectUrl && (
          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Preview</div>
              <div className="text-xs text-gray-500">{stage === 'preview' ? 'Enhanced (fast preview)' : 'Original'}</div>
            </div>
            <audio controls src={objectUrl} className="mt-2 w-full" />
            <p className="mt-1 text-xs text-gray-500">Note: This is a quick local preview for speed. The export applies high‑quality separation and cleanup.</p>
          </div>
        )}

        {/* Process & Export */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={async () => {
              if (!jobId && file) {
                // in case upload hasn't started
                setStage('uploading');
                return;
              }
              // otherwise nothing to do; submit already triggered after upload
            }}
            disabled={!canExport || isBusy || !file}
            className={`rounded-lg px-4 py-2 text-white ${(!canExport || isBusy || !file) ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {stage === 'preview' ? 'Process & Export' : stage === 'completed' ? 'Export again (change settings first)' : 'Processing…'}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>

      {/* Live activity feed */}
      {!!events.length && (
        <div className="mt-8 rounded-2xl border border-gray-200 p-4">
          <div className="text-sm font-medium mb-2">Export activity</div>
          <ul className="space-y-1 max-h-56 overflow-auto">
            {events.map((ev, idx) => (
              <li key={idx} className="text-sm text-gray-700">
                <span className="text-gray-500 mr-2">{formatTs(ev.ts)}</span>
                {ev.message || JSON.stringify(ev)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Downloads */}
      {stage === 'completed' && !!Object.keys(assets).length && (
        <div className="mt-8 rounded-2xl border border-gray-200 p-4">
          <div className="text-sm font-medium mb-2">Download</div>
          <ul className="space-y-2">
            {Object.entries(assets).map(([label, url]) => (
              <li key={label}>
                <a href={url ?? '#'} target="_blank" rel="noreferrer" className="text-indigo-700 underline">
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">We replace audio on video inputs (same picture, improved audio).</p>
        </div>
      )}
    </div>
  );
}

function formatTs(ts?: string) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString();
  } catch {
    return '';
  }
}
