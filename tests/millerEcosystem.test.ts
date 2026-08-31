import { describe, it, expect, beforeEach } from 'vitest';
import {
  ECOSYSTEM_KEYS, LEADS_KEY, readAllLeads, writeLeads,
  createLeadFromAgent, addLeadToPipeline, readBusinessProfile,
  getLeadCountForSite, countAgentLeads,
} from '@/lib/millerEcosystem';
import type { EcosystemLead } from '@/lib/millerEcosystem';

describe('millerEcosystem — shared ecosystem bridge', () => {
  beforeEach(() => localStorage.clear());

  it('exposes the canonical ecosystem keys', () => {
    expect(ECOSYSTEM_KEYS.leads).toBe('miller_leads_v1');
    expect(ECOSYSTEM_KEYS.landingSites).toBe('miller_landing_sites_v1');
    expect(ECOSYSTEM_KEYS.businessInfo).toBe('miller_business_info_v1');
    expect(ECOSYSTEM_KEYS.socialCreds).toBe('miller_social_creds_v1');
    expect(ECOSYSTEM_KEYS.agentConfig).toBe('miller_agent_cfg_v1');
    expect(ECOSYSTEM_KEYS.waDrafts).toBe('miller_wa_drafts_v1');
  });

  it('returns an empty profile when nothing is stored', () => {
    expect(readBusinessProfile()).toEqual({});
  });

  it('creates a lead from an agent action with agent-derived scoring', () => {
    const lead = createLeadFromAgent({
      name: 'Insta Fan', contact: '@fan', platform: 'Instagram',
      agentId: 'reply', note: 'asked about pricing',
    });
    expect(lead).not.toBeNull();
    expect(lead!.source).toBe('social');
    expect(lead!.score).toBe('warm'); // reply agent → warm
    expect(lead!.tags).toContain('agent-generated');
    expect(readAllLeads().length).toBe(1);
  });

  it('deduplicates agent leads by contact', () => {
    const opts = {
      name: 'Fan', contact: 'same@x.com', platform: 'WhatsApp',
      agentId: 'alert', note: 'first',
    };
    createLeadFromAgent(opts);
    const dup = createLeadFromAgent(opts);
    expect(dup).toBeNull();
    expect(readAllLeads().length).toBe(1);
  });

  it('counts landing-page leads per site', () => {
    const leads = [
      { source: 'landing_page', sourceName: 'SiteA' },
      { source: 'landing_page', sourceName: 'SiteA' },
      { source: 'landing_page', sourceName: 'SiteB' },
    ];
    // write raw leads in ecosystem storage format
    const stored = leads.map((l, i) => ({
      id: 'l' + i, name: 'L' + i, contact: 'c' + i,
      contactType: 'email' as const,
      source: l.source as EcosystemLead['source'],
      sourceName: l.sourceName, score: 'cold' as const, status: 'new' as const,
      notes: '', tags: [], capturedAt: new Date().toISOString(),
      nurtureSent: 0, nurtureMessages: [],
    }));
    writeLeads(stored);
    expect(getLeadCountForSite('SiteA')).toBe(2);
    expect(getLeadCountForSite('SiteB')).toBe(1);
    expect(countAgentLeads()).toBe(0); // none are social
  });

  it('adds a lead directly to the pipeline with an id assigned', () => {
    const lead = addLeadToPipeline({
      name: 'Manual', contact: 'm@x.com', contactType: 'email', source: 'manual',
      score: 'hot', status: 'new', notes: '', tags: [], capturedAt: new Date().toISOString(),
      nurtureSent: 0, nurtureMessages: [],
    });
    expect(lead.id).toBeTruthy();
    expect(readAllLeads().some(l => l.id === lead.id)).toBe(true);
    expect(LEADS_KEY).toBe('miller_leads_v1');
  });
});
