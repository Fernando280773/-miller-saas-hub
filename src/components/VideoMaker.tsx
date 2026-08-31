'use client';

/**
 * VideoMaker — browser-native product video recorder
 *
 * Browser APIs used (zero dependencies):
 *  getUserMedia  → live camera (front/back, mobile)
 *  MediaRecorder → records stream blob (WebM/MP4)
 *  Web Audio API → plays confirmation beep on stop
 *  URL.createObjectURL → in-memory preview, no upload
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Video, Upload, FlipHorizontal, RotateCcw, Check, Loader } from 'lucide-react';
import { checkVideoDuration } from '../lib/videoDb';

type Mode  = 'record' | 'upload';
type Stage = 'preview' | 'recording' | 'confirm'; // camera stages

const MAX_SEC = 10;

function bestMime() {
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';
}

/** Short confirmation beep via Web Audio API */
function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    setTimeout(() => ctx.close(), 600);
  } catch { /* Audio blocked in some contexts */ }
}

/** SVG countdown ring */
function Ring({ remaining, size = 80 }: { remaining: number; size?: number }) {
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = remaining / MAX_SEC;
  const col  = remaining > 5 ? '#6366f1' : remaining > 3 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={7}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={7}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 0.95s linear, stroke 0.3s' }}/>
    </svg>
  );
}

interface Props {
  onSave:  (blob: Blob) => void;
  onClose: () => void;
}

export default function VideoMaker({ onSave, onClose }: Props) {
  const [mode, setMode]       = useState<Mode>('record');
  const [stage, setStage]     = useState<Stage>('preview');
  const [facing, setFacing]   = useState<'user' | 'environment'>('environment');
  const [countdown, setCdown] = useState(MAX_SEC);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blob, setBlob]       = useState<Blob | null>(null);
  const [camErr, setCamErr]   = useState('');
  const [starting, setStarting] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  const liveRef     = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const tickRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef     = useRef<HTMLInputElement>(null);

  // ── start camera ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCamErr('');
    setStarting(true);
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (liveRef.current) {
        liveRef.current.srcObject = stream;
        await liveRef.current.play().catch(() => {});
      }
    } catch (err) {
      const msg = (err as Error).message;
      setCamErr(msg.includes('denied') || msg.includes('Permission')
        ? 'Camera permission denied. Allow camera access in your browser settings.'
        : `Camera unavailable: ${msg}`);
    } finally {
      setStarting(false);
    }
  }, [facing]);

  useEffect(() => {
    if (mode === 'record' && stage !== 'confirm') {
      // Defer camera start so state updates run in a callback, not
      // synchronously within the effect (react-hooks safe).
      const timer = setTimeout(() => startCamera(), 0);
      return () => {
        clearTimeout(timer);
        streamRef.current?.getTracks().forEach(track => track.stop());
        if (tickRef.current) clearInterval(tickRef.current);
      };
    }
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [mode, facing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── start recording ───────────────────────────────────────────────────────
  const startRec = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mime = bestMime();
    const recorder = new MediaRecorder(streamRef.current, { mimeType: mime, videoBitsPerSecond: 1_500_000 });
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const b = new Blob(chunksRef.current, { type: mime });
      setBlob(b);
      setBlobUrl(URL.createObjectURL(b));
      playBeep();              // ← audio confirmation
      setStage('confirm');
      streamRef.current?.getTracks().forEach(t => t.stop()); // release camera
    };
    recorderRef.current = recorder;
    recorder.start(200);
    setStage('recording');
    setCdown(MAX_SEC);

    let rem = MAX_SEC;
    tickRef.current = setInterval(() => {
      rem -= 1;
      setCdown(rem);
      if (rem <= 0) stopRec();
    }, 1000);
  };

  const stopRec = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  // ── retake ────────────────────────────────────────────────────────────────
  const retake = () => {
    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); setBlob(null); }
    setStage('preview');
    setCdown(MAX_SEC);
    startCamera();
  };

  // ── upload ────────────────────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadErr('');
    try {
      await checkVideoDuration(file, MAX_SEC);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlob(file);
      setBlobUrl(URL.createObjectURL(file));
      setStage('confirm');
      playBeep();
    } catch (err) {
      setUploadErr((err as Error).message);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (blob) { onSave(blob); onClose(); }
  };

  // ── switch mode ───────────────────────────────────────────────────────────
  const switchMode = (m: Mode) => {
    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); setBlob(null); }
    setStage('preview');
    setCdown(MAX_SEC);
    setUploadErr('');
    setMode(m);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content" style={{ maxWidth: '500px', background: '#0b0f19', color: '#f3f4f6' }}>

        {/* Header */}
        <div className="modal-header">
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Video size={18} style={{ color: 'var(--saas-primary)' }} /> Product Video Maker
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Mode tabs — only show when not in confirm stage */}
          {stage !== 'confirm' && (
            <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {(['record', 'upload'] as Mode[]).map((m, i) => (
                <button key={m} onClick={() => switchMode(m)}
                  style={{
                    flex: 1, padding: '0.55rem', border: 'none', cursor: 'pointer',
                    fontSize: '0.85rem', fontWeight: 600,
                    background: mode === m ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color:      mode === m ? 'var(--saas-primary)' : 'var(--saas-text-muted)',
                    borderRight: i === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  }}>
                  {m === 'record' ? <><Video size={14}/> Record from Camera</> : <><Upload size={14}/> Upload Video File</>}
                </button>
              ))}
            </div>
          )}

          {/* ══ RECORD MODE ════════════════════════════════════════════════ */}
          {mode === 'record' && stage !== 'confirm' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>

              {camErr ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', width: '100%', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.85rem' }}>
                  ⚠ {camErr}
                  <br/>
                  <button onClick={startCamera} style={{ marginTop: '0.75rem', background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', color: '#fca5a5', padding: '0.35rem 1rem', cursor: 'pointer', fontSize: '0.82rem' }}>
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  {/* ── Live camera viewport ── */}
                  <div style={{ position: 'relative', width: '100%', maxWidth: 320, aspectRatio: '1/1', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                    {starting && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', zIndex: 3 }}>
                        <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--saas-primary)' }}/>
                      </div>
                    )}

                    <video ref={liveRef} muted playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: facing === 'user' ? 'scaleX(-1)' : 'none' }}/>

                    {/* REC badge */}
                    {stage === 'recording' && (
                      <div style={{ position: 'absolute', top: 10, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.9)', borderRadius: 20, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, zIndex: 2 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }}/> REC
                      </div>
                    )}

                    {/* Countdown ring — centre overlay */}
                    {stage === 'recording' && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Ring remaining={countdown}/>
                          <span style={{ position: 'absolute', fontSize: '1.6rem', fontWeight: 800, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                            {countdown}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Flip camera button */}
                    <button onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')}
                      disabled={stage === 'recording'}
                      style={{ position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: stage === 'recording' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: stage === 'recording' ? 0.3 : 1, zIndex: 2 }}
                      title="Flip camera">
                      <FlipHorizontal size={15}/>
                    </button>
                  </div>

                  {/* ── BIG record / stop buttons ── */}
                  {stage === 'preview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <button onClick={startRec} disabled={starting || !!camErr}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          padding: '0.85rem 2.5rem', borderRadius: 50,
                          background: '#ef4444', border: '4px solid rgba(255,255,255,0.25)',
                          color: '#fff', fontWeight: 800, fontSize: '1rem',
                          cursor: starting ? 'not-allowed' : 'pointer',
                          boxShadow: '0 0 0 6px rgba(239,68,68,0.2)',
                          opacity: starting ? 0.5 : 1,
                          letterSpacing: '0.02em',
                        }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff' }}/>
                        START RECORDING
                      </button>
                      <span style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)' }}>Auto-stops after {MAX_SEC} seconds</span>
                    </div>
                  )}

                  {stage === 'recording' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <button onClick={stopRec}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          padding: '0.85rem 2.5rem', borderRadius: 50,
                          background: '#1f2937', border: '4px solid rgba(239,68,68,0.5)',
                          color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
                          boxShadow: '0 0 0 6px rgba(239,68,68,0.1)',
                          letterSpacing: '0.02em',
                        }}>
                        <div style={{ width: 14, height: 14, borderRadius: 3, background: '#ef4444' }}/>
                        STOP RECORDING
                      </button>
                      <span style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)' }}>Recording… {countdown}s left</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══ UPLOAD MODE ════════════════════════════════════════════════ */}
          {mode === 'upload' && stage !== 'confirm' && (
            <div>
              <div onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed rgba(99,102,241,0.35)', borderRadius: 'var(--radius-md)',
                  padding: '3rem 1rem', textAlign: 'center', cursor: 'pointer',
                  background: 'rgba(99,102,241,0.04)', transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--saas-primary)'; e.currentTarget.style.background = 'rgba(99,102,241,0.09)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
              >
                <Upload size={32} style={{ color: 'var(--saas-primary)', opacity: 0.7, display: 'block', margin: '0 auto 0.75rem' }}/>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.3rem' }}>Tap to choose video</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--saas-text-muted)' }}>MP4 · MOV · WebM — max 10 seconds</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)', marginTop: '0.2rem' }}>Works from your phone camera roll</div>
              </div>
              <input ref={fileRef} type="file" accept="video/*" capture="environment" onChange={handleFile} style={{ display: 'none' }}/>
              {uploadErr && <p style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: '0.6rem' }}>⚠ {uploadErr}</p>}
            </div>
          )}

          {/* ══ CONFIRM STAGE ══════════════════════════════════════════════ */}
          {stage === 'confirm' && blobUrl && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>

              {/* Success header */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>🎬</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--saas-success)' }}>Clip recorded!</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--saas-text-muted)', marginTop: '0.2rem' }}>Preview your clip, then choose below.</div>
              </div>

              {/* Preview player */}
              <div style={{ width: '100%', maxWidth: 320, aspectRatio: '1/1', borderRadius: 12, overflow: 'hidden', background: '#000', border: '2px solid rgba(99,102,241,0.3)' }}>
                <video src={blobUrl} muted autoPlay loop playsInline controls
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
              </div>

              {/* Action buttons — large and clear */}
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                <button onClick={mode === 'record' ? retake : () => { if (blobUrl) URL.revokeObjectURL(blobUrl); setBlobUrl(null); setBlob(null); setStage('preview'); }}
                  style={{
                    flex: 1, padding: '0.85rem', borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f3f4f6', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  }}>
                  <RotateCcw size={16}/> {mode === 'record' ? 'Retake' : 'Choose different'}
                </button>
                <button onClick={handleSave}
                  style={{
                    flex: 1, padding: '0.85rem', borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, var(--saas-primary), var(--saas-secondary))',
                    border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                  }}>
                  <Check size={16}/> Use this clip
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer — only when not in confirm (confirm has its own buttons) */}
        {stage !== 'confirm' && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
