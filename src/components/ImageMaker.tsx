'use client';

/**
 * ImageMaker — browser-native image enhancer.
 *
 * Pipeline (all Canvas / typed arrays, zero network):
 *  1. createImageBitmap()        — hardware-decoded, fastest path
 *  2. Canvas 600×600 contain-fit — aspect-ratio preserved, clean background
 *  3. ctx.filter contrast+saturation — hardware-accelerated colour lift
 *  4. Unsharp mask (blur-subtract) — removes softness / camera blur
 *  5. Store logo badge in corner  — branding watermark
 *  6. canvas.toBlob(JPEG 85%)    — compact, sharp output blob → IndexedDB
 */

import React, { useCallback, useRef, useState } from 'react';
import { Upload, Camera, Check, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface Props {
  storeLogo: string;   // emoji shown in corner badge
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

type Stage = 'idle' | 'processing' | 'confirm';

const OUTPUT_SIZE = 600; // square canvas px

// ── Unsharp mask via blur-subtract ─────────────────────────────────────────
function unsharpMask(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount = 0.45,       // 0–1 sharpening strength
  blurRadius = 1.2,    // px
): void {
  // Step 1: grab original pixels
  const original = ctx.getImageData(0, 0, width, height);

  // Step 2: draw blurred copy
  ctx.filter = `blur(${blurRadius}px)`;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = 'none';
  const blurred = ctx.getImageData(0, 0, width, height);

  // Step 3: restore original, then blend: out = orig + amount*(orig - blur)
  const o = original.data;
  const b = blurred.data;
  const out = new Uint8ClampedArray(o.length);

  for (let i = 0; i < o.length; i += 4) {
    out[i]   = Math.min(255, Math.max(0, o[i]   + amount * (o[i]   - b[i])));
    out[i+1] = Math.min(255, Math.max(0, o[i+1] + amount * (o[i+1] - b[i+1])));
    out[i+2] = Math.min(255, Math.max(0, o[i+2] + amount * (o[i+2] - b[i+2])));
    out[i+3] = o[i+3]; // preserve alpha
  }

  ctx.putImageData(new ImageData(out, width, height), 0, 0);
}

// ── Core processing function ────────────────────────────────────────────────
async function processImage(file: File, storeLogo: string): Promise<Blob> {
  const S = OUTPUT_SIZE;

  // Decode image (fastest browser path)
  const bmp = await createImageBitmap(file, { resizeQuality: 'high' });

  const canvas = document.createElement('canvas');
  canvas.width  = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  // Clean neutral background (light grey — looks professional)
  ctx.fillStyle = '#f2f2f4';
  ctx.fillRect(0, 0, S, S);

  // Contain-fit: scale to fill max area while preserving aspect ratio
  const scale = Math.min(S / bmp.width, S / bmp.height) * 0.96; // tiny margin
  const w = bmp.width  * scale;
  const h = bmp.height * scale;
  const x = (S - w) / 2;
  const y = (S - h) / 2;

  // Draw with colour enhancement filter
  ctx.filter = 'contrast(1.08) saturate(1.12) brightness(1.02)';
  ctx.drawImage(bmp, x, y, w, h);
  ctx.filter = 'none';

  // Unsharp mask — removes blur / softens
  unsharpMask(ctx, S, S, 0.45, 1.2);

  // Logo watermark badge — bottom-right corner
  if (storeLogo) {
    const pad    = 10;
    const bw     = 44;
    const bh     = 26;
    const bx     = S - bw - pad;
    const by     = S - bh - pad;
    const radius = 7;

    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle   = 'rgba(10,10,20,0.75)';
    ctx.beginPath();
    ctx.moveTo(bx + radius, by);
    ctx.lineTo(bx + bw - radius, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius);
    ctx.lineTo(bx + bw, by + bh - radius);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh);
    ctx.lineTo(bx + radius, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius);
    ctx.lineTo(bx, by + radius);
    ctx.quadraticCurveTo(bx, by, bx + radius, by);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha  = 1;
    ctx.font         = '15px serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(storeLogo, bx + bw / 2, by + bh / 2);
    ctx.restore();
  }

  bmp.close(); // free GPU texture

  return new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas export failed')), 'image/jpeg', 0.85)
  );
}

// ── Component ───────────────────────────────────────────────────────────────
export default function ImageMaker({ storeLogo, onSave, onClose }: Props) {
  const [stage, setStage]           = useState<Stage>('idle');
  const [error, setError]           = useState('');
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [showBefore, setShowBefore] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Release old blob URLs on unmount
  const prevOrigRef    = useRef<string | null>(null);
  const prevProcessRef = useRef<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WebP, etc.)');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Image too large — max 20 MB');
      return;
    }

    setError('');
    setStage('processing');

    // Show original preview
    if (prevOrigRef.current) URL.revokeObjectURL(prevOrigRef.current);
    const origUrl = URL.createObjectURL(file);
    prevOrigRef.current = origUrl;
    setOriginalSrc(origUrl);

    try {
      const blob = await processImage(file, storeLogo);

      if (prevProcessRef.current) URL.revokeObjectURL(prevProcessRef.current);
      const procUrl = URL.createObjectURL(blob);
      prevProcessRef.current = procUrl;

      setProcessedBlob(blob);
      setProcessedSrc(procUrl);
      setStage('confirm');
    } catch (err) {
      setError('Processing failed: ' + (err as Error).message);
      setStage('idle');
    }
  }, [storeLogo]);

  // Drag and drop
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleUse = () => {
    if (processedBlob) onSave(processedBlob);
  };

  const handleRetake = () => {
    setStage('idle');
    setProcessedBlob(null);
  };

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 2000 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-content"
        style={{ maxWidth: 520, background: '#0b0f19', color: '#f3f4f6', borderRadius: 16 }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            <ImageIcon size={18} style={{ color: 'var(--saas-primary)' }} />
            Product Image Maker
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}
          >
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>

          {/* ── IDLE ── */}
          {stage === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--saas-text-muted)', margin: 0 }}>
                Upload or take a photo. Auto-enhance removes blur, lifts colour, and adds your store badge.
              </p>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--saas-primary)' : 'rgba(99,102,241,0.35)'}`,
                  borderRadius: 12,
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragging ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.03)',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                <Upload size={28} style={{ color: 'var(--saas-primary)', opacity: 0.7, marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  Drop image here or click to browse
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)' }}>
                  JPG · PNG · WebP · HEIC — max 20 MB
                </div>
              </div>

              {/* Camera / Take Photo button */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(99,102,241,0.3)',
                  borderRadius: 12,
                  padding: '0.9rem',
                  background: 'rgba(99,102,241,0.04)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  color: 'var(--saas-primary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  transition: 'border-color 0.2s, background 0.2s',
                  width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--saas-primary)'; e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
              >
                <Camera size={18} />
                Take Photo from Camera
              </button>

              {/* What gets applied */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Auto-enhancement applied:</div>
                {[
                  ['✂️', 'Smart resize to 600×600 (aspect-ratio preserved)'],
                  ['🔆', 'Contrast + saturation lift'],
                  ['🔍', 'Unsharp mask — removes blur, sharpens detail'],
                  ['🏪', `Store badge (${storeLogo}) added to corner`],
                ].map(([icon, text]) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--saas-text-secondary)' }}>
                    <span>{icon}</span><span>{text}</span>
                  </div>
                ))}
              </div>

              {error && <p style={{ color: '#fca5a5', fontSize: '0.8rem', margin: 0 }}>⚠ {error}</p>}
            </div>
          )}

          {/* ── PROCESSING ── */}
          {stage === 'processing' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem 0' }}>
              {/* Spinner */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                border: '3px solid rgba(99,102,241,0.2)',
                borderTop: '3px solid var(--saas-primary)',
                animation: 'spin 0.8s linear infinite',
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Enhancing image…</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--saas-text-muted)' }}>Sharpening · colour lift · adding store badge</div>
              </div>
            </div>
          )}

          {/* ── CONFIRM ── */}
          {stage === 'confirm' && processedSrc && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>✨ Image enhanced!</span>
                {/* Before/after toggle */}
                <button
                  type="button"
                  onClick={() => setShowBefore(b => !b)}
                  style={{
                    background: 'rgba(255,255,255,0.07)', border: 'none',
                    borderRadius: 8, padding: '0.3rem 0.8rem',
                    color: '#f3f4f6', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  {showBefore ? 'Show Enhanced' : 'Show Original'}
                </button>
              </div>

              {/* Image preview */}
              <div style={{
                borderRadius: 12, overflow: 'hidden',
                background: '#000',
                aspectRatio: '1/1',
                maxHeight: 300,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- in-memory object-URL preview */}
                <img
                  src={showBefore ? (originalSrc ?? processedSrc) : processedSrc}
                  alt="preview"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  background: 'rgba(0,0,0,0.55)', borderRadius: 6,
                  padding: '2px 8px', fontSize: '0.7rem', color: '#fff', fontWeight: 700,
                }}>
                  {showBefore ? 'ORIGINAL' : 'ENHANCED'}
                </div>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', margin: 0, textAlign: 'center' }}>
                Stored in browser · no server upload · loads instantly
              </p>

              {error && <p style={{ color: '#fca5a5', fontSize: '0.8rem', margin: 0 }}>⚠ {error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          {stage === 'idle' && (
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          )}
          {stage === 'confirm' && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRetake}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={14} /> Try Different
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleUse}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Check size={14} /> Use this image
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onFileInput}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={onFileInput}
      />
    </div>
  );
}
