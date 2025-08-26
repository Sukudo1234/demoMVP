// lib/jobsClient.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';

export type InitUpload = { path: string; token: string };

export async function initEnhanceJob(fileNames: string[]): Promise<{ job_id: string; uploads: InitUpload[] }> {
  const res = await fetch('/api/jobs/enhance/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: fileNames }),
  });
  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(`init failed: ${msg}`);
  }
  const json = await res.json();
  if (!json?.job_id || !Array.isArray(json?.uploads)) {
    throw new Error('init failed: malformed response');
  }
  return json as { job_id: string; uploads: InitUpload[] };
}

export async function uploadToSignedUrl(path: string, token: string, file: File): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const supa = createClient(url, anon);
  const { error } = await supa.storage.from('inputs').uploadToSignedUrl(path, token, file);
  if (error) throw error;
}

export async function submitJob(job_id: string, paths: string[]): Promise<void> {
  const res = await fetch('/api/jobs/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id, paths }),
  });
  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(`submit failed: ${msg}`);
  }
}

export async function signAsset(job_id: string, file: string): Promise<string | null> {
  const u = new URL('/api/jobs/asset', window.location.origin);
  u.searchParams.set('id', job_id);
  u.searchParams.set('file', file);
  const res = await fetch(u.toString());
  if (!res.ok) return null;
  try {
    const j = await res.json();
    return j?.url ?? null;
  } catch {
    return null;
  }
}

async function safeText(res: Response): Promise<string> {
  try { return await res.text(); } catch { return String(res.status); }
}

export type JobEvent = {
  id?: number;
  job_id?: string;
  ts?: string;
  level?: 'info' | 'warn' | 'error';
  message?: string;
  data?: any;
};

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export function friendlyStageFromEvent(ev?: JobEvent): string | null {
  if (!ev) return null;
  const m = (ev.message || '').toLowerCase();
  if (m.includes('separat')) return 'Separating vocals & background';
  if (m.includes('denoise') || m.includes('clean') || m.includes('de-ess')) return 'Cleaning voice';
  if (m.includes('loud') || m.includes('lufs')) return 'Balancing loudness';
  if (m.includes('render') || m.includes('upload')) return 'Rendering files';
  if (m.includes('complete')) return 'Completed';
  if (m.includes('fail') || ev.level === 'error') return 'Failed';
  return null;
}
