# Miller SaaS Hub — Version 2 (v2) Blueprint & Roadmap

> **Tagline:** Powered by Miller AI · 80% AI Agent Driven  
> **Status:** Phase 2 Blueprint & Implementation Plan  
> **Previous Milestone:** v1 frozen as functional interactive prototype (`fa5646a`)

---

## 🧭 Executive Summary

**Miller SaaS Hub v1** established the 13 core dashboard modules, unified client-side state bridge (`millerEcosystem.ts`), and rich interactive UI workflows. 

**Version 2 (v2)** transforms Miller SaaS Hub into a **production-grade, multi-tenant AI-driven commerce & CRM platform**. The primary focus of v2 is transitioning client-side mock/`localStorage` persistence to **live Supabase PostgreSQL with strict Row Level Security (RLS)**, deploying **live serverless Edge Functions & webhooks**, enabling **live WhatsApp Cloud API & Social integrations**, and providing **public-facing landing page hosting with automated lead capture**.

---

## 🏗️ v2 Architectural Topology

```mermaid
graph TD
  subgraph PublicLayer [Public Web & Customers]
    Landing[Hosted Merchant Landing Pages]
    WAUser[Customer / Supplier WhatsApp]
    MarketplaceOrder[Amazon / eBay / UberEats Orders]
  end

  subgraph NextJSLayer [Next.js App Router (Vercel / Cloud)]
    AppRouter[Admin Dashboard (13 Modules)]
    SubdomainRouter[Subdomain / Custom Domain Middleware]
    CaptureAPI[Public Lead Capture Endpoint /api/leads/capture]
    WebhookAPI[Webhook Ingestion /api/webhooks/whatsapp]
  end

  subgraph SupabaseLayer [Supabase Backend & PostgreSQL]
    Auth[Supabase Auth (Magic Link, OAuth, RBAC)]
    DB[(PostgreSQL Database with RLS)]
    Realtime[Supabase Realtime Engine]
    Storage[Supabase Storage Buckets (Invoices, Logos, Media)]
  end

  subgraph EdgeWorkerLayer [Edge Functions & AI Automations]
    DenoOCR[Edge Function: WhatsApp Invoice OCR & LLM Parser]
    DenoScraper[Edge Function: Headless Competitor Scraper]
    AgentWorker[Edge Function: Social Monitor & Lead Scout]
    DripWorker[Edge Function: Multi-Channel Lead Nurture Cron]
  end

  subgraph ExternalSaaS [Third-Party Ecosystem]
    MetaAPI[WhatsApp Cloud API & Meta Graph API]
    StripeAPI[Stripe Subscriptions & Usage Metering]
    EmailAPI[Resend / SendGrid Email Dispatcher]
  end

  Landing -->|Form Submission| CaptureAPI
  CaptureAPI --> DB
  WAUser <-->|Inbound / Outbound| MetaAPI
  MetaAPI <--> WebhookAPI
  WebhookAPI --> DenoOCR
  DenoOCR --> DB
  
  MarketplaceOrder --> EdgeWorkerLayer
  AppRouter <--> Auth
  AppRouter <--> DB
  AppRouter <--> Realtime
  AppRouter <--> Storage

  EdgeWorkerLayer <--> DB
  DripWorker --> MetaAPI
  DripWorker --> EmailAPI
  AppRouter <--> StripeAPI
```

---

## 📦 Phase-by-Phase Roadmap

### 📋 Phase 1: Database Migration & Schema Expansion (`supabase/migrations/03_v2_schema.sql`)
*Replace all `localStorage` ecosystem keys with production Postgres tables, indexes, and RLS policies.*

- [ ] **`leads` Table** (replaces `miller_leads_v1`):
  - Fields: `id`, `store_id`, `name`, `email`, `phone`, `company`, `source_site_id`, `stage` (New, Contacted, Qualified, Proposal, Won, Lost), `score` (Hot, Warm, Cold), `tags`, `ai_summary`, `nurture_log` (JSONB), `created_at`, `updated_at`.
- [ ] **`landing_sites` Table** (replaces `miller_landing_sites_v1`):
  - Fields: `id`, `store_id`, `title`, `slug`, `business_name`, `page_type`, `palette_id`, `font_style`, `sections` (JSONB), `custom_domain`, `published_html`, `is_published`, `views_count`, `leads_count`, `created_at`.
- [ ] **`ai_agent_configs` Table** (replaces `miller_agent_cfg_v1`):
  - Fields: `id`, `store_id`, `agent_type` (Monitor, Post, Reply, Growth, Alert), `is_active`, `tone`, `auto_reply_threshold`, `schedule_cron`, `last_run_at`, `config` (JSONB).
- [ ] **`whatsapp_drafts` Table** (replaces `miller_wa_drafts_v1`):
  - Fields: `id`, `store_id`, `lead_id`, `recipient_phone`, `message_text`, `status` (Draft, Approved, Sent, Failed), `media_url`, `created_at`.
- [ ] **`supplier_invoices` Table** (replaces `purchases_v1`):
  - Fields: `id`, `store_id`, `supplier_name`, `invoice_number`, `invoice_date`, `total_amount`, `currency`, `status` (Pending, Verified, Paid), `items` (JSONB), `image_storage_path`.
- [ ] **Enable Supabase Realtime** on `leads`, `orders`, and `whatsapp_drafts` for instant dashboard sync.

---

### ⚡ Phase 2: Live Ingestion & Serverless Edge Functions
*Move client-side mock timers to serverless event-driven background workers.*

- [ ] **WhatsApp Cloud API Inbound Webhook (`/api/webhooks/whatsapp`)**:
  - Receive verified inbound WhatsApp messages from customers/staff.
  - Detect message intent:
    - *Invoice image attached:* Send image to Supabase Storage & trigger OCR/LLM invoice parsing into `supplier_invoices`.
    - *Customer inquiry:* Auto-create/update lead record in `leads` and enqueue a Miller AI draft response in `whatsapp_drafts`.
- [ ] **Competitor Scraper Worker (`supabase/functions/competitor-scraper`)**:
  - Scheduled cron to check active competitor URLs from `competitor_pricing`.
  - Extract price, availability, and write price change history with automated repricing alerts.
- [ ] **Social Media & Meta Graph API Integration**:
  - Live OAuth2 token refresh & token storage in `platform_accounts`.
  - Edge worker to pull post comments, DMs, and mentions into the social queue.

---

### 🌐 Phase 3: Public Landing Page Hosting & Form Capture Engine
*Make generated landing pages live on the web with instant lead routing.*

- [ ] **Dynamic Subdomain / Slug Router (`src/app/p/[slug]/page.tsx`)**:
  - Edge-cached route that fetches published HTML/JSON schema from `landing_sites` and renders the mobile-first animated page.
- [ ] **Public Lead Capture API (`/api/leads/capture`)**:
  - CORS-enabled endpoint accepting contact submissions from published landing pages.
  - Automatically enriches lead with IP geolocation, referrer, assigns Miller AI score, and notifies dashboard via Realtime.
- [ ] **Page Analytics Engine**:
  - Lightweight page-view & conversion event logger to display live CTR and lead counts in the Landing Builder gallery.

---

### 🔐 Phase 4: Multi-Tenant Auth, Teams & Security
*Enterprise-ready security and user management.*

- [ ] **Supabase Auth Integration**:
  - Passwordless Email Magic Links & Google OAuth.
  - Multi-tenant middleware protecting all `/dashboard/*` routes.
- [ ] **Role-Based Access Control (RBAC)**:
  - Roles: `Store Owner` (Billing, settings, all modules), `Store Manager` (CRM, orders, landing builder), `Staff / Operator` (Orders, WhatsApp inbox).
- [ ] **Audit Logging**:
  - Record major merchant actions (price overrides, lead status changes, platform credential updates).

---

### 🤖 Phase 5: Automated Nurture Sequences & Miller AI Dispatch
*Close the loop from lead capture to sale without manual intervention.*

- [ ] **Automated Nurture Flow Trigger**:
  - When lead status updates to `Qualified` or score is `Hot`:
    - Auto-schedule multi-step follow-ups (WhatsApp msg -> Email 24h later -> Reminder notification).
- [ ] **One-Click & Auto-Send WhatsApp Integration**:
  - Direct WhatsApp Cloud API dispatch for approved drafts with webhook delivery status tracking (`Sent`, `Delivered`, `Read`).

---

### 💳 Phase 6: Stripe Subscriptions & Metering
*Monetize the SaaS platform with tiered plans.*

- [ ] **Stripe Billing Integration**:
  - **Starter Tier (£29/mo):** 1 Store, 500 Products, Basic CRM, 2 Landing Pages.
  - **Growth Tier (£79/mo):** Multi-platform marketplace connector, 5 AI Agents, WhatsApp Invoice Capture, 10 Landing Pages.
  - **Scale / Agency Tier (£199/mo):** Custom domains, unlimited landing pages, automated repricer, dedicated edge scrapers.
- [ ] **Customer Billing Portal**:
  - Self-service subscription management, invoice downloads, and plan upgrades.

---

## 🗓️ Implementation Milestones

| Milestone | Target Scope | Output Artifacts |
| :--- | :--- | :--- |
| **M1: Database & RLS** | Create full v2 SQL migrations and update `supabaseClient.ts` | `03_v2_schema.sql`, `supabaseClient.ts` v2 types |
| **M2: Live CRM & Leads** | Migrate `/dashboard/leads` to live Supabase with Realtime | Realtime Kanban board & lead details |
| **M3: Landing Engine** | Public hosting route `/p/[slug]` & lead capture API | Live landing pages & capture endpoint |
| **M4: WhatsApp & OCR** | Inbound webhook & LLM invoice parser Edge function | WhatsApp webhook + Purchase Hub link |
| **M5: Auth & Subdomains** | Supabase Auth + Next.js Middleware + RBAC | Multi-tenant auth & permission gates |
| **M6: Stripe Billing** | Stripe Checkout, webhooks, and customer portal | Monetization engine & billing dashboard |

---

*Miller SaaS Hub v2 Roadmap approved for development.*
