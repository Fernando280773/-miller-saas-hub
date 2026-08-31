"use client";

import React, { useState, useEffect, useRef } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { db, Store } from '../../../lib/supabaseClient';
import type { ScrapedProduct } from '../../api/scrape/route';
import {
  Bot, Search, Download, Check, AlertTriangle,
  Loader, Trash2, ImageOff,
  LayoutGrid, List, DollarSign, Package, Link2, PenLine, Plus, Camera, Upload
} from 'lucide-react';

type PageTab = 'scrape' | 'manual' | 'image';

interface EditableRow extends ScrapedProduct {
  _id: string;
  selected: boolean;
  imported: boolean;
  editing: boolean;
}

const EMOJI_BY_CATEGORY: Record<string, string> = {
  'bubble tea': '🧋', 'beverage': '🥤', 'drink': '🍵', 'coffee': '☕',
  'food': '🍱', 'cake': '🎂', 'dessert': '🍰', 'snack': '🍿',
  'electronics': '💻', 'fashion': '👕', 'clothing': '👗',
  'furniture': '🛋️', 'beauty': '💄', 'general': '🛍️',
};
function guessEmoji(cat: string) {
  const l = cat.toLowerCase();
  for (const [k, e] of Object.entries(EMOJI_BY_CATEGORY)) if (l.includes(k)) return e;
  return '🛍️';
}
function parsePrice(raw: string): number {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}
function fmtPrice(raw: string) {
  return raw || '—';
}

const RECENT_KEY = 'scraper_recent_urls';
function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function saveRecent(url: string) {
  if (typeof window === 'undefined') return;
  const prev = loadRecent().filter(u => u !== url);
  localStorage.setItem(RECENT_KEY, JSON.stringify([url, ...prev].slice(0, 6)));
}

type ViewMode = 'cards' | 'table';

export default function ScraperPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [recentUrls, setRecentUrls] = useState<string[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('cards');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<PageTab>('scrape');

  const [manual, setManual] = useState({ name: '', description: '', price: '', category: '', image: '' });
  const [manualRows, setManualRows] = useState<EditableRow[]>([]);
  const [imgUrl, setImgUrl] = useState('');
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [imgAnalyzing, setImgAnalyzing] = useState(false);
  const [imgRows, setImgRows] = useState<EditableRow[]>([]);
  const [imgError, setImgError] = useState<string | null>(null);
  const [imgRaw, setImgRaw] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const allStores = await db.getStores();
      let current = allStores[0];
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('active_store_id');
        if (saved) current = allStores.find(s => s.id === saved) || allStores[0];
      }
      setStore(current || null);
      setRecentUrls(loadRecent());
      setLoading(false);
    };
    load();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = url.trim();
    if (!target) return;
    setScraping(true);
    setError(null);
    setRows([]);
    setSource(null);
    setShowRecent(false);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Scrape failed.');
        if (json.blocked) { setTab('manual'); }
      } else {
        setSource(json.source);
        saveRecent(target);
        setRecentUrls(loadRecent());
        const mapped = (json.products as ScrapedProduct[]).map((p, i) => ({
          ...p,
          _id: `r${i}-${Date.now()}`,
          selected: true,
          imported: false,
          editing: false,
        }));
        setRows(mapped);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
    } finally {
      setScraping(false);
    }
  };

  const update = (id: string, field: keyof ScrapedProduct, val: string) =>
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: val } : r));

  const toggleSelect = (id: string) =>
    setRows(prev => prev.map(r => r._id === id ? { ...r, selected: !r.selected } : r));

  const toggleAll = (val: boolean) =>
    setRows(prev => prev.map(r => ({ ...r, selected: val })));

  const deleteRow = (id: string) =>
    setRows(prev => prev.filter(r => r._id !== id));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
    setImgUrl('');
  };

  const handleImgUrlChange = (u: string) => {
    setImgUrl(u);
    setImgFile(null);
    setImgPreview(u || null);
  };

  const analyzeImage = async () => {
    setImgAnalyzing(true);
    setImgError(null);
    setImgRows([]);
    setImgRaw(null);
    try {
      let res: Response;
      if (imgFile) {
        const form = new FormData();
        form.append('image', imgFile);
        res = await fetch('/api/analyze-image', { method: 'POST', body: form });
      } else if (imgUrl.trim()) {
        res = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: imgUrl.trim() }),
        });
      } else return;

      const json = await res.json();
      if (!res.ok || json.error) {
        setImgError(json.error || 'Analysis failed.');
      } else {
        setImgRaw(json.raw);
        setImgRows((json.products as ScrapedProduct[]).map((p, i) => ({
          ...p,
          _id: `img-${i}-${Date.now()}`,
          selected: true,
          imported: false,
          editing: false,
        })));
        if (json.products.length === 0) setImgError('No menu items detected. Try a clearer image.');
      }
    } catch (err) {
      setImgError(`Error: ${(err as Error).message}`);
    } finally {
      setImgAnalyzing(false);
    }
  };

  const importImgRows = async () => {
    if (!store) return;
    const toImport = imgRows.filter(r => r.selected && !r.imported);
    if (!toImport.length) return;
    for (const row of toImport) {
      await db.addProduct({
        store_id: store.id,
        name: row.name,
        description: row.description,
        price: parsePrice(row.price),
        category: row.category || 'Menu',
        stock: 0,
        image: guessEmoji(row.category),
        image_url: row.image || undefined,
      });
      setImgRows(prev => prev.map(r => r._id === row._id ? { ...r, imported: true, selected: false } : r));
    }
    showToast(`${toImport.length} product${toImport.length > 1 ? 's' : ''} imported!`);
  };

  const addManualRow = () => {
    if (!manual.name.trim()) return;
    const newRow: EditableRow = {
      _id: `manual-${Date.now()}`,
      name: manual.name.trim(),
      description: manual.description.trim(),
      price: manual.price.trim(),
      category: manual.category.trim() || 'General',
      image: manual.image.trim(),
      source_url: 'manual',
      selected: true,
      imported: false,
      editing: false,
    };
    setManualRows(prev => [...prev, newRow]);
    setManual({ name: '', description: '', price: '', category: '', image: '' });
  };

  const importManual = async () => {
    if (!store) return;
    const toImport = manualRows.filter(r => r.selected && !r.imported);
    if (!toImport.length) return;
    for (const row of toImport) {
      await db.addProduct({
        store_id: store.id,
        name: row.name,
        description: row.description,
        price: parsePrice(row.price),
        category: row.category || 'General',
        stock: 0,
        image: guessEmoji(row.category),
        image_url: row.image || undefined,
      });
      setManualRows(prev => prev.map(r => r._id === row._id ? { ...r, imported: true, selected: false } : r));
    }
    showToast(`${toImport.length} product${toImport.length > 1 ? 's' : ''} imported!`);
  };

  const importSelected = async () => {
    if (!store) return;
    const toImport = rows.filter(r => r.selected && !r.imported);
    if (!toImport.length) return;
    const ids = new Set(toImport.map(r => r._id));
    setImportingIds(ids);
    let count = 0;
    for (const row of toImport) {
      await db.addProduct({
        store_id: store.id,
        name: row.name,
        description: row.description,
        price: parsePrice(row.price),
        category: row.category || 'General',
        stock: 0,
        image: guessEmoji(row.category),
        image_url: row.image || undefined,
      });
      count++;
      setRows(prev => prev.map(r => r._id === row._id ? { ...r, imported: true, selected: false } : r));
    }
    setImportingIds(new Set());
    showToast(`✓ ${count} product${count > 1 ? 's' : ''} imported to catalog!`);
  };

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#9ca3af' }}>
      <Loader size={20} style={{ animation: 'spin 1s linear infinite', marginRight: '0.6rem' }} /> Loading...
    </div>
  );
  if (!store) return null;

  const selectedCount = rows.filter(r => r.selected && !r.imported).length;
  const allSelected = rows.length > 0 && rows.filter(r => !r.imported).every(r => r.selected);
  const withImages = rows.filter(r => r.image).length;
  const avgPrice = rows.length > 0
    ? (rows.reduce((s, r) => s + parsePrice(r.price), 0) / rows.length).toFixed(2)
    : null;

  return (
    <div className="dashboard-layout">
      <DashboardSidebar storeName={store.name} storeLogo={store.logo_text} />

      <main className="dashboard-content" style={{ paddingBottom: selectedCount > 0 ? '5rem' : undefined }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Bot size={24} style={{ color: 'var(--saas-primary)' }} /> AI Product Scraper
            </h1>
            <p style={{ color: 'var(--saas-text-secondary)', fontSize: '0.85rem' }}>
              Scrape any product page — or manually add items for protected sites (Just Eat, Uber Eats, etc.)
            </p>
          </div>
          {/* Tab switcher */}
          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {([['scrape', '🔍 AI Scrape'], ['image', '📷 Menu Image'], ['manual', '✏️ Manual Entry']] as [PageTab, string][]).map(([t, label], i, arr) => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding: '0.5rem 1rem', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                  background: tab === t ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: tab === t ? 'var(--saas-primary)' : 'var(--saas-text-muted)',
                  borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── URL Input card ── */}
        {tab === 'scrape' && <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.75rem', position: 'relative' }}>
          <form onSubmit={handleScrape}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'stretch' }}>
              {/* URL field wrapper */}
              <div style={{ flexGrow: 1, position: 'relative' }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}>
                  <Link2 size={15} style={{ marginLeft: '0.9rem', color: 'var(--saas-text-muted)', flexShrink: 0 }} />
                  <input
                    type="url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onFocus={() => setShowRecent(true)}
                    onBlur={() => setTimeout(() => setShowRecent(false), 150)}
                    placeholder="https://competitor-shop.com/products  or  menu URL"
                    required
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      padding: '0.75rem 0.9rem', color: '#f3f4f6', fontSize: '0.9rem',
                    }}
                  />
                  {url && (
                    <button type="button" onClick={() => setUrl('')}
                      style={{ background: 'none', border: 'none', color: 'var(--saas-text-muted)', padding: '0 0.75rem', cursor: 'pointer', fontSize: '1.1rem' }}>
                      ×
                    </button>
                  )}
                </div>

                {/* Recent URLs dropdown */}
                {showRecent && recentUrls.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 50,
                    background: '#12172a', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-md)', overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}>
                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', color: 'var(--saas-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent</div>
                    {recentUrls.map(u => (
                      <button key={u} type="button" onMouseDown={() => setUrl(u)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          width: '100%', padding: '0.55rem 0.75rem', background: 'transparent',
                          border: 'none', color: 'var(--saas-text-secondary)', cursor: 'pointer',
                          fontSize: '0.8rem', textAlign: 'left',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Link2 size={11} style={{ flexShrink: 0, opacity: 0.5 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={scraping}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0 1.5rem', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--saas-primary), var(--saas-secondary))',
                  border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  cursor: scraping ? 'not-allowed' : 'pointer', opacity: scraping ? 0.75 : 1,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                {scraping
                  ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Scraping...</>
                  : <><Search size={15} /> Scrape Products</>}
              </button>
            </div>
          </form>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.875rem' }}>
            {['Shopify', 'WooCommerce', 'Amazon', 'Etsy', 'Any website (no bot protection)'].map(s => (
              <span key={s} style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--saas-text-muted)', background: 'rgba(255,255,255,0.02)' }}>{s}</span>
            ))}
            <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', borderRadius: '999px', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.7)', background: 'rgba(239,68,68,0.04)' }}>
              ⚠️ Just Eat / Uber Eats → use Manual tab
            </span>
          </div>
        </div>}

        {/* ── Manual Entry Panel ── */}
        {tab === 'manual' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Info banner */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.875rem 1.25rem', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--saas-text-secondary)' }}>
              <PenLine size={15} style={{ flexShrink: 0, marginTop: '0.1rem', color: 'var(--saas-primary)' }} />
              <span>Just Eat, Uber Eats and Deliveroo use Cloudflare bot protection — AI scraping is blocked. Add your menu items here manually, then import to catalog in one click.</span>
            </div>

            {/* Add form */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>Add Product</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label className="form-label">Product Name *</label>
                  <input className="form-control" value={manual.name} onChange={e => setManual(m => ({ ...m, name: e.target.value }))} placeholder="e.g. Mango Tango Latte" />
                </div>
                <div>
                  <label className="form-label">Price</label>
                  <input className="form-control" value={manual.price} onChange={e => setManual(m => ({ ...m, price: e.target.value }))} placeholder="£4.99" />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <input className="form-control" value={manual.category} onChange={e => setManual(m => ({ ...m, category: e.target.value }))} placeholder="Bubble Tea, Coffee, Food..." />
                </div>
                <div>
                  <label className="form-label">Image URL (optional)</label>
                  <input className="form-control" value={manual.image} onChange={e => setManual(m => ({ ...m, image: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Description (optional)</label>
                <textarea className="form-control" value={manual.description} onChange={e => setManual(m => ({ ...m, description: e.target.value }))} rows={2} placeholder="Short product description..." style={{ resize: 'none' }} />
              </div>
              <button onClick={addManualRow} disabled={!manual.name.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.25rem', background: 'var(--saas-primary)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: manual.name.trim() ? 'pointer' : 'not-allowed', opacity: manual.name.trim() ? 1 : 0.5 }}>
                <Plus size={14} /> Add to List
              </button>
            </div>

            {/* Manual rows */}
            {manualRows.length > 0 && (
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)' }}>{manualRows.length} item{manualRows.length > 1 ? 's' : ''} ready</h3>
                  <button onClick={importManual} disabled={manualRows.filter(r => r.selected && !r.imported).length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', background: 'linear-gradient(135deg, var(--saas-primary), var(--saas-secondary))', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <Download size={13} /> Import {manualRows.filter(r => r.selected && !r.imported).length} to Catalog
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {manualRows.map(row => (
                    <div key={row._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: row.imported ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${row.imported ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 'var(--radius-sm)' }}>
                      <input type="checkbox" checked={row.selected} onChange={() => setManualRows(prev => prev.map(r => r._id === row._id ? { ...r, selected: !r.selected } : r))} disabled={row.imported} />
                      <span style={{ fontSize: '1.3rem' }}>{guessEmoji(row.category)}</span>
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f3f4f6' }}>{row.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)' }}>{row.category}{row.description ? ` · ${row.description.slice(0, 60)}` : ''}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--saas-primary)', fontSize: '0.9rem', flexShrink: 0 }}>{row.price || '—'}</span>
                      {row.imported
                        ? <span style={{ fontSize: '0.72rem', color: 'var(--saas-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Check size={11} /> Done</span>
                        : <button onClick={() => setManualRows(prev => prev.filter(r => r._id !== row._id))} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer' }}><Trash2 size={13} /></button>
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Image Analysis Tab ── */}
        {tab === 'image' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.875rem 1.25rem', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--saas-text-secondary)' }}>
              <Camera size={15} style={{ flexShrink: 0, marginTop: '0.1rem', color: 'var(--saas-primary)' }} />
              <span>Upload a photo of a menu board, price list, or product sheet — AI reads every item and price automatically. Works with photos from Facebook, WhatsApp, or your camera.</span>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {/* File upload drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    flex: '1 1 200px', minHeight: '160px', border: '2px dashed rgba(99,102,241,0.3)',
                    borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    cursor: 'pointer', background: 'rgba(99,102,241,0.04)', transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--saas-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)')}
                >
                  <Upload size={24} style={{ color: 'var(--saas-primary)', opacity: 0.6 }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--saas-text-secondary)' }}>Click to upload image</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)' }}>JPG, PNG, WEBP</span>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                </div>

                {/* OR image URL */}
                <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                  <label className="form-label">Or paste image URL</label>
                  <input className="form-control" type="url" value={imgUrl}
                    onChange={e => handleImgUrlChange(e.target.value)}
                    placeholder="https://example.com/menu.jpg" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)' }}>Must be a direct image link (not a Facebook page)</span>
                </div>
              </div>

              {/* Image preview */}
              {imgPreview && (
                <div style={{ marginBottom: '1rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '300px', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgPreview} alt="menu preview" style={{ maxHeight: '300px', objectFit: 'contain' }}
                    onError={() => setImgError('Cannot preview image — it may be private or protected.')} />
                </div>
              )}

              <button onClick={analyzeImage} disabled={imgAnalyzing || (!imgFile && !imgUrl.trim())}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.65rem 1.5rem', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--saas-primary), var(--saas-secondary))',
                  border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  cursor: (!imgFile && !imgUrl.trim()) || imgAnalyzing ? 'not-allowed' : 'pointer',
                  opacity: (!imgFile && !imgUrl.trim()) ? 0.5 : 1,
                }}>
                {imgAnalyzing
                  ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Reading menu...</>
                  : <><Camera size={15} /> Analyze Menu Image</>}
              </button>
            </div>

            {/* Error */}
            {imgError && (
              <div style={{ display: 'flex', gap: '0.5rem', padding: '0.875rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '0.875rem' }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {imgError}
              </div>
            )}

            {/* Results */}
            {imgRows.length > 0 && (
              <div className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)' }}>
                      {imgRows.length} items extracted from image
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', marginTop: '0.2rem' }}>Edit any row before importing</p>
                  </div>
                  <button onClick={importImgRows} disabled={imgRows.filter(r => r.selected && !r.imported).length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', background: 'linear-gradient(135deg, var(--saas-primary), var(--saas-secondary))', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                    <Download size={13} /> Import {imgRows.filter(r => r.selected && !r.imported).length} to Catalog
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {imgRows.map((row) => (
                    <div key={row._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: row.imported ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${row.imported ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 'var(--radius-sm)' }}>
                      <input type="checkbox" checked={row.selected} onChange={() => setImgRows(prev => prev.map(r => r._id === row._id ? { ...r, selected: !r.selected } : r))} disabled={row.imported} />
                      <span style={{ fontSize: '1.2rem' }}>{guessEmoji(row.category)}</span>
                      <div style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', minWidth: 0 }}>
                        <input value={row.name} disabled={row.imported} onChange={e => setImgRows(prev => prev.map(r => r._id === row._id ? { ...r, name: e.target.value } : r))}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px', padding: '0.3rem 0.5rem', color: '#f3f4f6', fontSize: '0.82rem', fontWeight: 600, outline: 'none' }} />
                        <input value={row.price} disabled={row.imported} onChange={e => setImgRows(prev => prev.map(r => r._id === row._id ? { ...r, price: e.target.value } : r))} placeholder="£0.00"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px', padding: '0.3rem 0.5rem', color: 'var(--saas-primary)', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }} />
                        <input value={row.category} disabled={row.imported} onChange={e => setImgRows(prev => prev.map(r => r._id === row._id ? { ...r, category: e.target.value } : r))}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px', padding: '0.3rem 0.5rem', color: 'var(--saas-text-secondary)', fontSize: '0.8rem', outline: 'none' }} />
                        <input value={row.description} disabled={row.imported} onChange={e => setImgRows(prev => prev.map(r => r._id === row._id ? { ...r, description: e.target.value } : r))}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px', padding: '0.3rem 0.5rem', color: 'var(--saas-text-secondary)', fontSize: '0.78rem', outline: 'none' }} />
                      </div>
                      {row.imported
                        ? <span style={{ fontSize: '0.7rem', color: 'var(--saas-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}><Check size={11} /> Done</span>
                        : <button onClick={() => setImgRows(prev => prev.filter(r => r._id !== row._id))} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', flexShrink: 0 }}><Trash2 size={13} /></button>
                      }
                    </div>
                  ))}
                </div>

                {/* Raw OCR text toggle */}
                {imgRaw && (
                  <details style={{ marginTop: '1rem' }}>
                    <summary style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', cursor: 'pointer' }}>View raw OCR text</summary>
                    <pre style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--saas-text-muted)', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                      {imgRaw}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {tab === 'scrape' && error && (
          <div style={{
            display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
            padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)',
            color: '#fca5a5', marginBottom: '1.5rem', fontSize: '0.875rem',
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Scrape failed</div>
              {error}
            </div>
          </div>
        )}

        {/* ── Scraping skeleton ── */}
        {tab === 'scrape' && scraping && (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <Loader size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem', display: 'block', color: 'var(--saas-primary)' }} />
            <p style={{ fontWeight: 600, color: '#f3f4f6', marginBottom: '0.35rem' }}>AI is reading the page...</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--saas-text-muted)' }}>Extracting product names, prices, images and descriptions</p>
          </div>
        )}

        {/* ── Results ── */}
        {tab === 'scrape' && !scraping && rows.length > 0 && (
          <div ref={resultsRef}>

            {/* Stats + toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>

              {/* Stats pills */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.3rem 0.7rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '999px', color: 'var(--saas-primary)', fontWeight: 600 }}>
                  <Package size={12} /> {rows.length} products
                </span>
                {withImages > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.3rem 0.7rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', color: 'var(--saas-text-secondary)' }}>
                    🖼 {withImages} with images
                  </span>
                )}
                {avgPrice && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', padding: '0.3rem 0.7rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', color: 'var(--saas-text-secondary)' }}>
                    <DollarSign size={11} /> avg {avgPrice}
                  </span>
                )}
                {source && (
                  <span style={{ fontSize: '0.72rem', padding: '0.3rem 0.7rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '999px', color: 'var(--saas-success)' }}>
                    via {source}
                  </span>
                )}
              </div>

              {/* Right controls */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--saas-text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={allSelected} onChange={e => toggleAll(e.target.checked)} />
                  All
                </label>
                {/* View toggle */}
                <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  {(['cards', 'table'] as ViewMode[]).map(v => (
                    <button key={v} onClick={() => setView(v)}
                      style={{
                        padding: '0.35rem 0.6rem', background: view === v ? 'rgba(99,102,241,0.2)' : 'transparent',
                        border: 'none', color: view === v ? 'var(--saas-primary)' : 'var(--saas-text-muted)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                      }}>
                      {v === 'cards' ? <LayoutGrid size={14} /> : <List size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── CARD VIEW ── */}
            {view === 'cards' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {rows.map(row => (
                  <div key={row._id} className="glass-panel"
                    style={{
                      padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                      border: row.imported
                        ? '1px solid rgba(34,197,94,0.25)'
                        : row.selected
                        ? '1px solid rgba(99,102,241,0.35)'
                        : '1px solid rgba(255,255,255,0.06)',
                      opacity: row.imported ? 0.7 : 1,
                      position: 'relative',
                    }}>

                    {/* Checkbox overlay */}
                    <label style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', zIndex: 2, cursor: 'pointer' }}>
                      <input type="checkbox" checked={row.selected} onChange={() => toggleSelect(row._id)} disabled={row.imported}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--saas-primary)' }} />
                    </label>

                    {/* Delete */}
                    {!row.imported && (
                      <button onClick={() => deleteRow(row._id)}
                        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 2, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '4px', color: 'rgba(239,68,68,0.7)', cursor: 'pointer', padding: '0.2rem 0.3rem', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={11} />
                      </button>
                    )}

                    {/* Image */}
                    <div style={{ height: '160px', background: 'rgba(255,255,255,0.03)', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                      {row.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.image} alt={row.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)' }}>
                          <ImageOff size={32} />
                        </div>
                      )}
                      {/* Price badge */}
                      {row.price && (
                        <span style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', color: 'var(--saas-primary)', fontWeight: 800, fontSize: '0.9rem', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(99,102,241,0.3)' }}>
                          {fmtPrice(row.price)}
                        </span>
                      )}
                      {/* Imported badge */}
                      {row.imported && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ background: 'var(--saas-success)', color: '#fff', fontWeight: 700, fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Check size={12} /> Imported
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div style={{ padding: '0.875rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {editingId === row._id && !row.imported ? (
                        /* Edit mode */
                        <>
                          <input value={row.name} onChange={e => update(row._id, 'name', e.target.value)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '4px', padding: '0.3rem 0.5rem', color: '#f3f4f6', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }} />
                          <textarea value={row.description} onChange={e => update(row._id, 'description', e.target.value)} rows={3}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.3rem 0.5rem', color: 'var(--saas-text-secondary)', fontSize: '0.78rem', outline: 'none', resize: 'none', lineHeight: '1.4' }} />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input value={row.price} onChange={e => update(row._id, 'price', e.target.value)} placeholder="£0.00"
                              style={{ width: '80px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.3rem 0.5rem', color: 'var(--saas-primary)', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }} />
                            <input value={row.category} onChange={e => update(row._id, 'category', e.target.value)} placeholder="Category"
                              style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.3rem 0.5rem', color: 'var(--saas-text-secondary)', fontSize: '0.8rem', outline: 'none' }} />
                          </div>
                          <button onClick={() => setEditingId(null)}
                            style={{ alignSelf: 'flex-end', background: 'var(--saas-primary)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', padding: '0.3rem 0.75rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                            Done
                          </button>
                        </>
                      ) : (
                        /* View mode */
                        <>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f3f4f6', lineHeight: '1.3' }}>{row.name}</div>
                          {row.description && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--saas-text-secondary)', lineHeight: '1.45', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {row.description}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: 'auto' }}>
                            {row.category && (
                              <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '999px', color: 'var(--saas-text-muted)' }}>
                                {guessEmoji(row.category)} {row.category}
                              </span>
                            )}
                            {!row.imported && (
                              <button onClick={() => setEditingId(row._id)}
                                style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)', color: 'var(--saas-text-muted)', padding: '0.2rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer' }}>
                                Edit
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── TABLE VIEW ── */}
            {view === 'table' && (
              <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '0.7rem 1rem', width: '36px' }}></th>
                      <th style={{ padding: '0.7rem 0.5rem', width: '56px', color: 'var(--saas-text-muted)', fontWeight: 600 }}>Image</th>
                      <th style={{ padding: '0.7rem 0.5rem', textAlign: 'left', color: 'var(--saas-text-muted)', fontWeight: 600, minWidth: '150px' }}>Name</th>
                      <th style={{ padding: '0.7rem 0.5rem', textAlign: 'left', color: 'var(--saas-text-muted)', fontWeight: 600, minWidth: '200px' }}>Description</th>
                      <th style={{ padding: '0.7rem 0.5rem', textAlign: 'left', color: 'var(--saas-text-muted)', fontWeight: 600, width: '90px' }}>Price</th>
                      <th style={{ padding: '0.7rem 0.5rem', textAlign: 'left', color: 'var(--saas-text-muted)', fontWeight: 600, width: '110px' }}>Category</th>
                      <th style={{ padding: '0.7rem 0.5rem', textAlign: 'center', color: 'var(--saas-text-muted)', fontWeight: 600, width: '80px' }}>Status</th>
                      <th style={{ padding: '0.7rem 0.75rem', width: '36px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={row._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: row.imported ? 'rgba(34,197,94,0.03)' : row.selected ? 'rgba(99,102,241,0.04)' : 'transparent' }}>
                        <td style={{ padding: '0.55rem 1rem', textAlign: 'center' }}>
                          <input type="checkbox" checked={row.selected} onChange={() => toggleSelect(row._id)} disabled={row.imported} />
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center' }}>
                          {row.image
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={row.image} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            : <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '4px', color: 'var(--saas-text-muted)' }}><ImageOff size={14} /></div>
                          }
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem' }}>
                          <input value={row.name} onChange={e => update(row._id, 'name', e.target.value)} disabled={row.imported}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '0.3rem 0.45rem', color: '#f3f4f6', fontSize: '0.82rem', fontWeight: 600, outline: 'none' }} />
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem' }}>
                          <textarea value={row.description} onChange={e => update(row._id, 'description', e.target.value)} disabled={row.imported} rows={2}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '0.3rem 0.45rem', color: 'var(--saas-text-secondary)', fontSize: '0.76rem', outline: 'none', resize: 'none' }} />
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem' }}>
                          <input value={row.price} onChange={e => update(row._id, 'price', e.target.value)} disabled={row.imported} placeholder="£0.00"
                            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '0.3rem 0.45rem', color: 'var(--saas-primary)', fontSize: '0.85rem', fontWeight: 700, outline: 'none' }} />
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem' }}>
                          <input value={row.category} onChange={e => update(row._id, 'category', e.target.value)} disabled={row.imported} placeholder="General"
                            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '0.3rem 0.45rem', color: 'var(--saas-text-secondary)', fontSize: '0.8rem', outline: 'none' }} />
                        </td>
                        <td style={{ padding: '0.55rem 0.5rem', textAlign: 'center' }}>
                          {row.imported
                            ? <span style={{ fontSize: '0.7rem', color: 'var(--saas-success)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}><Check size={11} /> Done</span>
                            : importingIds.has(row._id)
                            ? <Loader size={13} style={{ animation: 'spin 1s linear infinite', color: 'var(--saas-text-muted)' }} />
                            : <span style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)' }}>#{idx + 1}</span>
                          }
                        </td>
                        <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                          {!row.imported && <button onClick={() => deleteRow(row._id)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer' }}><Trash2 size={12} /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Empty state ── */}
        {tab === 'scrape' && !scraping && rows.length === 0 && !error && (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.06)' }}>
            <Bot size={48} style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--saas-primary)', opacity: 0.25 }} />
            <p style={{ fontWeight: 700, color: 'var(--saas-text-secondary)', marginBottom: '0.5rem', fontSize: '1.05rem' }}>Paste a URL to extract products</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--saas-text-muted)', maxWidth: '420px', margin: '0 auto', lineHeight: '1.55' }}>
              Works on Shopify, WooCommerce, Just Eat, Uber Eats, Amazon, Etsy — any page with product listings. AI reads name, price, image and description.
            </p>
          </div>
        )}

        {/* ── Sticky import bar ── */}
        {selectedCount > 0 && (
          <div style={{
            position: 'fixed', bottom: 0, left: '260px', right: 0, zIndex: 100,
            padding: '1rem 2rem',
            background: 'rgba(9,13,22,0.9)', backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
          }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--saas-text-secondary)' }}>
              <strong style={{ color: '#f3f4f6' }}>{selectedCount}</strong> product{selectedCount > 1 ? 's' : ''} selected
            </span>
            <button onClick={importSelected} disabled={importingIds.size > 0}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1.5rem', borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--saas-primary), var(--saas-secondary))',
                border: 'none', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              }}>
              {importingIds.size > 0
                ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Importing...</>
                : <><Download size={15} /> Import {selectedCount} to Catalog</>}
            </button>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 200,
            background: 'var(--saas-success)', color: '#fff',
            padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            fontWeight: 600, fontSize: '0.9rem',
          }}>
            <Check size={16} /> {toast}
          </div>
        )}
      </main>
    </div>
  );
}
