// hooks/useJobSSE.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { JobEvent, JobStatus } from '@/lib/jobsClient';

type SSEState = {
  events: JobEvent[];
  last?: JobEvent;
  status: JobStatus | null;
  outputs: string[];  // URLs if provided by worker logs
  error?: string;
  done: boolean;
};

export function useJobSSE(jobId?: string) : SSEState {
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [outputs, setOutputs] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!jobId) return;
    const url = `/api/jobs/events?id=${encodeURIComponent(jobId)}`;
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as JobEvent;
        setEvents(prev => [...prev, ev]);
        // Infer status & outputs
        const msg = (ev.message || '').toLowerCase();
        if (msg.includes('running')) setStatus('running');
        if (msg.includes('queued')) setStatus('queued');
        if (msg.includes('complete')) setStatus('completed');
        if (msg.includes('fail')) setStatus('failed');
        if (ev?.data?.outputs && Array.isArray(ev.data.outputs)) {
          setOutputs(ev.data.outputs);
        }
      } catch (err) {
        console.error('SSE parse error', err);
      }
    };
    es.onerror = (e) => {
      console.warn('SSE error', e);
      setError('Connection lost. We will stop receiving live updates.');
      if (!doneRef.current) {
        // keep the prior events, UI can poll job row if needed (not implemented here)
      }
      es.close();
    };
    return () => { doneRef.current = true; es.close(); };
  }, [jobId]);

  const last = useMemo(() => events.length ? events[events.length - 1] : undefined, [events]);

  const done = status === 'completed' || status === 'failed';

  return { events, last, status, outputs, error, done };
}
