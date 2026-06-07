"use client";

import React, { useState, useEffect, useCallback } from 'react';

/* ─── Types ─────────────────────────────────────────────── */
type LeadSource   = 'whatsapp'|'landing_page'|'social'|'platform'|'referral'|'manual';
type LeadStatus   = 'new'|'contacted'|'qualified'|'proposal'|'won'|'lost';
type LeadScore    = 'hot'|'warm'|'cold';
type ContactType  = 'whatsapp'|'email'|'phone';

interface Lead {
  id: string;
  name: string;
  contact: string;
  contactType: ContactType;
  source: LeadSource;
  sourceName?: string;
  score: LeadScore;
  status: LeadStatus;
  businessUnit?: string;
  notes: string;
  tags: string[];
  capturedAt: string;
  lastContactedAt?: string;
  nextActionDate?: string;
  nextAction?: string;
  estimatedValue?: number;
  nurtureSent: number;
  nurtureMessages: NurtureMsg[];
}

interface NurtureMsg {
  id: string;
  sentAt: string;
  channel: 'whatsapp'|'email'|'phone';
  content: string;
  outcome?: 'replied'|'no_reply'|'bounced';
}

/* ─── Storage ────────────────────────────────────────────── */
const LEADS_KEY     = 'miller_leads_v1';
const WA_DRAFTS_KEY = 'miller_wa_drafts_v1';

interface WADraft {
  id: string;
  senderName: string;
  phone: string;
  note: string;
  imageKey?: string;
  receivedAt: string;
  processed: boolean;
}

function loadLeads(): Lead[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LEADS_KEY) || '[]'); } catch { return []; }
}
function saveLeads(leads: Lead[]) {
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}
function loadWADrafts(): WADraft[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(WA_DRAFTS_KEY) || '[]'); } catch { return []; }
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function tsShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});
}
function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

/* ─── Score helper ───────────────────────────────────────── */
function autoScore(lead: Partial<Lead>): LeadScore {
  let pts = 0;
  if (lead.estimatedValue && lead.estimatedValue > 0) pts += 2;
  if (lead.notes && lead.notes.length > 30) pts += 1;
  if (lead.source === 'whatsapp' || lead.source === 'referral') pts += 2;
  if (lead.source === 'landing_page') pts += 1;
  if (lead.nextActionDate) pts += 1;
  if (lead.contactType === 'whatsapp') pts += 1;
  return pts >= 5 ? 'hot' : pts >= 3 ? 'warm' : 'cold';
}

/* ─── Pipeline config ────────────────────────────────────── */
const PIPELINE: { key: LeadStatus; label: string; color: string }[] = [
  { key: 'new',       label: 'New',       color: '#6C63FF' },
  { key: 'contacted', label: 'Contacted', color: '#3B82F6' },
  { key: 'qualified', label: 'Qualified', color: '#F59E0B' },
  { key: 'proposal',  label: 'Proposal',  color: '#EC4899' },
  { key: 'won',       label: 'Won ✓',     color: '#10B981' },
  { key: 'lost',      label: 'Lost',      color: '#6B7280' },
];

const SOURCE_LABELS: Record<LeadSource, string> = {
  whatsapp:     '💬 WhatsApp',
  landing_page: '🌐 Landing Page',
  social:       '📱 Social',
  platform:     '🛒 Marketplace',
  referral:     '🤝 Referral',
  manual:       '✏️ Manual',
};
const SCORE_COLORS: Record<LeadScore, string> = {
  hot:  '#FF4D4D',
  warm: '#F59E0B',
  cold: '#6B7280',
};
const SCORE_ICONS: Record<LeadScore, string> = {
  hot: '🔥', warm: '🌡️', cold: '❄️',
};

/* ─── Blank lead ─────────────────────────────────────────── */
function blankLead(): Lead {
  return {
    id: uid(), name: '', contact: '', contactType: 'whatsapp',
    source: 'manual', score: 'cold', status: 'new',
    notes: '', tags: [], capturedAt: new Date().toISOString(),
    nurtureSent: 0, nurtureMessages: [],
  };
}

/* ─── Main Component ─────────────────────────────────────── */
export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeStatus, setActiveStatus] = useState<LeadStatus|'all'>('all');
  const [activeScore, setActiveScore] = useState<LeadScore|'all'>('all');
  const [searchQ, setSearchQ] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editLead, setEditLead] = useState<Lead|null>(null);
  const [detailLead, setDetailLead] = useState<Lead|null>(null);
  const [viewMode, setViewMode] = useState<'pipeline'|'list'>('pipeline');
  const [importCount, setImportCount] = useState(0);
  const [showImportBanner, setShowImportBanner] = useState(false);
  const [nurtureForm, setNurtureForm] = useState<{leadId:string; channel:NurtureMsg['channel']; content:string}|null>(null);

  useEffect(() => {
    setLeads(loadLeads());
    // check WA drafts for importable leads
    const drafts = loadWADrafts().filter(d => !d.processed);
    setImportCount(drafts.length);
  }, []);

  const persist = useCallback((next: Lead[]) => {
    setLeads(next);
    saveLeads(next);
  }, []);

  /* Import unprocessed WA drafts as new leads */
  function importFromWA() {
    const drafts = loadWADrafts().filter(d => !d.processed);
    if (!drafts.length) return;
    const existing = loadLeads();
    const existingPhones = new Set(existing.map(l => l.contact));
    const newLeads: Lead[] = drafts
      .filter(d => !existingPhones.has(d.phone))
      .map(d => ({
        id: uid(),
        name: d.senderName || 'Unknown',
        contact: d.phone,
        contactType: 'whatsapp' as ContactType,
        source: 'whatsapp' as LeadSource,
        sourceName: 'WA Invoice Capture',
        score: 'warm' as LeadScore,
        status: 'new' as LeadStatus,
        notes: d.note || '',
        tags: ['wa-import'],
        capturedAt: d.receivedAt,
        nurtureSent: 0,
        nurtureMessages: [],
      }));
    if (!newLeads.length) { setShowImportBanner(true); setTimeout(()=>setShowImportBanner(false),3000); return; }
    persist([...existing, ...newLeads]);
    setImportCount(0);
    setShowImportBanner(true);
    setTimeout(() => setShowImportBanner(false), 4000);
  }

  /* Add / save lead */
  function saveLead(lead: Lead) {
    const scored = { ...lead, score: autoScore(lead) };
    const idx = leads.findIndex(l => l.id === scored.id);
    const next = idx >= 0
      ? leads.map(l => l.id === scored.id ? scored : l)
      : [...leads, scored];
    persist(next);
    setShowAdd(false);
    setEditLead(null);
    if (detailLead?.id === scored.id) setDetailLead(scored);
  }

  function deleteLead(id: string) {
    persist(leads.filter(l => l.id !== id));
    if (detailLead?.id === id) setDetailLead(null);
  }

  function moveStatus(id: string, status: LeadStatus) {
    const next = leads.map(l => l.id === id ? { ...l, status } : l);
    persist(next);
    if (detailLead?.id === id) setDetailLead(next.find(l => l.id === id) || null);
  }

  function addNurtureMsg(leadId: string, channel: NurtureMsg['channel'], content: string) {
    const msg: NurtureMsg = { id: uid(), sentAt: new Date().toISOString(), channel, content };
    const next = leads.map(l => l.id === leadId
      ? { ...l, nurtureMessages: [...l.nurtureMessages, msg], nurtureSent: l.nurtureSent + 1, lastContactedAt: msg.sentAt }
      : l
    );
    persist(next);
    setDetailLead(next.find(l => l.id === leadId) || null);
    setNurtureForm(null);
  }

  /* Filtering */
  const filtered = leads.filter(l => {
    if (activeStatus !== 'all' && l.status !== activeStatus) return false;
    if (activeScore !== 'all' && l.score !== activeScore) return false;
    if (searchQ && !`${l.name} ${l.contact} ${l.notes}`.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  /* Stats */
  const hot   = leads.filter(l => l.score === 'hot').length;
  const warm  = leads.filter(l => l.score === 'warm').length;
  const cold  = leads.filter(l => l.score === 'cold').length;
  const wonMo = leads.filter(l => l.status === 'won' && daysSince(l.capturedAt) <= 30).length;
  const pipeline = leads.filter(l => !['won','lost'].includes(l.status)).length;

  return (
    <div style={{ padding:'1.5rem', maxWidth:1400, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem', marginBottom:'1.5rem' }}>
        <div>
          <h1 style={{ fontSize:'1.5rem', fontWeight:700, margin:0 }}>Lead Management</h1>
          <p style={{ margin:'0.25rem 0 0', color:'var(--saas-text-muted)', fontSize:'0.85rem' }}>
            Powered by <span style={{ color:'var(--saas-primary)', fontWeight:600 }}>Miller AI</span> · Pipeline tracking &amp; nurture
          </p>
        </div>
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
          {importCount > 0 && (
            <button onClick={importFromWA} style={btnStyle('#F59E0B')}>
              📥 Import {importCount} WA Lead{importCount > 1 ? 's' : ''}
            </button>
          )}
          <button onClick={() => { setEditLead(blankLead()); setShowAdd(true); }} style={btnStyle('var(--saas-primary)')}>
            + Add Lead
          </button>
        </div>
      </div>

      {/* Import banner */}
      {showImportBanner && (
        <div style={{ background:'rgba(16,185,129,0.15)', border:'1px solid #10B981', borderRadius:8, padding:'0.75rem 1rem', marginBottom:'1rem', color:'#10B981', fontSize:'0.85rem' }}>
          ✓ WA leads imported to pipeline
        </div>
      )}

      {/* Stats bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px,1fr))', gap:'0.75rem', marginBottom:'1.5rem' }}>
        {[
          { label:'Total Leads', val:leads.length, color:'var(--saas-primary)' },
          { label:'🔥 Hot', val:hot, color:'#FF4D4D' },
          { label:'🌡️ Warm', val:warm, color:'#F59E0B' },
          { label:'❄️ Cold', val:cold, color:'#6B7280' },
          { label:'In Pipeline', val:pipeline, color:'#3B82F6' },
          { label:'Won (30d)', val:wonMo, color:'#10B981' },
        ].map(s => (
          <div key={s.label} style={statCard}>
            <div style={{ fontSize:'1.4rem', fontWeight:700, color:s.color }}>{s.val}</div>
            <div style={{ fontSize:'0.7rem', color:'var(--saas-text-muted)', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'center', marginBottom:'1rem' }}>
        <input
          value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Search leads..."
          style={{ ...inputStyle, flex:'1 1 180px', maxWidth:280 }}
        />
        <select value={activeScore} onChange={e => setActiveScore(e.target.value as LeadScore|'all')} style={inputStyle}>
          <option value="all">All Scores</option>
          <option value="hot">🔥 Hot</option>
          <option value="warm">🌡️ Warm</option>
          <option value="cold">❄️ Cold</option>
        </select>
        <select value={activeStatus} onChange={e => setActiveStatus(e.target.value as LeadStatus|'all')} style={inputStyle}>
          <option value="all">All Stages</option>
          {PIPELINE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <div style={{ display:'flex', gap:4, marginLeft:'auto' }}>
          {(['pipeline','list'] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              style={{ ...btnStyle(viewMode === v ? 'var(--saas-primary)' : 'rgba(255,255,255,0.08)'), fontSize:'0.75rem', padding:'0.35rem 0.7rem', textTransform:'capitalize' }}>
              {v === 'pipeline' ? '⬛ Pipeline' : '☰ List'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Pipeline Board ─────────────────────────────────── */}
      {viewMode === 'pipeline' && (
        <div style={{ overflowX:'auto', paddingBottom:'1rem' }}>
          <div style={{ display:'flex', gap:'0.75rem', minWidth: `${PIPELINE.length * 230}px` }}>
            {PIPELINE.map(col => {
              const colLeads = filtered.filter(l => l.status === col.key);
              return (
                <div key={col.key} style={{ flex:'0 0 220px', background:'rgba(255,255,255,0.03)', borderRadius:12, border:`1px solid rgba(255,255,255,0.07)`, overflow:'hidden' }}>
                  {/* col header */}
                  <div style={{ background:`${col.color}22`, borderBottom:`2px solid ${col.color}`, padding:'0.6rem 0.75rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontWeight:600, fontSize:'0.8rem', color:col.color }}>{col.label}</span>
                    <span style={{ background:`${col.color}33`, color:col.color, borderRadius:20, padding:'1px 8px', fontSize:'0.72rem', fontWeight:700 }}>{colLeads.length}</span>
                  </div>
                  {/* cards */}
                  <div style={{ padding:'0.5rem', display:'flex', flexDirection:'column', gap:'0.5rem', minHeight:60 }}>
                    {colLeads.map(lead => (
                      <LeadCard key={lead.id} lead={lead}
                        onClick={() => setDetailLead(lead)}
                        onMove={moveStatus}
                        onEdit={() => { setEditLead(lead); setShowAdd(true); }}
                        onDelete={() => deleteLead(lead.id)}
                      />
                    ))}
                    {colLeads.length === 0 && (
                      <div style={{ color:'var(--saas-text-muted)', fontSize:'0.72rem', textAlign:'center', padding:'1rem 0' }}>No leads</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── List View ──────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', color:'var(--saas-text-muted)', padding:'3rem', background:'rgba(255,255,255,0.02)', borderRadius:12, border:'1px solid rgba(255,255,255,0.06)' }}>
              No leads match filters. Add one or import from WA.
            </div>
          )}
          {filtered.map(lead => (
            <div key={lead.id} onClick={() => setDetailLead(lead)} style={{ ...glassCard, display:'flex', alignItems:'center', gap:'1rem', cursor:'pointer', padding:'0.75rem 1rem', flexWrap:'wrap' }}>
              <ScoreBadge score={lead.score} />
              <div style={{ flex:'1 1 180px' }}>
                <div style={{ fontWeight:600, fontSize:'0.9rem' }}>{lead.name || 'Unnamed'}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--saas-text-muted)' }}>{lead.contact}</div>
              </div>
              <div style={{ flex:'0 1 auto', fontSize:'0.75rem', color:'var(--saas-text-muted)' }}>{SOURCE_LABELS[lead.source]}</div>
              <StatusPill status={lead.status} />
              <div style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', whiteSpace:'nowrap' }}>{tsShort(lead.capturedAt)}</div>
              <div style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)' }}>✉️ {lead.nurtureSent}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ───────────────────────────────── */}
      {showAdd && editLead && (
        <Modal title={leads.find(l=>l.id===editLead.id) ? 'Edit Lead' : 'Add Lead'} onClose={() => { setShowAdd(false); setEditLead(null); }}>
          <LeadForm lead={editLead} onChange={setEditLead} onSave={saveLead} onCancel={() => { setShowAdd(false); setEditLead(null); }} />
        </Modal>
      )}

      {/* ── Detail Panel ───────────────────────────────────── */}
      {detailLead && (
        <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(420px, 100vw)', background:'var(--saas-surface)', borderLeft:'1px solid var(--saas-border)', zIndex:200, display:'flex', flexDirection:'column', overflowY:'auto' }}>
          <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid var(--saas-border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <ScoreBadge score={detailLead.score} />
              <span style={{ fontWeight:700, fontSize:'1rem' }}>{detailLead.name || 'Unnamed'}</span>
            </div>
            <button onClick={() => setDetailLead(null)} style={{ background:'none', border:'none', color:'var(--saas-text-muted)', fontSize:'1.2rem', cursor:'pointer' }}>✕</button>
          </div>

          <div style={{ padding:'1rem 1.25rem', flex:1, overflowY:'auto' }}>
            {/* Contact info */}
            <div style={sectionBox}>
              <div style={fieldRow}><span style={fieldLabel}>Contact</span><span style={fieldVal}>{detailLead.contact} ({detailLead.contactType})</span></div>
              <div style={fieldRow}><span style={fieldLabel}>Source</span><span style={fieldVal}>{SOURCE_LABELS[detailLead.source]}{detailLead.sourceName ? ` — ${detailLead.sourceName}` : ''}</span></div>
              <div style={fieldRow}><span style={fieldLabel}>Captured</span><span style={fieldVal}>{tsShort(detailLead.capturedAt)} ({daysSince(detailLead.capturedAt)}d ago)</span></div>
              {detailLead.estimatedValue && <div style={fieldRow}><span style={fieldLabel}>Est. Value</span><span style={fieldVal}>£{detailLead.estimatedValue.toLocaleString()}</span></div>}
              {detailLead.businessUnit && <div style={fieldRow}><span style={fieldLabel}>Business</span><span style={fieldVal}>{detailLead.businessUnit}</span></div>}
            </div>

            {/* Pipeline move */}
            <div style={{ marginBottom:'1rem' }}>
              <div style={{ fontSize:'0.75rem', color:'var(--saas-text-muted)', marginBottom:'0.4rem', fontWeight:600 }}>PIPELINE STAGE</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem' }}>
                {PIPELINE.map(p => (
                  <button key={p.key} onClick={() => moveStatus(detailLead.id, p.key)}
                    style={{ ...btnStyle(detailLead.status === p.key ? p.color : 'rgba(255,255,255,0.07)'), fontSize:'0.72rem', padding:'0.3rem 0.65rem' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            {detailLead.notes && (
              <div style={sectionBox}>
                <div style={{ fontSize:'0.75rem', color:'var(--saas-text-muted)', marginBottom:'0.35rem', fontWeight:600 }}>NOTES</div>
                <div style={{ fontSize:'0.82rem', lineHeight:1.5, whiteSpace:'pre-wrap' }}>{detailLead.notes}</div>
              </div>
            )}

            {/* Next action */}
            {(detailLead.nextAction || detailLead.nextActionDate) && (
              <div style={{ ...sectionBox, borderColor:'rgba(245,158,11,0.3)', background:'rgba(245,158,11,0.06)' }}>
                <div style={{ fontSize:'0.75rem', color:'#F59E0B', marginBottom:'0.35rem', fontWeight:600 }}>NEXT ACTION</div>
                <div style={{ fontSize:'0.82rem' }}>{detailLead.nextAction}</div>
                {detailLead.nextActionDate && <div style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', marginTop:3 }}>Due: {tsShort(detailLead.nextActionDate)}</div>}
              </div>
            )}

            {/* Tags */}
            {detailLead.tags.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', marginBottom:'1rem' }}>
                {detailLead.tags.map(t => (
                  <span key={t} style={{ background:'rgba(108,99,255,0.2)', color:'var(--saas-primary)', borderRadius:20, padding:'2px 10px', fontSize:'0.7rem' }}>{t}</span>
                ))}
              </div>
            )}

            {/* Miller AI score insight */}
            <div style={{ background:'rgba(108,99,255,0.08)', border:'1px solid rgba(108,99,255,0.25)', borderRadius:10, padding:'0.75rem', marginBottom:'1rem', fontSize:'0.78rem' }}>
              <div style={{ color:'var(--saas-primary)', fontWeight:700, marginBottom:'0.35rem' }}>⚡ Miller AI Insight</div>
              <div style={{ color:'var(--saas-text-muted)', lineHeight:1.5 }}>
                {detailLead.score === 'hot' && 'Hot lead — contact within 24h. Use WhatsApp for fastest response. Offer a direct consultation or quote.'}
                {detailLead.score === 'warm' && `Warm lead — ${detailLead.nurtureSent === 0 ? 'send first nurture message today' : `${detailLead.nurtureSent} message(s) sent`}. Build trust with social proof or a case study.`}
                {detailLead.score === 'cold' && 'Cold lead — add to automated nurture. Send value content, not a sales pitch. Review in 2 weeks.'}
              </div>
            </div>

            {/* Nurture history */}
            <div style={{ marginBottom:'1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.5rem' }}>
                <div style={{ fontSize:'0.75rem', color:'var(--saas-text-muted)', fontWeight:600 }}>NURTURE LOG ({detailLead.nurtureSent})</div>
                <button onClick={() => setNurtureForm({ leadId: detailLead.id, channel:'whatsapp', content:'' })}
                  style={{ ...btnStyle('var(--saas-primary)'), fontSize:'0.7rem', padding:'0.25rem 0.6rem' }}>
                  + Log Message
                </button>
              </div>
              {detailLead.nurtureMessages.length === 0 && (
                <div style={{ fontSize:'0.75rem', color:'var(--saas-text-muted)', fontStyle:'italic' }}>No messages logged yet</div>
              )}
              {[...detailLead.nurtureMessages].reverse().map(m => (
                <div key={m.id} style={{ ...glassCard, padding:'0.5rem 0.75rem', marginBottom:'0.4rem', fontSize:'0.78rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', color:'var(--saas-text-muted)', fontSize:'0.7rem', marginBottom:3 }}>
                    <span>{m.channel === 'whatsapp' ? '💬' : m.channel === 'email' ? '✉️' : '📞'} {m.channel}</span>
                    <span>{tsShort(m.sentAt)}</span>
                  </div>
                  <div style={{ lineHeight:1.4 }}>{m.content}</div>
                </div>
              ))}
            </div>

            {/* Nurture compose */}
            {nurtureForm && nurtureForm.leadId === detailLead.id && (
              <div style={{ ...sectionBox, borderColor:'rgba(108,99,255,0.3)' }}>
                <div style={{ fontSize:'0.75rem', color:'var(--saas-text-muted)', marginBottom:'0.5rem', fontWeight:600 }}>LOG OUTREACH MESSAGE</div>
                <select value={nurtureForm.channel} onChange={e => setNurtureForm(f => f ? { ...f, channel: e.target.value as NurtureMsg['channel'] } : f)} style={{ ...inputStyle, marginBottom:'0.5rem', width:'100%' }}>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="email">✉️ Email</option>
                  <option value="phone">📞 Phone call</option>
                </select>
                <textarea value={nurtureForm.content} onChange={e => setNurtureForm(f => f ? { ...f, content: e.target.value } : f)}
                  placeholder="What did you send / discuss?"
                  rows={3} style={{ ...inputStyle, width:'100%', resize:'vertical', fontFamily:'inherit', boxSizing:'border-box' }} />
                <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.5rem' }}>
                  <button onClick={() => addNurtureMsg(detailLead.id, nurtureForm.channel, nurtureForm.content)} style={btnStyle('var(--saas-primary)')}>Save</button>
                  <button onClick={() => setNurtureForm(null)} style={btnStyle('rgba(255,255,255,0.08)')}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div style={{ padding:'0.75rem 1.25rem', borderTop:'1px solid var(--saas-border)', display:'flex', gap:'0.5rem', flexShrink:0 }}>
            <button onClick={() => { setEditLead(detailLead); setShowAdd(true); }} style={{ ...btnStyle('rgba(255,255,255,0.08)'), flex:1, fontSize:'0.8rem' }}>✏️ Edit</button>
            {detailLead.contactType === 'whatsapp' && (
              <a href={`https://wa.me/${detailLead.contact.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                style={{ ...btnStyle('#25D366'), flex:1, fontSize:'0.8rem', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                💬 WhatsApp
              </a>
            )}
            <button onClick={() => { if (confirm('Delete this lead?')) deleteLead(detailLead.id); }}
              style={{ ...btnStyle('rgba(239,68,68,0.2)'), color:'#EF4444', fontSize:'0.8rem' }}>
              🗑️
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── LeadCard (pipeline card) ───────────────────────────── */
function LeadCard({ lead, onClick, onMove, onEdit, onDelete }: {
  lead: Lead;
  onClick: () => void;
  onMove: (id: string, s: LeadStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const nextStatuses = PIPELINE.filter(p => p.key !== lead.status);

  return (
    <div onClick={onClick} style={{ background:'rgba(255,255,255,0.05)', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', padding:'0.6rem 0.7rem', cursor:'pointer', position:'relative' }}
      onMouseLeave={() => setShowActions(false)}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:4 }}>
        <div style={{ fontSize:'0.82rem', fontWeight:600, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.name || 'Unnamed'}</div>
        <div style={{ display:'flex', gap:3, flexShrink:0 }}>
          <ScoreBadge score={lead.score} small />
          <button onClick={e => { e.stopPropagation(); setShowActions(s => !s); }}
            style={{ background:'none', border:'none', color:'var(--saas-text-muted)', cursor:'pointer', padding:'0 2px', fontSize:'0.9rem', lineHeight:1 }}>⋯</button>
        </div>
      </div>
      <div style={{ fontSize:'0.7rem', color:'var(--saas-text-muted)', marginTop:3 }}>{SOURCE_LABELS[lead.source]}</div>
      <div style={{ fontSize:'0.68rem', color:'var(--saas-text-muted)', marginTop:2 }}>{daysSince(lead.capturedAt)}d ago · ✉️ {lead.nurtureSent}</div>

      {/* Quick-move dropdown */}
      {showActions && (
        <div onClick={e => e.stopPropagation()} style={{ position:'absolute', top:'100%', right:0, zIndex:50, background:'var(--saas-surface)', border:'1px solid var(--saas-border)', borderRadius:8, padding:'0.25rem', minWidth:150, boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
          {nextStatuses.map(s => (
            <button key={s.key} onClick={() => { onMove(lead.id, s.key); setShowActions(false); }}
              style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', color:'var(--saas-text)', fontSize:'0.75rem', padding:'0.35rem 0.6rem', cursor:'pointer', borderRadius:4 }}>
              → {s.label}
            </button>
          ))}
          <hr style={{ border:'none', borderTop:'1px solid var(--saas-border)', margin:'0.25rem 0' }} />
          <button onClick={() => { onEdit(); setShowActions(false); }}
            style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', color:'var(--saas-text)', fontSize:'0.75rem', padding:'0.35rem 0.6rem', cursor:'pointer', borderRadius:4 }}>
            ✏️ Edit
          </button>
          <button onClick={() => { if (confirm('Delete?')) onDelete(); setShowActions(false); }}
            style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', color:'#EF4444', fontSize:'0.75rem', padding:'0.35rem 0.6rem', cursor:'pointer', borderRadius:4 }}>
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Lead Form ───────────────────────────────────────────── */
function LeadForm({ lead, onChange, onSave, onCancel }: {
  lead: Lead;
  onChange: (l: Lead) => void;
  onSave: (l: Lead) => void;
  onCancel: () => void;
}) {
  const set = (field: keyof Lead, val: unknown) => onChange({ ...lead, [field]: val });
  const tagStr = lead.tags.join(', ');

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
        <div>
          <label style={labelStyle}>Name *</label>
          <input value={lead.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="Contact name" />
        </div>
        <div>
          <label style={labelStyle}>Contact (phone / email)</label>
          <input value={lead.contact} onChange={e => set('contact', e.target.value)} style={inputStyle} placeholder="+44 7700..." />
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
        <div>
          <label style={labelStyle}>Contact Type</label>
          <select value={lead.contactType} onChange={e => set('contactType', e.target.value)} style={inputStyle}>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Source</label>
          <select value={lead.source} onChange={e => set('source', e.target.value)} style={inputStyle}>
            {(Object.entries(SOURCE_LABELS) as [LeadSource, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
        <div>
          <label style={labelStyle}>Pipeline Stage</label>
          <select value={lead.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
            {PIPELINE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Est. Value (£)</label>
          <input type="number" value={lead.estimatedValue ?? ''} onChange={e => set('estimatedValue', e.target.value ? Number(e.target.value) : undefined)} style={inputStyle} placeholder="0" min={0} />
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
        <div>
          <label style={labelStyle}>Next Action</label>
          <input value={lead.nextAction ?? ''} onChange={e => set('nextAction', e.target.value)} style={inputStyle} placeholder="e.g. Send quote" />
        </div>
        <div>
          <label style={labelStyle}>Next Action Date</label>
          <input type="date" value={lead.nextActionDate ? lead.nextActionDate.slice(0,10) : ''} onChange={e => set('nextActionDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)} style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Business Unit</label>
        <input value={lead.businessUnit ?? ''} onChange={e => set('businessUnit', e.target.value)} style={inputStyle} placeholder="e.g. Main Store / Catering Brand" />
      </div>
      <div>
        <label style={labelStyle}>Tags (comma separated)</label>
        <input value={tagStr} onChange={e => set('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} style={inputStyle} placeholder="e.g. vip, follow-up, event" />
      </div>
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea value={lead.notes} onChange={e => set('notes', e.target.value)} rows={3} style={{ ...inputStyle, resize:'vertical', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }} placeholder="Context, requirements, timeline..." />
      </div>
      {/* Miller AI score preview */}
      <div style={{ background:'rgba(108,99,255,0.08)', border:'1px solid rgba(108,99,255,0.2)', borderRadius:8, padding:'0.5rem 0.75rem', fontSize:'0.77rem', color:'var(--saas-text-muted)' }}>
        ⚡ <span style={{ color:'var(--saas-primary)', fontWeight:600 }}>Miller AI</span> will auto-score this lead as&nbsp;
        <span style={{ color: SCORE_COLORS[autoScore(lead)], fontWeight:700 }}>{SCORE_ICONS[autoScore(lead)]} {autoScore(lead).toUpperCase()}</span> on save
      </div>
      <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end', paddingTop:'0.25rem' }}>
        <button onClick={onCancel} style={btnStyle('rgba(255,255,255,0.08)')}>Cancel</button>
        <button onClick={() => onSave(lead)} style={btnStyle('var(--saas-primary)')} disabled={!lead.name || !lead.contact}>Save Lead</button>
      </div>
    </div>
  );
}

/* ─── Modal wrapper ──────────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'var(--saas-surface)', borderRadius:14, border:'1px solid var(--saas-border)', width:'100%', maxWidth:580, maxHeight:'90vh', overflowY:'auto', padding:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <h2 style={{ margin:0, fontSize:'1.1rem', fontWeight:700 }}>{title}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--saas-text-muted)', fontSize:'1.3rem', cursor:'pointer', lineHeight:1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */
function ScoreBadge({ score, small }: { score: LeadScore; small?: boolean }) {
  return (
    <span style={{
      background: `${SCORE_COLORS[score]}22`,
      color: SCORE_COLORS[score],
      border: `1px solid ${SCORE_COLORS[score]}55`,
      borderRadius: 20,
      padding: small ? '1px 6px' : '2px 10px',
      fontSize: small ? '0.65rem' : '0.72rem',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {SCORE_ICONS[score]} {score.toUpperCase()}
    </span>
  );
}

function StatusPill({ status }: { status: LeadStatus }) {
  const col = PIPELINE.find(p => p.key === status);
  return (
    <span style={{
      background: `${col?.color ?? '#888'}22`,
      color: col?.color ?? '#888',
      borderRadius: 20,
      padding: '2px 10px',
      fontSize: '0.7rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {col?.label ?? status}
    </span>
  );
}

/* ─── Style constants ────────────────────────────────────── */
const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  cursor: 'pointer',
  padding: '0.5rem 1rem',
  fontSize: '0.82rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
});

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: 'var(--saas-text)',
  padding: '0.45rem 0.7rem',
  fontSize: '0.82rem',
  width: '100%',
  boxSizing: 'border-box',
};

const statCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 10,
  padding: '0.75rem 1rem',
  textAlign: 'center',
};

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 10,
  padding: '1rem',
};

const sectionBox: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '0.75rem',
  marginBottom: '1rem',
};

const fieldRow: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
  marginBottom: '0.35rem',
  fontSize: '0.8rem',
  flexWrap: 'wrap',
};

const fieldLabel: React.CSSProperties = {
  color: 'var(--saas-text-muted)',
  minWidth: 80,
  flexShrink: 0,
};

const fieldVal: React.CSSProperties = {
  flex: 1,
  wordBreak: 'break-word',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  color: 'var(--saas-text-muted)',
  marginBottom: '0.3rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};
