/**
 * Miller SaaS Hub — Ecosystem Bridge
 * Shared helpers read/write across all dashboard modules.
 * Social Accounts ↔ Lead Management ↔ Landing Builder ↔ Business Profile
 */

/* ─── Storage keys (single source of truth) ─── */
export const LEADS_KEY       = 'miller_leads_v1';
export const SITES_KEY       = 'miller_landing_sites_v1';
export const BIZ_INFO_KEY    = 'miller_business_info_v1';
export const SOCIAL_CREDS_KEY= 'miller_social_creds_v1';
export const AGENT_CFG_KEY   = 'miller_agent_cfg_v1';
export const WA_DRAFTS_KEY   = 'miller_wa_drafts_v1';

/* ─── Shared mini-types (avoid import cycles) ─── */
export type LeadScore  = 'hot' | 'warm' | 'cold';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
export type LeadSource = 'whatsapp' | 'landing_page' | 'social' | 'platform' | 'referral' | 'manual';

export interface EcosystemLead {
  id: string;
  name: string;
  contact: string;
  contactType: 'whatsapp' | 'email' | 'phone';
  source: LeadSource;
  sourceName?: string;       // e.g. site name, platform name
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
  nurtureMessages: unknown[];
}

export interface LandingSite {
  id: string;
  businessName: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  html: string;
}

export interface BusinessProfile {
  businessName?: string;
  industry?: string;
  location?: string;
  phone?: string;
  email?: string;
  tagline?: string;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ─── Business Profile ─────────────────────── */
export function readBusinessProfile(): BusinessProfile {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(BIZ_INFO_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/* ─── Landing Sites ────────────────────────── */
export function getLandingSites(): LandingSite[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getLeadCountForSite(siteName: string): number {
  const leads = readAllLeads();
  return leads.filter(l =>
    l.source === 'landing_page' &&
    l.sourceName?.toLowerCase() === siteName.toLowerCase()
  ).length;
}

/* ─── Leads ────────────────────────────────── */
export function readAllLeads(): EcosystemLead[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function writeLeads(leads: EcosystemLead[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

/**
 * Create a lead from an AI agent action.
 * Skips creation if a lead with same contact already exists.
 */
export function createLeadFromAgent(opts: {
  name: string;
  contact?: string;
  platform: string;
  agentId: string;
  note: string;
  score?: LeadScore;
}): EcosystemLead | null {
  const leads = readAllLeads();
  const biz = readBusinessProfile();

  // Deduplicate by contact if provided
  if (opts.contact && leads.some(l => l.contact === opts.contact)) return null;

  const agentScoreMap: Record<string, LeadScore> = {
    reply:   'warm',
    monitor: 'warm',
    growth:  'cold',
    alert:   'hot',
    post:    'cold',
  };

  const lead: EcosystemLead = {
    id: uid(),
    name: opts.name,
    contact: opts.contact || `@${opts.platform.toLowerCase()}_lead_${uid().slice(-4)}`,
    contactType: opts.platform === 'WhatsApp' ? 'whatsapp' : 'phone',
    source: 'social',
    sourceName: opts.platform,
    score: opts.score ?? agentScoreMap[opts.agentId] ?? 'cold',
    status: 'new',
    businessUnit: biz.businessName || '',
    notes: `Via Miller AI ${opts.agentId} agent on ${opts.platform}. ${opts.note}`,
    tags: ['agent-generated', opts.agentId, opts.platform.toLowerCase()],
    capturedAt: new Date().toISOString(),
    nurtureSent: 0,
    nurtureMessages: [],
  };

  writeLeads([...leads, lead]);
  return lead;
}

/**
 * Add a single lead manually (used by DM queue "→ Pipeline" action).
 */
export function addLeadToPipeline(lead: Omit<EcosystemLead, 'id'>): EcosystemLead {
  const leads = readAllLeads();
  const full: EcosystemLead = { ...lead, id: uid() };
  writeLeads([...leads, full]);
  return full;
}

/* ─── Agents ───────────────────────────────── */
export interface AgentStatus {
  id: string;
  label: string;
  emoji: string;
  enabled: boolean;
  tasksDone: number;
}

export function getAgentStatuses(): AgentStatus[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AGENT_CFG_KEY);
    const agents: AgentStatus[] = raw ? JSON.parse(raw) : [];
    return agents.map(a => ({ id: a.id, label: a.label, emoji: a.emoji, enabled: a.enabled, tasksDone: a.tasksDone }));
  } catch { return []; }
}

export function countAgentLeads(): number {
  return readAllLeads().filter(l => l.source === 'social').length;
}
