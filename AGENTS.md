<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:miller-saas-hub-rules -->
# Miller SaaS Hub — Project Rules (learned from mistakes)

## MANDATORY: Every dashboard page MUST have sidebar + layout wrapper

Every new page under `/dashboard/*` MUST follow this exact pattern — no exceptions:

```tsx
import DashboardSidebar from '../../../components/DashboardSidebar';
import { useStore } from '../../../lib/useStore';

export default function MyPage() {
  const store = useStore();

  return (
    <div className="dashboard-layout">
      <DashboardSidebar storeName={store?.name} storeLogo={store?.logo_text} />
      <main className="dashboard-content">
        {/* page content here */}
      </main>
    </div>
  );
}
```

Use the shared `useStore()` hook from `src/lib/useStore.ts` — do NOT hand-roll
`useState`+`useEffect` store loading in pages. The hook resolves
'active_store_id' → DEFAULT_STORE_ID → first seeded store and keeps all state
updates after an `await`, keeping the `react-hooks/set-state-in-effect` rule happy.

**Mistake logged:** Lead Management page (`/dashboard/leads`) was built without sidebar wrapper — rendered outside dashboard layout. Fixed in commit 2487cf4. Never skip this pattern again.

## Ecosystem keys (single source of truth — use millerEcosystem.ts)
- `miller_leads_v1` — leads pipeline
- `miller_landing_sites_v1` — landing builder sites
- `miller_business_info_v1` — business profile
- `miller_social_creds_v1` — social platform credentials
- `miller_agent_cfg_v1` — AI agent config
- `miller_wa_drafts_v1` — WhatsApp draft queue
- `miller_wa_senders_v1` — WhatsApp sender slots

## Branding rules
- AI agent = **Miller AI** (never "Mila AI", never "Claude")
- Tagline = "Powered by Miller AI · 80% AI Agent Driven"
<!-- END:miller-saas-hub-rules -->
