"use client";

import React, { useState, useEffect } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { db, Store } from '../../../lib/supabaseClient';
import {
  Globe, CheckCircle, Clock, Circle, Eye, EyeOff,
  ChevronDown, ChevronUp, Save, ExternalLink, Lock, User,
  Building, Phone, Mail, BookOpen
} from 'lucide-react';

/* ──────────────────────────────────────────────
   Types
────────────────────────────────────────────── */
type PlatformStatus = 'not_started' | 'in_progress' | 'done';

interface PlatformCred {
  handle: string;
  password: string;
  status: PlatformStatus;
  notes: string;
}

interface BusinessInfo {
  businessName: string;
  email: string;
  phone: string;
  website: string;
  country: string;
}

interface Platform {
  id: string;
  name: string;
  emoji: string;
  color: string;
  signupUrl: string;
  description: string;
  humanSteps: string[];
  aiCanDo: string[];
  humanMust: string[];
  extraLinks?: { label: string; url: string }[];
}

/* ──────────────────────────────────────────────
   Platform definitions
────────────────────────────────────────────── */
const PLATFORMS: Platform[] = [
  {
    id: 'google',
    name: 'Google Account',
    emoji: '🔵',
    color: '#4285F4',
    signupUrl: 'https://accounts.google.com/signup',
    description: 'One Google account unlocks Gmail + YouTube + Google Business + Google Ads.',
    humanSteps: [
      'Click "Open Signup" → accounts.google.com/signup',
      'Enter your business name (First: Business, Last: Name)',
      'Enter your business email (or choose @gmail.com)',
      'Set strong password — save it in vault below',
      'Enter phone number → AI pauses here',
      '⚠️ YOU: Enter SMS verification code on phone',
      'Complete birthday / gender form',
      'Accept terms → Account created ✓',
    ],
    aiCanDo: ['Fill name, email, password', 'Navigate through forms', 'Accept terms'],
    humanMust: ['Enter SMS verification code', 'Complete CAPTCHA if shown'],
  },
  {
    id: 'youtube',
    name: 'YouTube Channel',
    emoji: '▶️',
    color: '#FF0000',
    signupUrl: 'https://www.youtube.com/create_channel',
    description: 'Needs Google account first. Create a brand channel separate from personal.',
    humanSteps: [
      'Sign in to your Google account first',
      'Click "Open Signup" → youtube.com/create_channel',
      'Choose "Use a business or other name" for brand channel',
      'Enter your business/brand name',
      'Upload channel art and profile pic later',
      'Channel created ✓',
    ],
    aiCanDo: ['Navigate to channel creation', 'Fill brand name'],
    humanMust: ['Be signed into Google', 'Choose channel type'],
  },
  {
    id: 'google_business',
    name: 'Google Business Profile',
    emoji: '📍',
    color: '#34A853',
    signupUrl: 'https://business.google.com/create',
    description: 'Get your shop on Google Maps + Search. Verify your address, add products, collect reviews. Essential for local discovery.',
    humanSteps: [
      '━━ PHASE 1 — Create Profile ━━',
      'Sign in to Google account first',
      'Click "Open Signup" → business.google.com/create',
      'Enter your exact business name',
      'Select business category (e.g. "Clothing Store", "Jewellery Store")',
      'Toggle "Yes" for physical location customers can visit',
      'Enter full business address (street, city, postcode)',
      'Enter phone number + website URL',
      'Profile created — now verify ↓',
      '━━ PHASE 2 — Verify Location ━━',
      '⚠️ YOU: Choose verification method:',
      '  📮 Postcard by mail (5-14 days — Google mails PIN to address)',
      '  📞 Phone call (instant — if eligible, Google calls your number)',
      '  🎥 Video call (instant — show your storefront/interior live)',
      '⚠️ YOU: Enter verification PIN when received',
      'Verification confirmed → listing goes live on Google Maps ✓',
      '━━ PHASE 3 — Add Products ━━',
      'Go to business.google.com → select your profile',
      'Click "Products" in left menu → "Add product"',
      'Enter product name + category + price',
      'Add product photo (use your Image Maker photos)',
      'Add description + optional link to buy',
      'Repeat for each product — Google shows them in search results',
      '━━ PHASE 4 — Complete Profile ━━',
      'Add opening hours',
      'Upload 5+ photos: storefront, interior, products, team',
      'Write business description (750 chars, include keywords)',
      'Add business attributes (e.g. "Women-led", "Wheelchair accessible")',
      'Turn on messaging so customers can WhatsApp/text you',
      'Request reviews from first customers',
      'Profile 100% complete ✓',
    ],
    aiCanDo: [
      'Fill business name, category, address, phone, website',
      'Navigate through all profile sections',
      'Fill product name, description, price',
      'Fill business description with keywords',
    ],
    humanMust: [
      'Choose verification method (postcard/phone/video)',
      'Enter PIN from postcard or phone call',
      'Complete live video verification if chosen',
      'Upload your own photos',
      'Be physically present for video verification',
    ],
    extraLinks: [
      { label: '📦 Manage Products', url: 'https://business.google.com' },
      { label: '🗺️ View on Maps', url: 'https://maps.google.com' },
      { label: '📊 Business Insights', url: 'https://business.google.com/insights' },
      { label: '⭐ Manage Reviews', url: 'https://business.google.com/reviews' },
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook Page',
    emoji: '📘',
    color: '#1877F2',
    signupUrl: 'https://www.facebook.com/pages/create',
    description: 'Create a Facebook Business Page (not personal profile) for your shop.',
    humanSteps: [
      'Sign in to facebook.com (or create personal account first)',
      'Click "Open Signup" → facebook.com/pages/create',
      'Choose "Business or brand"',
      'Enter page name = your business name',
      'Select category (e.g. "Shopping & Retail")',
      'Add business email + phone',
      'Add profile photo + cover photo',
      '⚠️ YOU: May see phone/email verification step',
      'Page published ✓',
    ],
    aiCanDo: ['Fill business name, category, contact info', 'Navigate page creation flow'],
    humanMust: ['Login to Facebook account', 'Phone or email verification'],
  },
  {
    id: 'whatsapp_business',
    name: 'WhatsApp Business',
    emoji: '💬',
    color: '#25D366',
    signupUrl: 'https://business.whatsapp.com/products/business-app',
    description: 'WhatsApp Business App for your phone — chat with customers, set auto-replies, show opening hours, catalog your products.',
    humanSteps: [
      '━━ PHASE 1 — WhatsApp Business App ━━',
      'Download "WhatsApp Business" app on your phone (App Store / Google Play)',
      '⚠️ YOU: Enter your business phone number',
      '⚠️ YOU: Enter SMS verification code',
      'Set Business Profile: name, category, description',
      'Add address, email, website, opening hours',
      'Profile set up ✓',
      '━━ PHASE 2 — Connect to Meta Business Manager ━━',
      'Go to business.facebook.com → Business Settings',
      'Click "WhatsApp Accounts" → Add → Connect existing number',
      '⚠️ YOU: Confirm connection on your phone',
      'WhatsApp linked to Meta Business Manager ✓',
      '━━ PHASE 3 — Product Catalog on WhatsApp ━━',
      'Open WhatsApp Business app → Settings → Business Tools → Catalog',
      'Tap "+" → Add product: name, price, photo, description',
      'Repeat for each product',
      'Customers can browse your catalog in chat ✓',
      '━━ PHASE 4 — Auto-Replies & Labels ━━',
      'Settings → Business Tools → Away message → set off-hours reply',
      'Settings → Business Tools → Greeting message → new customer welcome',
      'Settings → Business Tools → Quick replies → save common answers',
      'Label chats: New Customer, Pending, Paid, etc.',
      'Business ready ✓',
    ],
    aiCanDo: ['Fill business profile details', 'Navigate catalog creation', 'Set up quick reply templates'],
    humanMust: ['Phone SMS verification', 'Physical phone needed for app', 'Confirm Meta connection on device'],
    extraLinks: [
      { label: '📲 Download App', url: 'https://www.whatsapp.com/business/download' },
      { label: '🏢 Meta Business Manager', url: 'https://business.facebook.com' },
      { label: '📦 WhatsApp Catalog', url: 'https://business.whatsapp.com/products/catalog' },
    ],
  },
  {
    id: 'twilio_whatsapp',
    name: 'Twilio (WhatsApp API)',
    emoji: '🔴',
    color: '#F22F46',
    signupUrl: 'https://www.twilio.com/try-twilio',
    description: 'Twilio powers automated WhatsApp messages — order confirmations, shipping updates, lead follow-ups — sent from your system automatically.',
    humanSteps: [
      '━━ PHASE 1 — Create Twilio Account ━━',
      'Click "Open Signup" → twilio.com/try-twilio',
      'Enter name, email, password',
      '⚠️ YOU: Enter email verification code',
      '⚠️ YOU: Enter phone SMS code (Twilio verifies identity)',
      'Answer onboarding: "What do you want to build?" → select WhatsApp',
      'Free trial account active ($15 credit) ✓',
      '━━ PHASE 2 — Enable WhatsApp Sandbox ━━',
      'Dashboard → Messaging → Try it Out → Send a WhatsApp Message',
      'Twilio gives you a sandbox number (e.g. +1 415 523 8886)',
      'Send "join <your-keyword>" to that number from your phone to test',
      'Sandbox active — test messages working ✓',
      '━━ PHASE 3 — Apply for Real WhatsApp Business API ━━',
      'Dashboard → Messaging → Senders → WhatsApp Senders',
      'Click "Request Access" → enter your Facebook Business ID',
      '⚠️ YOU: Facebook Business must be verified (takes 1-3 days)',
      'Enter your business phone number (different from personal)',
      '⚠️ YOU: Verify phone number via call or SMS',
      'Submit → approval takes 1-5 business days',
      '━━ PHASE 4 — Get API Keys ━━',
      'Dashboard → Account → API keys & tokens',
      'Copy Account SID → save in vault below',
      'Copy Auth Token → save in vault below',
      'These keys connect Miller SaaS Hub → WhatsApp API',
      'Add to Integrations Panel → WhatsApp Business integration ✓',
    ],
    aiCanDo: ['Fill signup form', 'Navigate dashboard', 'Copy API keys to vault'],
    humanMust: ['Email verification code', 'Phone SMS code', 'Facebook Business verification', 'WhatsApp sender approval (1-5 days)'],
    extraLinks: [
      { label: '🔑 Twilio Console', url: 'https://console.twilio.com' },
      { label: '📖 WhatsApp API Docs', url: 'https://www.twilio.com/docs/whatsapp' },
      { label: '🧪 Sandbox Test', url: 'https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn' },
      { label: '📊 Message Logs', url: 'https://console.twilio.com/us1/monitor/logs/sms' },
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram Business',
    emoji: '📸',
    color: '#E1306C',
    signupUrl: 'https://www.instagram.com/accounts/emailsignup/',
    description: 'Create Instagram account then switch to Business profile for analytics & ads.',
    humanSteps: [
      'Click "Open Signup" → instagram.com signup',
      'Enter email, name, username, password',
      '⚠️ YOU: Enter email confirmation code',
      'Set birthday (use business owner DOB)',
      'Account created → Go to Settings',
      'Settings → Account → Switch to Professional Account',
      'Choose "Business" → select category',
      'Connect to Facebook page (optional but recommended)',
      'Business profile active ✓',
    ],
    aiCanDo: ['Fill email, name, username, password', 'Navigate to professional settings'],
    humanMust: ['Email verification code', 'CAPTCHA on signup'],
  },
  {
    id: 'tiktok',
    name: 'TikTok Business',
    emoji: '🎵',
    color: '#010101',
    signupUrl: 'https://ads.tiktok.com/i18n/signup',
    description: 'TikTok Business account for selling products and running ads.',
    humanSteps: [
      'Click "Open Signup" → ads.tiktok.com/i18n/signup',
      'Enter email address',
      '⚠️ YOU: Enter email verification code',
      'Set password — save in vault',
      'Enter business name + phone',
      '⚠️ YOU: Enter SMS code on phone',
      'Select business category',
      'Business account verified ✓',
      'Optional: Also create TikTok creator account at tiktok.com/signup',
    ],
    aiCanDo: ['Fill email, business name, category'],
    humanMust: ['Email code', 'SMS phone code', 'CAPTCHA slider puzzle'],
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    emoji: '🐦',
    color: '#1DA1F2',
    signupUrl: 'https://twitter.com/i/flow/signup',
    description: 'X (Twitter) for brand announcements, customer support, and product drops.',
    humanSteps: [
      'Click "Open Signup" → twitter.com/i/flow/signup',
      'Enter name (business name)',
      'Enter email',
      'Click Next → Customize your experience → Next',
      '⚠️ YOU: Enter email verification code',
      'Set password — save in vault',
      'Set @username (your brand handle)',
      '⚠️ YOU: Complete image-based CAPTCHA',
      'Upload profile photo',
      'Account active ✓',
    ],
    aiCanDo: ['Fill name, email, username, password'],
    humanMust: ['Email verification code', 'Image CAPTCHA'],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Company',
    emoji: '💼',
    color: '#0A66C2',
    signupUrl: 'https://www.linkedin.com/company/setup/new/',
    description: 'LinkedIn Company Page for B2B sales, hiring, and brand credibility.',
    humanSteps: [
      'Create personal LinkedIn account first (if not already)',
      'Click "Open Signup" → linkedin.com/company/setup/new/',
      'Enter company name + LinkedIn public URL',
      'Select company type + industry + size',
      'Enter website URL',
      'Add tagline + logo',
      '⚠️ YOU: Verify you are authorized (LinkedIn checks email domain)',
      'Company page created ✓',
      'Add 3 admins minimum for backup access',
    ],
    aiCanDo: ['Fill company details, industry, size, website'],
    humanMust: ['Personal LinkedIn login', 'Email domain verification'],
  },
];

/* ──────────────────────────────────────────────
   localStorage helpers
────────────────────────────────────────────── */
const CREDS_KEY = 'miller_social_creds_v1';
const BIZ_KEY = 'miller_business_info_v1';

function loadCreds(): Record<string, PlatformCred> {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const defaults: Record<string, PlatformCred> = {};
  PLATFORMS.forEach(p => {
    defaults[p.id] = { handle: '', password: '', status: 'not_started', notes: '' };
  });
  return defaults;
}

function saveCreds(creds: Record<string, PlatformCred>) {
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

function loadBiz(): BusinessInfo {
  try {
    const raw = localStorage.getItem(BIZ_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { businessName: '', email: '', phone: '', website: '', country: '' };
}

function saveBiz(biz: BusinessInfo) {
  localStorage.setItem(BIZ_KEY, JSON.stringify(biz));
}

/* ──────────────────────────────────────────────
   Status badge
────────────────────────────────────────────── */
function StatusBadge({ status }: { status: PlatformStatus }) {
  const cfg = {
    not_started: { label: 'Not Started', icon: Circle, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
    in_progress: { label: 'In Progress', icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    done: { label: 'Done ✓', icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  }[status];
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.02em',
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
  cred,
  onCredChange,
}: {
  platform: Platform;
  cred: PlatformCred;
  onCredChange: (id: string, update: Partial<PlatformCred>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${cred.status === 'done'
        ? 'rgba(16,185,129,0.3)'
        : cred.status === 'in_progress'
          ? 'rgba(245,158,11,0.25)'
          : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 14,
      overflow: 'hidden',
      transition: 'border-color 0.3s',
    }}>
      {/* Card header */}
      <div style={{ padding: '1.1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
          <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{platform.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2 }}>{platform.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)' }}>{platform.description}</div>
          </div>
          <StatusBadge status={cred.status} />
        </div>

        {/* Status toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '0.85rem', flexWrap: 'wrap' }}>
          {(['not_started', 'in_progress', 'done'] as PlatformStatus[]).map(s => (
            <button
              key={s}
              onClick={() => onCredChange(platform.id, { status: s })}
              style={{
                padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                borderColor: cred.status === s ? platform.color : 'rgba(255,255,255,0.1)',
                background: cred.status === s ? `${platform.color}22` : 'transparent',
                color: cred.status === s ? platform.color : 'var(--saas-text-muted)',
                transition: 'all 0.2s',
              }}
            >
              {s === 'not_started' ? 'Not Started' : s === 'in_progress' ? 'In Progress' : 'Done ✓'}
            </button>
          ))}
        </div>

        {/* Credential vault row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '0.6rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <User size={13} style={{
              position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--saas-text-muted)', pointerEvents: 'none'
            }} />
            <input
              type="text"
              placeholder={
                platform.id === 'google_business' ? 'Google email / Business ID' :
                platform.id === 'twilio_whatsapp' ? 'Account SID (ACxxxxxxxx...)' :
                platform.id === 'whatsapp_business' ? 'Business phone number' :
                '@username or handle'
              }
              value={cred.handle}
              onChange={e => onCredChange(platform.id, { handle: e.target.value })}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '6px 10px 6px 28px',
                color: 'var(--saas-text)', fontSize: '0.8rem',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <Lock size={13} style={{
              position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--saas-text-muted)', pointerEvents: 'none'
            }} />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder={platform.id === 'twilio_whatsapp' ? 'Auth Token' : 'Password'}
              value={cred.password}
              onChange={e => onCredChange(platform.id, { password: e.target.value })}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '6px 30px 6px 28px',
                color: 'var(--saas-text)', fontSize: '0.8rem',
                outline: 'none',
              }}
            />
            <button
              onClick={() => setShowPass(v => !v)}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--saas-text-muted)', padding: 0,
              }}
            >
              {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a
            href={platform.signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8,
              background: `${platform.color}22`,
              color: platform.color,
              border: `1px solid ${platform.color}44`,
              textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            <ExternalLink size={12} />
            Open Signup
          </a>
          <button
            onClick={() => { handleSave(); }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8,
              background: saved ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)',
              color: saved ? '#10b981' : 'var(--saas-text-muted)',
              border: `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            <Save size={12} />
            {saved ? 'Saved!' : 'Save Creds'}
          </button>
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
            Guide
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Expandable step guide */}
      {expanded && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '1rem 1.25rem',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--saas-text-secondary)' }}>
            📋 Step-by-Step Guide
          </div>

          {/* Extra quick-links (e.g. Google Business product management) */}
          {platform.extraLinks && platform.extraLinks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.9rem' }}>
              {platform.extraLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 20,
                    background: `${platform.color}18`,
                    color: platform.color,
                    border: `1px solid ${platform.color}33`,
                    textDecoration: 'none', fontSize: '0.72rem', fontWeight: 600,
                  }}
                >
                  <ExternalLink size={10} />
                  {link.label}
                </a>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {(() => {
              let stepNum = 0;
              return platform.humanSteps.map((step, i) => {
                const isPhase = step.startsWith('━━');
                const isWarning = step.startsWith('⚠️');
                const isIndented = step.startsWith('  ');
                if (!isPhase && !isIndented) stepNum++;
                return (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: isIndented ? 'center' : 'flex-start',
                    gap: isPhase ? 0 : 8,
                    marginTop: isPhase ? 6 : 0,
                  }}>
                    {isPhase ? (
                      <div style={{
                        fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em',
                        color: platform.color, opacity: 0.85,
                        borderBottom: `1px solid ${platform.color}33`,
                        paddingBottom: 3, width: '100%',
                      }}>
                        {step.replace(/━━/g, '').trim()}
                      </div>
                    ) : isIndented ? (
                      <div style={{
                        fontSize: '0.75rem', color: '#d97706', lineHeight: 1.5,
                        paddingLeft: 28,
                      }}>{step.trim()}</div>
                    ) : (
                      <>
                        <span style={{
                          flexShrink: 0, width: 18, height: 18,
                          borderRadius: '50%',
                          background: isWarning ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${isWarning ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.58rem', fontWeight: 700,
                          color: isWarning ? '#f59e0b' : 'var(--saas-text-muted)',
                          marginTop: 2,
                        }}>
                          {isWarning ? '!' : stepNum}
                        </span>
                        <span style={{
                          fontSize: '0.78rem',
                          color: isWarning ? '#f59e0b' : 'var(--saas-text-secondary)',
                          lineHeight: 1.5, flex: 1,
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

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <div style={{
              flex: 1, minWidth: 180,
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 8, padding: '0.65rem 0.85rem',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#818cf8', marginBottom: 4 }}>
                🤖 AI can fill
              </div>
              {platform.aiCanDo.map((s, i) => (
                <div key={i} style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>• {s}</div>
              ))}
            </div>
            <div style={{
              flex: 1, minWidth: 180,
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 8, padding: '0.65rem 0.85rem',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
                👤 YOU must do
              </div>
              {platform.humanMust.map((s, i) => (
                <div key={i} style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)', lineHeight: 1.5 }}>• {s}</div>
              ))}
            </div>
          </div>

          {/* Notes field */}
          <div style={{ marginTop: '0.75rem' }}>
            <textarea
              placeholder="Notes (profile URL, backup codes, 2FA setup, etc.)"
              value={cred.notes}
              onChange={e => onCredChange(platform.id, { notes: e.target.value })}
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
   Main Page
────────────────────────────────────────────── */
export default function SocialSetupPage() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [creds, setCreds] = useState<Record<string, PlatformCred>>({});
  const [biz, setBiz] = useState<BusinessInfo>({ businessName: '', email: '', phone: '', website: '', country: '' });
  const [bizOpen, setBizOpen] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      let activeId = 'store-1';
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('active_store_id');
        if (saved) activeId = saved;
      }
      const allStores = await db.getStores();
      const cur = allStores.find(s => s.id === activeId) || allStores[0];
      if (cur) setStore(cur);
      setCreds(loadCreds());
      setBiz(loadBiz());
      setLoading(false);
    };
    load();
  }, []);

  // Auto-save creds on any change
  const updateCred = (id: string, update: Partial<PlatformCred>) => {
    setCreds(prev => {
      const next = { ...prev, [id]: { ...prev[id], ...update } };
      saveCreds(next);
      return next;
    });
  };

  const updateBiz = (field: keyof BusinessInfo, value: string) => {
    setBiz(prev => {
      const next = { ...prev, [field]: value };
      return next;
    });
  };

  const saveBizInfo = () => {
    saveBiz(biz);
    setBizSaved(true);
    setTimeout(() => setBizSaved(false), 2000);
  };

  const doneCount = Object.values(creds).filter(c => c.status === 'done').length;
  const inProgCount = Object.values(creds).filter(c => c.status === 'in_progress').length;
  const progressPct = Math.round((doneCount / PLATFORMS.length) * 100);

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
        {/* ── Onboarding Hero ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(16,185,129,0.06) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 18, padding: '2rem 2.25rem', marginBottom: '2rem',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Background glow blobs */}
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 200, height: 200,
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', bottom: -30, left: '40%', width: 160, height: 160,
            background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 20, padding: '4px 12px', marginBottom: '1rem',
            fontSize: '0.72rem', fontWeight: 700, color: '#818cf8', letterSpacing: '0.04em',
          }}>
            🚀 FOR STARTUPS — START HERE
          </div>

          <h1 style={{
            fontSize: '1.9rem', fontFamily: 'var(--font-display)',
            marginBottom: '0.5rem', lineHeight: 1.2,
          }}>
            Build Your Entire Online Presence<br />
            <span style={{ color: '#818cf8' }}>From One Place.</span>
          </h1>

          <p style={{
            color: 'var(--saas-text-secondary)', fontSize: '0.92rem',
            maxWidth: 620, lineHeight: 1.7, marginBottom: '1.75rem',
          }}>
            Miller SaaS Hub handles <strong style={{ color: '#a5b4fc' }}>80% of the work</strong> for you.
            Just enter your business email and name — then follow the guide for each platform.
            AI fills in the forms, you handle the phone code and press confirm. Done.
          </p>

          {/* 3-step flow */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem', position: 'relative', zIndex: 1,
          }}>
            {[
              {
                num: '01',
                icon: '📋',
                title: 'Fill Business Info',
                desc: 'Enter your business name, email, phone and website once. We pre-fill every platform signup for you.',
                color: '#6366f1',
                badge: 'Start here →',
              },
              {
                num: '02',
                icon: '🤖',
                title: 'AI Does 80%',
                desc: 'Open each platform below. AI fills name, email, password and navigates through every form page.',
                color: '#8b5cf6',
                badge: '~5 min each',
              },
              {
                num: '03',
                icon: '📱',
                title: 'You Do 20%',
                desc: 'Enter the SMS code on your phone, the email code, or pass the CAPTCHA. That\'s your only job.',
                color: '#10b981',
                badge: '1–2 taps',
              },
              {
                num: '04',
                icon: '🔐',
                title: 'Save & Done',
                desc: 'Every username and password auto-saves in your private vault here. One dashboard, all accounts.',
                color: '#f59e0b',
                badge: 'All in one place',
              },
            ].map(step => (
              <div key={step.num} style={{
                background: 'rgba(0,0,0,0.25)', border: `1px solid ${step.color}25`,
                borderRadius: 12, padding: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.1em',
                    color: step.color, opacity: 0.7,
                  }}>{step.num}</span>
                  <span style={{ fontSize: '1.2rem' }}>{step.icon}</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: '0.62rem', fontWeight: 700,
                    color: step.color, background: `${step.color}18`,
                    border: `1px solid ${step.color}30`,
                    borderRadius: 10, padding: '2px 7px',
                  }}>{step.badge}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>{step.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)', lineHeight: 1.55 }}>{step.desc}</div>
              </div>
            ))}
          </div>

          {/* Bottom tip */}
          <div style={{
            marginTop: '1.25rem', paddingTop: '1rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: '0.77rem', color: 'var(--saas-text-muted)',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <span>💡 <strong style={{ color: 'var(--saas-text-secondary)' }}>New to social media?</strong> Start with Google Business + WhatsApp. Those two alone bring in most local customers.</span>
            <span style={{ marginLeft: 'auto', color: '#6366f1', fontWeight: 600 }}>
              {PLATFORMS.length} platforms ready to set up below ↓
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.75rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Overall Progress</div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
              <span style={{ color: '#10b981' }}>✓ {doneCount} Done</span>
              <span style={{ color: '#f59e0b' }}>⏳ {inProgCount} In Progress</span>
              <span style={{ color: 'var(--saas-text-muted)' }}>○ {PLATFORMS.length - doneCount - inProgCount} Not Started</span>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              borderRadius: 99,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--saas-text-muted)', marginTop: 4 }}>
            {doneCount}/{PLATFORMS.length} platforms complete ({progressPct}%)
          </div>
        </div>

        {/* Business Info Vault */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, marginBottom: '1.75rem', overflow: 'hidden',
        }}>
          <button
            onClick={() => setBizOpen(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '1rem 1.25rem',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--saas-text)', textAlign: 'left',
            }}
          >
            <Building size={18} style={{ color: '#6366f1' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Business Info Vault</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)' }}>
                Fill once — copy-paste to every platform signup
              </div>
            </div>
            {bizOpen ? <ChevronUp size={16} style={{ color: 'var(--saas-text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--saas-text-muted)' }} />}
          </button>

          {bizOpen && (
            <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.85rem' }}>
                {[
                  { key: 'businessName', label: 'Business Name', icon: Building, placeholder: 'Aura Artisans' },
                  { key: 'email', label: 'Business Email', icon: Mail, placeholder: 'hello@yourbusiness.com' },
                  { key: 'phone', label: 'Phone Number', icon: Phone, placeholder: '+44 7700 900000' },
                  { key: 'website', label: 'Website', icon: Globe, placeholder: 'https://yourbusiness.com' },
                  { key: 'country', label: 'Country', icon: Globe, placeholder: 'United Kingdom' },
                ].map(({ key, label, icon: Icon, placeholder }) => (
                  <div key={key} style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
                    <div style={{ position: 'relative' }}>
                      <Icon size={13} style={{
                        position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--saas-text-muted)', pointerEvents: 'none',
                      }} />
                      <input
                        type="text"
                        placeholder={placeholder}
                        value={biz[key as keyof BusinessInfo]}
                        onChange={e => updateBiz(key as keyof BusinessInfo, e.target.value)}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8, padding: '7px 10px 7px 28px',
                          color: 'var(--saas-text)', fontSize: '0.8rem', outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={saveBizInfo}
                style={{
                  marginTop: '0.85rem',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 18px', borderRadius: 8,
                  background: bizSaved ? 'rgba(16,185,129,0.18)' : 'rgba(99,102,241,0.18)',
                  color: bizSaved ? '#10b981' : '#818cf8',
                  border: `1px solid ${bizSaved ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                <Save size={14} />
                {bizSaved ? 'Business info saved!' : 'Save Business Info'}
              </button>
            </div>
          )}
        </div>

        {/* Platform cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '1rem' }}>
          {PLATFORMS.map(platform => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              cred={creds[platform.id] || { handle: '', password: '', status: 'not_started', notes: '' }}
              onCredChange={updateCred}
            />
          ))}
        </div>

        {/* Bottom notice */}
        <div style={{
          marginTop: '2rem', padding: '1rem 1.25rem',
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 10, fontSize: '0.78rem', color: '#d97706', lineHeight: 1.6,
        }}>
          <strong>🔒 Privacy note:</strong> All usernames and passwords are stored only in your browser (localStorage).
          Nothing is sent to any server. Clear browser data will erase saved credentials — export or note them separately.
        </div>
      </main>
    </div>
  );
}
