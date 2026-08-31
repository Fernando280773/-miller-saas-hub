/**
 * Miller SaaS Hub — Ecosystem Bridge
 * Shared helpers read/write across all dashboard modules.
 * Social Accounts ↔ Lead Management ↔ Landing Builder ↔ Business Profile
 */

export const LEADS_KEY       = 'miller_leads_v1';
export const SITES_KEY       = 'miller_landing_sites_v1';
export const BIZ_INFO_KEY    = 'miller_business_info_v1';
export const SOCIAL_CREDS_KEY= 'miller_social_creds_v1';
export const AGENT_CFG_KEY   = 'miller_agent_cfg_v1';
export const WA_DRAFTS_KEY   = 'miller_wa_drafts_v1';

export const ECOSYSTEM_KEYS = {
  leads: LEADS_KEY,
  landingSites: SITES_KEY,
  businessInfo: BIZ_INFO_KEY,
  socialCreds: SOCIAL_CREDS_KEY,
  agentConfig: AGENT_CFG_KEY,
  waDrafts: WA_DRAFTS_KEY,
};

/* ─── Shared types — single source of truth in ./types ─── */
import type {
  LeadScore,
  EcosystemLead,
  StoredLandingSite,
  BusinessProfile,
  AgentStatus,
} from './types';
export type {
  LeadScore,
  LeadStatus,
  LeadSource,
  EcosystemLead,
  StoredLandingSite,
  BusinessProfile,
  AgentStatus,
} from './types';
// Back-compat alias: the ecosystem bridge historically exported LandingSite.
// Re-export it as StoredLandingSite for new code, keep the old name working.
export type { StoredLandingSite as LandingSite } from './types';

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
export function getLandingSites(): StoredLandingSite[] {
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
