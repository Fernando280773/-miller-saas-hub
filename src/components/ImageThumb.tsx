'use client';

/**
 * ImageThumb — IntersectionObserver lazy-load from IndexedDB.
 *
 * Technology stack (all pure browser, zero network):
 *  • IntersectionObserver  — only activates when row enters viewport
 *  • IndexedDB             — local binary blob storage (imageDb.ts)
 *  • URL.createObjectURL   — in-memory Blob URL, revoked on unmount
 *  • <img>                 — static image display
 *
 * Falls back to fallbackEmoji if no image stored.
 */

import React, { useEffect, useRef, useState } from 'react';
import { getProductImage } from '../lib/imageDb';

interface Props {
  productId: string;
  fallbackEmoji: string;
  size?: number;
}

export default function ImageThumb({ productId, fallbackEmoji, size = 48 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [src, setSrc]         = useState<string | null>(null);
  const [hasImage, setHasImage] = useState(false);

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
          const blob = await getProductImage(productId);
          if (blob) {
            const url = URL.createObjectURL(blob);
            objectUrlRef.current = url;
            setSrc(url);
            setHasImage(true);
          }
        } catch {
          /* no image stored — emoji stays */
        }
      },
      { rootMargin: '120px' }
    );

    io.observe(container);

    return () => {
      io.disconnect();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [productId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: size, height: size,
        borderRadius: 8, overflow: 'hidden',
        position: 'relative', flexShrink: 0,
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      {/* Emoji fallback — fades out when image ready */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.55,
        opacity: hasImage ? 0 : 1,
        transition: 'opacity 0.4s',
        pointerEvents: 'none',
      }}>
        {fallbackEmoji}
      </div>

      {/* Image — fades in when loaded */}
      {src && (
        <img
          src={src}
          alt="product"
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            opacity: hasImage ? 1 : 0,
            transition: 'opacity 0.4s',
          }}
        />
      )}

      {/* "📸" badge when image present */}
      {hasImage && (
        <div style={{
          position: 'absolute', bottom: 2, right: 2,
          fontSize: 9, background: 'rgba(0,0,0,0.55)',
          color: '#fff', borderRadius: 3, padding: '0 3px', lineHeight: '14px',
          fontWeight: 700,
        }}>
          📸
        </div>
      )}
    </div>
  );
}
