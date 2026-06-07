"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { db, Store } from '../../../lib/supabaseClient';
import { createLeadFromAgent, addLeadToPipeline, countAgentLeads, readBusinessProfile } from '../../../lib/millerEcosystem';
import {
  Eye, Send, TrendingUp, Bell, FileText,
  Power, PlayCircle, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, Eye as EyeIcon, EyeOff,
  Save, ExternalLink, AlertTriangle, Inbox,
  Zap, User, ThumbsUp, MessageCircle, Activity,
  ToggleLeft, ToggleRight, RefreshCw
} from 'lucide-react';

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */
type SocialStatus = 'disconnected' | 'connected' | 'expired' | 'testing';
type AgentMode    = 'auto' | 'approve' | 'off';
type QueueType    = 'review' | 'code' | 'post_approval' | 'dm' | 'alert';
type LogResult    = 'success' | 'human_required' | 'failed';

interface SocialAccount {
  token: string;
  tokenExpiry: string;
  status: SocialStatus;
  mode: AgentMode;
  notes: string;
}

interface QueueItem {
  id: string;
  platform: string;
  type: QueueType;
  title: string;
  body: string;
  draft?: string;
  createdAt: string;
  resolved: boolean;
}

interface AgentCfg {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  enabled: boolean;
  lastRun: string;
  tasksDone: number;
}

interface LogEntry {
  id: string;
  agentId: string;
  platform: string;
  action: string;
  result: LogResult;
  ts: string;
}

/* ═══════════════════════════════════════════
   PLATFORM DEFINITIONS
═══════════════════════════════════════════ */
interface SPlatform {
  id: string;
  name: string;
  emoji: string;
  color: string;
  dashUrl: string;
  tokenGuide: string[];
  statLabels: string[];
  mockStats: string[];
}

const PLATFORMS: SPlatform[] = [
  {
    id: 'facebook',
    name: 'Facebook Page',
    emoji: '📘',
    color: '#1877F2',
    dashUrl: 'https://business.facebook.com',
    tokenGuide: [
      'Go to developers.facebook.com → My Apps → Create App',
      'Choose "Business" type → set app name',
      'Add product "Facebook Login" + "Pages API"',
      'Tools → Graph API Explorer → select your Page',
      'Add permissions: pages_read_engagement, pages_manage_posts',
      'Generate Access Token → copy it',
      'Extend to long-lived: use Graph API debug tool (valid 60 days)',
      '⚠️ Re-generate every 60 days or set up token refresh',
    ],
    statLabels: ['Page Likes', 'Weekly Reach', 'Posts this month'],
    mockStats: ['4,821', '12,340', '14'],
  },
  {
    id: 'instagram',
    name: 'Instagram Business',
    emoji: '📸',
    color: '#E1306C',
    dashUrl: 'https://business.facebook.com',
    tokenGuide: [
      'Instagram Business API is through Facebook (Meta Graph API)',
      'Same Facebook Developer App from Facebook setup above',
      'Add permission: instagram_basic, instagram_content_publish',
      'Get Instagram Business Account ID from Graph API Explorer',
      'Same long-lived access token works for both Facebook + Instagram',
      '⚠️ Instagram must be linked to a Facebook Page first',
    ],
    statLabels: ['Followers', 'Weekly Impressions', 'Posts this month'],
    mockStats: ['7,203', '28,500', '11'],
  },
  {
    id: 'tiktok',
    name: 'TikTok Business',
    emoji: '🎵',
    color: '#ff0050',
    dashUrl: 'https://ads.tiktok.com',
    tokenGuide: [
      'Go to developers.tiktok.com → sign in with business account',
      'My Apps → Create App → select "Content Posting API"',
      'Fill app details → submit for review (1-2 days)',
      'Approved app → App Management → get Client Key',
      'Generate access token via OAuth flow in developer console',
      '⚠️ TikTok tokens expire in 24 hours — refresh token lasts 365 days',
      'Paste refresh token here — agent auto-refreshes access token',
    ],
    statLabels: ['Followers', 'Avg Video Views', 'Videos this month'],
    mockStats: ['2,140', '8,900', '6'],
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    emoji: '🐦',
    color: '#1DA1F2',
    dashUrl: 'https://twitter.com',
    tokenGuide: [
      'Go to developer.twitter.com → sign in',
      'Projects & Apps → Create Project → Create App',
      'App Settings → Keys and Tokens',
      'Generate "Access Token and Secret" (not just Bearer Token)',
      'You need 4 values: API Key, API Secret, Access Token, Access Secret',
      'Paste all 4 in the fields below (separate with | character)',
      'Format: APIKey|APISecret|AccessToken|AccessSecret',
      '⚠️ Enable "Read and Write" permissions in App Settings first',
    ],
    statLabels: ['Followers', 'Monthly Impressions', 'Tweets this month'],
    mockStats: ['1,876', '45,200', '22'],
  },
  {
    id: 'youtube',
    name: 'YouTube Channel',
    emoji: '▶️',
    color: '#FF0000',
    dashUrl: 'https://studio.youtube.com',
    tokenGuide: [
      'Go to console.cloud.google.com → New Project',
      'APIs & Services → Enable APIs → enable "YouTube Data API v3"',
      'APIs & Services → Credentials → Create Credentials → OAuth 2.0',
      'Download JSON → run OAuth flow → get refresh token',
      'Or: use OAuth Playground (developers.google.com/oauthplayground)',
      'Scope: https://www.googleapis.com/auth/youtube',
      'Exchange auth code for refresh token → paste here',
      '⚠️ Google tokens expire — paste refresh token (not access token)',
    ],
    statLabels: ['Subscribers', 'Monthly Views', 'Videos uploaded'],
    mockStats: ['892', '34,100', '4'],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Company',
    emoji: '💼',
    color: '#0A66C2',
    dashUrl: 'https://www.linkedin.com/company',
    tokenGuide: [
      'Go to linkedin.com/developers → Create App',
      'Link to your LinkedIn Company Page',
      'Products tab → request "Marketing Developer Platform" access',
      'Auth tab → OAuth 2.0 Settings → generate access token',
      'Scopes needed: r_organization_social, w_organization_social',
      '⚠️ Access approval can take 1-5 business days from LinkedIn',
      'Once approved: generate token via OAuth flow → paste here',
      'LinkedIn tokens expire in 60 days',
    ],
    statLabels: ['Followers', 'Post Impressions', 'Posts this month'],
    mockStats: ['1,204', '9,800', '8'],
  },
  {
    id: 'google_biz',
    name: 'Google Business',
    emoji: '📍',
    color: '#34A853',
    dashUrl: 'https://business.google.com',
    tokenGuide: [
      'Google Cloud Console → same project as YouTube (or create new)',
      'APIs & Services → Enable "My Business Account Management API"',
      'Also enable "My Business Business Information API"',
      'Credentials → OAuth 2.0 → run OAuth Playground',
      'Scope: https://www.googleapis.com/auth/business.manage',
      'Get refresh token → paste here',
      'One Google refresh token can cover YouTube + Google Business',
    ],
    statLabels: ['Profile Views', 'Search Impressions', 'Reviews'],
    mockStats: ['3,210', '18,700', '47'],
  },
  {
    id: 'whatsapp_biz',
    name: 'WhatsApp Business',
    emoji: '💬',
    color: '#25D366',
    dashUrl: 'https://business.facebook.com',
    tokenGuide: [
      'Facebook Developer App → add "WhatsApp" product',
      'WhatsApp → API Setup → create phone number',
      'Generate "Permanent Token" via System User in Meta Business Settings',
      'Meta Business Settings → System Users → Add → generate token',
      'Scopes: whatsapp_business_messaging, whatsapp_business_management',
      '⚠️ Permanent token never expires (unlike regular user tokens)',
      'Also note your Phone Number ID and WhatsApp Business Account ID',
      'Paste Permanent Token here — format: EAA...',
    ],
    statLabels: ['Messages sent', 'Messages read', 'Active conversations'],
    mockStats: ['1,432', '1,198', '34'],
  },
];

/* ═══════════════════════════════════════════
   DEFAULT AGENTS
═══════════════════════════════════════════ */
const DEFAULT_AGENTS: AgentCfg[] = [
  {
    id: 'monitor',
    label: 'Monitor Agent',
    emoji: '👁️',
    desc: 'Watches all accounts every 15 min — new comments, DMs, reviews, follower changes',
    enabled: false,
    lastRun: '',
    tasksDone: 0,
  },
  {
    id: 'post',
    label: 'Post Agent',
    emoji: '📤',
    desc: 'Publishes scheduled posts to selected platforms at set times automatically',
    enabled: false,
    lastRun: '',
    tasksDone: 0,
  },
  {
    id: 'reply',
    label: 'Reply Agent',
    emoji: '💬',
    desc: 'Drafts AI replies to comments and DMs using your business tone',
    enabled: false,
    lastRun: '',
    tasksDone: 0,
  },
  {
    id: 'growth',
    label: 'Growth Agent',
    emoji: '📈',
    desc: 'Tracks follower growth, reach, engagement — generates weekly report',
    enabled: false,
    lastRun: '',
    tasksDone: 0,
  },
  {
    id: 'alert',
    label: 'Alert Agent',
    emoji: '🚨',
    desc: 'Detects unusual activity — spam, account warnings, sudden follower drops',
    enabled: false,
    lastRun: '',
    tasksDone: 0,
  },
];

/* ═══════════════════════════════════════════
   MOCK SEED DATA
═══════════════════════════════════════════ */
const SEED_QUEUE: QueueItem[] = [
  {
    id: 'q1',
    platform: 'Google Business',
    type: 'review',
    title: '1-star review received',
    body: '"Ordered twice, both times wrong items. No response from shop. Avoid."',
    draft: 'Thank you for your feedback. We sincerely apologise for these errors — this is not our standard. Please contact us directly at [email] and we will make this right immediately.',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    resolved: false,
  },
  {
    id: 'q2',
    platform: 'TikTok',
    type: 'code',
    title: 'Phone code required to post video',
    body: 'TikTok requested verification before publishing scheduled post "New arrivals 🔥". Enter your SMS code to continue.',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    resolved: false,
  },
  {
    id: 'q3',
    platform: 'Instagram',
    type: 'post_approval',
    title: 'Scheduled post awaiting approval',
    body: '"Our summer collection is here 🌸 Tap the link in bio to shop before it sells out. Limited stock!" + product photo attached.',
    draft: undefined,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    resolved: false,
  },
  {
    id: 'q4',
    platform: 'Facebook',
    type: 'dm',
    title: 'Customer DM — refund request',
    body: '"Hi, I ordered 3 days ago, order #4421. Still not arrived. Can I get a refund?"',
    draft: 'Hi! Thanks for reaching out. We\'re sorry to hear your order hasn\'t arrived yet. Let me look into #4421 right away. Could you confirm your email address so we can track it for you?',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    resolved: false,
  },
];

const SEED_LOG: LogEntry[] = [
  { id: 'l1', agentId: 'monitor', platform: 'Google Business', action: 'Checked for new reviews — 0 new', result: 'success', ts: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  { id: 'l2', agentId: 'reply', platform: 'Facebook', action: 'Drafted reply to comment "Where do you ship to?"', result: 'success', ts: new Date(Date.now() - 1000 * 60 * 32).toISOString() },
  { id: 'l3', agentId: 'monitor', platform: 'Google Business', action: '1-star review detected → pushed to Human Queue', result: 'human_required', ts: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { id: 'l4', agentId: 'post', platform: 'Instagram', action: 'Scheduled post queued for 09:00 tomorrow', result: 'success', ts: new Date(Date.now() - 1000 * 60 * 62).toISOString() },
  { id: 'l5', agentId: 'growth', platform: 'All', action: 'Weekly growth report generated — +234 followers total', result: 'success', ts: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
  { id: 'l6', agentId: 'post', platform: 'TikTok', action: 'Phone verification required to post — pushed to Human Queue', result: 'human_required', ts: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
  { id: 'l7', agentId: 'alert', platform: 'Instagram', action: 'Follower spike +180 in 1hr — organic (post went viral)', result: 'success', ts: new Date(Date.now() - 1000 * 60 * 200).toISOString() },
];

/* ═══════════════════════════════════════════
   MOCK AGENT ACTIONS (on "Run Now")
═══════════════════════════════════════════ */
const MOCK_AGENT_ACTIONS: Record<string, { platform: string; action: string; result: LogResult }[]> = {
  monitor: [
    { platform: 'Facebook', action: 'Scanned page — 2 new comments detected, drafting replies', result: 'success' },
    { platform: 'Instagram', action: 'Checked mentions — no new tags', result: 'success' },
    { platform: 'Google Business', action: 'Checked reviews — 0 new since last run', result: 'success' },
  ],
  post: [
    { platform: 'Facebook + Instagram', action: 'Published scheduled post "Weekend special 🛍️"', result: 'success' },
    { platform: 'TikTok', action: 'Phone verification required — pushed to Human Queue', result: 'human_required' },
  ],
  reply: [
    { platform: 'Facebook', action: 'Auto-replied to 3 comments with shipping info', result: 'success' },
    { platform: 'Instagram', action: 'Drafted reply to DM — waiting approval', result: 'human_required' },
  ],
  growth: [
    { platform: 'All', action: 'Growth snapshot: +47 followers this week across all platforms', result: 'success' },
    { platform: 'YouTube', action: 'Channel views up 12% vs last week', result: 'success' },
  ],
  alert: [
    { platform: 'All', action: 'Security scan complete — no unusual login attempts detected', result: 'success' },
    { platform: 'Twitter', action: 'Follower count stable — no bot activity detected', result: 'success' },
  ],
};

/* ═══════════════════════════════════════════
   LOCALSTORAGE HELPERS
═══════════════════════════════════════════ */
const SA_KEY    = 'miller_social_accounts_v1';
const AG_KEY    = 'miller_agent_cfg_v1';
const QUEUE_KEY = 'miller_human_queue_v1';
const LOG_KEY   = 'miller_activity_log_v1';

function loadAccounts(): Record<string, SocialAccount> {
  try { const r = localStorage.getItem(SA_KEY); if (r) return JSON.parse(r); } catch { /**/ }
  const d: Record<string, SocialAccount> = {};
  PLATFORMS.forEach(p => { d[p.id] = { token: '', tokenExpiry: '', status: 'disconnected', mode: 'approve', notes: '' }; });
  return d;
}
function loadAgents(): AgentCfg[] {
  try { const r = localStorage.getItem(AG_KEY); if (r) return JSON.parse(r); } catch { /**/ }
  return DEFAULT_AGENTS;
}
function loadQueue(): QueueItem[] {
  try { const r = localStorage.getItem(QUEUE_KEY); if (r) return JSON.parse(r); } catch { /**/ }
  return SEED_QUEUE;
}
function loadLog(): LogEntry[] {
  try { const r = localStorage.getItem(LOG_KEY); if (r) return JSON.parse(r); } catch { /**/ }
  return SEED_LOG;
}

function ts(date: string) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ═══════════════════════════════════════════
   STATUS BADGE
═══════════════════════════════════════════ */
function StatusBadge({ status }: { status: SocialStatus }) {
  const cfg = {
    disconnected: { label: 'Not Connected', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
    connected:    { label: 'Connected ✓',  color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    expired:      { label: 'Token Expired', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    testing:      { label: 'Testing...',    color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  }[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
      borderRadius: 20, background: cfg.bg, color: cfg.color,
      fontSize: '0.71rem', fontWeight: 600,
    }}>{cfg.label}</span>
  );
}

/* ═══════════════════════════════════════════
   MODE TOGGLE
═══════════════════════════════════════════ */
function ModeToggle({ mode, onChange }: { mode: AgentMode; onChange: (m: AgentMode) => void }) {
  const modes: AgentMode[] = ['off', 'approve', 'auto'];
  const cfg = {
    off:     { label: 'Agent Off',  color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
    approve: { label: 'Approve Mode', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    auto:    { label: 'Auto Mode',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  };
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {modes.map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            padding: '3px 9px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600,
            cursor: 'pointer', border: '1px solid',
            borderColor: mode === m ? cfg[m].color : 'rgba(255,255,255,0.08)',
            background: mode === m ? cfg[m].bg : 'transparent',
            color: mode === m ? cfg[m].color : 'var(--saas-text-muted)',
            transition: 'all 0.15s',
          }}
        >
          {cfg[m].label}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   QUEUE ITEM CARD
═══════════════════════════════════════════ */
function QueueCard({
  item,
  onResolve,
  onLeadCreate,
}: {
  item: QueueItem;
  onResolve: (id: string) => void;
  onLeadCreate?: (item: QueueItem) => void;
}) {
  const [draftText, setDraftText] = useState(item.draft || '');
  const [codeInput, setCodeInput] = useState('');
  const [sending, setSending] = useState(false);

  const typeCfg: Record<QueueType, { icon: string; color: string; label: string }> = {
    review:       { icon: '⭐', color: '#ef4444', label: 'Review Response Needed' },
    code:         { icon: '📱', color: '#f59e0b', label: 'Phone/Email Code Required' },
    post_approval:{ icon: '✅', color: '#6366f1', label: 'Post Awaiting Approval' },
    dm:           { icon: '💬', color: '#0A66C2', label: 'Customer Message' },
    alert:        { icon: '🚨', color: '#ef4444', label: 'Alert' },
  };
  const cfg = typeCfg[item.type];

  const handleAction = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      onResolve(item.id);
    }, 800);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${cfg.color}30`,
      borderLeft: `3px solid ${cfg.color}`,
      borderRadius: 10, padding: '0.9rem 1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '1rem' }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{item.title}</span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 600, color: cfg.color,
              background: `${cfg.color}15`, border: `1px solid ${cfg.color}25`,
              borderRadius: 8, padding: '1px 6px',
            }}>{item.platform}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)' }}>{cfg.label} · {ts(item.createdAt)}</div>
        </div>
      </div>

      <div style={{
        fontSize: '0.78rem', color: 'var(--saas-text-secondary)',
        background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '0.6rem 0.75rem',
        marginBottom: '0.7rem', fontStyle: 'italic', lineHeight: 1.5,
      }}>
        {item.body}
      </div>

      {/* Actions per type */}
      {(item.type === 'review' || item.type === 'dm') && (
        <div style={{ marginBottom: '0.7rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#818cf8', marginBottom: 4, fontWeight: 600 }}>
            🤖 AI draft reply:
          </div>
          <textarea
            value={draftText}
            onChange={e => setDraftText(e.target.value)}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 7, padding: '7px 9px',
              color: 'var(--saas-text)', fontSize: '0.78rem',
              resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
            }}
          />
        </div>
      )}

      {item.type === 'code' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '0.7rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Enter verification code"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: 7, padding: '7px 10px',
              color: 'var(--saas-text)', fontSize: '0.82rem', outline: 'none',
              fontFamily: 'monospace', letterSpacing: '0.15em',
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {item.type === 'review' || item.type === 'dm' ? (
          <>
            <button
              onClick={handleAction}
              disabled={sending}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 7, cursor: 'pointer',
                background: 'rgba(99,102,241,0.18)', color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.3)',
                fontSize: '0.78rem', fontWeight: 600,
              }}
            >
              <Send size={12} />
              {sending ? 'Sending...' : 'Send Reply'}
            </button>
            {item.type === 'dm' && onLeadCreate && (
              <button
                onClick={() => onLeadCreate(item)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
                  background: 'rgba(16,185,129,0.15)', color: '#10b981',
                  border: '1px solid rgba(16,185,129,0.3)',
                  fontSize: '0.75rem', fontWeight: 600,
                }}
              >
                🎯 → Lead Pipeline
              </button>
            )}
          </>
        ) : null}

        {item.type === 'post_approval' ? (
          <button
            onClick={handleAction}
            disabled={sending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 7, cursor: 'pointer',
              background: 'rgba(16,185,129,0.18)', color: '#10b981',
              border: '1px solid rgba(16,185,129,0.3)',
              fontSize: '0.78rem', fontWeight: 600,
            }}
          >
            <CheckCircle size={12} />
            {sending ? 'Publishing...' : 'Approve & Publish'}
          </button>
        ) : item.type === 'code' ? (
          <button
            onClick={handleAction}
            disabled={sending || !codeInput.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 7,
              cursor: codeInput.trim() ? 'pointer' : 'not-allowed',
              background: codeInput.trim() ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)',
              color: codeInput.trim() ? '#f59e0b' : 'var(--saas-text-muted)',
              border: `1px solid ${codeInput.trim() ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}`,
              fontSize: '0.78rem', fontWeight: 600,
            }}
          >
            <Zap size={12} />
            {sending ? 'Submitting...' : 'Submit Code → Resume Agent'}
          </button>
        ) : null}

        <button
          onClick={() => onResolve(item.id)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
            background: 'transparent', color: 'var(--saas-text-muted)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '0.75rem',
          }}
        >
          <XCircle size={12} />
          Dismiss
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   AGENT CARD
═══════════════════════════════════════════ */
function AgentCard({
  agent,
  onToggle,
  onRun,
}: {
  agent: AgentCfg;
  onToggle: (id: string) => void;
  onRun: (id: string) => void;
}) {
  const [running, setRunning] = useState(false);

  const handleRun = () => {
    setRunning(true);
    onRun(agent.id);
    setTimeout(() => setRunning(false), 2000);
  };

  return (
    <div style={{
      background: agent.enabled ? 'rgba(99,102,241,0.07)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${agent.enabled ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 12, padding: '1rem',
      transition: 'all 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '1.3rem' }}>{agent.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 2 }}>{agent.label}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>{agent.desc}</div>
        </div>
        <button
          onClick={() => onToggle(agent.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          title={agent.enabled ? 'Turn off' : 'Turn on'}
        >
          {agent.enabled
            ? <ToggleRight size={26} style={{ color: '#6366f1' }} />
            : <ToggleLeft size={26} style={{ color: '#6b7280' }} />
          }
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.65rem' }}>
        <span style={{
          fontSize: '0.68rem', color: 'var(--saas-text-muted)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Clock size={10} />
          {agent.lastRun ? `Last run: ${ts(agent.lastRun)}` : 'Never run'}
        </span>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700,
          color: agent.tasksDone > 0 ? '#10b981' : 'var(--saas-text-muted)',
        }}>
          {agent.tasksDone} tasks done
        </span>
        <button
          onClick={handleRun}
          disabled={running}
          style={{
            marginLeft: 'auto',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
            background: 'rgba(99,102,241,0.12)', color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.2)',
            fontSize: '0.7rem', fontWeight: 600,
            opacity: running ? 0.6 : 1,
          }}
        >
          <PlayCircle size={11} />
          {running ? 'Running...' : 'Run Now'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PLATFORM ACCOUNT CARD
═══════════════════════════════════════════ */
function AccountCard({
  platform,
  account,
  onChange,
}: {
  platform: SPlatform;
  account: SocialAccount;
  onChange: (id: string, u: Partial<SocialAccount>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasToken = account.token.trim().length > 0;

  const testConn = () => {
    if (!hasToken) return;
    onChange(platform.id, { status: 'testing' });
    setTimeout(() => onChange(platform.id, { status: 'connected' }), 1600);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${account.status === 'connected'
        ? 'rgba(16,185,129,0.28)'
        : account.status === 'expired'
          ? 'rgba(239,68,68,0.28)'
          : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.3s',
    }}>
      <div style={{ padding: '1rem 1.15rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '1.45rem', flexShrink: 0 }}>{platform.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{platform.name}</div>
          </div>
          <StatusBadge status={account.status} />
        </div>

        {/* Mock stats — show when connected */}
        {account.status === 'connected' && (
          <div style={{
            display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap',
          }}>
            {platform.statLabels.map((label, i) => (
              <div key={label} style={{
                background: `${platform.color}12`,
                border: `1px solid ${platform.color}22`,
                borderRadius: 8, padding: '5px 10px', textAlign: 'center', flex: 1, minWidth: 70,
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: platform.color }}>
                  {platform.mockStats[i]}
                </div>
                <div style={{ fontSize: '0.63rem', color: 'var(--saas-text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Mode toggle */}
        <div style={{ marginBottom: '0.7rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--saas-text-muted)', marginBottom: 4 }}>Agent mode:</div>
          <ModeToggle mode={account.mode} onChange={m => onChange(platform.id, { mode: m })} />
        </div>

        {/* Token field */}
        <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
          <input
            type={showToken ? 'text' : 'password'}
            placeholder="Paste access token / API key here"
            value={account.token}
            onChange={e => onChange(platform.id, { token: e.target.value })}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '7px 34px 7px 10px',
              color: 'var(--saas-text)', fontSize: '0.78rem',
              outline: 'none', fontFamily: 'monospace',
            }}
          />
          <button
            onClick={() => setShowToken(v => !v)}
            style={{
              position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--saas-text-muted)', padding: 0,
            }}
          >
            {showToken ? <EyeOff size={13} /> : <EyeIcon size={13} />}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: '0.65rem' }}>
          <input
            type="date"
            placeholder="Token expiry date"
            value={account.tokenExpiry}
            onChange={e => onChange(platform.id, { tokenExpiry: e.target.value })}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '6px 10px',
              color: 'var(--saas-text)', fontSize: '0.78rem', outline: 'none',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={testConn}
            disabled={!hasToken || account.status === 'testing'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 7, cursor: hasToken ? 'pointer' : 'not-allowed',
              background: account.status === 'connected' ? 'rgba(16,185,129,0.15)' : hasToken ? `${platform.color}18` : 'rgba(255,255,255,0.03)',
              color: account.status === 'connected' ? '#10b981' : hasToken ? platform.color : 'var(--saas-text-muted)',
              border: `1px solid ${account.status === 'connected' ? 'rgba(16,185,129,0.3)' : hasToken ? `${platform.color}35` : 'rgba(255,255,255,0.06)'}`,
              fontSize: '0.76rem', fontWeight: 600, transition: 'all 0.2s',
            }}
          >
            <Activity size={11} />
            {account.status === 'testing' ? 'Testing...' : account.status === 'connected' ? 'Active ✓' : 'Test Token'}
          </button>
          <button
            onClick={handleSave}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 12px', borderRadius: 7, cursor: 'pointer',
              background: saved ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
              color: saved ? '#10b981' : 'var(--saas-text-muted)',
              border: `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}`,
              fontSize: '0.76rem', fontWeight: 600, transition: 'all 0.2s',
            }}
          >
            <Save size={11} />
            {saved ? 'Saved!' : 'Save'}
          </button>
          <a
            href={platform.dashUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 10px', borderRadius: 7,
              background: 'transparent', color: 'var(--saas-text-muted)',
              border: '1px solid rgba(255,255,255,0.07)',
              textDecoration: 'none', fontSize: '0.74rem', fontWeight: 600,
            }}
          >
            <ExternalLink size={10} />
            Open
          </a>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--saas-text-muted)', fontSize: '0.72rem',
            }}
          >
            Token Guide {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '0.85rem 1.15rem',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--saas-text-secondary)' }}>
            🔑 How to get your access token
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {(() => {
              let n = 0;
              return platform.tokenGuide.map((step, i) => {
                const warn = step.startsWith('⚠️');
                if (!warn) n++;
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{
                      flexShrink: 0, width: 17, height: 17, borderRadius: '50%', marginTop: 2,
                      background: warn ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${warn ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.55rem', fontWeight: 700,
                      color: warn ? '#f59e0b' : 'var(--saas-text-muted)',
                    }}>
                      {warn ? '!' : n}
                    </span>
                    <span style={{
                      fontSize: '0.76rem', lineHeight: 1.5, flex: 1,
                      color: warn ? '#f59e0b' : 'var(--saas-text-secondary)',
                    }}>{step}</span>
                  </div>
                );
              });
            })()}
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <textarea
              placeholder="Notes (token scope, expiry notes, refresh info...)"
              value={account.notes}
              onChange={e => onChange(platform.id, { notes: e.target.value })}
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 7, padding: '6px 9px',
                color: 'var(--saas-text)', fontSize: '0.75rem',
                resize: 'vertical', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function SocialAccountsPage() {
  const [store, setStore]       = useState<Store | null>(null);
  const [loading, setLoading]   = useState(true);
  const [accounts, setAccounts] = useState<Record<string, SocialAccount>>({});
  const [agents, setAgents]     = useState<AgentCfg[]>([]);
  const [queue, setQueue]       = useState<QueueItem[]>([]);
  const [log, setLog]           = useState<LogEntry[]>([]);
  const [logOpen, setLogOpen]   = useState(false);
  const [leadCount, setLeadCount] = useState(0);
  const [bizName, setBizName]   = useState('');

  useEffect(() => {
    const load = async () => {
      let id = 'store-1';
      if (typeof window !== 'undefined') {
        const s = localStorage.getItem('active_store_id');
        if (s) id = s;
      }
      const stores = await db.getStores();
      const cur = stores.find(s => s.id === id) || stores[0];
      if (cur) setStore(cur);
      setAccounts(loadAccounts());
      setAgents(loadAgents());
      setQueue(loadQueue());
      setLog(loadLog());
      setLeadCount(countAgentLeads());
      const biz = readBusinessProfile();
      if (biz.businessName) setBizName(biz.businessName);
      setLoading(false);
    };
    load();
  }, []);

  const updateAccount = useCallback((pid: string, u: Partial<SocialAccount>) => {
    setAccounts(prev => {
      const next = { ...prev, [pid]: { ...prev[pid], ...u } };
      localStorage.setItem(SA_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleAgent = useCallback((id: string) => {
    setAgents(prev => {
      const next = prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
      localStorage.setItem(AG_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const runAgent = useCallback((id: string) => {
    const actions = MOCK_AGENT_ACTIONS[id] || [];
    const now = new Date().toISOString();
    const newEntries: LogEntry[] = actions.map((a, i) => ({
      id: `${Date.now()}-${i}`,
      agentId: id,
      platform: a.platform,
      action: a.action,
      result: a.result,
      ts: now,
    }));
    const humanItems = newEntries.filter(e => e.result === 'human_required');

    setLog(prev => {
      const next = [...newEntries, ...prev].slice(0, 40);
      localStorage.setItem(LOG_KEY, JSON.stringify(next));
      return next;
    });

    if (humanItems.length > 0) {
      const newQItems: QueueItem[] = humanItems.map((e, i) => ({
        id: `q-${Date.now()}-${i}`,
        platform: e.platform,
        type: id === 'reply' ? 'dm' : 'code' as QueueType,
        title: `Agent paused — human needed`,
        body: e.action,
        createdAt: now,
        resolved: false,
      }));
      setQueue(prev => {
        const next = [...newQItems, ...prev];
        localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
        return next;
      });
    }

    // ── Ecosystem: auto-create leads from agent actions ──
    const AGENT_LEAD_NAMES: Record<string, string[]> = {
      reply:   ['Sarah K.','James O.','Maria L.','Priya S.','Tom B.'],
      growth:  ['Aisha N.','Luke M.','Fatima R.','Dan C.','Yemi A.'],
      monitor: ['Rachel T.','Omar F.','Nina W.','Chris P.','Jade E.'],
      alert:   ['Hot Prospect','Urgent Enquiry'],
    };
    const successActions = newEntries.filter(e => e.result === 'success');
    if (['reply','growth','monitor','alert'].includes(id) && successActions.length > 0) {
      const namePool = AGENT_LEAD_NAMES[id] || [];
      const count = Math.min(successActions.length, 2);
      for (let i = 0; i < count; i++) {
        const a = successActions[i];
        createLeadFromAgent({
          name: namePool[Math.floor(Math.random() * namePool.length)] || 'Social Lead',
          platform: a.platform.split('+')[0].trim(),
          agentId: id,
          note: a.action,
        });
      }
      setLeadCount(countAgentLeads());
    }

    setAgents(prev => {
      const next = prev.map(a =>
        a.id === id
          ? { ...a, lastRun: now, tasksDone: a.tasksDone + actions.filter(x => x.result === 'success').length }
          : a
      );
      localStorage.setItem(AG_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resolveQueue = useCallback((qid: string) => {
    setQueue(prev => {
      const next = prev.map(q => q.id === qid ? { ...q, resolved: true } : q);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleLeadCreate = useCallback((item: QueueItem) => {
    addLeadToPipeline({
      name: `DM — ${item.platform}`,
      contact: '',
      contactType: item.platform === 'WhatsApp' ? 'whatsapp' : 'phone',
      source: 'social',
      sourceName: item.platform,
      score: 'warm',
      status: 'new',
      businessUnit: bizName,
      notes: item.body,
      tags: ['dm', 'social', item.platform.toLowerCase()],
      capturedAt: item.createdAt,
      nurtureSent: 0,
      nurtureMessages: [],
    });
    setLeadCount(c => c + 1);
    resolveQueue(item.id);
  }, [bizName, resolveQueue]);

  const connectedCount  = Object.values(accounts).filter(a => a.status === 'connected').length;
  const pendingQueue    = queue.filter(q => !q.resolved);
  const enabledAgents   = agents.filter(a => a.enabled).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#9ca3af' }}>
        <h3>Loading...</h3>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <DashboardSidebar storeName={store?.name} storeLogo={store?.logo_text} />

      <main className="dashboard-content">

        {/* ── Hero ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.1) 50%, rgba(16,185,129,0.06) 100%)',
          border: '1px solid rgba(99,102,241,0.22)',
          borderRadius: 18, padding: '1.75rem 2rem', marginBottom: '1.75rem',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 200, height: 200,
            background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 20, padding: '4px 12px', marginBottom: '0.85rem',
            fontSize: '0.7rem', fontWeight: 700, color: '#818cf8', letterSpacing: '0.04em',
          }}>
            🤖 AI AGENT SOCIAL MANAGER
          </div>
          <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', marginBottom: '0.4rem', lineHeight: 1.2 }}>
            Your Social Accounts,<br />
            <span style={{ color: '#818cf8' }}>Managed by AI.</span>
          </h1>
          <p style={{ color: 'var(--saas-text-secondary)', fontSize: '0.88rem', maxWidth: 600, lineHeight: 1.65, marginBottom: '1.25rem' }}>
            Paste your access tokens below. AI agents monitor all platforms 24/7, post on schedule,
            draft replies, and track growth — automatically. They pause and notify you <strong style={{ color: '#a5b4fc' }}>only when human input is needed</strong>.
            You check the queue once a day and clear it in minutes.
          </p>
          {/* Summary pills */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { label: `${connectedCount}/${PLATFORMS.length} accounts connected`, color: '#10b981' },
              { label: `${enabledAgents}/${agents.length} agents active`, color: '#6366f1' },
              { label: `${pendingQueue.length} items in human queue`, color: pendingQueue.length > 0 ? '#f59e0b' : '#6b7280' },
              { label: `🎯 ${leadCount} leads in pipeline`, color: leadCount > 0 ? '#10b981' : '#6b7280' },
              ...(bizName ? [{ label: `🏢 ${bizName}`, color: '#818cf8' }] : []),
            ].map(p => (
              <span key={p.label} style={{
                fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                background: `${p.color}15`, border: `1px solid ${p.color}30`, color: p.color,
              }}>{p.label}</span>
            ))}
          </div>
        </div>

        {/* ── Agent Control Panel ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem' }}>
            <Zap size={16} style={{ color: '#6366f1' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>AI Agent Control Panel</span>
            <span style={{
              marginLeft: 'auto', fontSize: '0.72rem', color: enabledAgents > 0 ? '#10b981' : 'var(--saas-text-muted)', fontWeight: 600,
            }}>
              {enabledAgents} agents running
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {agents.map(agent => (
              <AgentCard key={agent.id} agent={agent} onToggle={toggleAgent} onRun={runAgent} />
            ))}
          </div>
          <div style={{
            marginTop: '0.75rem', fontSize: '0.74rem', color: 'var(--saas-text-muted)',
            background: 'rgba(99,102,241,0.06)', borderRadius: 8, padding: '0.6rem 0.9rem',
            border: '1px solid rgba(99,102,241,0.12)',
          }}>
            💡 <strong style={{ color: '#818cf8' }}>Approve Mode</strong> = agent drafts, you approve before anything posts.&nbsp;
            <strong style={{ color: '#10b981' }}>Auto Mode</strong> = agent acts immediately without asking. Start with Approve Mode.
          </div>
        </div>

        {/* ── Human Queue ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem' }}>
            <Inbox size={16} style={{ color: pendingQueue.length > 0 ? '#f59e0b' : '#6b7280' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Human Queue</span>
            {pendingQueue.length > 0 && (
              <span style={{
                background: '#f59e0b', color: '#000', borderRadius: 99,
                fontSize: '0.65rem', fontWeight: 800, padding: '1px 7px',
              }}>{pendingQueue.length}</span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--saas-text-muted)' }}>
              Agents paused here — your input needed
            </span>
          </div>

          {pendingQueue.length === 0 ? (
            <div style={{
              background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)',
              borderRadius: 12, padding: '1.5rem', textAlign: 'center',
              color: '#10b981', fontSize: '0.85rem', fontWeight: 600,
            }}>
              ✓ Queue clear — agents running fully automated
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pendingQueue.map(item => (
                <QueueCard key={item.id} item={item} onResolve={resolveQueue} onLeadCreate={handleLeadCreate} />
              ))}
            </div>
          )}
        </div>

        {/* ── Account Cards ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem' }}>
            <User size={16} style={{ color: '#6366f1' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Connected Accounts</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--saas-text-muted)' }}>
              {connectedCount}/{PLATFORMS.length} connected
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
            {PLATFORMS.map(platform => (
              <AccountCard
                key={platform.id}
                platform={platform}
                account={accounts[platform.id] || { token: '', tokenExpiry: '', status: 'disconnected', mode: 'approve', notes: '' }}
                onChange={updateAccount}
              />
            ))}
          </div>
        </div>

        {/* ── Activity Log ── */}
        <div style={{ marginBottom: '1.75rem' }}>
          <button
            onClick={() => setLogOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '0.9rem 1.1rem', cursor: 'pointer',
              color: 'var(--saas-text)',
            }}
          >
            <Activity size={15} style={{ color: '#6366f1' }} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Agent Activity Log</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)', marginLeft: 4 }}>
              {log.length} entries
            </span>
            <span style={{ marginLeft: 'auto' }}>
              {logOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </span>
          </button>

          {logOpen && (
            <div style={{
              background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)',
              borderTop: 'none', borderRadius: '0 0 12px 12px',
              maxHeight: 380, overflowY: 'auto',
            }}>
              {log.map(entry => {
                const resultCfg = {
                  success:        { color: '#10b981', icon: '✓' },
                  human_required: { color: '#f59e0b', icon: '⏸' },
                  failed:         { color: '#ef4444', icon: '✗' },
                }[entry.result];
                const agentEmoji = agents.find(a => a.id === entry.agentId)?.emoji || '🤖';
                return (
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '0.6rem 1.1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{agentEmoji}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.76rem', color: 'var(--saas-text-secondary)' }}>
                        <strong style={{ color: 'var(--saas-text)' }}>{entry.platform}</strong>
                        {' — '}{entry.action}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, color: resultCfg.color, flexShrink: 0,
                    }}>
                      {resultCfg.icon}
                    </span>
                    <span style={{ fontSize: '0.66rem', color: 'var(--saas-text-muted)', flexShrink: 0 }}>
                      {ts(entry.ts)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div style={{
          padding: '1rem 1.25rem',
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 10, fontSize: '0.78rem', color: '#d97706', lineHeight: 1.6,
        }}>
          <strong>🔒 Token security:</strong> All access tokens stored only in your browser (localStorage). Never shared with any server.
          Tokens expire — set expiry dates above and regenerate before they expire. Use Approve Mode until you trust the agent.
        </div>
      </main>
    </div>
  );
}
