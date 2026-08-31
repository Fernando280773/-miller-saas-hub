/**
 * Miller SaaS Hub — Canonical Domain Types (single source of truth).
 *
 * Every shared entity shape lives here. supabaseClient.ts and
 * millerEcosystem.ts re-export these so existing imports such as
 * `import { Store } from '@/lib/supabaseClient'` keep working, and a schema
 * change only needs to be made in one place.
 */

// ── Scalar unions ───────────────────────────────────────────────────────────
export type LeadScore  = 'hot' | 'warm' | 'cold';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
export type LeadSource = 'whatsapp' | 'landing_page' | 'social' | 'platform' | 'referral' | 'manual';

// ── DB-facing entities (Supabase tables / db layer) ─────────────────────────
export interface Store {
  id: string;
  name: string;
  subdomain: string;
  logo_text: string;
  primary_color: string;
  secondary_color: string;
  bg_color: string;
  text_color: string;
  btn_color: string;
  layout: string;
  description: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  stock: number;
  image: string;
  image_url?: string;
}

export interface Order {
  id: string;
  store_id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  status: 'Pending' | 'Shipped' | 'Delivered';
  shipping_address: string;
  created_at: string;
}

export interface Integration {
  id: string;
  store_id: string;
  name: string;
  type: string;
  status: 'Active' | 'Inactive';
  config: Record<string, string>;
}

export interface CompetitorPricing {
  id: string;
  product_id: string;
  competitor_name: string;
  competitor_url: string;
  price: number;
  is_active: boolean;
}

export interface Lead {
  id: string;
  store_id: string;
  name: string;
  contact: string;
  contact_type: 'whatsapp' | 'email' | 'phone';
  source: LeadSource;
  source_name?: string;
  score: LeadScore;
  status: LeadStatus;
  business_unit?: string;
  notes?: string;
  tags?: string[];
  estimated_value?: number;
  next_action?: string;
  next_action_date?: string;
  last_contacted_at?: string;
  nurture_sent?: number;
  nurture_messages?: unknown[];
  created_at?: string;
  updated_at?: string;
}

export interface LandingSite {
  id: string;
  store_id: string;
  business_name: string;
  slug?: string;
  title?: string;
  published: boolean;
  html: string;
  page_type?: string;
  views_count?: number;
  leads_count?: number;
  custom_domain?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface AiAgentConfig {
  id: string;
  store_id: string;
  agent_id: 'monitor' | 'post' | 'reply' | 'growth' | 'alert' | string;
  label: string;
  emoji?: string;
  enabled: boolean;
  tasks_done: number;
  config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppDraft {
  id: string;
  store_id: string;
  lead_id?: string;
  recipient_name: string;
  recipient_phone: string;
  message_text: string;
  status: 'Draft' | 'Approved' | 'Sent' | 'Failed';
  media_url?: string;
  trigger_reason?: string;
  created_at?: string;
}

export interface SupplierInvoice {
  id: string;
  store_id: string;
  supplier_name: string;
  invoice_number?: string;
  invoice_date?: string;
  total_amount: number;
  currency?: string;
  status: 'Pending' | 'Verified' | 'Paid';
  items?: unknown[];
  image_storage_path?: string;
  captured_via?: 'whatsapp' | 'manual' | 'email' | 'scan';
  created_at?: string;
}

export interface PlatformAccount {
  id: string;
  store_id: string;
  platform_id: string;
  api_key?: string;
  api_secret?: string;
  store_url?: string;
  status: 'disconnected' | 'connected' | 'error' | 'testing';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ── Ecosystem / localStorage storage shapes (millerEcosystem.ts) ────────────
export interface EcosystemLead {
  id: string;
  name: string;
  contact: string;
  contactType: 'whatsapp' | 'email' | 'phone';
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
  nurtureMessages: unknown[];
}

/**
 * Landing-site shape as persisted in the ecosystem bridge
 * (localStorage). Distinct from the DB-facing {@link LandingSite}.
 */
export interface StoredLandingSite {
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

export interface AgentStatus {
  id: string;
  label: string;
  emoji: string;
  enabled: boolean;
  tasksDone: number;
}
