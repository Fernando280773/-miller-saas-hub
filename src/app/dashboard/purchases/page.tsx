"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { db, Store, DEFAULT_STORE_ID, supabase } from '../../../lib/supabaseClient';
import { saveInvoiceImage, getInvoiceImage, deleteInvoiceImage } from '../../../lib/invoiceDb';
import { playNotificationChime } from '../../../lib/audioChime';
import {
  Plus, X, ChevronDown, ChevronUp, Eye, EyeOff, Save,
  Upload, Camera, FileText, CheckCircle, Clock, AlertCircle,
  Search, Filter, Trash2, ExternalLink, Image, Calendar,
  TrendingUp, ShoppingBag, CreditCard, BarChart2
} from 'lucide-react';

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */
type SupplierCategory = 'cash_carry'|'van_direct'|'vape_tobacco'|'phone'|'fresh_food'|'fashion'|'general'|'custom';
type SupplierStatus   = 'active'|'paused'|'on_hold';
type PaymentMethod    = 'cash'|'card'|'credit'|'bacs';
type PaymentStatus    = 'unpaid'|'paid'|'part_paid';
type TimePeriod       = 'week'|'month'|'quarter'|'year'|'custom';

interface Supplier {
  id: string; name: string; category: SupplierCategory;
  accountNumber: string; username: string; password: string;
  repName: string; repPhone: string; nextDelivery: string;
  creditLimit: number; outstandingBalance: number;
  portalUrl: string; status: SupplierStatus; notes: string; createdAt: string;
}

interface LineItem { description: string; qty: number; unitPrice: number; }

interface Invoice {
  id: string; supplierId: string; supplierName: string; category: SupplierCategory;
  invoiceNumber: string; invoiceDate: string; dueDate: string;
  lineItems: LineItem[]; subtotal: number; vat: number; grandTotal: number;
  paymentMethod: PaymentMethod; paymentStatus: PaymentStatus;
  hasImage: boolean; notes: string; createdAt: string;
}

interface WASender {
  id: string; name: string; phone: string;
  role: 'owner' | 'manager'; active: boolean; connectedAt?: string;
}

interface WADraft {
  id: string; senderId: string; senderName: string; senderPhone: string;
  receivedAt: string; hasImage: boolean; processed: boolean; note: string;
}

/* ═══════════════════════════════════════════
   CATEGORY CONFIG
═══════════════════════════════════════════ */
const CAT: Record<SupplierCategory, { label: string; emoji: string; color: string }> = {
  cash_carry:   { label: 'Cash & Carry',     emoji: '🏪', color: '#6366f1' },
  van_direct:   { label: 'Van Direct',       emoji: '🚐', color: '#f59e0b' },
  vape_tobacco: { label: 'Vape & Tobacco',   emoji: '🔋', color: '#8b5cf6' },
  phone:        { label: 'Phone & SIM',      emoji: '📱', color: '#06b6d4' },
  fresh_food:   { label: 'Fresh & Food',     emoji: '🥛', color: '#10b981' },
  fashion:      { label: 'Fashion',          emoji: '👗', color: '#ec4899' },
  general:      { label: 'General Wholesale',emoji: '📦', color: '#64748b' },
  custom:       { label: 'Custom / Other',   emoji: '⭐', color: '#eab308' },
};

/* ═══════════════════════════════════════════
   SEED DATA
═══════════════════════════════════════════ */
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400000).toISOString().split('T')[0];
}

const SEED_SUPPLIERS: Supplier[] = [
  { id:'s1', name:"Booker's Wholesale", category:'cash_carry', accountNumber:'BK-88441', username:'merchant_store', password:'bk2024pass', repName:'James Wilson', repPhone:'07700 900111', nextDelivery: daysAgo(-2), creditLimit:5000, outstandingBalance:1200, portalUrl:'https://www.booker.co.uk', status:'active', notes:'Tuesday & Friday deliveries', createdAt: daysAgo(90) },
  { id:'s2', name:'Bestway Cash & Carry', category:'cash_carry', accountNumber:'BW-22190', username:'bw_merchant', password:'bestway99', repName:'Priya Patel', repPhone:'07700 900222', nextDelivery: daysAgo(-5), creditLimit:3000, outstandingBalance:0, portalUrl:'https://www.bestway.co.uk', status:'active', notes:'Self-collection only', createdAt: daysAgo(120) },
  { id:'s3', name:'Empire Vape Co.', category:'vape_tobacco', accountNumber:'EV-5521', username:'empire_vape', password:'vape2024!', repName:'Danny Khan', repPhone:'07700 900333', nextDelivery: daysAgo(-1), creditLimit:2000, outstandingBalance:480, portalUrl:'https://empirevape.co.uk', status:'active', notes:'Next day delivery available', createdAt: daysAgo(60) },
  { id:'s4', name:'DG Distribution (Phones)', category:'phone', accountNumber:'DG-9910', username:'dg_dist', password:'dgphones1', repName:'Sarah Chow', repPhone:'07700 900444', nextDelivery: daysAgo(-3), creditLimit:4000, outstandingBalance:760, portalUrl:'https://dgdistribution.co.uk', status:'active', notes:'Phone accessories & cases', createdAt: daysAgo(45) },
  { id:'s5', name:'City Fresh Sandwiches', category:'fresh_food', accountNumber:'CFS-441', username:'', password:'', repName:'Tom Baker', repPhone:'07700 900555', nextDelivery: daysAgo(0), creditLimit:0, outstandingBalance:0, portalUrl:'', status:'active', notes:'6am delivery Mon–Fri, 20 pieces min order', createdAt: daysAgo(30) },
  { id:'s6', name:'Valley Dairy (Milkman)', category:'fresh_food', accountNumber:'VD-221', username:'', password:'', repName:'Bill Green', repPhone:'07700 900666', nextDelivery: daysAgo(0), creditLimit:0, outstandingBalance:0, portalUrl:'', status:'active', notes:'Daily 5am delivery', createdAt: daysAgo(60) },
  { id:'s7', name:'Lycamobile Trade', category:'phone', accountNumber:'LYC-TRD-8812', username:'lyca_merchant', password:'lyca2024', repName:'Aisha Rahman', repPhone:'07700 900777', nextDelivery: daysAgo(-7), creditLimit:1500, outstandingBalance:0, portalUrl:'https://trade.lycamobile.co.uk', status:'active', notes:'Phone cards & SIM bundles', createdAt: daysAgo(80) },
  { id:'s8', name:'Micro Wholesale', category:'general', accountNumber:'MW-3312', username:'micro_acct', password:'micro123', repName:'Chris Hall', repPhone:'07700 900888', nextDelivery: daysAgo(-4), creditLimit:2500, outstandingBalance:320, portalUrl:'', status:'active', notes:'General ambient goods', createdAt: daysAgo(100) },
];

const SEED_INVOICES: Invoice[] = [
  { id:'i1', supplierId:'s1', supplierName:"Booker's Wholesale", category:'cash_carry', invoiceNumber:'BK-INV-44821', invoiceDate: daysAgo(3), dueDate: daysAgo(-27), lineItems:[{description:'Coca Cola 24x330ml',qty:10,unitPrice:8.50},{description:'Walkers Crisps 48pk',qty:5,unitPrice:14.20},{description:'Ribena 12x500ml',qty:8,unitPrice:6.80}], subtotal:195.00, vat:39.00, grandTotal:234.00, paymentMethod:'credit', paymentStatus:'unpaid', hasImage:false, notes:'', createdAt: daysAgo(3) },
  { id:'i2', supplierId:'s3', supplierName:'Empire Vape Co.', category:'vape_tobacco', invoiceNumber:'EV-20441', invoiceDate: daysAgo(7), dueDate: daysAgo(-14), lineItems:[{description:'Elf Bar 600 Mixed x50',qty:2,unitPrice:120.00},{description:'Lost Mary Mixed x25',qty:3,unitPrice:85.00}], subtotal:495.00, vat:0, grandTotal:495.00, paymentMethod:'bacs', paymentStatus:'paid', hasImage:false, notes:'VAT exempt — tobacco products', createdAt: daysAgo(7) },
  { id:'i3', supplierId:'s4', supplierName:'DG Distribution (Phones)', category:'phone', invoiceNumber:'DG-8812', invoiceDate: daysAgo(5), dueDate: daysAgo(-25), lineItems:[{description:'Phone Cases Mixed x100',qty:2,unitPrice:45.00},{description:'Screen Protectors x50',qty:4,unitPrice:18.00}], subtotal:162.00, vat:32.40, grandTotal:194.40, paymentMethod:'card', paymentStatus:'unpaid', hasImage:false, notes:'', createdAt: daysAgo(5) },
  { id:'i4', supplierId:'s2', supplierName:'Bestway Cash & Carry', category:'cash_carry', invoiceNumber:'BW-INV-9921', invoiceDate: daysAgo(14), dueDate: daysAgo(-16), lineItems:[{description:'Red Bull 24x250ml',qty:6,unitPrice:22.00},{description:'Haribo 12x200g',qty:4,unitPrice:8.40},{description:'Monster Energy 24x500ml',qty:5,unitPrice:28.00}], subtotal:307.60, vat:61.52, grandTotal:369.12, paymentMethod:'cash', paymentStatus:'paid', hasImage:false, notes:'', createdAt: daysAgo(14) },
  { id:'i5', supplierId:'s5', supplierName:'City Fresh Sandwiches', category:'fresh_food', invoiceNumber:'CFS-W22', invoiceDate: daysAgo(1), dueDate: daysAgo(-6), lineItems:[{description:'Mixed Sandwiches x20',qty:5,unitPrice:28.00},{description:'Meal Deals x10',qty:3,unitPrice:18.00}], subtotal:194.00, vat:0, grandTotal:194.00, paymentMethod:'cash', paymentStatus:'unpaid', hasImage:false, notes:'Weekly invoice', createdAt: daysAgo(1) },
  { id:'i6', supplierId:'s7', supplierName:'Lycamobile Trade', category:'phone', invoiceNumber:'LYC-44210', invoiceDate: daysAgo(21), dueDate: daysAgo(-9), lineItems:[{description:'Lyca SIM Bundle x100',qty:3,unitPrice:12.00},{description:'£10 Top-up Cards x50',qty:5,unitPrice:48.00}], subtotal:276.00, vat:0, grandTotal:276.00, paymentMethod:'bacs', paymentStatus:'paid', hasImage:false, notes:'', createdAt: daysAgo(21) },
  { id:'i7', supplierId:'s1', supplierName:"Booker's Wholesale", category:'cash_carry', invoiceNumber:'BK-INV-44390', invoiceDate: daysAgo(30), dueDate: daysAgo(0), lineItems:[{description:'General stock run',qty:1,unitPrice:620.00}], subtotal:620.00, vat:124.00, grandTotal:744.00, paymentMethod:'credit', paymentStatus:'paid', hasImage:false, notes:'', createdAt: daysAgo(30) },
  { id:'i8', supplierId:'s8', supplierName:'Micro Wholesale', category:'general', invoiceNumber:'MW-1190', invoiceDate: daysAgo(10), dueDate: daysAgo(-20), lineItems:[{description:'Cleaning products assorted',qty:6,unitPrice:22.00},{description:'Paper bags x500',qty:2,unitPrice:14.00}], subtotal:160.00, vat:32.00, grandTotal:192.00, paymentMethod:'cash', paymentStatus:'part_paid', hasImage:false, notes:'£100 paid, £92 remaining', createdAt: daysAgo(10) },
];

const SEED_WA_SENDERS: WASender[] = [
  { id:'wa-o1', name:'', phone:'', role:'owner',   active:false },
  { id:'wa-o2', name:'', phone:'', role:'owner',   active:false },
  { id:'wa-o3', name:'', phone:'', role:'owner',   active:false },
  { id:'wa-m1', name:'', phone:'', role:'manager', active:false },
  { id:'wa-m2', name:'', phone:'', role:'manager', active:false },
  { id:'wa-m3', name:'', phone:'', role:'manager', active:false },
];

const SEED_WA_DRAFTS: WADraft[] = [
  { id:'wd1', senderId:'wa-o1', senderName:'Owner', senderPhone:'', receivedAt: new Date(Date.now()-1000*60*25).toISOString(), hasImage:true, processed:false, note:'Photo sent from WhatsApp — Booker\'s delivery receipt' },
  { id:'wd2', senderId:'wa-m1', senderName:'Manager', senderPhone:'', receivedAt: new Date(Date.now()-1000*60*60*3).toISOString(), hasImage:true, processed:false, note:'Vape delivery invoice photo' },
];

/* ═══════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════ */
const SUP_KEY = 'miller_suppliers_v1';
const INV_KEY = 'miller_invoices_v1';

function loadSuppliers(): Supplier[] {
  try { const r = localStorage.getItem(SUP_KEY); if (r) return JSON.parse(r); } catch {/**/}
  localStorage.setItem(SUP_KEY, JSON.stringify(SEED_SUPPLIERS));
  return SEED_SUPPLIERS;
}
function saveSuppliers(s: Supplier[]) { localStorage.setItem(SUP_KEY, JSON.stringify(s)); }

function loadInvoices(): Invoice[] {
  try { const r = localStorage.getItem(INV_KEY); if (r) return JSON.parse(r); } catch {/**/}
  localStorage.setItem(INV_KEY, JSON.stringify(SEED_INVOICES));
  return SEED_INVOICES;
}
function saveInvoices(i: Invoice[]) { localStorage.setItem(INV_KEY, JSON.stringify(i)); }

/* ═══════════════════════════════════════════
   DATE HELPERS
═══════════════════════════════════════════ */
function getPeriodRange(period: TimePeriod, customFrom: string, customTo: string): { from: Date; to: Date } {
  const now = new Date(); now.setHours(23,59,59,999);
  switch (period) {
    case 'week':    return { from: new Date(Date.now() - 7*86400000), to: now };
    case 'month':   return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    case 'quarter': return { from: new Date(Date.now() - 90*86400000), to: now };
    case 'year':    return { from: new Date(now.getFullYear(), 0, 1), to: now };
    case 'custom':  return { from: customFrom ? new Date(customFrom) : new Date(Date.now()-30*86400000), to: customTo ? new Date(customTo+'T23:59:59') : now };
  }
}

function inPeriod(dateStr: string, from: Date, to: Date) {
  const d = new Date(dateStr);
  return d >= from && d <= to;
}

function fmtDate(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtGBP(n: number) {
  return '£' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ═══════════════════════════════════════════
   SPENDING ANALYTICS
═══════════════════════════════════════════ */
function SpendingAnalytics({ invoices, period, customFrom, customTo }:
  { invoices: Invoice[]; period: TimePeriod; customFrom: string; customTo: string }) {

  const { from, to } = getPeriodRange(period, customFrom, customTo);
  const filtered = invoices.filter(i => inPeriod(i.invoiceDate, from, to));

  const totalSpent  = filtered.reduce((s, i) => s + i.grandTotal, 0);
  const invoiceCount = filtered.length;
  const unpaidAmt   = filtered.filter(i => i.paymentStatus !== 'paid').reduce((s, i) => s + i.grandTotal, 0);
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
  const avgPerWeek  = (totalSpent / days) * 7;

  // Category breakdown
  const catTotals: Record<string, number> = {};
  filtered.forEach(i => { catTotals[i.category] = (catTotals[i.category] || 0) + i.grandTotal; });
  const catEntries = Object.entries(catTotals).sort((a,b) => b[1]-a[1]);
  const maxCat = catEntries[0]?.[1] || 1;

  // Top suppliers
  const supTotals: Record<string, number> = {};
  filtered.forEach(i => { supTotals[i.supplierName] = (supTotals[i.supplierName] || 0) + i.grandTotal; });
  const topSups = Object.entries(supTotals).sort((a,b) => b[1]-a[1]).slice(0,5);
  const maxSup = topSups[0]?.[1] || 1;

  // Monthly trend (for quarter/year)
  const showTrend = period === 'quarter' || period === 'year';
  const monthMap: Record<string, number> = {};
  if (showTrend) {
    filtered.forEach(i => {
      const key = i.invoiceDate.slice(0,7);
      monthMap[key] = (monthMap[key] || 0) + i.grandTotal;
    });
  }
  const monthEntries = Object.entries(monthMap).sort((a,b) => a[0].localeCompare(b[0]));
  const maxMonth = monthEntries.reduce((m, e) => Math.max(m, e[1]), 1);

  const summaryCards = [
    { label: 'Total Spent', value: fmtGBP(totalSpent), icon: TrendingUp, color: '#6366f1' },
    { label: 'Invoices', value: String(invoiceCount), icon: FileText, color: '#06b6d4' },
    { label: 'Unpaid', value: fmtGBP(unpaidAmt), icon: AlertCircle, color: unpaidAmt > 0 ? '#ef4444' : '#10b981' },
    { label: 'Avg / Week', value: fmtGBP(avgPerWeek), icon: BarChart2, color: '#f59e0b' },
  ];

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
        {summaryCards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} style={{
              background: `${c.color}10`, border: `1px solid ${c.color}25`,
              borderRadius: 12, padding: '1rem 1.15rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
                <Icon size={15} style={{ color: c.color }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--saas-text-muted)', fontWeight: 600 }}>{c.label}</span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: c.color, fontFamily: 'var(--font-display)' }}>{c.value}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showTrend ? '1fr 1fr 1fr' : '1fr 1fr', gap: '1rem' }}>
        {/* Category breakdown */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '1rem',
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.85rem' }}>Spend by Category</div>
          {catEntries.length === 0
            ? <div style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)' }}>No data in period</div>
            : catEntries.map(([cat, val]) => {
                const cfg = CAT[cat as SupplierCategory] || CAT.custom;
                return (
                  <div key={cat} style={{ marginBottom: '0.6rem' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.73rem', marginBottom:3 }}>
                      <span>{cfg.emoji} {cfg.label}</span>
                      <span style={{ fontWeight:700 }}>{fmtGBP(val)}</span>
                    </div>
                    <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:99, height:6, overflow:'hidden' }}>
                      <div style={{
                        height:'100%', borderRadius:99, transition:'width 0.5s',
                        width:`${(val/maxCat)*100}%`,
                        background: cfg.color,
                      }}/>
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Top suppliers */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 12, padding: '1rem',
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.85rem' }}>Top Suppliers</div>
          {topSups.length === 0
            ? <div style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)' }}>No data in period</div>
            : topSups.map(([name, val], idx) => (
                <div key={name} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'0.55rem' }}>
                  <span style={{
                    width:18, height:18, borderRadius:'50%', flexShrink:0,
                    background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.25)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'0.6rem', fontWeight:800, color:'#818cf8',
                  }}>{idx+1}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.73rem', marginBottom:2 }}>
                      <span style={{ fontWeight:600 }}>{name}</span>
                      <span style={{ fontWeight:700 }}>{fmtGBP(val)}</span>
                    </div>
                    <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:99, height:4, overflow:'hidden' }}>
                      <div style={{
                        height:'100%', borderRadius:99,
                        width:`${(val/maxSup)*100}%`,
                        background:'linear-gradient(90deg,#6366f1,#8b5cf6)',
                      }}/>
                    </div>
                  </div>
                </div>
              ))
          }
        </div>

        {/* Monthly trend */}
        {showTrend && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '1rem',
          }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.85rem' }}>Monthly Trend</div>
            {monthEntries.length === 0
              ? <div style={{ fontSize: '0.75rem', color: 'var(--saas-text-muted)' }}>No data in period</div>
              : (
                <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:100 }}>
                  {monthEntries.map(([month, val]) => (
                    <div key={month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                      <span style={{ fontSize:'0.58rem', color:'var(--saas-text-muted)', fontWeight:700 }}>
                        {fmtGBP(val).replace('£','£')}
                      </span>
                      <div style={{
                        width:'100%', borderRadius:'4px 4px 0 0',
                        height: `${Math.max(8,(val/maxMonth)*80)}px`,
                        background: 'linear-gradient(180deg,#6366f1,#8b5cf6)',
                        transition: 'height 0.5s',
                      }}/>
                      <span style={{ fontSize:'0.58rem', color:'var(--saas-text-muted)' }}>
                        {new Date(month+'-01').toLocaleDateString('en-GB',{month:'short'})}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUPPLIER CARD
═══════════════════════════════════════════ */
function SupplierCard({ supplier, invoices, onEdit, onDelete }:
  { supplier: Supplier; invoices: Invoice[]; onEdit: (s: Supplier) => void; onDelete: (id: string) => void }) {

  const [expanded, setExpanded] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const cfg = CAT[supplier.category];
  const totalSpend = invoices.filter(i => i.supplierId === supplier.id).reduce((s,i) => s+i.grandTotal, 0);
  const unpaidInv  = invoices.filter(i => i.supplierId === supplier.id && i.paymentStatus !== 'paid').length;

  const statusCfg = {
    active:  { color:'#10b981', label:'Active' },
    paused:  { color:'#f59e0b', label:'Paused' },
    on_hold: { color:'#ef4444', label:'On Hold' },
  }[supplier.status];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${supplier.status==='active' ? `${cfg.color}25` : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 12, overflow:'hidden', transition:'border-color 0.3s',
    }}>
      <div style={{ padding:'0.9rem 1.1rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.65rem', marginBottom:'0.65rem' }}>
          <span style={{ fontSize:'1.4rem' }}>{cfg.emoji}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:'0.9rem' }}>{supplier.name}</div>
            <div style={{ fontSize:'0.7rem', color:'var(--saas-text-muted)' }}>{cfg.label} · Acc: {supplier.accountNumber||'—'}</div>
          </div>
          <span style={{ fontSize:'0.68rem', fontWeight:700, color:statusCfg.color, background:`${statusCfg.color}15`, border:`1px solid ${statusCfg.color}25`, borderRadius:10, padding:'2px 8px' }}>
            {statusCfg.label}
          </span>
        </div>

        {/* Quick stats */}
        <div style={{ display:'flex', gap:'0.75rem', marginBottom:'0.65rem', flexWrap:'wrap' }}>
          {[
            { label:'Total spend', val: fmtGBP(totalSpend), color: cfg.color },
            { label:'Outstanding', val: fmtGBP(supplier.outstandingBalance), color: supplier.outstandingBalance>0?'#ef4444':'#10b981' },
            { label:'Unpaid inv.', val: String(unpaidInv), color: unpaidInv>0?'#f59e0b':'#10b981' },
            { label:'Credit limit', val: supplier.creditLimit>0?fmtGBP(supplier.creditLimit):'None', color:'var(--saas-text-muted)' },
          ].map(s => (
            <div key={s.label} style={{ background:'rgba(255,255,255,0.03)', borderRadius:7, padding:'4px 9px' }}>
              <div style={{ fontSize:'0.6rem', color:'var(--saas-text-muted)' }}>{s.label}</div>
              <div style={{ fontSize:'0.8rem', fontWeight:700, color:s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Rep + next delivery */}
        <div style={{ display:'flex', gap:'0.75rem', fontSize:'0.73rem', color:'var(--saas-text-muted)', marginBottom:'0.65rem', flexWrap:'wrap' }}>
          {supplier.repName && <span>👤 {supplier.repName} · {supplier.repPhone}</span>}
          {supplier.nextDelivery && (
            <span style={{ color: new Date(supplier.nextDelivery) >= new Date() ? '#10b981' : 'var(--saas-text-muted)' }}>
              🚚 Next: {fmtDate(supplier.nextDelivery)}
            </span>
          )}
        </div>

        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => setExpanded(v=>!v)} style={{
            display:'inline-flex', alignItems:'center', gap:4,
            padding:'4px 10px', borderRadius:6, cursor:'pointer',
            background:'rgba(255,255,255,0.05)', color:'var(--saas-text-muted)',
            border:'1px solid rgba(255,255,255,0.08)', fontSize:'0.73rem',
          }}>
            {expanded ? <ChevronUp size={11}/> : <ChevronDown size={11}/>} Details
          </button>
          {supplier.portalUrl && (
            <a href={supplier.portalUrl} target="_blank" rel="noopener noreferrer" style={{
              display:'inline-flex', alignItems:'center', gap:4,
              padding:'4px 10px', borderRadius:6, textDecoration:'none',
              background:'transparent', color:'var(--saas-text-muted)',
              border:'1px solid rgba(255,255,255,0.07)', fontSize:'0.73rem',
            }}>
              <ExternalLink size={10}/> Portal
            </a>
          )}
          <button onClick={() => onEdit(supplier)} style={{
            marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:4,
            padding:'4px 10px', borderRadius:6, cursor:'pointer',
            background:`${cfg.color}12`, color:cfg.color,
            border:`1px solid ${cfg.color}25`, fontSize:'0.73rem',
          }}>Edit</button>
          <button onClick={() => onDelete(supplier.id)} style={{
            display:'inline-flex', alignItems:'center', gap:4,
            padding:'4px 8px', borderRadius:6, cursor:'pointer',
            background:'rgba(239,68,68,0.1)', color:'#ef4444',
            border:'1px solid rgba(239,68,68,0.2)', fontSize:'0.73rem',
          }}><Trash2 size={10}/></button>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'0.85rem 1.1rem', background:'rgba(0,0,0,0.2)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.6rem' }}>
            <div>
              <div style={{ fontSize:'0.67rem', color:'var(--saas-text-muted)', marginBottom:3 }}>Username</div>
              <div style={{ fontSize:'0.8rem', fontFamily:'monospace' }}>{supplier.username||'—'}</div>
            </div>
            <div>
              <div style={{ fontSize:'0.67rem', color:'var(--saas-text-muted)', marginBottom:3 }}>Password</div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:'0.8rem', fontFamily:'monospace' }}>
                  {showPass ? supplier.password||'—' : supplier.password ? '••••••••' : '—'}
                </span>
                {supplier.password && (
                  <button onClick={() => setShowPass(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', padding:0, color:'var(--saas-text-muted)' }}>
                    {showPass ? <EyeOff size={12}/> : <Eye size={12}/>}
                  </button>
                )}
              </div>
            </div>
          </div>
          {supplier.notes && (
            <div style={{ fontSize:'0.75rem', color:'var(--saas-text-muted)', background:'rgba(255,255,255,0.03)', borderRadius:6, padding:'0.5rem 0.7rem' }}>
              📝 {supplier.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUPPLIER FORM MODAL
═══════════════════════════════════════════ */
function SupplierModal({ supplier, onSave, onClose }:
  { supplier: Supplier|null; onSave: (s: Supplier) => void; onClose: () => void }) {

  const blank: Supplier = { id:'', name:'', category:'general', accountNumber:'', username:'', password:'', repName:'', repPhone:'', nextDelivery:'', creditLimit:0, outstandingBalance:0, portalUrl:'', status:'active', notes:'', createdAt:new Date().toISOString() };
  const [form, setForm] = useState<Supplier>(supplier || blank);
  const set = (k: keyof Supplier, v: string|number) => setForm(p => ({...p, [k]:v}));

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, id: form.id || `s${Date.now()}`, createdAt: form.createdAt || new Date().toISOString() });
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#0f1420', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, width:'100%', maxWidth:580, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', margin:0 }}>{form.id ? 'Edit Supplier' : 'Add Supplier'}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--saas-text-muted)' }}><X size={18}/></button>
        </div>
        <div style={{ padding:'1.25rem 1.5rem', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:'0.85rem' }}>
          {[
            { label:'Supplier Name *', key:'name' as const, type:'text' },
            { label:'Account Number', key:'accountNumber' as const, type:'text' },
            { label:'Portal / Website URL', key:'portalUrl' as const, type:'text' },
            { label:'Rep Name', key:'repName' as const, type:'text' },
            { label:'Rep Phone', key:'repPhone' as const, type:'text' },
            { label:'Next Delivery Date', key:'nextDelivery' as const, type:'date' },
            { label:'Username', key:'username' as const, type:'text' },
            { label:'Password', key:'password' as const, type:'password' },
            { label:'Credit Limit (£)', key:'creditLimit' as const, type:'number' },
            { label:'Outstanding Balance (£)', key:'outstandingBalance' as const, type:'number' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', display:'block', marginBottom:4 }}>{f.label}</label>
              <input
                type={f.type}
                value={String(form[f.key])}
                onChange={e => set(f.key, f.type==='number' ? Number(e.target.value) : e.target.value)}
                style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'7px 10px', color:'var(--saas-text)', fontSize:'0.82rem', outline:'none' }}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', display:'block', marginBottom:4 }}>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'7px 10px', color:'var(--saas-text)', fontSize:'0.82rem', outline:'none' }}>
              {Object.entries(CAT).map(([k,v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', display:'block', marginBottom:4 }}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'7px 10px', color:'var(--saas-text)', fontSize:'0.82rem', outline:'none' }}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', display:'block', marginBottom:4 }}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'7px 10px', color:'var(--saas-text)', fontSize:'0.82rem', outline:'none', resize:'vertical', fontFamily:'inherit' }}/>
          </div>
        </div>
        <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'8px 20px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'var(--saas-text-muted)', cursor:'pointer', fontSize:'0.82rem' }}>Cancel</button>
          <button onClick={handleSave} style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', cursor:'pointer', fontSize:'0.82rem', fontWeight:700 }}>Save Supplier</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   INVOICE FORM MODAL
═══════════════════════════════════════════ */
function InvoiceModal({ suppliers, invoice, onSave, onClose }:
  { suppliers: Supplier[]; invoice: Invoice|null; onSave: (inv: Invoice, imgBlob?: Blob) => void; onClose: () => void }) {

  const blankInv: Invoice = {
    id:'', supplierId:'', supplierName:'', category:'general',
    invoiceNumber:'', invoiceDate: new Date().toISOString().split('T')[0], dueDate:'',
    lineItems:[{description:'',qty:1,unitPrice:0}],
    subtotal:0, vat:0, grandTotal:0,
    paymentMethod:'cash', paymentStatus:'unpaid',
    hasImage:false, notes:'', createdAt: new Date().toISOString(),
  };

  const [form, setForm] = useState<Invoice>(invoice || blankInv);
  const [imgBlob, setImgBlob] = useState<Blob|null>(null);
  const [imgPreview, setImgPreview] = useState<string|null>(null);
  const [dragging, setDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanBanner, setScanBanner] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const setField = (k: keyof Invoice, v: string|number|boolean) => setForm(p => ({...p,[k]:v}));

  const updateLine = (idx: number, field: keyof LineItem, val: string|number) => {
    setForm(p => {
      const items = p.lineItems.map((li,i) => i===idx ? {...li,[field]:field==='description'?val:Number(val)} : li);
      const subtotal = items.reduce((s,li) => s + li.qty*li.unitPrice, 0);
      return {...p, lineItems:items, subtotal, grandTotal: subtotal + p.vat};
    });
  };

  const addLine = () => setForm(p => ({...p, lineItems:[...p.lineItems, {description:'',qty:1,unitPrice:0}]}));
  const removeLine = (idx: number) => setForm(p => ({...p, lineItems: p.lineItems.filter((_,i)=>i!==idx)}));

  const updateVAT = (v: number) => setForm(p => ({...p, vat:v, grandTotal: p.subtotal+v}));

  const handleSupplierChange = (id: string) => {
    const sup = suppliers.find(s => s.id===id);
    setForm(p => ({...p, supplierId:id, supplierName:sup?.name||'', category:sup?.category||'general'}));
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type!=='application/pdf') return;
    setImgBlob(file);
    setField('hasImage', true);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImgPreview(url);
    }

    // Trigger Live AI Invoice Vision OCR
    setIsScanning(true);
    setScanBanner(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('mode', 'invoice');

      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data?.invoice) {
        const inv = data.invoice;
        let matchedSup = suppliers.find(s => s.name.toLowerCase().includes(inv.supplierName.toLowerCase()) || inv.supplierName.toLowerCase().includes(s.name.toLowerCase()));
        if (!matchedSup && suppliers.length > 0) {
          matchedSup = suppliers[0];
        }

        setForm(prev => ({
          ...prev,
          supplierId: matchedSup?.id || prev.supplierId || (suppliers[0]?.id || ''),
          supplierName: matchedSup?.name || inv.supplierName || prev.supplierName,
          category: (matchedSup?.category || inv.category || prev.category) as SupplierCategory,
          invoiceNumber: inv.invoiceNumber || prev.invoiceNumber,
          invoiceDate: inv.invoiceDate || prev.invoiceDate,
          dueDate: inv.dueDate || prev.dueDate,
          subtotal: inv.subtotal || prev.subtotal,
          vat: inv.vat || prev.vat,
          grandTotal: inv.grandTotal || prev.grandTotal,
          paymentMethod: (inv.paymentMethod as PaymentMethod) || prev.paymentMethod,
          lineItems: (inv.lineItems && inv.lineItems.length > 0)
            ? inv.lineItems.map((li: { description?: string; qty?: number; unitPrice?: number }) => ({
                description: li.description || 'Wholesale item',
                qty: Number(li.qty || 1),
                unitPrice: Number(li.unitPrice || 0)
              }))
            : prev.lineItems
        }));

        playNotificationChime('invoice');
        setScanBanner(`⚡ Miller AI Vision OCR: Extracted ${inv.lineItems?.length || 1} line item(s) · £${Number(inv.grandTotal || 0).toFixed(2)} Total`);
      }
    } catch (err) {
      console.warn('AI Invoice OCR error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSave = () => {
    if (!form.supplierId || !form.invoiceNumber) return;
    onSave({ ...form, id: form.id||`inv${Date.now()}`, createdAt: form.createdAt||new Date().toISOString() }, imgBlob||undefined);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#0f1420', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, width:'100%', maxWidth:640, maxHeight:'92vh', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', margin:0 }}>{form.id ? 'Edit Invoice' : 'Add Invoice'}</h3>
            <span style={{ fontSize:'0.7rem', padding:'2px 8px', borderRadius:20, background:'rgba(99,102,241,0.15)', color:'#818cf8', fontWeight:700 }}>
              AI Vision Enabled
            </span>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--saas-text-muted)' }}><X size={18}/></button>
        </div>

        <div style={{ padding:'1.25rem 1.5rem', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:'0.85rem' }}>
          {/* AI Scan Status Banner */}
          {isScanning && (
            <div style={{
              padding:'0.75rem 1rem', borderRadius:10,
              background:'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(16,185,129,0.15))',
              border:'1px solid rgba(99,102,241,0.4)',
              display:'flex', alignItems:'center', gap:10, fontSize:'0.82rem', color:'#c7d2fe'
            }}>
              <span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>🌀</span>
              <span><strong>Miller AI Vision OCR:</strong> Scanning receipt, line items, and VAT totals...</span>
            </div>
          )}

          {scanBanner && (
            <div style={{
              padding:'0.75rem 1rem', borderRadius:10,
              background:'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(99,102,241,0.15))',
              border:'1px solid rgba(16,185,129,0.4)',
              display:'flex', alignItems:'center', gap:10, fontSize:'0.82rem', color:'#a7f3d0'
            }}>
              <span>✓</span>
              <span>{scanBanner}</span>
            </div>
          )}

          {/* Image upload */}
          <div>
            <label style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', display:'block', marginBottom:6 }}>Invoice Photo / PDF (optional)</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              style={{
                border:`2px dashed ${dragging?'#6366f1':'rgba(255,255,255,0.12)'}`,
                borderRadius:10, padding:'1rem', textAlign:'center',
                background: dragging?'rgba(99,102,241,0.08)':'rgba(255,255,255,0.02)',
                transition:'all 0.2s', cursor:'pointer',
              }}
              onClick={() => fileRef.current?.click()}
            >
              {imgPreview
                ? <img src={imgPreview} alt="invoice" style={{ maxHeight:120, borderRadius:6, maxWidth:'100%' }}/>
                : (
                  <div style={{ fontSize:'0.8rem', color:'var(--saas-text-muted)' }}>
                    <Upload size={20} style={{ display:'block', margin:'0 auto 0.4rem', opacity:0.5 }}/>
                    Drag & drop or click to upload · <span style={{ color:'#818cf8' }}>Auto-scanned by Miller AI →</span>
                  </div>
                )
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={e => { if(e.target.files?.[0]) handleFile(e.target.files[0]); }}/>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e => { if(e.target.files?.[0]) handleFile(e.target.files[0]); }}/>
            <button onClick={() => cameraRef.current?.click()} style={{
              marginTop:6, display:'inline-flex', alignItems:'center', gap:5,
              padding:'5px 12px', borderRadius:6, cursor:'pointer',
              background:'rgba(99,102,241,0.12)', color:'#818cf8',
              border:'1px solid rgba(99,102,241,0.2)', fontSize:'0.75rem', fontWeight:600,
            }}><Camera size={12}/> Snap Photo with Camera</button>
          </div>

          {/* Supplier */}
          <div>
            <label style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', display:'block', marginBottom:4 }}>Supplier *</label>
            <select value={form.supplierId} onChange={e => handleSupplierChange(e.target.value)}
              style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'7px 10px', color:'var(--saas-text)', fontSize:'0.82rem', outline:'none' }}>
              <option value="">— Select supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{CAT[s.category].emoji} {s.name}</option>)}
            </select>
          </div>

          {/* Invoice # and dates */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.7rem' }}>
            {[
              { label:'Invoice Number *', key:'invoiceNumber' as const, type:'text' },
              { label:'Invoice Date', key:'invoiceDate' as const, type:'date' },
              { label:'Due Date', key:'dueDate' as const, type:'date' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', display:'block', marginBottom:4 }}>{f.label}</label>
                <input type={f.type} value={String(form[f.key])} onChange={e => setField(f.key, e.target.value)}
                  style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'7px 10px', color:'var(--saas-text)', fontSize:'0.82rem', outline:'none' }}/>
              </div>
            ))}
          </div>

          {/* Line items */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <label style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)' }}>Line Items</label>
              <button onClick={addLine} style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:6, cursor:'pointer', background:'rgba(99,102,241,0.12)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.2)', fontSize:'0.7rem' }}>
                <Plus size={10}/> Add row
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 60px 90px 80px 28px', gap:5 }}>
                {['Description','Qty','Unit Price','Total',''].map(h => (
                  <div key={h} style={{ fontSize:'0.65rem', color:'var(--saas-text-muted)', fontWeight:600 }}>{h}</div>
                ))}
              </div>
              {form.lineItems.map((li, idx) => (
                <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr 60px 90px 80px 28px', gap:5, alignItems:'center' }}>
                  <input value={li.description} onChange={e => updateLine(idx,'description',e.target.value)} placeholder="Item description"
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'5px 8px', color:'var(--saas-text)', fontSize:'0.78rem', outline:'none' }}/>
                  <input type="number" value={li.qty} onChange={e => updateLine(idx,'qty',e.target.value)} min={1}
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'5px 8px', color:'var(--saas-text)', fontSize:'0.78rem', outline:'none', textAlign:'center' }}/>
                  <input type="number" value={li.unitPrice} onChange={e => updateLine(idx,'unitPrice',e.target.value)} step="0.01" min={0} placeholder="0.00"
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'5px 8px', color:'var(--saas-text)', fontSize:'0.78rem', outline:'none' }}/>
                  <div style={{ fontSize:'0.78rem', fontWeight:700, textAlign:'right', paddingRight:4 }}>{fmtGBP(li.qty*li.unitPrice)}</div>
                  {form.lineItems.length > 1
                    ? <button onClick={() => removeLine(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
                    : <div/>
                  }
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ marginTop:'0.75rem', display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
              <div style={{ display:'flex', gap:'1rem', fontSize:'0.8rem' }}>
                <span style={{ color:'var(--saas-text-muted)' }}>Subtotal:</span>
                <span style={{ fontWeight:700, minWidth:70, textAlign:'right' }}>{fmtGBP(form.subtotal)}</span>
              </div>
              <div style={{ display:'flex', gap:'1rem', fontSize:'0.8rem', alignItems:'center' }}>
                <span style={{ color:'var(--saas-text-muted)' }}>VAT (£):</span>
                <input type="number" value={form.vat} onChange={e => updateVAT(Number(e.target.value))} step="0.01" min={0}
                  style={{ width:80, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'4px 8px', color:'var(--saas-text)', fontSize:'0.78rem', outline:'none', textAlign:'right' }}/>
              </div>
              <div style={{ display:'flex', gap:'1rem', fontSize:'0.92rem', fontWeight:800, borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:6 }}>
                <span>Grand Total:</span>
                <span style={{ color:'#10b981', minWidth:70, textAlign:'right' }}>{fmtGBP(form.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.7rem' }}>
            <div>
              <label style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', display:'block', marginBottom:4 }}>Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setField('paymentMethod', e.target.value)}
                style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'7px 10px', color:'var(--saas-text)', fontSize:'0.82rem', outline:'none' }}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="credit">Credit Account</option>
                <option value="bacs">BACS Transfer</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', display:'block', marginBottom:4 }}>Payment Status</label>
              <select value={form.paymentStatus} onChange={e => setField('paymentStatus', e.target.value)}
                style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'7px 10px', color:'var(--saas-text)', fontSize:'0.82rem', outline:'none' }}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="part_paid">Part Paid</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', display:'block', marginBottom:4 }}>Notes</label>
            <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={2}
              style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'7px 10px', color:'var(--saas-text)', fontSize:'0.82rem', outline:'none', resize:'vertical', fontFamily:'inherit' }}/>
          </div>
        </div>

        <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'8px 20px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'var(--saas-text-muted)', cursor:'pointer', fontSize:'0.82rem' }}>Cancel</button>
          <button onClick={handleSave} style={{ padding:'8px 20px', borderRadius:8, border:'none', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', cursor:'pointer', fontSize:'0.82rem', fontWeight:700 }}>Save Invoice</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   INVOICE TABLE
═══════════════════════════════════════════ */
function InvoiceTable({ invoices, period, customFrom, customTo, suppliers, onEdit, onDelete, onMarkPaid }:
  { invoices: Invoice[]; period: TimePeriod; customFrom: string; customTo: string; suppliers: Supplier[]; onEdit:(i:Invoice)=>void; onDelete:(id:string)=>void; onMarkPaid:(id:string)=>void }) {

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<SupplierCategory|'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus|'all'>('all');
  const [expandedId, setExpandedId] = useState<string|null>(null);

  const { from, to } = getPeriodRange(period, customFrom, customTo);

  const filtered = invoices
    .filter(i => inPeriod(i.invoiceDate, from, to))
    .filter(i => catFilter==='all' || i.category===catFilter)
    .filter(i => statusFilter==='all' || i.paymentStatus===statusFilter)
    .filter(i => !search || i.supplierName.toLowerCase().includes(search.toLowerCase()) || i.invoiceNumber.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => b.invoiceDate.localeCompare(a.invoiceDate));

  const statusCfg = {
    paid:      { color:'#10b981', bg:'rgba(16,185,129,0.1)', label:'Paid' },
    unpaid:    { color:'#ef4444', bg:'rgba(239,68,68,0.1)',  label:'Unpaid' },
    part_paid: { color:'#f59e0b', bg:'rgba(245,158,11,0.1)', label:'Part Paid' },
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--saas-text-muted)', pointerEvents:'none' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search supplier or invoice #"
            style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'7px 10px 7px 30px', color:'var(--saas-text)', fontSize:'0.8rem', outline:'none' }}/>
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value as SupplierCategory|'all')}
          style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'7px 10px', color:'var(--saas-text)', fontSize:'0.8rem', outline:'none' }}>
          <option value="all">All categories</option>
          {Object.entries(CAT).map(([k,v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as PaymentStatus|'all')}
          style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'7px 10px', color:'var(--saas-text)', fontSize:'0.8rem', outline:'none' }}>
          <option value="all">All statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="part_paid">Part Paid</option>
        </select>
        <span style={{ fontSize:'0.75rem', color:'var(--saas-text-muted)' }}>{filtered.length} invoices</span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'2rem', color:'var(--saas-text-muted)', fontSize:'0.85rem' }}>
          No invoices in this period
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {filtered.map(inv => {
            const scfg = statusCfg[inv.paymentStatus];
            const catCfg = CAT[inv.category];
            const isExpanded = expandedId === inv.id;
            return (
              <div key={inv.id} style={{
                background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)',
                borderRadius:10, overflow:'hidden',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0.75rem 1rem', cursor:'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : inv.id)}>
                  <span style={{ fontSize:'1rem' }}>{catCfg.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, fontSize:'0.83rem' }}>{inv.supplierName}</span>
                      <span style={{ fontSize:'0.7rem', color:'var(--saas-text-muted)' }}>#{inv.invoiceNumber}</span>
                      {inv.hasImage && <span style={{ fontSize:'0.65rem', background:'rgba(99,102,241,0.15)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.25)', borderRadius:6, padding:'1px 5px' }}>📷 Photo</span>}
                    </div>
                    <div style={{ fontSize:'0.7rem', color:'var(--saas-text-muted)' }}>
                      {fmtDate(inv.invoiceDate)} · {inv.paymentMethod.toUpperCase()} · Due {fmtDate(inv.dueDate)||'—'}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontWeight:800, fontSize:'0.9rem' }}>{fmtGBP(inv.grandTotal)}</div>
                    <span style={{ fontSize:'0.68rem', fontWeight:700, color:scfg.color, background:scfg.bg, borderRadius:8, padding:'1px 7px' }}>{scfg.label}</span>
                  </div>
                  {isExpanded ? <ChevronUp size={14} style={{ color:'var(--saas-text-muted)', flexShrink:0 }}/> : <ChevronDown size={14} style={{ color:'var(--saas-text-muted)', flexShrink:0 }}/>}
                </div>

                {isExpanded && (
                  <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'0.85rem 1rem', background:'rgba(0,0,0,0.15)' }}>
                    {/* Line items */}
                    <div style={{ marginBottom:'0.75rem' }}>
                      <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--saas-text-muted)', marginBottom:6 }}>LINE ITEMS</div>
                      {inv.lineItems.map((li, i) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', color:'var(--saas-text-secondary)', marginBottom:3 }}>
                          <span>{li.description}</span>
                          <span>{li.qty} × {fmtGBP(li.unitPrice)} = <strong>{fmtGBP(li.qty*li.unitPrice)}</strong></span>
                        </div>
                      ))}
                      <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', marginTop:6, paddingTop:6, display:'flex', flexDirection:'column', gap:2, alignItems:'flex-end', fontSize:'0.78rem' }}>
                        <span>Subtotal: {fmtGBP(inv.subtotal)}</span>
                        <span>VAT: {fmtGBP(inv.vat)}</span>
                        <span style={{ fontWeight:800, fontSize:'0.88rem', color:'#10b981' }}>Total: {fmtGBP(inv.grandTotal)}</span>
                      </div>
                    </div>
                    {inv.notes && <div style={{ fontSize:'0.75rem', color:'var(--saas-text-muted)', marginBottom:'0.75rem' }}>📝 {inv.notes}</div>}
                    <div style={{ display:'flex', gap:6 }}>
                      {inv.paymentStatus !== 'paid' && (
                        <button onClick={() => onMarkPaid(inv.id)} style={{
                          display:'inline-flex', alignItems:'center', gap:4,
                          padding:'5px 12px', borderRadius:6, cursor:'pointer',
                          background:'rgba(16,185,129,0.15)', color:'#10b981',
                          border:'1px solid rgba(16,185,129,0.3)', fontSize:'0.76rem', fontWeight:600,
                        }}><CheckCircle size={11}/> Mark Paid</button>
                      )}
                      <button onClick={() => onEdit(inv)} style={{
                        display:'inline-flex', alignItems:'center', gap:4,
                        padding:'5px 12px', borderRadius:6, cursor:'pointer',
                        background:'rgba(99,102,241,0.12)', color:'#818cf8',
                        border:'1px solid rgba(99,102,241,0.2)', fontSize:'0.76rem',
                      }}>Edit</button>
                      <button onClick={() => onDelete(inv.id)} style={{
                        display:'inline-flex', alignItems:'center', gap:4,
                        padding:'5px 10px', borderRadius:6, cursor:'pointer',
                        background:'rgba(239,68,68,0.1)', color:'#ef4444',
                        border:'1px solid rgba(239,68,68,0.2)', fontSize:'0.76rem',
                      }}><Trash2 size={11}/></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   WA STORAGE HELPERS
═══════════════════════════════════════════ */
const WA_SENDERS_KEY = 'miller_wa_senders_v1';
const WA_DRAFTS_KEY  = 'miller_wa_drafts_v1';
const WA_BIZ_NUM_KEY = 'miller_wa_biz_number_v1';

function loadWASenders(): WASender[] {
  try { const r = localStorage.getItem(WA_SENDERS_KEY); if (r) return JSON.parse(r); } catch {/**/}
  return SEED_WA_SENDERS;
}
function loadWADrafts(): WADraft[] {
  try { const r = localStorage.getItem(WA_DRAFTS_KEY); if (r) return JSON.parse(r); } catch {/**/}
  return SEED_WA_DRAFTS;
}
function loadWABizNum(): string {
  return localStorage.getItem(WA_BIZ_NUM_KEY) || '';
}

function tsShort(iso: string) {
  const d = new Date(iso), diff = Date.now()-d.getTime(), m = Math.floor(diff/60000);
  if (m<1) return 'just now'; if (m<60) return `${m}m ago`;
  const h = Math.floor(m/60); if (h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

/* ═══════════════════════════════════════════
   WHATSAPP SECTION COMPONENT
═══════════════════════════════════════════ */
function WhatsAppSection({
  senders, bizNumber, drafts,
  onSendersChange, onBizNumberChange,
  onDraftProcessed, onOpenInvoiceForDraft,
}: {
  senders: WASender[];
  bizNumber: string;
  drafts: WADraft[];
  onSendersChange: (s: WASender[]) => void;
  onBizNumberChange: (n: string) => void;
  onDraftProcessed: (id: string) => void;
  onOpenInvoiceForDraft: (d: WADraft) => void;
}) {
  const [open, setOpen] = useState(true);
  const [bizNum, setBizNum] = useState(bizNumber);
  const [bizSaved, setBizSaved] = useState(false);

  const updateSender = (id: string, field: keyof WASender, val: string | boolean) => {
    const next = senders.map(s => s.id===id ? {...s, [field]:val} : s);
    onSendersChange(next);
  };

  const connectSender = (sender: WASender) => {
    if (!sender.phone.trim() || !bizNum.trim()) return;
    // Open WhatsApp with pre-filled registration message
    const clean = bizNum.replace(/\D/g,'');
    const msg = encodeURIComponent(`INVOICE-REGISTER: ${sender.name} (${sender.role}) connecting to Miller SaaS Purchase Hub`);
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
    // Mark as connected (mock — real would be confirmed via webhook)
    const next = senders.map(s => s.id===sender.id ? {...s, active:true, connectedAt:new Date().toISOString()} : s);
    onSendersChange(next);
  };

  const saveBizNum = () => {
    onBizNumberChange(bizNum);
    setBizSaved(true);
    setTimeout(() => setBizSaved(false), 2000);
  };

  const pendingDrafts = drafts.filter(d => !d.processed);
  const owners   = senders.filter(s => s.role==='owner');
  const managers = senders.filter(s => s.role==='manager');

  return (
    <div style={{ marginBottom:'2rem' }}>
      {/* Section header */}
      <button onClick={() => setOpen(v=>!v)} style={{
        width:'100%', display:'flex', alignItems:'center', gap:8,
        background:'rgba(37,211,102,0.06)', border:'1px solid rgba(37,211,102,0.2)',
        borderRadius: open ? '12px 12px 0 0' : 12,
        padding:'0.85rem 1.1rem', cursor:'pointer', color:'var(--saas-text)',
        transition:'border-radius 0.2s',
      }}>
        <span style={{ fontSize:'1.1rem' }}>📲</span>
        <span style={{ fontWeight:700, fontSize:'1rem' }}>WhatsApp Invoice Capture</span>
        {pendingDrafts.length > 0 && (
          <span style={{ background:'#25D366', color:'#000', borderRadius:99, fontSize:'0.65rem', fontWeight:800, padding:'1px 7px' }}>
            {pendingDrafts.length} pending
          </span>
        )}
        <span style={{ marginLeft:'auto', fontSize:'0.72rem', color:'var(--saas-text-muted)' }}>
          {senders.filter(s=>s.active).length}/6 connected
        </span>
        {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </button>

      {open && (
        <div style={{
          background:'rgba(0,0,0,0.2)', border:'1px solid rgba(37,211,102,0.15)',
          borderTop:'none', borderRadius:'0 0 12px 12px', padding:'1.25rem',
        }}>

          {/* How it works */}
          <div style={{
            background:'rgba(37,211,102,0.07)', border:'1px solid rgba(37,211,102,0.15)',
            borderRadius:10, padding:'0.85rem 1rem', marginBottom:'1.25rem',
            fontSize:'0.78rem', color:'#4ade80', lineHeight:1.6,
          }}>
            <strong>📋 How it works:</strong> Set your business WhatsApp number below → register owners & managers → they take a photo of any invoice → send it to your business WhatsApp number → it appears here as a draft → you tap "Complete Invoice" to fill in the details.
          </div>

          {/* Business WhatsApp number */}
          <div style={{ marginBottom:'1.25rem' }}>
            <label style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', display:'block', marginBottom:6, fontWeight:600 }}>
              📱 Your Business WhatsApp Number (with country code — invoices are sent TO this number)
            </label>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input
                value={bizNum}
                onChange={e => setBizNum(e.target.value)}
                placeholder="+44 7700 900000 (Twilio or WhatsApp Business number)"
                style={{
                  flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(37,211,102,0.25)',
                  borderRadius:8, padding:'8px 12px', color:'var(--saas-text)', fontSize:'0.82rem', outline:'none',
                }}
              />
              <button onClick={saveBizNum} style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'7px 16px', borderRadius:8, cursor:'pointer',
                background: bizSaved ? 'rgba(16,185,129,0.18)' : 'rgba(37,211,102,0.15)',
                color: bizSaved ? '#10b981' : '#4ade80',
                border:`1px solid ${bizSaved?'rgba(16,185,129,0.3)':'rgba(37,211,102,0.3)'}`,
                fontSize:'0.8rem', fontWeight:700,
              }}>
                <Save size={13}/> {bizSaved ? 'Saved!' : 'Save Number'}
              </button>
            </div>
            <div style={{ fontSize:'0.7rem', color:'var(--saas-text-muted)', marginTop:4 }}>
              💡 Use your Twilio WhatsApp number from the Integrations Panel, or your WhatsApp Business phone number
            </div>
          </div>

          {/* Team slots */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem', marginBottom:'1.25rem' }}>
            {[{ role:'owner' as const, label:'👑 Owners', list:owners },
              { role:'manager' as const, label:'🧑‍💼 Managers', list:managers }].map(({ role, label, list }) => (
              <div key={role}>
                <div style={{ fontWeight:700, fontSize:'0.82rem', marginBottom:'0.75rem', color:'var(--saas-text-secondary)' }}>{label} (up to 3)</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
                  {list.map((sender, idx) => (
                    <div key={sender.id} style={{
                      background: sender.active ? 'rgba(37,211,102,0.06)' : 'rgba(255,255,255,0.03)',
                      border:`1px solid ${sender.active?'rgba(37,211,102,0.25)':'rgba(255,255,255,0.07)'}`,
                      borderRadius:10, padding:'0.75rem 0.9rem',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:'0.55rem' }}>
                        <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--saas-text-muted)' }}>
                          {role==='owner'?'👑':'🧑‍💼'} {role==='owner'?'Owner':'Manager'} {idx+1}
                        </span>
                        {sender.active && (
                          <span style={{ fontSize:'0.65rem', fontWeight:700, color:'#4ade80', background:'rgba(37,211,102,0.15)', border:'1px solid rgba(37,211,102,0.25)', borderRadius:8, padding:'1px 6px', marginLeft:'auto' }}>
                            ✓ Connected {sender.connectedAt ? tsShort(sender.connectedAt) : ''}
                          </span>
                        )}
                      </div>
                      <div style={{ display:'flex', gap:6, marginBottom:'0.5rem' }}>
                        <input
                          value={sender.name}
                          onChange={e => updateSender(sender.id, 'name', e.target.value)}
                          placeholder="Full name"
                          style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'6px 8px', color:'var(--saas-text)', fontSize:'0.78rem', outline:'none' }}
                        />
                        <input
                          value={sender.phone}
                          onChange={e => updateSender(sender.id, 'phone', e.target.value)}
                          placeholder="+44 7700..."
                          style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'6px 8px', color:'var(--saas-text)', fontSize:'0.78rem', outline:'none', fontFamily:'monospace' }}
                        />
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button
                          onClick={() => connectSender(sender)}
                          disabled={!sender.name.trim() || !sender.phone.trim() || !bizNum.trim()}
                          style={{
                            display:'inline-flex', alignItems:'center', gap:5,
                            padding:'5px 12px', borderRadius:6,
                            cursor: (sender.name && sender.phone && bizNum) ? 'pointer' : 'not-allowed',
                            background: sender.active ? 'rgba(37,211,102,0.15)' : 'rgba(37,211,102,0.1)',
                            color: sender.active ? '#4ade80' : (sender.name && sender.phone && bizNum) ? '#86efac' : 'var(--saas-text-muted)',
                            border:`1px solid ${sender.active?'rgba(37,211,102,0.3)':'rgba(37,211,102,0.15)'}`,
                            fontSize:'0.73rem', fontWeight:600,
                            opacity: (sender.name && sender.phone && bizNum) ? 1 : 0.5,
                          }}
                        >
                          💬 {sender.active ? 'Reconnect via WhatsApp' : 'Send WhatsApp Invite'}
                        </button>
                        {sender.active && (
                          <button onClick={() => updateSender(sender.id, 'active', false)} style={{
                            padding:'5px 8px', borderRadius:6, cursor:'pointer',
                            background:'rgba(239,68,68,0.1)', color:'#ef4444',
                            border:'1px solid rgba(239,68,68,0.2)', fontSize:'0.7rem',
                          }}>Remove</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pending draft invoices */}
          <div>
            <div style={{ fontWeight:700, fontSize:'0.85rem', marginBottom:'0.75rem', display:'flex', alignItems:'center', gap:8 }}>
              📥 Received from WhatsApp
              {pendingDrafts.length > 0 && (
                <span style={{ background:'#25D366', color:'#000', borderRadius:99, fontSize:'0.65rem', fontWeight:800, padding:'1px 7px' }}>{pendingDrafts.length}</span>
              )}
            </div>

            {pendingDrafts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'1.25rem', color:'var(--saas-text-muted)', fontSize:'0.8rem', background:'rgba(255,255,255,0.02)', borderRadius:8, border:'1px dashed rgba(255,255,255,0.07)' }}>
                No pending invoice photos — registered team members send WhatsApp photos here
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
                {pendingDrafts.map(draft => (
                  <div key={draft.id} style={{
                    display:'flex', alignItems:'center', gap:12,
                    background:'rgba(37,211,102,0.06)', border:'1px solid rgba(37,211,102,0.2)',
                    borderLeft:'3px solid #25D366', borderRadius:10, padding:'0.85rem 1rem',
                  }}>
                    <div style={{ fontSize:'1.5rem', flexShrink:0 }}>
                      {draft.hasImage ? '🖼️' : '📄'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:'0.82rem', marginBottom:2 }}>
                        Invoice photo from {draft.senderName || 'Team member'}
                      </div>
                      <div style={{ fontSize:'0.72rem', color:'var(--saas-text-muted)', marginBottom:3 }}>
                        📲 {draft.senderPhone || 'WhatsApp'} · {tsShort(draft.receivedAt)}
                      </div>
                      {draft.note && (
                        <div style={{ fontSize:'0.74rem', color:'var(--saas-text-secondary)', fontStyle:'italic' }}>{draft.note}</div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={() => onOpenInvoiceForDraft(draft)} style={{
                        display:'inline-flex', alignItems:'center', gap:5,
                        padding:'6px 14px', borderRadius:7, cursor:'pointer',
                        background:'rgba(37,211,102,0.18)', color:'#4ade80',
                        border:'1px solid rgba(37,211,102,0.3)', fontSize:'0.78rem', fontWeight:700,
                      }}>
                        <FileText size={12}/> Complete Invoice
                      </button>
                      <button onClick={() => onDraftProcessed(draft.id)} style={{
                        padding:'6px 10px', borderRadius:7, cursor:'pointer',
                        background:'rgba(239,68,68,0.1)', color:'#ef4444',
                        border:'1px solid rgba(239,68,68,0.2)', fontSize:'0.76rem',
                      }}>
                        <X size={12}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function PurchasesPage() {
  const [store, setStore]         = useState<Store | null>(null);
  const [loading, setLoading]     = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [period, setPeriod]       = useState<TimePeriod>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [showSupModal, setShowSupModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier|null>(null);
  const [showInvModal, setShowInvModal] = useState(false);
  const [editInvoice, setEditInvoice]   = useState<Invoice|null>(null);
  const [liveInvoiceToast, setLiveInvoiceToast] = useState<{ supplierName: string; invoiceNumber: string; amount: number; via: string } | null>(null);
  const [catGroupOpen, setCatGroupOpen] = useState<Record<string,boolean>>({ cash_carry:true });
  const [supSearch, setSupSearch] = useState('');
  const [waSenders, setWASenders] = useState<WASender[]>([]);
  const [waDrafts, setWADrafts]   = useState<WADraft[]>([]);
  const [bizWANumber, setBizWANumber] = useState('');

  useEffect(() => {
    const load = async () => {
      let id = DEFAULT_STORE_ID;
      if (typeof window !== 'undefined') { const s = localStorage.getItem('active_store_id'); if(s) id=s; }
      const stores = await db.getStores();
      const cur = stores.find(s=>s.id===id)||stores[0];
      if (cur) setStore(cur);
      setSuppliers(loadSuppliers());

      // Live Supabase Supplier Invoices
      const liveInvoices = await db.getSupplierInvoices(cur?.id || id);
      const localInvs = loadInvoices();
      const combined: Invoice[] = [
        ...localInvs,
        ...liveInvoices
          .filter(li => !localInvs.some(loc => loc.id === li.id))
          .map(li => ({
            id: li.id,
            supplierId: 'sup-live',
            supplierName: li.supplier_name,
            category: 'cash_carry' as SupplierCategory,
            invoiceNumber: li.invoice_number || `INV-${li.id.slice(0, 5)}`,
            invoiceDate: li.invoice_date || new Date().toISOString().split('T')[0],
            dueDate: li.invoice_date || new Date().toISOString().split('T')[0],
            lineItems: (li.items || []).map((it: unknown) => {
              const itemObj = (it && typeof it === 'object') ? (it as Record<string, unknown>) : {};
              return {
                description: typeof itemObj.description === 'string' ? itemObj.description : 'Captured line item',
                qty: typeof itemObj.qty === 'number' ? itemObj.qty : 1,
                unitPrice: typeof itemObj.unitPrice === 'number' ? itemObj.unitPrice : li.total_amount
              };
            }),
            subtotal: li.total_amount,
            vat: 0,
            grandTotal: li.total_amount,
            paymentMethod: 'bacs' as PaymentMethod,
            paymentStatus: (li.status === 'Paid' ? 'paid' : 'unpaid') as PaymentStatus,
            hasImage: !!li.image_storage_path,
            notes: `Captured via ${li.captured_via || 'live integration'}`,
            createdAt: li.created_at || new Date().toISOString()
          }))
      ];
      setInvoices(combined);

      // Load WA Drafts from Supabase
      const liveWADrafts = await db.getWhatsAppDrafts(cur?.id || id);
      const localWADrafts = loadWADrafts();
      const mappedWADrafts: WADraft[] = [
        ...localWADrafts,
        ...liveWADrafts
          .filter(ld => !localWADrafts.some(loc => loc.id === ld.id))
          .map(ld => ({
            id: ld.id,
            senderId: 'live-sender',
            senderName: ld.recipient_name,
            senderPhone: ld.recipient_phone,
            receivedAt: ld.created_at || new Date().toISOString(),
            hasImage: false,
            processed: ld.status === 'Approved',
            note: ld.message_text
          }))
      ];
      setWASenders(loadWASenders());
      setWADrafts(mappedWADrafts);
      setBizWANumber(loadWABizNum());
      setLoading(false);
    };
    load();
  }, []);

  // ── Supabase Realtime Channel: Instant Inbound Invoice Push ──────────────
  useEffect(() => {
    const targetStoreId = store?.id || DEFAULT_STORE_ID;

    const channel = supabase
      .channel(`realtime_invoices_${targetStoreId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'supplier_invoices',
          filter: `store_id=eq.${targetStoreId}`
        },
        (payload) => {
          const newRow = payload.new as Record<string, unknown>;
          if (!newRow) return;

          const mappedInvoice: Invoice = {
            id: (newRow.id as string) || `inv-${Date.now()}`,
            supplierId: 'sup-live',
            supplierName: (newRow.supplier_name as string) || 'Wholesale Supplier',
            category: 'cash_carry',
            invoiceNumber: (newRow.invoice_number as string) || `INV-${Date.now().toString().slice(-4)}`,
            invoiceDate: (newRow.invoice_date as string) || new Date().toISOString().split('T')[0],
            dueDate: (newRow.invoice_date as string) || new Date().toISOString().split('T')[0],
            lineItems: Array.isArray(newRow.items) ? (newRow.items as LineItem[]) : [],
            subtotal: (newRow.total_amount as number) || 0,
            vat: 0,
            grandTotal: (newRow.total_amount as number) || 0,
            paymentMethod: 'bacs',
            paymentStatus: (newRow.status === 'Paid' ? 'paid' : 'unpaid'),
            hasImage: !!newRow.image_storage_path,
            notes: `Captured via ${(newRow.captured_via as string) || 'whatsapp'}`,
            createdAt: (newRow.created_at as string) || new Date().toISOString()
          };

          // Play melodious triple-tone notification chime
          playNotificationChime('invoice');

          // Trigger live toast
          setLiveInvoiceToast({
            supplierName: mappedInvoice.supplierName,
            invoiceNumber: mappedInvoice.invoiceNumber,
            amount: mappedInvoice.grandTotal,
            via: (newRow.captured_via as string) || 'whatsapp'
          });
          setTimeout(() => setLiveInvoiceToast(null), 7000);

          // Prepend to invoices state immediately
          setInvoices((prev) => {
            if (prev.some((i) => i.id === mappedInvoice.id)) return prev;
            return [mappedInvoice, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store?.id]);

  const updateWASenders = useCallback((next: WASender[]) => {
    setWASenders(next);
    localStorage.setItem(WA_SENDERS_KEY, JSON.stringify(next));
  }, []);

  const updateBizWANumber = useCallback((n: string) => {
    setBizWANumber(n);
    localStorage.setItem(WA_BIZ_NUM_KEY, n);
  }, []);

  const markDraftProcessed = useCallback((id: string) => {
    setWADrafts(prev => {
      const next = prev.map(d => d.id===id ? {...d, processed:true} : d);
      localStorage.setItem(WA_DRAFTS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const openInvoiceForDraft = useCallback((draft: WADraft) => {
    // Pre-open new invoice modal; mark draft processed
    markDraftProcessed(draft.id);
    setEditInvoice(null);
    setShowInvModal(true);
  }, [markDraftProcessed]);

  const saveSupplier = useCallback((s: Supplier) => {
    setSuppliers(prev => {
      const exists = prev.find(x=>x.id===s.id);
      const next = exists ? prev.map(x=>x.id===s.id?s:x) : [...prev, s];
      saveSuppliers(next); return next;
    });
    setShowSupModal(false); setEditSupplier(null);
  }, []);

  const deleteSupplier = useCallback((id: string) => {
    setSuppliers(prev => { const next=prev.filter(s=>s.id!==id); saveSuppliers(next); return next; });
  }, []);

  const saveInvoice = useCallback(async (inv: Invoice, imgBlob?: Blob) => {
    if (imgBlob) await saveInvoiceImage(inv.id, imgBlob);

    // Save to Supabase
    await db.createSupplierInvoice({
      id: inv.id,
      store_id: store?.id || DEFAULT_STORE_ID,
      supplier_name: inv.supplierName,
      invoice_number: inv.invoiceNumber,
      invoice_date: inv.invoiceDate,
      total_amount: inv.grandTotal,
      currency: 'GBP',
      status: inv.paymentStatus === 'paid' ? 'Paid' : 'Pending',
      items: inv.lineItems,
      image_storage_path: inv.hasImage ? `inv_${inv.id}` : undefined,
      captured_via: 'manual'
    });

    setInvoices(prev => {
      const exists = prev.find(x=>x.id===inv.id);
      const next = exists ? prev.map(x=>x.id===inv.id?inv:x) : [...prev, inv];
      saveInvoices(next); return next;
    });
    setShowInvModal(false); setEditInvoice(null);
  }, [store?.id]);

  const deleteInvoice = useCallback(async (id: string) => {
    await deleteInvoiceImage(id).catch(()=>{});
    await db.deleteSupplierInvoice(id).catch(()=>{});
    setInvoices(prev => { const next=prev.filter(i=>i.id!==id); saveInvoices(next); return next; });
  }, []);

  const markPaid = useCallback(async (id: string) => {
    await db.updateSupplierInvoiceStatus(id, 'Paid').catch(()=>{});
    setInvoices(prev => {
      const next = prev.map(i=>i.id===id?{...i,paymentStatus:'paid' as PaymentStatus}:i);
      saveInvoices(next); return next;
    });
  }, []);

  // Grouped suppliers by category
  const groupedSuppliers = Object.keys(CAT).reduce((acc, cat) => {
    const list = suppliers.filter(s => s.category===cat && (!supSearch || s.name.toLowerCase().includes(supSearch.toLowerCase())));
    if (list.length) acc[cat] = list;
    return acc;
  }, {} as Record<string, Supplier[]>);

  const totalUnpaid = invoices.filter(i=>i.paymentStatus!=='paid').reduce((s,i)=>s+i.grandTotal,0);
  const activeSupCount = suppliers.filter(s=>s.status==='active').length;

  const PERIODS: {key: TimePeriod; label: string}[] = [
    {key:'week',label:'This Week'},{key:'month',label:'This Month'},
    {key:'quarter',label:'Quarter'},{key:'year',label:'This Year'},{key:'custom',label:'Custom'},
  ];

  if (loading) return (
    <div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center',background:'#090d16',color:'#9ca3af'}}>
      <h3>Loading...</h3>
    </div>
  );

  return (
    <div className="dashboard-layout">
      <DashboardSidebar storeName={store?.name} storeLogo={store?.logo_text}/>

      <main className="dashboard-content">

        {/* ── Realtime Inbound Invoice Alert ── */}
        {liveInvoiceToast && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.4rem',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(99,102,241,0.25))',
            border: '1px solid rgba(16,185,129,0.45)',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 10px 35px rgba(16,185,129,0.2)',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #10B981, #6366F1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              boxShadow: '0 0 15px rgba(16,185,129,0.5)'
            }}>
              🧾
            </div>
            <div style={{ flex: 1, fontSize: '0.86rem' }}>
              <div style={{ fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Inbound Invoice Captured in Realtime!</span>
                <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.15)', padding: '2px 7px', borderRadius: 12 }}>
                  {liveInvoiceToast.via.toUpperCase()}
                </span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
                <strong>{liveInvoiceToast.supplierName}</strong> (#{liveInvoiceToast.invoiceNumber}) — <span style={{ color: '#34d399', fontWeight: 700 }}>£{liveInvoiceToast.amount.toFixed(2)}</span> has been booked into the ledger.
              </div>
            </div>
            <button
              onClick={() => setLiveInvoiceToast(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: '1.1rem'
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{
          background:'linear-gradient(135deg,rgba(16,185,129,0.1) 0%,rgba(99,102,241,0.08) 60%,rgba(245,158,11,0.06) 100%)',
          border:'1px solid rgba(16,185,129,0.2)', borderRadius:18, padding:'1.75rem 2rem', marginBottom:'1.75rem',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, background:'radial-gradient(circle,rgba(16,185,129,0.12) 0%,transparent 70%)', pointerEvents:'none' }}/>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(16,185,129,0.14)', border:'1px solid rgba(16,185,129,0.28)', borderRadius:20, padding:'4px 12px', marginBottom:'0.85rem', fontSize:'0.7rem', fontWeight:700, color:'#34d399', letterSpacing:'0.04em' }}>
            🛒 MERCHANT PURCHASE HUB
          </div>
          <h1 style={{ fontSize:'1.75rem', fontFamily:'var(--font-display)', marginBottom:'0.4rem', lineHeight:1.2 }}>
            Purchase Management<br/><span style={{color:'#34d399'}}>All Suppliers. All Invoices. One Place.</span>
          </h1>
          <p style={{ color:'var(--saas-text-secondary)', fontSize:'0.88rem', maxWidth:600, lineHeight:1.65, marginBottom:'1rem' }}>
            Connect your wholesale accounts, upload invoices with photo capture, and track every pound you spend — weekly, monthly, or by custom date range.
          </p>
          <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
            {[
              {label:`${activeSupCount} active suppliers`, color:'#10b981'},
              {label:`${invoices.length} total invoices`, color:'#6366f1'},
              {label:`${fmtGBP(totalUnpaid)} outstanding`, color: totalUnpaid>0?'#ef4444':'#10b981'},
            ].map(p => (
              <span key={p.label} style={{ fontSize:'0.75rem', fontWeight:700, padding:'4px 12px', borderRadius:20, background:`${p.color}15`, border:`1px solid ${p.color}30`, color:p.color }}>
                {p.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Time period filter ── */}
        <div style={{
          background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:12, padding:'0.85rem 1.1rem', marginBottom:'1.5rem',
          display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap',
        }}>
          <Calendar size={15} style={{ color:'#6366f1', flexShrink:0 }}/>
          <span style={{ fontWeight:700, fontSize:'0.85rem', flexShrink:0 }}>Viewing:</span>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                padding:'5px 14px', borderRadius:20, cursor:'pointer',
                fontSize:'0.78rem', fontWeight:600, border:'1px solid',
                borderColor: period===p.key ? '#6366f1' : 'rgba(255,255,255,0.08)',
                background: period===p.key ? 'rgba(99,102,241,0.18)' : 'transparent',
                color: period===p.key ? '#818cf8' : 'var(--saas-text-muted)',
                transition:'all 0.15s',
              }}>{p.label}</button>
            ))}
          </div>
          {period==='custom' && (
            <div style={{ display:'flex', gap:6, alignItems:'center', marginLeft:4 }}>
              <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)}
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'5px 8px', color:'var(--saas-text)', fontSize:'0.78rem', outline:'none' }}/>
              <span style={{ color:'var(--saas-text-muted)', fontSize:'0.78rem' }}>to</span>
              <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)}
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'5px 8px', color:'var(--saas-text)', fontSize:'0.78rem', outline:'none' }}/>
            </div>
          )}
        </div>

        {/* ── Spending Analytics ── */}
        <div style={{ marginBottom:'2rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1rem' }}>
            <TrendingUp size={16} style={{ color:'#6366f1' }}/>
            <span style={{ fontWeight:700, fontSize:'1rem' }}>Spending Analytics</span>
          </div>
          <SpendingAnalytics invoices={invoices} period={period} customFrom={customFrom} customTo={customTo}/>
        </div>

        {/* ── Supplier Accounts ── */}
        <div style={{ marginBottom:'2rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1rem' }}>
            <ShoppingBag size={16} style={{ color:'#10b981' }}/>
            <span style={{ fontWeight:700, fontSize:'1rem' }}>Supplier Accounts</span>
            <div style={{ flex:1, position:'relative', maxWidth:240, marginLeft:8 }}>
              <Search size={12} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--saas-text-muted)', pointerEvents:'none' }}/>
              <input value={supSearch} onChange={e=>setSupSearch(e.target.value)} placeholder="Search suppliers"
                style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:7, padding:'5px 8px 5px 26px', color:'var(--saas-text)', fontSize:'0.77rem', outline:'none' }}/>
            </div>
            <button onClick={() => { setEditSupplier(null); setShowSupModal(true); }} style={{
              marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:5,
              padding:'7px 16px', borderRadius:8, cursor:'pointer',
              background:'rgba(16,185,129,0.18)', color:'#10b981',
              border:'1px solid rgba(16,185,129,0.3)', fontSize:'0.8rem', fontWeight:700,
            }}><Plus size={13}/> Add Supplier</button>
          </div>

          {Object.entries(groupedSuppliers).map(([cat, list]) => {
            const cfg = CAT[cat as SupplierCategory];
            const open = catGroupOpen[cat] ?? false;
            return (
              <div key={cat} style={{ marginBottom:'0.85rem' }}>
                <button onClick={() => setCatGroupOpen(p=>({...p,[cat]:!p[cat]}))} style={{
                  width:'100%', display:'flex', alignItems:'center', gap:8,
                  background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)',
                  borderRadius: open?'10px 10px 0 0':10, padding:'0.65rem 1rem',
                  cursor:'pointer', color:'var(--saas-text)',
                }}>
                  <span style={{ fontSize:'1.1rem' }}>{cfg.emoji}</span>
                  <span style={{ fontWeight:700, fontSize:'0.85rem' }}>{cfg.label}</span>
                  <span style={{ fontSize:'0.7rem', color:'var(--saas-text-muted)', background:'rgba(255,255,255,0.05)', borderRadius:10, padding:'1px 8px' }}>{list.length}</span>
                  <span style={{ marginLeft:'auto' }}>{open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</span>
                </button>
                {open && (
                  <div style={{
                    display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))',
                    gap:'0.75rem', padding:'0.75rem',
                    background:'rgba(255,255,255,0.01)', border:'1px solid rgba(255,255,255,0.06)',
                    borderTop:'none', borderRadius:'0 0 10px 10px',
                  }}>
                    {list.map(sup => (
                      <SupplierCard key={sup.id} supplier={sup} invoices={invoices}
                        onEdit={s => { setEditSupplier(s); setShowSupModal(true); }}
                        onDelete={deleteSupplier}/>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {Object.keys(groupedSuppliers).length===0 && (
            <div style={{ textAlign:'center', padding:'2rem', color:'var(--saas-text-muted)', fontSize:'0.85rem' }}>
              No suppliers yet — click "Add Supplier" to get started
            </div>
          )}
        </div>

        {/* ── WhatsApp Invoice Capture ── */}
        <WhatsAppSection
          senders={waSenders}
          bizNumber={bizWANumber}
          drafts={waDrafts}
          onSendersChange={updateWASenders}
          onBizNumberChange={updateBizWANumber}
          onDraftProcessed={markDraftProcessed}
          onOpenInvoiceForDraft={openInvoiceForDraft}
        />

        {/* ── Invoice Management ── */}
        <div style={{ marginBottom:'2rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1rem' }}>
            <FileText size={16} style={{ color:'#6366f1' }}/>
            <span style={{ fontWeight:700, fontSize:'1rem' }}>Invoice Management</span>
            <button onClick={() => { setEditInvoice(null); setShowInvModal(true); }} style={{
              marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:5,
              padding:'7px 16px', borderRadius:8, cursor:'pointer',
              background:'rgba(99,102,241,0.18)', color:'#818cf8',
              border:'1px solid rgba(99,102,241,0.3)', fontSize:'0.8rem', fontWeight:700,
            }}><Plus size={13}/> Add Invoice</button>
          </div>
          <InvoiceTable
            invoices={invoices} period={period} customFrom={customFrom} customTo={customTo}
            suppliers={suppliers}
            onEdit={inv => { setEditInvoice(inv); setShowInvModal(true); }}
            onDelete={deleteInvoice}
            onMarkPaid={markPaid}
          />
        </div>

        {/* Footer */}
        <div style={{ padding:'1rem 1.25rem', background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.15)', borderRadius:10, fontSize:'0.78rem', color:'#d97706', lineHeight:1.6 }}>
          <strong>🔒 Privacy note:</strong> All supplier credentials and invoices stored locally in your browser. Invoice photos saved in IndexedDB. Nothing sent to any server.
        </div>
      </main>

      {/* Modals */}
      {showSupModal && <SupplierModal supplier={editSupplier} onSave={saveSupplier} onClose={() => { setShowSupModal(false); setEditSupplier(null); }}/>}
      {showInvModal && <InvoiceModal suppliers={suppliers} invoice={editInvoice} onSave={saveInvoice} onClose={() => { setShowInvModal(false); setEditInvoice(null); }}/>}
    </div>
  );
}
