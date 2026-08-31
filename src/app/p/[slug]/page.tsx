'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { db, LandingSite } from '@/lib/supabaseClient';

export default function PublicLandingPage() {
  const params = useParams();
  const rawSlug = params?.slug as string;
  const slug = rawSlug ? decodeURIComponent(rawSlug) : '';

  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState<LandingSite | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }

    const loadSite = async () => {
      try {
        const sites = await db.getLandingSites('store-1');
        // Match by slug or id or sanitized business_name
        const match = sites.find(s => 
          s.slug?.toLowerCase() === slug.toLowerCase() ||
          s.id.toLowerCase() === slug.toLowerCase() ||
          s.business_name.toLowerCase().replace(/[^a-z0-9]/g, '-') === slug.toLowerCase()
        ) || null;

        if (match) {
          setSite(match);
        }
      } catch (err) {
        console.error('Error fetching landing site:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSite();
  }, [slug]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#080e1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: "'Inter', system-ui, sans-serif"
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.15)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '1rem'
        }} />
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Loading landing page...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!site || !site.html) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#080e1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: "'Inter', system-ui, sans-serif"
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: '1rem',
          background: 'rgba(255,255,255,0.05)',
          width: '80px',
          height: '80px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>🔍</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Landing Page Not Found</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '440px', lineHeight: 1.6, marginBottom: '2rem', fontSize: '0.95rem' }}>
          We could not find a published landing page matching <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{slug}</code>.
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/dashboard/landing-builder" style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
            borderRadius: '50px',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.88rem'
          }}>
            Open Landing Builder →
          </Link>
          <Link href="/" style={{
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50px',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.88rem'
          }}>
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      <iframe
        srcDoc={site.html}
        title={site.business_name}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block'
        }}
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
      />
    </div>
  );
}
