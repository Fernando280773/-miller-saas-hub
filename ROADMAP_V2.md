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

## 📦 Phase-by-Phase Roadmap & Commercial Readiness

### 🛡️ Phase A: Make it Real & Safe (Core Backend & Security) — ✅ COMPLETED
*The foundational plumbing required for multi-tenant isolation and security.*

- [x] **Strict PostgreSQL RLS Policies (`04_strict_security_and_tenancy.sql`)**:
  - Replaced all permissive `USING(true)` rules with `public.is_store_member(store_id, min_role)` checks.
  - Introduced `store_members` table linking Supabase `auth.users(id)` to tenant stores with roles (`owner`, `manager`, `staff`).
- [x] **Real Supabase Auth Integration (`src/lib/auth.ts` & `/login`)**:
  - Live session handling via `supabase.auth.getSession()` & `supabase.auth.onAuthStateChange()`.
  - Password and passwordless magic link support.
  - Isolated demo sandbox clearly labeled for client evaluation.
- [x] **Secure Public Lead Capture (`/api/leads/capture`)**:
  - IP-based sliding window rate limiting (10 req/min).
  - Honeypot bot trap detection (`website`, `_hp_trap`).
  - Mandatory store existence check and input sanitization.
- [x] **Database Schema Expansion (`03_v2_schema.sql`)**:
  - Tables for `leads`, `landing_sites`, `ai_agent_configs`, `whatsapp_drafts`, and `supplier_invoices`.

---

### ⚡ Phase B: Live Ingestion & Serverless Edge Functions — ✅ COMPLETED
*Connecting external gateways and serverless event-driven background workers.*

- [x] **WhatsApp Cloud API Inbound Webhook (`/api/webhooks/whatsapp`)**:
  - Verified webhook handshake with Meta Cloud API.
  - Dual-route message intent: supplier invoices to Purchase Hub ledger & customer inquiries to CRM leads.
- [x] **Dynamic Public Landing Page Engine (`/p/[slug]`)**:
  - Edge-cached route rendering mobile-first landing pages with direct CORS-protected lead capture forms.
- [x] **Automated Lead CRM Nurture Sequences (`/dashboard/leads`)**:
  - 6-Stage pipeline automations that generate customized Miller AI touchpoints and draft WhatsApp responses on stage change.
- [x] **Stripe Subscriptions & Usage Metering (`/dashboard/billing` & `/api/billing/checkout`)**:
  - Multi-tier plans (Starter £29/mo, Growth £79/mo, Agency £199/mo) with live checkout session generation.

---

### 🚀 Phase C: Productionization & Operational Hygiene — ✅ COMPLETED
*Preparing the codebase for commercial distribution and team collaboration.*

- [x] **Clean Next.js 16 Production Build**: Verified across all 24 static and dynamic routes.
- [x] **Security Exclusions in `.gitignore`**: Excluded `*.p8` Apple keys, `*.zip` archives, and temporary artifacts.
- [x] **Package & Docs Harmonization**:
  - Updated package name to `miller-saas-hub` v2.0.0.
  - Authored comprehensive enterprise `README.md`.
  - Documented dual-mode architecture (Offline Demo Sandbox vs. Live Production Backend).

---

## 🗓️ Implementation Milestones & Commercial Audit Status

| Milestone | Target Scope | Output Artifacts | Status |
| :--- | :--- | :--- | :--- |
| **M1: Database & RLS** | Create full v2 SQL migrations and update `supabaseClient.ts` | `03_v2_schema.sql`, `04_strict_security_and_tenancy.sql` | ✅ Hardened |
| **M2: Live CRM & Leads** | Migrate `/dashboard/leads` to live Supabase with Realtime | Realtime Kanban board & lead details | ✅ Live |
| **M3: Landing Engine** | Public hosting route `/p/[slug]` & secure lead capture API | Live landing pages & capture endpoint | ✅ Live |
| **M4: WhatsApp & OCR** | Inbound webhook & receipt parser | `/api/webhooks/whatsapp` | ✅ Live |
| **M5: Auth & Security** | Supabase Auth + Strict RBAC + Rate limiting | `/login`, `auth.ts`, `04_strict_security.sql` | ✅ Hardened |
| **M6: Stripe Billing** | Stripe Checkout, usage metering, and billing portal | `/dashboard/billing`, `/api/billing/checkout` | ✅ Live |

---

*Miller SaaS Hub v2 Architecture & Commercial Security Hardening Completed.*

