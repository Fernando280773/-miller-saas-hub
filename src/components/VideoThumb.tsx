'use client';

/**
 * VideoThumb — IntersectionObserver lazy-load from IndexedDB.
 *
 * Technology stack (all pure browser, zero network):
 *  • IntersectionObserver  — only activates when row enters viewport
 *  • IndexedDB             — local binary blob storage (videoDb.ts)
 *  • URL.createObjectURL   — in-memory Blob URL, revoked on unmount
 *  • <video muted loop>    — silent autoplay, hardware-decoded
 */

import React, { useEffect, useRef, useState } from 'react';
import { getProductVideo } from '../lib/videoDb';

interface Props {
  productId: string;
  fallbackEmoji: string;
  size?: number;
}

export default function VideoThumb({ productId, fallbackEmoji, size = 48 }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const videoRef      = useRef<HTMLVideoElement>(null);
  const objectUrlRef  = useRef<string | null>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let triggered = false;

    const io = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || triggered) return;
        triggered = true;
        io.disconnect();

        try {
          const blob = await getProductVideo(productId);
          if (blob && videoRef.current) {
            const url = URL.createObjectURL(blob);
            objectUrlRef.current = url;
            videoRef.current.src = url;
            setHasVideo(true);
            // play() returns promise — swallow AbortError on fast unmount
            videoRef.current.play().catch(() => {});
          }
        } catch {
          /* no video stored for this product — emoji stays */
        }
      },
      { rootMargin: '120px' } // pre-load slightly before visible
    );

    io.observe(container);

    return () => {
      io.disconnect();
      // Revoke blob URL to free memory
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [productId]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size, borderRadius: 8, overflow: 'hidden', position: 'relative', flexShrink: 0, background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Emoji fallback — fades out when video ready */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.55,
        opacity: hasVideo ? 0 : 1,
        transition: 'opacity 0.5s',
        pointerEvents: 'none',
      }}>
        {fallbackEmoji}
      </div>

      {/* Video — always in DOM so ref stable; src set lazily */}
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="none"
        style={{
          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
          opacity: hasVideo ? 1 : 0,
          transition: 'opacity 0.5s',
        }}
      />

      {/* "🎬" badge when video present */}
      {hasVideo && (
        <div style={{
          position: 'absolute', bottom: 2, right: 2,
          fontSize: 9, background: 'rgba(0,0,0,0.55)',
          color: '#fff', borderRadius: 3, padding: '0 3px', lineHeight: '14px',
          fontWeight: 700, letterSpacing: '0.02em',
        }}>
          🎬
        </div>
      )}
    </div>
  );
}
