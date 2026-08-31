import { describe, it, expect } from 'vitest';
import { DEFAULT_STORE_ID, db } from '@/lib/supabaseClient';
import { ECOSYSTEM_KEYS } from '@/lib/millerEcosystem';

describe('Multi-Tenant Identity & Storage Invariants', () => {
  it('enforces valid UUID v4 for the seeded default demo tenant', () => {
    expect(DEFAULT_STORE_ID).toBe('00000000-0000-0000-0000-000000000001');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(DEFAULT_STORE_ID)).toBe(true);
  });

  it('guarantees ecosystem keys are defined as single source of truth', () => {
    expect(ECOSYSTEM_KEYS.leads).toBe('miller_leads_v1');
    expect(ECOSYSTEM_KEYS.landingSites).toBe('miller_landing_sites_v1');
    expect(ECOSYSTEM_KEYS.businessInfo).toBe('miller_business_info_v1');
    expect(ECOSYSTEM_KEYS.socialCreds).toBe('miller_social_creds_v1');
    expect(ECOSYSTEM_KEYS.agentConfig).toBe('miller_agent_cfg_v1');
    expect(ECOSYSTEM_KEYS.waDrafts).toBe('miller_wa_drafts_v1');
  });

  it('returns valid seed stores from db.getStores()', async () => {
    const stores = await db.getStores();
    expect(Array.isArray(stores)).toBe(true);
    expect(stores.length).toBeGreaterThan(0);
    const demoStore = stores.find(s => s.id === DEFAULT_STORE_ID);
    expect(demoStore).toBeDefined();
    expect(demoStore?.name).toBe('Miller Demo Store');
  });
});
