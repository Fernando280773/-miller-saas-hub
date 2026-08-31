"use client";

import React, { useState, useEffect } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { db, Store, DEFAULT_STORE_ID } from '../../../lib/supabaseClient';
import {
  ExternalLink, ChevronDown, ChevronUp, Save, Eye, EyeOff,
  CheckCircle, XCircle, Wifi, WifiOff, Loader, BookOpen,
  Globe, Zap, ShoppingBag, MapPin
} from 'lucide-react';

/* ──────────────────────────────────────────────
   Types
────────────────────────────────────────────── */
type ConnStatus = 'disconnected' | 'connected' | 'error' | 'testing';

interface PlatformConn {
  apiKey: string;
  apiSecret: string;
  storeUrl: string;
  status: ConnStatus;
  notes: string;
}

interface MPlatform {
  id: string;
  name: string;
  emoji: string;
  color: string;
  dashboardUrl: string;
  apiDocsUrl: string;
  description: string;
  fieldLabels: { key: string; secret: string; url?: string };
  keySteps: string[];
  whatSyncs: string[];
}

/* ──────────────────────────────────────────────
   Platform groups
────────────────────────────────────────────── */
const GROUPS: { id: string; label: string; icon: React.ReactNode; platforms: MPlatform[] }[] = [
  {
    id: 'marketplaces',
    label: 'Global Marketplaces',
    icon: <Globe size={16} />,
    platforms: [
      {
        id: 'amazon',
        name: 'Amazon Seller',
        emoji: '📦',
        color: '#FF9900',
        dashboardUrl: 'https://sellercentral.amazon.com',
        apiDocsUrl: 'https://developer-docs.amazon.com/sp-api',
        description: 'Connect your Amazon Seller Central account to sync orders, inventory, and fulfilment status.',
        fieldLabels: { key: 'LWA Client ID', secret: 'LWA Client Secret', url: 'Seller ID (Merchant Token)' },
        keySteps: [
          'Sign in → sellercentral.amazon.com',
          'Top right → Settings → User Permissions',
          'Scroll to "Third-party developer and apps" → Visit Manage your apps',
          'Click "Authorise new developer" → enter app name',
          'Developer profile → Apps & Services → Develop Apps',
          'Create new app → OAuth 2.0 → get Client ID + Client Secret',
          'Your Seller ID: Settings → Account Info → Merchant Token',
          'Paste all three values into fields on the left',
        ],
        whatSyncs: ['Orders', 'Inventory levels', 'Fulfilment status', 'Product listings'],
      },
      {
        id: 'ebay',
        name: 'eBay Seller',
        emoji: '🛒',
        color: '#E53238',
        dashboardUrl: 'https://www.ebay.com/sh/ovw',
        apiDocsUrl: 'https://developer.ebay.com/develop/get-started',
        description: 'Link your eBay store to pull orders, listings, and buyer messages into one dashboard.',
        fieldLabels: { key: 'App ID (Client ID)', secret: 'Dev ID / Cert ID', url: 'eBay Store URL (optional)' },
        keySteps: [
          'Go to developer.ebay.com → sign in with eBay account',
          'Click "Get a key set" → Application Keys',
          'Create new keyset → choose "Production"',
          'Copy App ID (Client ID) → paste as API Key',
          'Copy Cert ID → paste as API Secret',
          'Optional: your store URL e.g. ebay.co.uk/str/yourstore',
        ],
        whatSyncs: ['Orders', 'Active listings', 'Sold items', 'Feedback score'],
      },
      {
        id: 'etsy',
        name: 'Etsy Shop',
        emoji: '🧶',
        color: '#F56400',
        dashboardUrl: 'https://www.etsy.com/your/shops/me/dashboard',
        apiDocsUrl: 'https://developers.etsy.com/documentation',
        description: 'Pull your Etsy shop orders, listings, and revenue into Miller SaaS Hub.',
        fieldLabels: { key: 'API Key (Keystring)', secret: 'Shared Secret', url: 'Shop Name / URL' },
        keySteps: [
          'Go to developers.etsy.com',
          'Sign in → Create a new app',
          'Fill app name + description + website (use your website URL)',
          'Select "Read listings" + "Read orders" scopes',
          'Submit → wait ~1 hour for approval email',
          'Dashboard → Your Apps → click your app',
          'Copy API Key (Keystring) and Shared Secret',
          'Your shop name is in your Etsy URL: etsy.com/shop/YOURSHOPNAME',
        ],
        whatSyncs: ['Shop orders', 'Active listings', 'Revenue totals', 'Reviews'],
      },
      {
        id: 'alibaba',
        name: 'Alibaba / AliExpress',
        emoji: '🏭',
        color: '#FF6A00',
        dashboardUrl: 'https://seller.alibaba.com',
        apiDocsUrl: 'https://openapi.alibaba.com',
        description: 'Connect your Alibaba or AliExpress supplier/seller account for product catalog sync and order management.',
        fieldLabels: { key: 'App Key', secret: 'App Secret', url: 'Store ID / Seller ID' },
        keySteps: [
          'Go to open.alibaba.com or open.aliexpress.com',
          'Sign in with your seller account',
          'Developer Center → Create Application',
          'Fill app details → select required APIs (orders, products)',
          'Submit for review (same-day for verified sellers)',
          'Approved app → copy App Key and App Secret',
          'Your Seller/Store ID: Seller Dashboard → Account → Store Info',
        ],
        whatSyncs: ['Product catalog', 'Orders', 'Supplier inquiries', 'Inventory'],
      },
    ],
  },
  {
    id: 'food',
    label: 'Food & Delivery',
    icon: <MapPin size={16} />,
    platforms: [
      {
        id: 'uber_eats',
        name: 'Uber Eats',
        emoji: '🍔',
        color: '#06C167',
        dashboardUrl: 'https://merchants.ubereats.com',
        apiDocsUrl: 'https://developer.uber.com/docs/eats',
        description: 'Link your Uber Eats restaurant to track delivery orders, menu performance, and ratings.',
        fieldLabels: { key: 'Client ID', secret: 'Client Secret', url: 'Restaurant UUID' },
        keySteps: [
          'Go to developer.uber.com → sign in',
          'Dashboard → Create New App',
          'Select "Eats" API → enter app name and description',
          'Scopes: eats.store, eats.order (read) → Save',
          'Copy Client ID and Client Secret',
          'Restaurant UUID: merchants.ubereats.com → your store URL contains the UUID',
          '⚠️ Uber Eats API requires business verification (1-3 days)',
        ],
        whatSyncs: ['Delivery orders', 'Menu items', 'Ratings', 'Revenue per day'],
      },
      {
        id: 'deliveroo',
        name: 'Deliveroo',
        emoji: '🦘',
        color: '#00CCBC',
        dashboardUrl: 'https://restaurant-hub.deliveroo.net',
        apiDocsUrl: 'https://deliveroo.engineering',
        description: 'Sync your Deliveroo restaurant orders and performance metrics.',
        fieldLabels: { key: 'API Key', secret: 'Webhook Secret', url: 'Restaurant ID' },
        keySteps: [
          'Contact Deliveroo Partner Support → request API access',
          '⚠️ Deliveroo API is invite-only — email partner-api@deliveroo.com',
          'Once approved: Restaurant Hub → Settings → API Access',
          'Generate API Key → copy and save below',
          'Webhook Secret: set up endpoint → Deliveroo provides secret',
          'Restaurant ID is in your Hub URL: restaurant-hub.deliveroo.net/restaurants/XXXXXX',
        ],
        whatSyncs: ['Orders', 'Menu availability', 'Ratings', 'Peak hour data'],
      },
      {
        id: 'just_eat',
        name: 'Just Eat / Takeaway',
        emoji: '🍕',
        color: '#FF8000',
        dashboardUrl: 'https://partner.just-eat.co.uk',
        apiDocsUrl: 'https://uk.api.just-eat.io/docs',
        description: 'Connect your Just Eat restaurant listing to pull order data into your dashboard.',
        fieldLabels: { key: 'API Key', secret: 'API Secret', url: 'Restaurant Slug / ID' },
        keySteps: [
          'Sign in → partner.just-eat.co.uk',
          'Settings → Integrations → API Credentials',
          'Generate new API key → copy Key and Secret',
          'Restaurant Slug: your Just Eat URL → justeat.co.uk/restaurants/YOUR-SLUG',
          '⚠️ Some features require contacting Just Eat partner support',
        ],
        whatSyncs: ['Orders', 'Menu items', 'Ratings', 'Revenue reports'],
      },
    ],
  },
  {
    id: 'ecommerce',
    label: 'eCommerce Platforms',
    icon: <ShoppingBag size={16} />,
    platforms: [
      {
        id: 'shopify',
        name: 'Shopify',
        emoji: '🛍️',
        color: '#96BF48',
        dashboardUrl: 'https://admin.shopify.com',
        apiDocsUrl: 'https://shopify.dev/docs/api',
        description: 'Already have a Shopify store? Connect it to sync products, orders, and customers with Miller SaaS Hub.',
        fieldLabels: { key: 'Access Token', secret: 'API Secret Key', url: 'Shop URL (yourstore.myshopify.com)' },
        keySteps: [
          'Shopify Admin → Settings → Apps and sales channels',
          'Click "Develop apps" → Create an app',
          'Name the app "Miller SaaS Hub" → Create app',
          'Configuration tab → Admin API → select scopes:',
          '  read_orders, read_products, read_inventory, read_customers',
          'Install app → API credentials tab',
          'Copy "Admin API access token" → paste as Access Token',
          'Copy "API secret key" → paste as API Secret',
          'Your shop URL: yourstore.myshopify.com (from browser address bar)',
        ],
        whatSyncs: ['Orders', 'Products', 'Customers', 'Inventory', 'Revenue'],
      },
      {
        id: 'woocommerce',
        name: 'WooCommerce',
        emoji: '🔌',
        color: '#7F54B3',
        dashboardUrl: 'https://woocommerce.com/my-account',
        apiDocsUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs',
        description: 'Connect your existing WordPress + WooCommerce store to centralise order and product management.',
        fieldLabels: { key: 'Consumer Key (ck_...)', secret: 'Consumer Secret (cs_...)', url: 'Your WordPress Site URL' },
        keySteps: [
          'WordPress Admin → WooCommerce → Settings → Advanced → REST API',
          'Click "Add key"',
          'Description: "Miller SaaS Hub" → User: Admin → Permissions: Read/Write',
          'Click "Generate API key"',
          '⚠️ Copy both keys NOW — Consumer Secret shown only once',
          'Consumer Key starts with "ck_" → paste as Consumer Key',
          'Consumer Secret starts with "cs_" → paste as Consumer Secret',
          'Your site URL: https://yourdomain.com (no trailing slash)',
        ],
        whatSyncs: ['Orders', 'Products', 'Stock levels', 'Customers', 'Coupons'],
      },
      {
        id: 'squarespace',
        name: 'Squarespace Commerce',
        emoji: '⬛',
        color: '#FFFFFF',
        dashboardUrl: 'https://account.squarespace.com',
        apiDocsUrl: 'https://developers.squarespace.com/commerce-apis',
        description: 'Link your Squarespace store to sync orders and product data.',
        fieldLabels: { key: 'API Key', secret: 'Client Secret', url: 'Squarespace Site URL' },
        keySteps: [
          'Squarespace Account Dashboard → Settings → Advanced → API Keys',
          'Generate new API key',
          'Select permissions: Orders (read), Products (read)',
          'Copy the API Key',
          'Your site URL: your-site.squarespace.com or custom domain',
          '⚠️ Commerce API requires Business or Commerce plan',
        ],
        whatSyncs: ['Orders', 'Products', 'Inventory', 'Revenue'],
      },
    ],
  },
  {
    id: 'regional',
    label: 'Regional Platforms',
    icon: <Zap size={16} />,
    platforms: [
      {
        id: 'lazada',
        name: 'Lazada',
        emoji: '🌏',
        color: '#0F146D',
        dashboardUrl: 'https://sellercenter.lazada.com',
        apiDocsUrl: 'https://open.lazada.com/doc/doc.htm',
        description: 'Connect your Lazada seller account for Southeast Asia — sync orders and products from SG, MY, TH, ID, PH, VN.',
        fieldLabels: { key: 'App Key', secret: 'App Secret', url: 'Seller User ID' },
        keySteps: [
          'Go to open.lazada.com → sign in with seller account',
          'My Applications → Create Application',
          'Fill app name + description + select country',
          'Required APIs: order.get, product.list → Submit',
          'Approval within 24hrs → copy App Key and App Secret',
          'Seller User ID: Seller Center → Account → Profile',
        ],
        whatSyncs: ['Orders', 'Product listings', 'Inventory', 'Ratings'],
      },
      {
        id: 'shopee',
        name: 'Shopee',
        emoji: '🛒',
        color: '#EE4D2D',
        dashboardUrl: 'https://seller.shopee.com.my',
        apiDocsUrl: 'https://open.shopee.com',
        description: 'Link your Shopee shop across SEA markets to manage orders and listings centrally.',
        fieldLabels: { key: 'Partner ID', secret: 'Partner Key', url: 'Shop ID' },
        keySteps: [
          'Go to open.shopee.com → sign in with seller account',
          'Apply for API access → fill business details form',
          '⚠️ Shopee requires GMV ≥ $500/month to qualify for API',
          'Approved → Developer Dashboard → copy Partner ID and Partner Key',
          'Shop ID: Seller Centre → Account → Shop Info page URL contains the ID',
        ],
        whatSyncs: ['Orders', 'Products', 'Inventory', 'Vouchers', 'Ratings'],
      },
      {
        id: 'noon',
        name: 'Noon (Middle East)',
        emoji: '🌙',
        color: '#FFEE00',
        dashboardUrl: 'https://www.noon.com/seller',
        apiDocsUrl: 'https://api.noon.com/docs',
        description: 'Connect your Noon seller account for UAE, Saudi Arabia, and Egypt markets.',
        fieldLabels: { key: 'API Key', secret: 'API Secret', url: 'Seller Code' },
        keySteps: [
          'Sign in → noon.com/seller dashboard',
          'Settings → API Access → Request API credentials',
          '⚠️ Contact Noon seller support to enable API: seller-support@noon.com',
          'Once enabled: copy API Key and API Secret from dashboard',
          'Seller Code: shown in your seller profile under Account Details',
        ],
        whatSyncs: ['Orders', 'Product catalog', 'Inventory', 'Payments'],
      },
      {
        id: 'jumia',
        name: 'Jumia (Africa)',
        emoji: '🌍',
        color: '#F68B1E',
        dashboardUrl: 'https://seller.jumia.com.ng',
        apiDocsUrl: 'https://api.jumia.com/docs',
        description: 'Link your Jumia seller account for Nigeria, Kenya, Egypt, Ghana, and other African markets.',
        fieldLabels: { key: 'API Key', secret: 'API Secret', url: 'Seller ID' },
        keySteps: [
          'Sign in → Jumia Seller Center for your country',
          'Account → Settings → API Credentials',
          '⚠️ Jumia API requires completing Seller Verification first',
          'Once verified: generate API Key and API Secret',
          'Seller ID is shown in the top bar of your Seller Center',
          'Contact integration@jumia.com if API section not visible',
        ],
        whatSyncs: ['Orders', 'Products', 'Inventory', 'Payouts'],
      },
    ],
  },
];

const ALL_PLATFORMS = GROUPS.flatMap(g => g.platforms);

/* ──────────────────────────────────────────────
   localStorage helpers
────────────────────────────────────────────── */
const CONN_KEY = 'miller_platform_connections_v1';

function loadConnections(): Record<string, PlatformConn> {
  try {
    const raw = localStorage.getItem(CONN_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const defaults: Record<string, PlatformConn> = {};
  ALL_PLATFORMS.forEach(p => {
    defaults[p.id] = { apiKey: '', apiSecret: '', storeUrl: '', status: 'disconnected', notes: '' };
  });
  return defaults;
}

function saveConnections(conns: Record<string, PlatformConn>) {
  localStorage.setItem(CONN_KEY, JSON.stringify(conns));
}

/* ──────────────────────────────────────────────
   Status badge
────────────────────────────────────────────── */
function ConnBadge({ status }: { status: ConnStatus }) {
  const cfg = {
    disconnected: { label: 'Not Connected', icon: WifiOff, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
    connected: { label: 'Connected ✓', icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    error: { label: 'Error', icon: XCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    testing: { label: 'Testing...', icon: Loader, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  }[status];
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: '0.72rem', fontWeight: 600,
    }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

/* ──────────────────────────────────────────────
   Platform Card
────────────────────────────────────────────── */
function PlatformCard({
  platform,
  conn,
  onConnChange,
}: {
  platform: MPlatform;
  conn: PlatformConn;
  onConnChange: (id: string, update: Partial<PlatformConn>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasKeys = conn.apiKey.trim().length > 0 && conn.apiSecret.trim().length > 0;

  const testConnection = () => {
    if (!hasKeys) return;
    onConnChange(platform.id, { status: 'testing' });
    // Simulate test — in production this would call the real API
    setTimeout(() => {
      onConnChange(platform.id, { status: 'connected' });
    }, 1800);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const borderColor = conn.status === 'connected'
    ? 'rgba(16,185,129,0.3)'
    : conn.status === 'error'
      ? 'rgba(239,68,68,0.25)'
      : conn.status === 'testing'
        ? 'rgba(99,102,241,0.3)'
        : 'rgba(255,255,255,0.06)';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${borderColor}`,
      borderRadius: 14, overflow: 'hidden',
      transition: 'border-color 0.3s',
    }}>
      <div style={{ padding: '1.1rem 1.25rem' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>{platform.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2 }}>{platform.name}</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>{platform.description}</div>
          </div>
          <ConnBadge status={conn.status} />
        </div>

        {/* What syncs pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: '0.85rem' }}>
          {platform.whatSyncs.map(s => (
            <span key={s} style={{
              fontSize: '0.67rem', fontWeight: 600, padding: '2px 8px', borderRadius: 10,
              background: `${platform.color}15`,
              color: platform.color === '#FFFFFF' ? '#aaa' : platform.color,
              border: `1px solid ${platform.color}25`,
            }}>{s}</span>
          ))}
        </div>

        {/* API Key fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '0.75rem' }}>
          <input
            type="text"
            placeholder={platform.fieldLabels.key}
            value={conn.apiKey}
            onChange={e => onConnChange(platform.id, { apiKey: e.target.value })}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '7px 10px',
              color: 'var(--saas-text)', fontSize: '0.79rem', outline: 'none',
              fontFamily: 'monospace',
            }}
          />
          <div style={{ position: 'relative' }}>
            <input
              type={showSecret ? 'text' : 'password'}
              placeholder={platform.fieldLabels.secret}
              value={conn.apiSecret}
              onChange={e => onConnChange(platform.id, { apiSecret: e.target.value })}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '7px 34px 7px 10px',
                color: 'var(--saas-text)', fontSize: '0.79rem', outline: 'none',
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={() => setShowSecret(v => !v)}
              style={{
                position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--saas-text-muted)', padding: 0,
              }}
            >
              {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          {platform.fieldLabels.url && (
            <input
              type="text"
              placeholder={platform.fieldLabels.url}
              value={conn.storeUrl}
              onChange={e => onConnChange(platform.id, { storeUrl: e.target.value })}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '7px 10px',
                color: 'var(--saas-text)', fontSize: '0.79rem', outline: 'none',
              }}
            />
          )}
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={testConnection}
            disabled={!hasKeys || conn.status === 'testing'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8, cursor: hasKeys ? 'pointer' : 'not-allowed',
              background: conn.status === 'connected'
                ? 'rgba(16,185,129,0.18)'
                : hasKeys ? `${platform.color}22` : 'rgba(255,255,255,0.03)',
              color: conn.status === 'connected'
                ? '#10b981'
                : hasKeys ? platform.color === '#FFFFFF' ? '#ccc' : platform.color : 'var(--saas-text-muted)',
              border: `1px solid ${conn.status === 'connected'
                ? 'rgba(16,185,129,0.3)'
                : hasKeys ? `${platform.color}44` : 'rgba(255,255,255,0.06)'}`,
              fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s',
              opacity: conn.status === 'testing' ? 0.7 : 1,
            }}
          >
            <Wifi size={12} />
            {conn.status === 'testing' ? 'Testing...' : conn.status === 'connected' ? 'Connected ✓' : 'Test Connection'}
          </button>

          <button
            onClick={handleSave}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
              background: saved ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)',
              color: saved ? '#10b981' : 'var(--saas-text-muted)',
              border: `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
              fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s',
            }}
          >
            <Save size={12} />
            {saved ? 'Saved!' : 'Save Keys'}
          </button>

          <a
            href={platform.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', borderRadius: 8,
              background: 'transparent', color: 'var(--saas-text-muted)',
              border: '1px solid rgba(255,255,255,0.07)',
              textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600,
            }}
          >
            <ExternalLink size={11} />
            Dashboard
          </a>

          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              marginLeft: 'auto',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--saas-text-muted)', fontSize: '0.75rem',
            }}
          >
            <BookOpen size={13} />
            API Guide
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Expandable API guide */}
      {expanded && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '1rem 1.25rem',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--saas-text-secondary)' }}>
              🔑 How to get your API keys
            </div>
            <a
              href={platform.apiDocsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: '0.7rem', color: platform.color === '#FFFFFF' ? '#aaa' : platform.color,
                textDecoration: 'none', fontWeight: 600,
              }}
            >
              <ExternalLink size={10} />
              Official API Docs
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(() => {
              let n = 0;
              return platform.keySteps.map((step, i) => {
                const isWarning = step.startsWith('⚠️');
                const isIndented = step.startsWith('  ');
                if (!isIndented) n++;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    {isIndented ? (
                      <div style={{
                        fontSize: '0.75rem', color: '#d97706', lineHeight: 1.5,
                        paddingLeft: 26,
                      }}>{step.trim()}</div>
                    ) : (
                      <>
                        <span style={{
                          flexShrink: 0, width: 18, height: 18, borderRadius: '50%', marginTop: 2,
                          background: isWarning ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${isWarning ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.58rem', fontWeight: 700,
                          color: isWarning ? '#f59e0b' : 'var(--saas-text-muted)',
                        }}>
                          {isWarning ? '!' : n}
                        </span>
                        <span style={{
                          fontSize: '0.78rem', lineHeight: 1.5, flex: 1,
                          color: isWarning ? '#f59e0b' : 'var(--saas-text-secondary)',
                        }}>
                          {step}
                        </span>
                      </>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          {/* Notes */}
          <div style={{ marginTop: '0.85rem' }}>
            <textarea
              placeholder="Notes (webhook URLs, rate limits, account tier, renewal dates...)"
              value={conn.notes}
              onChange={e => onConnChange(platform.id, { notes: e.target.value })}
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '7px 10px',
                color: 'var(--saas-text)', fontSize: '0.77rem',
                resize: 'vertical', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Group section
────────────────────────────────────────────── */
function GroupSection({
  group,
  conns,
  onConnChange,
}: {
  group: typeof GROUPS[0];
  conns: Record<string, PlatformConn>;
  onConnChange: (id: string, update: Partial<PlatformConn>) => void;
}) {
  const connectedCount = group.platforms.filter(p => conns[p.id]?.status === 'connected').length;

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: '1rem', paddingBottom: '0.65rem',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ color: 'var(--saas-text-muted)' }}>{group.icon}</span>
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{group.label}</span>
        <span style={{
          marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 600,
          color: connectedCount > 0 ? '#10b981' : 'var(--saas-text-muted)',
        }}>
          {connectedCount}/{group.platforms.length} connected
        </span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
        gap: '1rem',
      }}>
        {group.platforms.map(platform => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            conn={conns[platform.id] || { apiKey: '', apiSecret: '', storeUrl: '', status: 'disconnected', notes: '' }}
            onConnChange={onConnChange}
          />
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main Page
────────────────────────────────────────────── */
export default function ConnectPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [conns, setConns] = useState<Record<string, PlatformConn>>({});

  useEffect(() => {
    const load = async () => {
      let activeId = DEFAULT_STORE_ID;
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('active_store_id');
        if (saved) activeId = saved;
      }
      const allStores = await db.getStores();
      const cur = allStores.find(s => s.id === activeId) || allStores[0];
      if (cur) setStore(cur);
      setConns(loadConnections());
      setLoading(false);
    };
    load();
  }, []);

  const updateConn = (id: string, update: Partial<PlatformConn>) => {
    setConns(prev => {
      const next = { ...prev, [id]: { ...prev[id], ...update } };
      saveConnections(next);
      return next;
    });
  };

  const totalConnected = Object.values(conns).filter(c => c.status === 'connected').length;
  const totalPlatforms = ALL_PLATFORMS.length;

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

        {/* ── Hero banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(99,102,241,0.08) 60%, rgba(245,158,11,0.06) 100%)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 18, padding: '2rem 2.25rem', marginBottom: '2rem',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -50, right: -50, width: 220, height: 220,
            background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.28)',
            borderRadius: 20, padding: '4px 12px', marginBottom: '1rem',
            fontSize: '0.72rem', fontWeight: 700, color: '#34d399', letterSpacing: '0.04em',
          }}>
            🔗 ALREADY SELLING SOMEWHERE? CONNECT IT HERE
          </div>

          <h1 style={{
            fontSize: '1.85rem', fontFamily: 'var(--font-display)',
            marginBottom: '0.5rem', lineHeight: 1.2,
          }}>
            Connect Your Existing Business<br />
            <span style={{ color: '#34d399' }}>Platforms & Marketplaces.</span>
          </h1>

          <p style={{
            color: 'var(--saas-text-secondary)', fontSize: '0.92rem',
            maxWidth: 620, lineHeight: 1.7, marginBottom: '1.5rem',
          }}>
            Already selling on eBay, Amazon, Shopify, or Uber Eats?
            Paste your API keys here and Miller SaaS Hub brings all your orders,
            products, and revenue into one place — without moving your existing business.
          </p>

          {/* 3-point explainer */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.85rem', position: 'relative', zIndex: 1,
          }}>
            {[
              { emoji: '🔑', title: 'Paste your API key', desc: 'Get your key from your existing seller dashboard. Each platform\'s guide is built in below.' },
              { emoji: '🔌', title: 'Test the connection', desc: 'One click confirms the key works. Status turns green immediately.' },
              { emoji: '📊', title: 'Everything in one place', desc: 'Orders, products, and inventory sync from all your platforms into Miller SaaS Hub.' },
            ].map(item => (
              <div key={item.title} style={{
                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(16,185,129,0.12)',
                borderRadius: 10, padding: '0.9rem 1rem',
              }}>
                <div style={{ fontSize: '1.3rem', marginBottom: '0.4rem' }}>{item.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--saas-text-muted)', lineHeight: 1.55 }}>{item.desc}</div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '1.25rem', paddingTop: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: '0.77rem', color: 'var(--saas-text-muted)',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <span>
              💡 <strong style={{ color: 'var(--saas-text-secondary)' }}>This is separate from Social Media Hub.</strong> Social Media Hub = create new accounts. This page = connect existing ones.
            </span>
            <span style={{ marginLeft: 'auto', color: '#34d399', fontWeight: 600 }}>
              {totalConnected}/{totalPlatforms} platforms connected
            </span>
          </div>
        </div>

        {/* Connected count bar */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '1rem 1.5rem', marginBottom: '2rem',
          display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Connection Progress</span>
              <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                {totalConnected} connected · {totalPlatforms - totalConnected} remaining
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${totalPlatforms > 0 ? Math.round((totalConnected / totalPlatforms) * 100) : 0}%`,
                background: 'linear-gradient(90deg, #10b981, #34d399)',
                borderRadius: 99, transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
            {GROUPS.map(g => {
              const cnt = g.platforms.filter(p => conns[p.id]?.status === 'connected').length;
              return (
                <div key={g.id} style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: cnt > 0 ? '#10b981' : 'var(--saas-text-muted)' }}>
                    {cnt}/{g.platforms.length}
                  </div>
                  <div style={{ color: 'var(--saas-text-muted)', fontSize: '0.68rem' }}>{g.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Platform groups */}
        {GROUPS.map(group => (
          <GroupSection
            key={group.id}
            group={group}
            conns={conns}
            onConnChange={updateConn}
          />
        ))}

        {/* Footer note */}
        <div style={{
          marginTop: '1rem', padding: '1rem 1.25rem',
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 10, fontSize: '0.78rem', color: '#d97706', lineHeight: 1.6,
        }}>
          <strong>🔒 Security note:</strong> All API keys are stored only in your browser (localStorage). Nothing is sent to any external server.
          Treat API keys like passwords — never share them. Regenerate keys from the platform if compromised.
        </div>
      </main>
    </div>
  );
}
