'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import DashboardSidebar from '@/components/DashboardSidebar';
import {
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Sparkles, Globe, Search, Plus, X, Check, Download,
  Edit2, Eye, Copy, Trash2, ExternalLink, RefreshCw,
  Save, Layout, Rocket, Palette, Users, Target,
  Building2, FileText, Image, Link2, AlertCircle,
} from 'lucide-react';

/* ═══════════════════════════════════════
   TYPES
═══════════════════════════════════════ */
type BuilderStage = 'welcome' | 'gather' | 'competitor' | 'logo' | 'plan' | 'build' | 'view';
type GatherStep   = 0 | 1 | 2 | 3;
type BizType  = 'service'|'ecommerce'|'platform'|'restaurant'|'clinic'|'agency'|'other';
type ToneType = 'professional'|'friendly'|'bold'|'luxury'|'playful';
type FontType = 'modern'|'classic'|'minimal'|'bold_font';
type CTAGoal  = 'book'|'buy'|'quote'|'signup'|'call';

interface BizForm {
  businessName:string; industry:string; bizType:BizType;
  tagline:string; usp:string; yearsInBusiness:string;
  targetCustomer:string; services:string[]; pricingModel:string; location:string;
  logoUrl:string; colorPrimary:string; colorSecondary:string; colorAccent:string;
  tone:ToneType; fontStyle:FontType;
  ctaGoal:CTAGoal; ctaText:string;
  phone:string; email:string; address:string;
  existingWebUrl:string;
  socialLinks:Record<string,string>;
}

interface Competitor {
  id:string; name:string; url:string;
  status:'idle'|'analyzing'|'done'|'error';
  analysis?:{ headline:string; cta:string; colorTone:string; keySections:string[]; strengths:string[]; gaps:string[]; opportunity:string };
}

interface PlanSection {
  id:string; name:string; emoji:string;
  description:string; content:string; approved:boolean; editing:boolean;
}

interface SavedSite {
  id:string; businessName:string; createdAt:string; updatedAt:string;
  stage:BuilderStage; form:BizForm; competitors:Competitor[];
  plan:PlanSection[]; html:string; published:boolean;
}

/* ═══════════════════════════════════════
   STORAGE
═══════════════════════════════════════ */
const SITES_KEY = 'miller_landing_sites_v1';
const DRAFT_KEY = 'miller_landing_draft_v1';

function loadSites():SavedSite[] {
  try { const r=localStorage.getItem(SITES_KEY); if(r) return JSON.parse(r); } catch {/**/}
  return [];
}
function saveSites(s:SavedSite[]) { localStorage.setItem(SITES_KEY,JSON.stringify(s)); }

/* ═══════════════════════════════════════
   SOCIAL HUB READER
═══════════════════════════════════════ */
function readHubData() {
  let biz:Record<string,string>={}, links:Record<string,string>={}, done:string[]=[];
  try {
    const bi=localStorage.getItem('miller_business_info_v1'); if(bi) biz=JSON.parse(bi);
    const sc=localStorage.getItem('miller_social_creds_v1');
    if(sc) {
      const creds=JSON.parse(sc) as Record<string,{done?:boolean;username?:string;profileUrl?:string}>;
      const URL_FN:Record<string,(u:string)=>string>={
        instagram:u=>`https://instagram.com/${u}`,
        facebook:u=>`https://facebook.com/${u}`,
        twitter:u=>`https://twitter.com/${u}`,
        tiktok:u=>`https://tiktok.com/@${u}`,
        youtube:u=>`https://youtube.com/@${u}`,
        linkedin:u=>`https://linkedin.com/company/${u}`,
      };
      Object.entries(creds).forEach(([p,d])=>{
        if(d.done) done.push(p);
        if(d.profileUrl) links[p]=d.profileUrl;
        else if(d.username&&URL_FN[p]) links[p]=URL_FN[p](d.username);
      });
    }
  } catch {/**/}
  return { biz, links, done };
}

function blankForm(biz:Record<string,string>, links:Record<string,string>):BizForm {
  return {
    businessName: biz.businessName||'', industry: biz.industry||'',
    bizType:'service', tagline: biz.tagline||'', usp:'', yearsInBusiness:'',
    targetCustomer:'', services:['','','',''], pricingModel:'quote-based',
    location: biz.address||'',
    logoUrl: biz.logoUrl||'',
    colorPrimary:'#6366f1', colorSecondary:'#8b5cf6', colorAccent:'#10b981',
    tone:'professional', fontStyle:'modern',
    ctaGoal:'quote', ctaText:'Get a Free Quote',
    phone: biz.phone||'', email: biz.email||'', address: biz.address||'',
    existingWebUrl: '',
    socialLinks: links,
  };
}

/* ═══════════════════════════════════════
   PLAN GENERATOR
═══════════════════════════════════════ */
function generatePlan(form:BizForm, _competitors:Competitor[]):PlanSection[] {
  const svcs = form.services.filter(Boolean);
  const hasSocial = Object.keys(form.socialLinks).length>0;
  const pageType = svcs.length>5?'multi-section':'1-page';
  const compGaps = _competitors.filter(c=>c.analysis).flatMap(c=>c.analysis!.gaps).slice(0,3);
  const compOpps = _competitors.filter(c=>c.analysis).map(c=>c.analysis!.opportunity).filter(Boolean).slice(0,2);

  const base:PlanSection[] = [
    { id:'hero',    name:'Hero Section',     emoji:'🚀', approved:false, editing:false,
      description:'First impression — headline, CTA button, background gradient',
      content:`Headline: "${form.tagline||`Welcome to ${form.businessName}`}" · USP subline · "${form.ctaText}" button · Radial glow background in primary color` },
    { id:'problem', name:'Problem Section',  emoji:'😩', approved:false, editing:false,
      description:'Agitate the pain point your customer faces before finding you',
      content:`3 pain-point cards: common struggles of ${form.targetCustomer||'your target customer'} · Emotional hook · Transition: "That's why ${form.businessName} exists"${compGaps.length?` · Gaps competitors miss: ${compGaps.join('; ')}`:''}` },
    { id:'trust',   name:'Trust Bar',        emoji:'✅', approved:false, editing:false,
      description:'Key numbers to build instant credibility',
      content:`${form.yearsInBusiness?form.yearsInBusiness+'+ Years · ':''}500+ Clients · 98% Satisfaction · 24/7 Support` },
    { id:'services',name:'Services',         emoji:'🧩', approved:false, editing:false,
      description:`${svcs.length||4} service/product cards in a responsive grid`,
      content:`Cards: ${svcs.length?svcs.slice(0,4).join(' · '):'Consultation · Implementation · Support · Strategy'}` },
    { id:'about',   name:'About Section',    emoji:'👋', approved:false, editing:false,
      description:'Brand story, mission, and personality',
      content:`Image left + story right · Tone: ${form.tone} · ${form.yearsInBusiness?form.yearsInBusiness+' years in business':'Founded with a mission to help clients succeed'}` },
    { id:'testimonials',name:'Social Proof', emoji:'⭐', approved:false, editing:false,
      description:'3 client testimonial cards with star ratings',
      content:'3 × 5-star quotes · Author avatar + name + role · Grid layout' },
  ];
  if(!['quote-based','custom'].includes(form.pricingModel))
    base.push({ id:'pricing',name:'Pricing Tiers',emoji:'💰', approved:false, editing:false,
      description:'3-column pricing card layout',
      content:'Starter · Professional · Enterprise · Highlight middle tier' });
  base.push(
    { id:'faq',  name:'FAQ',          emoji:'❓', approved:false, editing:false,
      description:'5 common questions in accordion style',
      content:`Questions: How fast can you start? · What areas? · Cost? · Support? · How to begin? · Answers based on ${form.industry||'your industry'}` },
    { id:'cta',  name:'Final CTA',    emoji:'📣', approved:false, editing:false,
      description:'Closing call-to-action + contact form',
      content:`"${form.ctaText}" headline · Enquiry form (Name/Email/Phone/Message) · Contact details: ${form.phone||'phone'} · ${form.email||'email'}` },
  );
  if(hasSocial)
    base.push({ id:'social',name:'Social Links',emoji:'📱', approved:false, editing:false,
      description:'Auto-linked icons from your Social Media Hub',
      content:`Platforms: ${Object.keys(form.socialLinks).join(', ')}` });
  base.push({ id:'footer',name:'Footer',emoji:'🔗', approved:false, editing:false,
    description:'Brand, links, copyright',
    content:`${form.businessName} · ${form.email||''} · ${form.phone||''} · Social icons · © ${new Date().getFullYear()}` });
  return base;
}

/* ═══════════════════════════════════════
   HTML GENERATOR
═══════════════════════════════════════ */
function generateHTML(form:BizForm, plan:PlanSection[]):string {
  const svcs = form.services.filter(Boolean);
  const p=form.colorPrimary, sec=form.colorSecondary, a=form.colorAccent;
  const socEmoji:Record<string,string>={instagram:'📸',facebook:'👥',twitter:'🐦',tiktok:'🎵',youtube:'▶️',linkedin:'💼',whatsapp_business:'💬'};
  const fontStack = form.fontStyle==='classic'?"Georgia,serif":form.fontStyle==='bold_font'?"Impact,sans-serif":"'Inter','Segoe UI',system-ui,sans-serif";
  const hasPricing = plan.some(pl=>pl.id==='pricing');
  const tagWords=(form.tagline||`Welcome to ${form.businessName}`).split(' ');
  const half=Math.ceil(tagWords.length/2);
  const tag1=tagWords.slice(0,half).join(' '), tag2=tagWords.slice(half).join(' ');
  const svcCards=svcs.map((sv,i)=>`
    <div class="card reveal" style="--d:${i*80}ms">
      <div class="card-glow"></div>
      <div class="card-icon">${['🎯','⚡','🔑','💡','🚀','✨','🎨','🔧'][i%8]}</div>
      <h3>${sv}</h3>
      <p>Professional ${sv.toLowerCase()} tailored to your specific needs. Delivered with expertise and care.</p>
      <div class="card-line"></div>
    </div>`).join('')||`
    <div class="card reveal" style="--d:0ms"><div class="card-glow"></div><div class="card-icon">🎯</div><h3>Consultation</h3><p>Expert advice tailored to your goals and situation.</p><div class="card-line"></div></div>
    <div class="card reveal" style="--d:80ms"><div class="card-glow"></div><div class="card-icon">⚡</div><h3>Delivery</h3><p>Fast, professional execution on every project we take on.</p><div class="card-line"></div></div>
    <div class="card reveal" style="--d:160ms"><div class="card-glow"></div><div class="card-icon">🔑</div><h3>Support</h3><p>Ongoing help and guidance to ensure lasting success.</p><div class="card-line"></div></div>
    <div class="card reveal" style="--d:240ms"><div class="card-glow"></div><div class="card-icon">💡</div><h3>Strategy</h3><p>Data-driven plans that move your business forward.</p><div class="card-line"></div></div>`;
  const contactBlock=[
    form.phone?`<div class="contact-item"><div class="ci-icon">📞</div><div><strong>Phone</strong><p>${form.phone}</p></div></div>`:'',
    form.email?`<div class="contact-item"><div class="ci-icon">✉️</div><div><strong>Email</strong><p>${form.email}</p></div></div>`:'',
    form.address?`<div class="contact-item"><div class="ci-icon">📍</div><div><strong>Address</strong><p>${form.address}</p></div></div>`:'',
    ...Object.entries(form.socialLinks).map(([pl,url])=>`<div class="contact-item"><div class="ci-icon">${socEmoji[pl]||'🔗'}</div><div><strong>${pl}</strong><p><a href="${url}" target="_blank" style="color:${p}">${url}</a></p></div></div>`),
  ].join('');
  const socFooter=Object.entries(form.socialLinks).map(([pl,url])=>
    `<a href="${url}" target="_blank" class="soc-link">${socEmoji[pl]||'🔗'} ${pl.replace(/_/g,' ')}</a>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover">
<meta name="theme-color" content="${p}">
<title>${form.businessName}${form.tagline?' — '+form.tagline:''}</title>
<style>
/* ── RESET & BASE (mobile-first) ── */
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
img,svg{max-width:100%;display:block}
a{text-decoration:none}

/* ── CUSTOM PROPERTIES ── */
:root{
  --p:${p};--s:${sec};--a:${a};
  --dark:#080e1a;--surface:#0d1527;--card:#111a2e;
  --tx:#f0f4ff;--mu:#7a8aaa;--bd:rgba(255,255,255,.07);
  --r:18px;--r-sm:10px;
  --ff:${fontStack};
  --glow-p:${p}40;--glow-a:${a}30;
  --grad:linear-gradient(135deg,var(--p),var(--s));
  --grad-r:linear-gradient(135deg,var(--s),var(--a));
}

/* ── ANIMATIONS ── */
@keyframes float{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-18px) rotate(3deg)}}
@keyframes float2{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-12px) rotate(-4deg)}}
@keyframes pulse-glow{0%,100%{box-shadow:0 0 20px var(--glow-p)}50%{box-shadow:0 0 50px var(--glow-p),0 0 80px ${p}25}}
@keyframes grad-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes badge-pulse{0%,100%{box-shadow:0 0 0 0 ${p}44}70%{box-shadow:0 0 0 10px ${p}00}}
@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideRight{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideLeft{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes spin-slow{to{transform:rotate(360deg)}}
@keyframes counter{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes mesh-move{0%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-20px) scale(1.05)}66%{transform:translate(-20px,15px) scale(.97)}100%{transform:translate(0,0) scale(1)}}

/* ── SCROLL REVEAL ── */
.reveal{opacity:0;transform:translateY(28px);transition:opacity .65s cubic-bezier(.22,1,.36,1),transform .65s cubic-bezier(.22,1,.36,1);transition-delay:var(--d,0ms)}
.reveal.in{opacity:1;transform:translateY(0)}
.reveal-left{opacity:0;transform:translateX(-30px);transition:opacity .65s cubic-bezier(.22,1,.36,1),transform .65s cubic-bezier(.22,1,.36,1);transition-delay:var(--d,0ms)}
.reveal-left.in{opacity:1;transform:translateX(0)}
.reveal-right{opacity:0;transform:translateX(30px);transition:opacity .65s cubic-bezier(.22,1,.36,1),transform .65s cubic-bezier(.22,1,.36,1);transition-delay:var(--d,0ms)}
.reveal-right.in{opacity:1;transform:translateX(0)}

/* ── BODY ── */
body{font-family:var(--ff);background:var(--dark);color:var(--tx);line-height:1.65;overflow-x:hidden}

/* ── GRADIENT MESH BG ── */
.mesh{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.mesh-orb{position:absolute;border-radius:50%;filter:blur(80px);animation:mesh-move 12s ease-in-out infinite}
.mesh-orb:nth-child(1){width:600px;height:600px;background:radial-gradient(circle,${p}15,transparent 70%);top:-200px;right:-150px;animation-duration:14s}
.mesh-orb:nth-child(2){width:500px;height:500px;background:radial-gradient(circle,${sec}12,transparent 70%);bottom:-150px;left:-100px;animation-duration:18s;animation-delay:-6s}
.mesh-orb:nth-child(3){width:350px;height:350px;background:radial-gradient(circle,${a}10,transparent 70%);top:40%;left:35%;animation-duration:22s;animation-delay:-10s}

/* ── NAV ── */
nav{position:fixed;top:0;inset-inline:0;z-index:1000;backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);background:rgba(8,14,26,.82);border-bottom:1px solid var(--bd);padding:0 1.25rem;display:flex;align-items:center;justify-content:space-between;height:64px;transition:background .3s}
.nav-logo{font-size:1.2rem;font-weight:900;background:linear-gradient(135deg,var(--p),var(--a));-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-.02em}
.nav-links{display:none;gap:2rem;list-style:none}
.nav-links a{color:var(--mu);font-size:.9rem;font-weight:500;transition:color .2s;padding:.25rem 0}
.nav-links a:hover{color:var(--tx)}
.nav-cta{background:var(--grad);color:#fff;padding:10px 20px;border-radius:50px;font-weight:700;font-size:.85rem;transition:opacity .2s,transform .2s;white-space:nowrap;animation:pulse-glow 3s ease-in-out infinite}
.nav-cta:hover{opacity:.88;transform:scale(1.03)}
.menu-btn{display:flex;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:4px}
.menu-btn span{display:block;width:24px;height:2px;background:var(--tx);border-radius:2px;transition:transform .3s,opacity .3s}

/* ── HERO ── */
.hero{position:relative;min-height:100svh;display:flex;align-items:center;justify-content:center;padding:80px 1.25rem 3rem;text-align:center;overflow:hidden;z-index:1}
.hero-shapes{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.shape{position:absolute;border-radius:30% 70% 70% 30%/30% 30% 70% 70%;opacity:.12}
.shape-1{width:300px;height:300px;background:var(--grad);top:-80px;right:-80px;animation:float 8s ease-in-out infinite}
.shape-2{width:200px;height:200px;background:var(--grad-r);bottom:10%;left:-60px;animation:float2 10s ease-in-out infinite;animation-delay:-3s}
.shape-3{width:150px;height:150px;background:linear-gradient(135deg,var(--a),var(--p));top:30%;right:5%;border-radius:50%;opacity:.08;animation:float 12s ease-in-out infinite;animation-delay:-6s}
.hero-content{position:relative;z-index:2;max-width:800px;margin:0 auto}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:${p}18;border:1px solid ${p}40;border-radius:50px;padding:7px 18px;font-size:.72rem;font-weight:800;color:${p};margin-bottom:1.5rem;text-transform:uppercase;letter-spacing:.08em;animation:badge-pulse 2.5s ease-out infinite,fadeIn .8s ease both}
.hero h1{font-size:clamp(2.2rem,8vw,4.5rem);font-weight:900;line-height:1.08;margin-bottom:1.25rem;letter-spacing:-.03em;animation:fadeUp .9s .2s ease both}
.hero h1 em{font-style:normal;background:linear-gradient(135deg,var(--p) 0%,var(--a) 50%,var(--s) 100%);background-size:200% 200%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:grad-shift 4s ease infinite}
.hero-sub{font-size:clamp(.95rem,2.5vw,1.15rem);color:var(--mu);max-width:580px;margin:0 auto 2.25rem;line-height:1.7;animation:fadeUp .9s .35s ease both}
.hero-btns{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;animation:fadeUp .9s .5s ease both}
.btn-primary{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:50px;font-weight:800;font-size:.95rem;background:var(--grad);color:#fff;box-shadow:0 8px 30px ${p}45;transition:transform .2s,box-shadow .2s}
.btn-primary:active{transform:scale(.97)}
.btn-secondary{display:inline-flex;align-items:center;gap:8px;padding:14px 24px;border-radius:50px;font-weight:700;font-size:.92rem;color:var(--tx);border:1px solid var(--bd);background:rgba(255,255,255,.04);backdrop-filter:blur(8px);transition:border-color .2s,background .2s}
.hero-scroll{position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--mu);font-size:.7rem;animation:fadeIn 1.5s 1s ease both}
.hero-scroll-line{width:1px;height:40px;background:linear-gradient(to bottom,transparent,var(--mu));animation:float 2s ease-in-out infinite}

/* ── TRUST ── */
.trust{position:relative;z-index:1;padding:1.5rem 1.25rem;border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);background:rgba(13,21,39,.6);backdrop-filter:blur(10px);display:flex;justify-content:center;gap:2rem;flex-wrap:wrap}
.trust-item{text-align:center}
.trust-item strong{display:block;font-size:1.5rem;font-weight:900;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1}
.trust-item span{font-size:.72rem;color:var(--mu);display:block;margin-top:2px}

/* ── SECTIONS ── */
section{position:relative;z-index:1;padding:4.5rem 1.25rem}
.section-label{font-size:.68rem;font-weight:800;color:${p};letter-spacing:.12em;text-transform:uppercase;margin-bottom:.75rem;display:flex;align-items:center;gap:8px}
.section-label::before{content:'';display:block;width:24px;height:2px;background:var(--grad);border-radius:2px;flex-shrink:0}
.section-title{font-size:clamp(1.6rem,4vw,2.6rem);font-weight:900;margin-bottom:.85rem;line-height:1.12;letter-spacing:-.02em}
.section-sub{color:var(--mu);font-size:.97rem;max-width:560px;line-height:1.7}
.section-header{margin-bottom:2.5rem}
.section-header.center{text-align:center}
.section-header.center .section-label{justify-content:center}
.section-header.center .section-sub{margin:0 auto}

/* ── 3D CARDS ── */
.cards-grid{display:grid;grid-template-columns:1fr;gap:1.25rem}
.card{position:relative;background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:1.75rem;overflow:hidden;cursor:default;transform-style:preserve-3d;transition:transform .3s ease,border-color .3s,box-shadow .3s}
.card:hover{border-color:${p}55;box-shadow:0 20px 60px ${p}18,0 0 0 1px ${p}22;transform:translateY(-6px) rotateX(2deg)}
.card-glow{position:absolute;inset:0;background:radial-gradient(circle at 50% 0%,${p}12,transparent 60%);opacity:0;transition:opacity .3s;pointer-events:none}
.card:hover .card-glow{opacity:1}
.card-icon{font-size:2.2rem;margin-bottom:1.1rem;filter:drop-shadow(0 4px 12px ${p}44)}
.card h3{font-size:1rem;font-weight:700;margin-bottom:.6rem;color:var(--tx)}
.card p{color:var(--mu);font-size:.86rem;line-height:1.65}
.card-line{position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--grad);transform:scaleX(0);transform-origin:left;transition:transform .4s ease}
.card:hover .card-line{transform:scaleX(1)}

/* ── PROBLEM ── */
.prob-grid{display:grid;grid-template-columns:1fr;gap:1.25rem}
.prob-card{background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.18);border-radius:var(--r);padding:1.5rem;transition:transform .3s,border-color .3s}
.prob-card:hover{transform:translateY(-4px);border-color:rgba(239,68,68,.35)}
.prob-card .icon{font-size:2rem;margin-bottom:.85rem}
.prob-card h3{font-size:.98rem;font-weight:700;margin-bottom:.6rem}
.prob-card p{font-size:.85rem;color:var(--mu);line-height:1.65}
.prob-resolution{margin-top:2.5rem;padding:1.75rem;background:linear-gradient(135deg,${p}12,${sec}08);border:1px solid ${p}25;border-radius:var(--r);text-align:center}
.prob-resolution .icon{font-size:2rem;margin-bottom:.85rem}
.prob-resolution h3{font-size:1.15rem;font-weight:800;margin-bottom:.65rem}
.prob-resolution h3 span{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.prob-resolution p{color:var(--mu);font-size:.9rem;line-height:1.7;max-width:540px;margin:0 auto}

/* ── ABOUT ── */
.about-wrap{display:flex;flex-direction:column;gap:2.5rem}
.about-visual{position:relative;border-radius:var(--r);overflow:hidden;min-height:280px;background:linear-gradient(135deg,${p}18,${sec}14);display:flex;align-items:center;justify-content:center}
.about-bg-text{font-size:8rem;opacity:.08;position:absolute;bottom:-1rem;right:-1rem;line-height:1;user-select:none}
.about-badge-float{position:absolute;top:1.25rem;right:1.25rem;background:rgba(8,14,26,.85);border:1px solid var(--bd);border-radius:50px;padding:6px 14px;font-size:.72rem;font-weight:700;color:var(--tx);backdrop-filter:blur(8px)}
.about-icon{font-size:5rem;position:relative;z-index:1;animation:float 7s ease-in-out infinite}
.about-content .section-sub{margin-bottom:1.5rem}
.about-stats{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.stat-box{background:var(--card);border:1px solid var(--bd);border-radius:var(--r-sm);padding:1rem;text-align:center}
.stat-box strong{display:block;font-size:1.4rem;font-weight:900;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.stat-box span{font-size:.72rem;color:var(--mu)}

/* ── TESTIMONIALS ── */
.testi-grid{display:grid;grid-template-columns:1fr;gap:1.25rem}
.testi-card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:1.75rem;transition:transform .3s,border-color .3s;transform-style:preserve-3d}
.testi-card:hover{transform:translateY(-4px) rotateY(1deg);border-color:${p}33}
.stars{color:#f59e0b;font-size:1rem;margin-bottom:.85rem;letter-spacing:.1em}
.testi-card blockquote{color:var(--mu);font-size:.88rem;line-height:1.75;font-style:italic;margin-bottom:1.25rem;position:relative;padding-left:1.1rem}
.testi-card blockquote::before{content:'"';position:absolute;left:0;top:-.25rem;font-size:1.8rem;color:${p};font-style:normal;line-height:1}
.testi-author{display:flex;align-items:center;gap:.75rem}
.testi-av{width:38px;height:38px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.82rem;flex-shrink:0;box-shadow:0 0 12px ${p}44}
.testi-info strong{display:block;font-size:.84rem;font-weight:700}
.testi-info span{font-size:.72rem;color:var(--mu)}

/* ── PRICING ── */
.pricing-grid{display:grid;grid-template-columns:1fr;gap:1.25rem}
.price-card{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);padding:1.75rem;text-align:center;position:relative;transition:transform .3s,border-color .3s}
.price-card:hover{transform:translateY(-4px)}
.price-card.pop{border-color:${p}55;background:linear-gradient(160deg,${p}10,var(--card) 60%)}
.pop-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--grad);color:#fff;font-size:.62rem;font-weight:800;padding:4px 16px;border-radius:50px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
.price-card h3{font-weight:700;font-size:.95rem;margin-bottom:.5rem}
.price-amt{font-size:2.2rem;font-weight:900;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:.75rem 0;line-height:1}
.price-amt sup{font-size:1rem;font-weight:800;vertical-align:super}
.price-amt sub{font-size:.85rem;font-weight:500;color:var(--mu);-webkit-text-fill-color:var(--mu)}
.price-card ul{list-style:none;text-align:left;margin:1rem 0 1.5rem;display:flex;flex-direction:column;gap:.5rem}
.price-card li{font-size:.86rem;color:var(--mu);padding-left:1.4rem;position:relative}
.price-card li::before{content:'✓';position:absolute;left:0;color:${a};font-weight:800}
.price-btn{display:block;padding:12px;border-radius:50px;font-weight:700;font-size:.88rem;background:var(--grad);color:#fff;transition:opacity .2s,transform .2s}
.price-btn:hover{opacity:.88;transform:scale(1.02)}

/* ── FAQ ── */
.faq-list{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:.85rem}
.faq-item{background:var(--card);border:1px solid var(--bd);border-radius:var(--r);overflow:hidden;transition:border-color .2s}
.faq-item:hover{border-color:${p}33}
.faq-q{display:flex;align-items:center;justify-content:space-between;padding:1.1rem 1.25rem;cursor:pointer;font-weight:700;font-size:.93rem;gap:1rem;user-select:none;-webkit-tap-highlight-color:transparent}
.faq-q .faq-icon{width:22px;height:22px;border-radius:50%;background:${p}18;border:1px solid ${p}30;display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0;transition:transform .3s,background .3s}
.faq-item.open .faq-icon{transform:rotate(45deg);background:${p}30}
.faq-a{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.22,1,.36,1),padding .3s}
.faq-item.open .faq-a{max-height:200px}
.faq-a p{padding:0 1.25rem 1.25rem;color:var(--mu);font-size:.87rem;line-height:1.75}

/* ── CTA / CONTACT ── */
.cta-section{background:linear-gradient(160deg,${p}10 0%,var(--dark) 50%,${sec}08 100%);border-top:1px solid ${p}18;border-bottom:1px solid ${p}18;text-align:center}
.cta-glow{position:absolute;top:0;left:50%;transform:translateX(-50%);width:600px;height:200px;background:radial-gradient(ellipse,${p}15,transparent 70%);pointer-events:none}
.contact-wrap{display:flex;flex-direction:column;gap:2rem;margin-top:2.5rem;text-align:left}
.contact-info{display:flex;flex-direction:column;gap:1rem}
.contact-item{display:flex;gap:.85rem;align-items:flex-start}
.ci-icon{width:38px;height:38px;border-radius:10px;background:${p}15;border:1px solid ${p}25;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
.contact-item strong{display:block;font-size:.82rem;font-weight:700;margin-bottom:2px}
.contact-item p{font-size:.83rem;color:var(--mu)}
.cform{display:flex;flex-direction:column;gap:.85rem}
.cform-row{display:grid;grid-template-columns:1fr;gap:.85rem}
.field{display:flex;flex-direction:column;gap:4px}
.field label{font-size:.72rem;font-weight:700;color:var(--mu);text-transform:uppercase;letter-spacing:.05em}
.field input,.field textarea{background:rgba(255,255,255,.04);border:1px solid var(--bd);border-radius:var(--r-sm);padding:12px 14px;color:var(--tx);font-family:var(--ff);font-size:.9rem;outline:none;transition:border-color .2s,box-shadow .2s;width:100%;-webkit-appearance:none}
.field input:focus,.field textarea:focus{border-color:${p};box-shadow:0 0 0 3px ${p}22}
.field textarea{height:110px;resize:vertical}
.submit-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;border-radius:50px;font-weight:800;font-size:.97rem;background:var(--grad);color:#fff;border:none;cursor:pointer;transition:opacity .2s,transform .2s,box-shadow .2s;box-shadow:0 8px 30px ${p}40;touch-action:manipulation}
.submit-btn:active{transform:scale(.97)}

/* ── FOOTER ── */
footer{position:relative;z-index:1;padding:2.5rem 1.25rem;border-top:1px solid var(--bd)}
.footer-top{display:flex;flex-direction:column;gap:1.5rem;margin-bottom:1.5rem}
.footer-brand{font-size:1.2rem;font-weight:900;background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.footer-tagline{font-size:.8rem;color:var(--mu);margin-top:3px}
.footer-social{display:flex;gap:.85rem;flex-wrap:wrap}
.soc-link{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:50px;background:rgba(255,255,255,.04);border:1px solid var(--bd);color:var(--mu);font-size:.78rem;transition:border-color .2s,color .2s,background .2s}
.soc-link:hover{border-color:${p}44;color:var(--tx);background:${p}12}
.footer-bottom{padding-top:1.25rem;border-top:1px solid var(--bd);font-size:.75rem;color:var(--mu)}

/* ── TABLET & DESKTOP ── */
@media(min-width:640px){
  nav{padding:0 2.5rem}
  .hero{padding:88px 2.5rem 3rem}
  section{padding:5rem 2.5rem}
  .trust{padding:1.75rem 2.5rem;gap:3rem}
  .cards-grid{grid-template-columns:repeat(2,1fr)}
  .prob-grid{grid-template-columns:repeat(2,1fr)}
  .testi-grid{grid-template-columns:repeat(2,1fr)}
  .cform-row{grid-template-columns:1fr 1fr}
  footer{padding:3rem 2.5rem}
}
@media(min-width:1024px){
  nav{padding:0 5%}
  .nav-links{display:flex}
  .menu-btn{display:none}
  .hero{padding:100px 5% 4rem}
  .btn-primary:hover{transform:translateY(-3px);box-shadow:0 16px 50px ${p}55}
  .btn-secondary:hover{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.07)}
  section{padding:6rem 5%}
  .trust{padding:2rem 5%;gap:4rem}
  .cards-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
  .prob-grid{grid-template-columns:repeat(3,1fr)}
  .about-wrap{flex-direction:row;gap:4rem;align-items:center}
  .about-visual{flex:0 0 440px;min-height:360px}
  .testi-grid{grid-template-columns:repeat(3,1fr)}
  .pricing-grid{grid-template-columns:repeat(3,1fr)}
  .contact-wrap{flex-direction:row;gap:4rem}
  .contact-info{flex:0 0 320px}
  .cform{flex:1}
  .footer-top{flex-direction:row;justify-content:space-between;align-items:flex-start}
}
</style>
</head>
<body>

<!-- Gradient mesh background -->
<div class="mesh" aria-hidden="true">
  <div class="mesh-orb"></div>
  <div class="mesh-orb"></div>
  <div class="mesh-orb"></div>
</div>

<!-- NAV -->
<nav id="nav">
  <div class="nav-logo">${form.businessName}</div>
  <ul class="nav-links">
    <li><a href="#services">Services</a></li>
    <li><a href="#about">About</a></li>
    <li><a href="#testimonials">Reviews</a></li>
    <li><a href="#contact">Contact</a></li>
  </ul>
  <div style="display:flex;align-items:center;gap:12px">
    <a href="#contact" class="nav-cta">${form.ctaText||'Get Started'}</a>
    <button class="menu-btn" id="menuBtn" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<!-- Mobile menu -->
<div id="mobileMenu" style="display:none;position:fixed;top:64px;inset-inline:0;z-index:999;background:rgba(8,14,26,.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--bd);padding:1.5rem;flex-direction:column;gap:.5rem">
  <a href="#services" class="mm-link" style="display:block;padding:.85rem 1rem;border-radius:10px;color:var(--tx);font-weight:600;font-size:.97rem;transition:background .2s">Services</a>
  <a href="#about" class="mm-link" style="display:block;padding:.85rem 1rem;border-radius:10px;color:var(--tx);font-weight:600;font-size:.97rem;transition:background .2s">About</a>
  <a href="#testimonials" class="mm-link" style="display:block;padding:.85rem 1rem;border-radius:10px;color:var(--tx);font-weight:600;font-size:.97rem;transition:background .2s">Reviews</a>
  <a href="#contact" class="mm-link" style="display:block;padding:.85rem 1rem;border-radius:10px;color:var(--tx);font-weight:600;font-size:.97rem;transition:background .2s">Contact</a>
  <a href="#contact" style="display:block;padding:12px;border-radius:50px;text-align:center;font-weight:800;background:var(--grad);color:#fff;margin-top:.5rem">${form.ctaText||'Get Started'}</a>
</div>

<!-- HERO -->
<section class="hero" id="home">
  <div class="hero-shapes" aria-hidden="true">
    <div class="shape shape-1"></div>
    <div class="shape shape-2"></div>
    <div class="shape shape-3"></div>
  </div>
  <div class="hero-content">
    <div class="hero-badge">✨ ${form.industry||'Business Solutions'}</div>
    <h1>${tag1}<br><em>${tag2||form.businessName}</em></h1>
    <p class="hero-sub">${form.usp||`Professional ${form.industry||'services'} tailored to your needs. We deliver results that matter.`}</p>
    <div class="hero-btns">
      <a href="#contact" class="btn-primary">🚀 ${form.ctaText||'Get Started'}</a>
      <a href="#services" class="btn-secondary">Explore Services ↓</a>
    </div>
  </div>
  <div class="hero-scroll" aria-hidden="true">
    <span>scroll</span>
    <div class="hero-scroll-line"></div>
  </div>
</section>

<!-- TRUST BAR -->
<div class="trust" id="trust">
  ${form.yearsInBusiness?`<div class="trust-item reveal"><strong class="counter" data-target="${form.yearsInBusiness}">${form.yearsInBusiness}</strong><span>Years Experience</span></div>`:''}
  <div class="trust-item reveal" style="--d:80ms"><strong class="counter" data-target="500">500</strong><span>Happy Clients</span></div>
  <div class="trust-item reveal" style="--d:160ms"><strong>98%</strong><span>Satisfaction Rate</span></div>
  <div class="trust-item reveal" style="--d:240ms"><strong>24/7</strong><span>Support</span></div>
</div>

<!-- PROBLEM -->
<section id="problem" style="background:rgba(13,21,39,.5)">
  <div class="section-header center">
    <div class="section-label reveal">Sound Familiar?</div>
    <h2 class="section-title reveal" style="--d:80ms">The Problem We Solve</h2>
    <p class="section-sub reveal" style="--d:160ms">Before finding ${form.businessName}, ${form.targetCustomer?'most '+form.targetCustomer+' struggle':'many businesses struggle'} with these challenges...</p>
  </div>
  <div class="prob-grid" style="max-width:960px;margin:0 auto">
    <div class="prob-card reveal" style="--d:0ms"><div class="icon">😩</div><h3>Wasted Time &amp; Money</h3><p>Unreliable providers who overpromise and underdeliver, costing you more in the long run.</p></div>
    <div class="prob-card reveal" style="--d:100ms"><div class="icon">🤯</div><h3>No Clear Solution</h3><p>Searching for someone who truly understands your ${form.industry||'industry'} and delivers real results.</p></div>
    <div class="prob-card reveal" style="--d:200ms"><div class="icon">📉</div><h3>Falling Behind</h3><p>Watching competitors grow while you're stuck with problems that should have been solved already.</p></div>
  </div>
  <div class="prob-resolution reveal" style="--d:300ms;max-width:640px;margin:2.5rem auto 0">
    <div class="icon">💡</div>
    <h3>That's why <span>${form.businessName}</span> exists.</h3>
    <p>${form.usp||`We provide professional ${form.industry||'services'} that actually solve the problem — reliably, efficiently, and with results you can see.`}</p>
  </div>
</section>

<!-- SERVICES -->
<section id="services">
  <div class="section-header">
    <div class="section-label reveal">What We Offer</div>
    <h2 class="section-title reveal" style="--d:80ms">Our Services</h2>
    <p class="section-sub reveal" style="--d:160ms">${form.usp||`Everything you need from ${form.businessName}. Professional quality, proven results.`}</p>
  </div>
  <div class="cards-grid">${svcCards}</div>
</section>

<!-- ABOUT -->
<section id="about" style="background:rgba(13,21,39,.5)">
  <div class="about-wrap">
    <div class="about-visual reveal-left">
      <div class="about-bg-text">🏢</div>
      <div class="about-icon">🏢</div>
      ${form.yearsInBusiness?`<div class="about-badge-float">✨ ${form.yearsInBusiness}+ years</div>`:''}
    </div>
    <div class="reveal-right">
      <div class="section-label">Our Story</div>
      <h2 class="section-title">About ${form.businessName}</h2>
      <p class="section-sub">${form.usp||`We are passionate about delivering exceptional ${form.industry||'business'} solutions.${form.yearsInBusiness?' With over '+form.yearsInBusiness+' years of experience,':''} we understand what it takes to help businesses like yours succeed.`}</p>
      <div class="about-stats" style="margin-top:1.5rem">
        <div class="stat-box"><strong>${form.yearsInBusiness||'5'}+</strong><span>Years</span></div>
        <div class="stat-box"><strong>500+</strong><span>Clients</span></div>
        <div class="stat-box"><strong>98%</strong><span>Satisfaction</span></div>
        <div class="stat-box"><strong>24/7</strong><span>Support</span></div>
      </div>
      <a href="#contact" class="btn-primary" style="margin-top:1.75rem;display:inline-flex">Work With Us →</a>
    </div>
  </div>
</section>

<!-- TESTIMONIALS -->
<section id="testimonials">
  <div class="section-header center">
    <div class="section-label reveal">Social Proof</div>
    <h2 class="section-title reveal" style="--d:80ms">Trusted by Businesses Like Yours</h2>
  </div>
  <div class="testi-grid">
    <div class="testi-card reveal" style="--d:0ms">
      <div class="stars">★★★★★</div>
      <blockquote>"${form.businessName} completely transformed how we operate. The results exceeded every expectation."</blockquote>
      <div class="testi-author"><div class="testi-av">SJ</div><div class="testi-info"><strong>Sarah Johnson</strong><span>Business Owner</span></div></div>
    </div>
    <div class="testi-card reveal" style="--d:100ms">
      <div class="stars">★★★★★</div>
      <blockquote>"Professional, reliable, and incredibly skilled. I wouldn't hesitate to recommend them to anyone."</blockquote>
      <div class="testi-author"><div class="testi-av">MP</div><div class="testi-info"><strong>Mark Phillips</strong><span>Managing Director</span></div></div>
    </div>
    <div class="testi-card reveal" style="--d:200ms">
      <div class="stars">★★★★★</div>
      <blockquote>"The best investment I've made for my business. The team goes above and beyond every single time."</blockquote>
      <div class="testi-author"><div class="testi-av">AK</div><div class="testi-info"><strong>Aisha Khan</strong><span>Entrepreneur</span></div></div>
    </div>
  </div>
</section>

${hasPricing?`
<!-- PRICING -->
<section id="pricing" style="background:rgba(13,21,39,.5)">
  <div class="section-header center">
    <div class="section-label reveal">Pricing</div>
    <h2 class="section-title reveal" style="--d:80ms">Simple, Transparent Plans</h2>
    <p class="section-sub reveal" style="--d:160ms">No hidden fees. Pick the plan that fits your needs.</p>
  </div>
  <div class="pricing-grid" style="max-width:960px;margin:0 auto">
    <div class="price-card reveal" style="--d:0ms">
      <h3>Starter</h3>
      <div class="price-amt"><sup>£</sup>99<sub>/mo</sub></div>
      <ul><li>Core features</li><li>Email support</li><li>1 user seat</li><li>Basic analytics</li></ul>
      <a href="#contact" class="price-btn">Get Started</a>
    </div>
    <div class="price-card pop reveal" style="--d:120ms">
      <div class="pop-badge">Most Popular</div>
      <h3>Professional</h3>
      <div class="price-amt"><sup>£</sup>249<sub>/mo</sub></div>
      <ul><li>Everything in Starter</li><li>Priority support</li><li>5 user seats</li><li>Advanced analytics</li><li>Custom integrations</li></ul>
      <a href="#contact" class="price-btn">Get Started</a>
    </div>
    <div class="price-card reveal" style="--d:240ms">
      <h3>Enterprise</h3>
      <div class="price-amt"><sup>£</sup>599<sub>/mo</sub></div>
      <ul><li>Everything in Pro</li><li>Dedicated manager</li><li>Unlimited seats</li><li>White-label option</li><li>SLA guarantee</li></ul>
      <a href="#contact" class="price-btn">Contact Us</a>
    </div>
  </div>
</section>`:''}

<!-- FAQ -->
<section id="faq">
  <div class="section-header center">
    <div class="section-label reveal">FAQ</div>
    <h2 class="section-title reveal" style="--d:80ms">Common Questions</h2>
  </div>
  <div class="faq-list">
    ${[
      ['How quickly can you get started?','We typically begin within 48 hours of initial consultation. Reach out today and we\'ll discuss your specific timeline.'],
      ['What areas do you serve?', form.location?`We primarily serve ${form.location}, and also work with clients remotely across the UK and beyond.`:'We serve clients locally and remotely across the UK. Contact us to discuss your location.'],
      ['How much does it cost?', form.pricingModel==='quote-based'?'Every project is unique. We provide free, no-obligation quotes tailored to your exact requirements — no surprises.':'Please contact us for current pricing. We offer competitive rates with flexible payment options.'],
      ['Do you offer ongoing support?','Yes — we provide continued support and maintenance well after project completion. Your long-term success is our priority.'],
      ['How do I get started?','Simply fill in the contact form below or give us a call. We\'ll arrange a free consultation with no obligation whatsoever.'],
    ].map(([q,a],i)=>`
    <div class="faq-item reveal" style="--d:${i*60}ms">
      <div class="faq-q">${q}<span class="faq-icon">+</span></div>
      <div class="faq-a"><p>${a}</p></div>
    </div>`).join('')}
  </div>
</section>

<!-- CTA + CONTACT -->
<section class="cta-section" id="contact">
  <div class="cta-glow" aria-hidden="true"></div>
  <div class="section-header center">
    <div class="section-label reveal">Get In Touch</div>
    <h2 class="section-title reveal" style="--d:80ms">${form.ctaText||'Ready to Get Started?'}</h2>
    <p class="section-sub reveal" style="--d:160ms">${form.usp||`Let's discuss how ${form.businessName} can help you achieve your goals. Free consultation, no obligation.`}</p>
  </div>
  <div class="contact-wrap">
    <div class="contact-info reveal-left">
      ${contactBlock||'<p style="color:var(--mu)">Reach out and we\'ll be in touch shortly.</p>'}
    </div>
    <div class="cform reveal-right">
      <div class="cform-row">
        <div class="field"><label>Your Name</label><input type="text" placeholder="John Smith" autocomplete="name"/></div>
        <div class="field"><label>Your Email</label><input type="email" placeholder="john@email.com" autocomplete="email"/></div>
      </div>
      <div class="field"><label>Phone Number</label><input type="tel" placeholder="+44 7700 900000" autocomplete="tel"/></div>
      <div class="field"><label>Tell us about your project</label><textarea placeholder="Describe what you need help with..."></textarea></div>
      <button class="submit-btn" type="button">${form.ctaText||'Send Message'} →</button>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="footer-top">
    <div>
      <div class="footer-brand">${form.businessName}</div>
      <div class="footer-tagline">${form.tagline||form.usp||'Professional services you can trust'}</div>
    </div>
    ${socFooter?`<div class="footer-social">${socFooter}</div>`:''}
  </div>
  <div class="footer-bottom">
    © ${new Date().getFullYear()} ${form.businessName}. All rights reserved.
    ${form.address?`<span style="margin:0 .75rem;opacity:.3">·</span>${form.address}`:''}
    Built with Miller SaaS Hub.
  </div>
</footer>

<script>
(function(){
  'use strict';
  // ── Scroll reveal via IntersectionObserver ──
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}
    });
  },{threshold:.12,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(function(el){io.observe(el);});

  // ── FAQ accordion ──
  document.querySelectorAll('.faq-q').forEach(function(btn){
    btn.addEventListener('click',function(){
      var item=btn.closest('.faq-item');
      var open=item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(o){o.classList.remove('open');});
      if(!open)item.classList.add('open');
    });
  });

  // ── Mobile menu ──
  var menuBtn=document.getElementById('menuBtn');
  var mobileMenu=document.getElementById('mobileMenu');
  var menuOpen=false;
  menuBtn&&menuBtn.addEventListener('click',function(){
    menuOpen=!menuOpen;
    mobileMenu.style.display=menuOpen?'flex':'none';
    var spans=menuBtn.querySelectorAll('span');
    if(menuOpen){spans[0].style.transform='rotate(45deg) translate(5px,5px)';spans[1].style.opacity='0';spans[2].style.transform='rotate(-45deg) translate(5px,-5px)';}
    else{spans[0].style.transform='';spans[1].style.opacity='1';spans[2].style.transform='';}
  });
  document.querySelectorAll('.mm-link, #mobileMenu a').forEach(function(a){
    a.addEventListener('click',function(){menuOpen=false;mobileMenu.style.display='none';var s=menuBtn.querySelectorAll('span');s[0].style.transform='';s[1].style.opacity='1';s[2].style.transform='';});
  });

  // ── Nav scroll opacity ──
  window.addEventListener('scroll',function(){
    document.getElementById('nav').style.background=window.scrollY>60?'rgba(8,14,26,.97)':'rgba(8,14,26,.82)';
  },{passive:true});

  // ── Touch-friendly card 3D tilt (desktop only) ──
  if(window.matchMedia('(min-width:1024px)').matches&&!('ontouchstart' in window)){
    document.querySelectorAll('.card').forEach(function(card){
      card.addEventListener('mousemove',function(e){
        var r=card.getBoundingClientRect();
        var x=(e.clientX-r.left)/r.width-.5;
        var y=(e.clientY-r.top)/r.height-.5;
        card.style.transform='translateY(-6px) rotateX('+(y*-8)+'deg) rotateY('+(x*8)+'deg)';
      });
      card.addEventListener('mouseleave',function(){card.style.transform='';});
    });
  }
})();
</script>
</body>
</html>`;
}

/* ═══════════════════════════════════════
   MILA AGENT
═══════════════════════════════════════ */
const MILA:Record<string,string[]> = {
  welcome:[
    "Hi! I'm Miller AI, your AI website builder 👋 I handle 80% of the work — you guide the vision.",
    "I've scanned your Social Media Hub and will pull in everything I already know about your business.",
    "This page becomes the final step in your setup journey — after all your social platforms.",
  ],
  gather:[
    "Let's collect your business details. I'll auto-fill anything from your Social Hub. 📋",
    "The more detail you give me, the better your landing page will be!",
    "Step through each section — Identity, Offer, Brand, then Goals. Takes about 3 minutes.",
  ],
  competitor:[
    "Time to research the competition! 🔍 Add up to 10 competitors.",
    "I'll analyze each one — headline, CTA, key sections, color tone, strengths, and gaps.",
    "I'll use competitor gaps to make YOUR page stronger.",
  ],
  logo:[
    "Let's lock in your logo and brand identity before we build! 🎨",
    "Upload your logo, paste a URL, or I'll generate a text placeholder — you can swap it later.",
    "I'll also confirm your color palette here. This drives the entire page design.",
  ],
  plan:[
    "Here's your landing page blueprint! 📋 Review each section before we build.",
    "You can edit the content description for any section, or remove sections you don't need.",
    "When you're happy — hit 'Approve All & Build' and I'll get to work! 🚀",
  ],
  build:[
    "Building your landing page now! 🏗️ Applying your brand, colors, and content...",
    "Generating sections from your plan and competitor research...",
    "Adding the finishing touches — integrating your social media links ✨",
  ],
  view:[
    "Your landing page is live and saved! 🎉 Preview it in the iframe below.",
    "Download the HTML to host anywhere, or keep editing sections here.",
    "It's saved in your Miller SaaS Hub sites library — come back anytime to edit.",
  ],
};

function MilaAgent({stage, thinking}:{stage:string;thinking:boolean}) {
  const [idx,setIdx]=useState(0);
  const [text,setText]=useState('');
  const [typing,setTyping]=useState(false);
  const msgs=MILA[stage]||[];
  useEffect(()=>{setIdx(0);},[stage]);
  useEffect(()=>{
    const m=msgs[idx]||''; setText(''); setTyping(true); let i=0;
    const iv=setInterval(()=>{ i++; setText(m.slice(0,i)); if(i>=m.length){clearInterval(iv);setTyping(false);}},16);
    return ()=>clearInterval(iv);
  },[idx,stage]);
  return (
    <div style={{background:'linear-gradient(135deg,rgba(99,102,241,.1),rgba(16,185,129,.07))',border:'1px solid rgba(99,102,241,.25)',borderRadius:16,padding:'1.1rem',marginBottom:'1.5rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'0.75rem'}}>
        <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#10b981)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem',boxShadow:'0 0 20px rgba(99,102,241,.35)',flexShrink:0}}>🤖</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:'.9rem'}}>Miller AI — Builder</div>
          <div style={{fontSize:'.68rem',color:'var(--saas-text-muted)'}}>
            {thinking?'🔍 Analyzing competitors...':typing?'⌨️ Typing...':'✅ Ready to help'}
          </div>
        </div>
        {msgs.length>1&&<button onClick={()=>setIdx(v=>Math.min(v+1,msgs.length-1))} disabled={idx>=msgs.length-1} style={{padding:'3px 10px',borderRadius:8,cursor:'pointer',background:'rgba(99,102,241,.15)',color:'#818cf8',border:'1px solid rgba(99,102,241,.2)',fontSize:'.7rem',opacity:idx>=msgs.length-1?.4:1}}>next tip →</button>}
      </div>
      <div style={{background:'rgba(0,0,0,.25)',borderRadius:10,padding:'.8rem 1rem',fontSize:'.83rem',lineHeight:1.65,minHeight:46,borderLeft:'3px solid #6366f1'}}>
        {text}{typing&&<span style={{opacity:.6}}>|</span>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   STAGE PROGRESS BAR
═══════════════════════════════════════ */
const STAGES:BuilderStage[]=['welcome','gather','competitor','logo','plan','build','view'];
const STAGE_LABELS:Record<string,string>={welcome:'Start',gather:'Business Info',competitor:'Competitors',logo:'Logo & Brand',plan:'Flat Plan',build:'Build',view:'Your Site'};
const STAGE_EMOJI:Record<string,string>={welcome:'👋',gather:'📋',competitor:'🔍',logo:'🎨',plan:'🗺️',build:'🏗️',view:'🌐'};

function StageBar({stage}:{stage:BuilderStage}) {
  const idx=STAGES.indexOf(stage);
  return (
    <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:'1.75rem',overflow:'hidden',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',padding:'0.65rem 1rem'}}>
      {STAGES.map((s,i)=>(
        <React.Fragment key={s}>
          <div style={{display:'flex',alignItems:'center',gap:6,flex:1,opacity:i>idx?.35:1}}>
            <span style={{fontSize:'.9rem'}}>{STAGE_EMOJI[s]}</span>
            <span style={{fontSize:'.72rem',fontWeight:i===idx?800:600,color:i===idx?'var(--saas-text)':'var(--saas-text-muted)',whiteSpace:'nowrap'}}>{STAGE_LABELS[s]}</span>
            {i<idx&&<Check size={11} style={{color:'#10b981'}}/>}
          </div>
          {i<STAGES.length-1&&<div style={{width:24,height:1,background:'rgba(255,255,255,.08)',flexShrink:0,margin:'0 4px'}}/>}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   FORM FIELD HELPERS
═══════════════════════════════════════ */
function Field({label,children,tip}:{label:string;children:React.ReactNode;tip?:string}) {
  return (
    <div style={{marginBottom:'1rem'}}>
      <label style={{display:'block',fontSize:'.73rem',fontWeight:700,color:'var(--saas-text-secondary)',marginBottom:5}}>{label}</label>
      {children}
      {tip&&<div style={{fontSize:'.68rem',color:'var(--saas-text-muted)',marginTop:3}}>{tip}</div>}
    </div>
  );
}
const inputStyle:React.CSSProperties={width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.09)',borderRadius:8,padding:'9px 12px',color:'var(--saas-text)',fontSize:'.85rem',outline:'none'};
const selectStyle:React.CSSProperties={...inputStyle,cursor:'pointer'};

/* ═══════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════ */
export default function LandingBuilderPage() {
  const [stage, setStage]             = useState<BuilderStage>('welcome');
  const [gatherStep, setGatherStep]   = useState<GatherStep>(0);
  const [form, setForm]               = useState<BizForm|null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [plan, setPlan]               = useState<PlanSection[]>([]);
  const [builtHtml, setBuiltHtml]     = useState('');
  const [buildPct, setBuildPct]       = useState(0);
  const [milaThinking, setMilaThinking] = useState(false);
  const [sites, setSites]             = useState<SavedSite[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string|null>(null);
  const [hubData, setHubData]         = useState<{biz:Record<string,string>;links:Record<string,string>;done:string[]}>({biz:{},links:{},done:[]});
  const [newCompName, setNewCompName] = useState('');
  const [newCompUrl, setNewCompUrl]   = useState('');
  const [previewFull, setPreviewFull] = useState(false);
  const [copied, setCopied]           = useState(false);
  const [siteGalleryOpen, setSiteGalleryOpen] = useState(true);

  // Load on mount
  useEffect(()=>{
    const hub=readHubData(); setHubData(hub);
    const saved=loadSites(); setSites(saved);
    // Load draft
    try {
      const dr=localStorage.getItem(DRAFT_KEY);
      if(dr) {
        const d=JSON.parse(dr);
        if(d.form) setForm(d.form);
        if(d.competitors) setCompetitors(d.competitors);
        if(d.plan) setPlan(d.plan);
        if(d.stage) setStage(d.stage);
      } else {
        setForm(blankForm(hub.biz,hub.links));
      }
    } catch {
      setForm(blankForm(hub.biz,hub.links));
    }
  },[]);

  // Auto-save draft
  useEffect(()=>{
    if(!form) return;
    try { localStorage.setItem(DRAFT_KEY,JSON.stringify({stage,form,competitors,plan})); } catch {/**/}
  },[stage,form,competitors,plan]);

  const patchForm = useCallback((patch:Partial<BizForm>)=>{
    setForm(prev=>prev?{...prev,...patch}:prev);
  },[]);

  /* ── Competitor mock analysis ── */
  const analyzeCompetitor = useCallback(async (id:string)=>{
    setMilaThinking(true);
    setCompetitors(prev=>prev.map(c=>c.id===id?{...c,status:'analyzing'}:c));
    await new Promise(r=>setTimeout(r,1800+Math.random()*1200));
    const comp = competitors.find(c=>c.id===id);
    const colorTones=['Dark professional blue','Warm orange + white','Minimal grey + black','Bright green + white','Purple gradient premium'];
    const sectionSets=[
      ['Hero','Services','About','Contact'],
      ['Hero','Features','Pricing','FAQ','Footer'],
      ['Hero','Social Proof','Services','CTA','Contact'],
      ['Hero','Stats','Team','Testimonials','Footer'],
    ];
    const opps=[
      `Add a "Problem" section — ${comp?.name||'competitor'} jumps straight to services without agitating the pain point`,
      `Show pricing transparency — ${comp?.name||'competitor'} hides costs, which loses trust`,
      `Add an FAQ — ${comp?.name||'competitor'} has none, leaving common objections unanswered`,
      `Lead with USP in hero — ${comp?.name||'competitor'} uses generic headline with no differentiation`,
    ];
    const mockAnalysis = {
      headline:`"${comp?.name||'Competitor'} — Your Trusted Partner"`,
      cta:'Get a Free Quote',
      colorTone: colorTones[Math.floor(Math.random()*colorTones.length)],
      keySections: sectionSets[Math.floor(Math.random()*sectionSets.length)],
      strengths:['Clean homepage design','Clear service list','Has customer testimonials'],
      gaps:['No pricing visible','Slow page load (no optimisation)','No FAQ section','Missing social proof numbers','No clear USP statement'],
      opportunity: opps[Math.floor(Math.random()*opps.length)],
    };
    setCompetitors(prev=>prev.map(c=>c.id===id?{...c,status:'done',analysis:mockAnalysis}:c));
    setMilaThinking(false);
  },[competitors]);

  const addCompetitor = ()=>{
    if(!newCompName.trim()) return;
    const c:Competitor={id:`c${Date.now()}`,name:newCompName.trim(),url:newCompUrl.trim(),status:'idle'};
    setCompetitors(prev=>[...prev,c]);
    setNewCompName(''); setNewCompUrl('');
  };

  /* ── Build ── */
  const startBuild = useCallback(async ()=>{
    if(!form) return;
    setStage('build'); setBuildPct(0);
    const steps=[
      {pct:10,msg:'Analyzing business info...'},
      {pct:30,msg:'Applying brand colors...'},
      {pct:55,msg:'Generating sections...'},
      {pct:75,msg:'Integrating social links...'},
      {pct:90,msg:'Polishing final design...'},
      {pct:100,msg:'Done!'},
    ];
    for(const step of steps){
      await new Promise(r=>setTimeout(r,400+Math.random()*300));
      setBuildPct(step.pct);
    }
    const html=generateHTML(form,plan);
    setBuiltHtml(html);
    // Save site
    const site:SavedSite={
      id: activeSiteId||`site-${Date.now()}`,
      businessName: form.businessName||'My Business',
      createdAt: activeSiteId?sites.find(s=>s.id===activeSiteId)?.createdAt||new Date().toISOString():new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stage:'view',form,competitors,plan,html,published:false,
    };
    setSites(prev=>{
      const next=activeSiteId?prev.map(s=>s.id===activeSiteId?site:s):[...prev,site];
      saveSites(next); return next;
    });
    setActiveSiteId(site.id);
    setStage('view');
  },[form,plan,competitors,activeSiteId,sites]);

  /* ── Download ── */
  const downloadHtml = ()=>{
    const blob=new Blob([builtHtml],{type:'text/html'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`${form?.businessName?.replace(/\s+/g,'-')||'landing-page'}.html`;
    a.click();
  };

  /* ── Copy code ── */
  const copyCode = async ()=>{
    await navigator.clipboard.writeText(builtHtml); setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };

  /* ── Load saved site ── */
  const loadSite = (site:SavedSite)=>{
    setForm(site.form); setCompetitors(site.competitors);
    setPlan(site.plan); setBuiltHtml(site.html);
    setActiveSiteId(site.id); setStage('view');
  };

  /* ── Delete site ── */
  const deleteSite = (id:string)=>{
    setSites(prev=>{ const next=prev.filter(s=>s.id!==id); saveSites(next); return next; });
    if(activeSiteId===id) setActiveSiteId(null);
  };

  if(!form) return <div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center',background:'#090d16',color:'#9ca3af'}}><h3>Loading...</h3></div>;

  /* ── RENDER ── */
  return (
    <div className="dashboard-layout">
      <DashboardSidebar/>
      <main className="dashboard-content">

        {/* Page header */}
        <div style={{background:'linear-gradient(135deg,rgba(99,102,241,.1),rgba(16,185,129,.07))',border:'1px solid rgba(99,102,241,.22)',borderRadius:18,padding:'1.75rem 2rem',marginBottom:'1.75rem',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:-40,right:-40,width:220,height:220,background:'radial-gradient(circle,rgba(99,102,241,.14) 0%,transparent 70%)',pointerEvents:'none'}}/>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(99,102,241,.14)',border:'1px solid rgba(99,102,241,.28)',borderRadius:20,padding:'4px 12px',marginBottom:'.85rem',fontSize:'.7rem',fontWeight:700,color:'#818cf8',letterSpacing:'.04em'}}>
            🌐 AI LANDING PAGE BUILDER
          </div>
          <h1 style={{fontSize:'1.75rem',fontFamily:'var(--font-display)',marginBottom:'.4rem',lineHeight:1.2}}>
            Build Your Landing Page<br/><span style={{color:'#818cf8'}}>Powered by Miller AI · 80% AI Agent Driven</span>
          </h1>
          <p style={{color:'var(--saas-text-secondary)',fontSize:'.88rem',maxWidth:620,lineHeight:1.65}}>
            The final step in your business setup. Miller AI pulls your social media links, brand info, and competitor data — then builds a professional landing page in minutes.
          </p>
        </div>

        {/* Sites gallery */}
        {sites.length>0 && (
          <div style={{marginBottom:'1.75rem'}}>
            <button onClick={()=>setSiteGalleryOpen(v=>!v)} style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',cursor:'pointer',color:'var(--saas-text)',fontWeight:700,fontSize:'.9rem',padding:'0 0 .5rem 0'}}>
              <Layout size={15} style={{color:'#6366f1'}}/>
              Saved Sites ({sites.length})
              {siteGalleryOpen?<ChevronUp size={13}/>:<ChevronDown size={13}/>}
            </button>
            {siteGalleryOpen&&(
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'1rem'}}>
                {sites.map(site=>(
                  <div key={site.id} style={{background:'rgba(99,102,241,.06)',border:`1px solid ${activeSiteId===site.id?'rgba(99,102,241,.4)':'rgba(99,102,241,.15)'}`,borderRadius:12,padding:'1rem 1.2rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <Globe size={14} style={{color:'#6366f1'}}/>
                      <span style={{fontWeight:700,fontSize:'.88rem',flex:1}}>{site.businessName}</span>
                      {activeSiteId===site.id&&<span style={{fontSize:'.65rem',fontWeight:800,color:'#6366f1',background:'rgba(99,102,241,.15)',border:'1px solid rgba(99,102,241,.25)',borderRadius:8,padding:'1px 6px'}}>Active</span>}
                    </div>
                    <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap',marginBottom:6}}>
                      <span style={{fontSize:'.68rem',color:'var(--saas-text-muted)'}}>Updated {new Date(site.updatedAt).toLocaleDateString()}</span>
                      {(()=>{
                        try{
                          const allLeads:Array<{source:string;sourceName?:string}>=JSON.parse(localStorage.getItem('miller_leads_v1')||'[]');
                          const cnt=allLeads.filter(l=>l.source==='landing_page'&&l.sourceName?.toLowerCase()===site.businessName.toLowerCase()).length;
                          return cnt>0?<span style={{fontSize:'.68rem',color:'#10b981',fontWeight:700}}>🎯 {cnt} lead{cnt>1?'s':''}</span>:null;
                        }catch{return null;}
                      })()}
                      {site.published&&<span style={{fontSize:'.65rem',color:'#10b981',fontWeight:700}}>● Live</span>}
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>loadSite(site)} style={{flex:1,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:5,padding:'5px 10px',borderRadius:7,cursor:'pointer',background:'rgba(99,102,241,.15)',color:'#818cf8',border:'1px solid rgba(99,102,241,.2)',fontSize:'.75rem',fontWeight:700}}>
                        <Eye size={11}/> Open
                      </button>
                      <button onClick={()=>deleteSite(site.id)} style={{padding:'5px 8px',borderRadius:7,cursor:'pointer',background:'rgba(239,68,68,.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,.2)',fontSize:'.75rem'}}>
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  </div>
                ))}
                <div onClick={()=>{setForm(blankForm(hubData.biz,hubData.links));setCompetitors([]);setPlan([]);setBuiltHtml('');setActiveSiteId(null);setStage('welcome');}} style={{background:'rgba(255,255,255,.02)',border:'2px dashed rgba(255,255,255,.08)',borderRadius:12,padding:'1rem 1.2rem',display:'flex',alignItems:'center',justifyContent:'center',gap:8,cursor:'pointer',color:'var(--saas-text-muted)',fontSize:'.83rem',fontWeight:600,minHeight:110}}>
                  <Plus size={14}/> New Site
                </div>
              </div>
            )}
          </div>
        )}

        <MilaAgent stage={stage} thinking={milaThinking}/>
        <StageBar stage={stage}/>

        {/* ══ WELCOME ══ */}
        {stage==='welcome'&&(
          <div>
            {/* Social Hub status */}
            <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'1.25rem',marginBottom:'1.5rem'}}>
              <div style={{fontWeight:700,fontSize:'.88rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:8}}>
                <Link2 size={14} style={{color:'#10b981'}}/> Data Auto-Pulled from Your Hub
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'0.75rem'}}>
                {[
                  {label:'Business Name',val:hubData.biz.businessName,icon:'🏢'},
                  {label:'Email',val:hubData.biz.email,icon:'✉️'},
                  {label:'Phone',val:hubData.biz.phone,icon:'📞'},
                  {label:'Social Platforms',val:hubData.done.length?`${hubData.done.length} connected`:null,icon:'📱'},
                  {label:'Social Links',val:Object.keys(hubData.links).length?`${Object.keys(hubData.links).length} ready`:null,icon:'🔗'},
                ].map(item=>(
                  <div key={item.label} style={{display:'flex',alignItems:'center',gap:8,padding:'.6rem .85rem',borderRadius:9,background:item.val?'rgba(16,185,129,.08)':'rgba(255,255,255,.02)',border:`1px solid ${item.val?'rgba(16,185,129,.2)':'rgba(255,255,255,.05)'}`}}>
                    <span style={{fontSize:'1rem'}}>{item.icon}</span>
                    <div>
                      <div style={{fontSize:'.65rem',color:'var(--saas-text-muted)'}}>{item.label}</div>
                      <div style={{fontSize:'.78rem',fontWeight:700,color:item.val?'#4ade80':'var(--saas-text-muted)'}}>{item.val||'Not set yet'}</div>
                    </div>
                    {item.val?<Check size={11} style={{color:'#10b981',marginLeft:'auto'}}/>:<AlertCircle size={11} style={{color:'rgba(255,255,255,.2)',marginLeft:'auto'}}/>}
                  </div>
                ))}
              </div>
              {hubData.done.length===0&&(
                <div style={{marginTop:'0.85rem',padding:'.65rem .9rem',background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.15)',borderRadius:8,fontSize:'.75rem',color:'#fbbf24',display:'flex',gap:7,alignItems:'center'}}>
                  <AlertCircle size={12}/> Tip: Complete your Social Media Hub first to auto-fill social links into your landing page.
                </div>
              )}
            </div>

            {/* What Miller AI will build */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'1rem',marginBottom:'1.75rem'}}>
              {[
                {emoji:'📋',title:'Gather Business Info',sub:'4-step form · auto-filled from hub'},
                {emoji:'🔍',title:'Competitor Analysis',sub:'Up to 10 competitors · AI analysis'},
                {emoji:'🗺️',title:'Flat Plan First',sub:'Review sections before we build'},
                {emoji:'🌐',title:'Full Landing Page',sub:'HTML · download or save here'},
              ].map(c=>(
                <div key={c.title} style={{background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.15)',borderRadius:12,padding:'1.1rem 1.2rem'}}>
                  <div style={{fontSize:'1.5rem',marginBottom:6}}>{c.emoji}</div>
                  <div style={{fontWeight:700,fontSize:'.88rem',marginBottom:3}}>{c.title}</div>
                  <div style={{fontSize:'.72rem',color:'var(--saas-text-muted)'}}>{c.sub}</div>
                </div>
              ))}
            </div>

            <button onClick={()=>setStage('gather')} style={{display:'inline-flex',alignItems:'center',gap:8,padding:'14px 32px',borderRadius:50,cursor:'pointer',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',fontSize:'1rem',fontWeight:800,boxShadow:'0 0 30px rgba(99,102,241,.4)'}}>
              <Sparkles size={16}/> Start Building with Miller AI →
            </button>
          </div>
        )}

        {/* ══ GATHER ══ */}
        {stage==='gather'&&(
          <div>
            {/* Step tabs */}
            <div style={{display:'flex',gap:6,marginBottom:'1.5rem'}}>
              {[{i:0,label:'Identity',emoji:'🏢'},{i:1,label:'Offer',emoji:'🎯'},{i:2,label:'Brand',emoji:'🎨'},{i:3,label:'Goals & Contact',emoji:'📞'}].map(({i,label,emoji})=>(
                <button key={i} onClick={()=>setGatherStep(i as GatherStep)} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 16px',borderRadius:50,cursor:'pointer',fontWeight:700,fontSize:'.78rem',border:'1px solid',borderColor:gatherStep===i?'#6366f1':'rgba(255,255,255,.08)',background:gatherStep===i?'rgba(99,102,241,.18)':'transparent',color:gatherStep===i?'#818cf8':'var(--saas-text-muted)'}}>
                  {i<gatherStep&&<Check size={11} style={{color:'#10b981'}}/>}{emoji} {label}
                </button>
              ))}
            </div>

            <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'1.5rem',marginBottom:'1.25rem'}}>

              {/* Step 0 — Identity */}
              {gatherStep===0&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                  <Field label="Business Name *">
                    <input style={inputStyle} value={form.businessName} onChange={e=>patchForm({businessName:e.target.value})} placeholder="e.g. Bright Spark Electrics"/>
                  </Field>
                  <Field label="Industry / Niche">
                    <input style={inputStyle} value={form.industry} onChange={e=>patchForm({industry:e.target.value})} placeholder="e.g. Electrical Services, Fashion, Cafe"/>
                  </Field>
                  <Field label="Business Type">
                    <select style={selectStyle} value={form.bizType} onChange={e=>patchForm({bizType:e.target.value as BizType})}>
                      <option value="service">Service Business</option>
                      <option value="ecommerce">E-Commerce / Shop</option>
                      <option value="platform">Online Platform</option>
                      <option value="restaurant">Restaurant / Food</option>
                      <option value="clinic">Clinic / Health</option>
                      <option value="agency">Agency / Creative</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  <Field label="Years in Business">
                    <input style={inputStyle} value={form.yearsInBusiness} onChange={e=>patchForm({yearsInBusiness:e.target.value})} placeholder="e.g. 5"/>
                  </Field>
                  <div style={{gridColumn:'1/-1'}}>
                    <Field label="Tagline / Slogan" tip="Short punchy phrase shown on hero — e.g. 'Expert Electrics, Fast & Reliable'">
                      <input style={inputStyle} value={form.tagline} onChange={e=>patchForm({tagline:e.target.value})} placeholder="Your best tagline here..."/>
                    </Field>
                  </div>
                  <div style={{gridColumn:'1/-1'}}>
                    <Field label="USP — Unique Selling Point" tip="1 sentence: what makes you different from competitors?">
                      <input style={inputStyle} value={form.usp} onChange={e=>patchForm({usp:e.target.value})} placeholder="e.g. Same-day service, free call-out, 10-year guarantee..."/>
                    </Field>
                  </div>
                </div>
              )}

              {/* Step 1 — Offer */}
              {gatherStep===1&&(
                <div>
                  <Field label="Target Customer — Who do you serve?">
                    <input style={inputStyle} value={form.targetCustomer} onChange={e=>patchForm({targetCustomer:e.target.value})} placeholder="e.g. Small business owners in London, young professionals, families..."/>
                  </Field>
                  <Field label="Services / Products (up to 8 — one per line)">
                    {form.services.map((sv,i)=>(
                      <input key={i} style={{...inputStyle,marginBottom:6}} value={sv} onChange={e=>{const n=[...form.services];n[i]=e.target.value;patchForm({services:n});}} placeholder={`Service ${i+1}...`}/>
                    ))}
                    {form.services.length<8&&<button onClick={()=>patchForm({services:[...form.services,'']})} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,cursor:'pointer',background:'rgba(255,255,255,.05)',color:'var(--saas-text-muted)',border:'1px solid rgba(255,255,255,.08)',fontSize:'.78rem',marginTop:4}}><Plus size={11}/> Add service</button>}
                  </Field>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                    <Field label="Pricing Model">
                      <select style={selectStyle} value={form.pricingModel} onChange={e=>patchForm({pricingModel:e.target.value})}>
                        <option value="quote-based">Quote-Based (free quotes)</option>
                        <option value="subscription">Subscription / Monthly</option>
                        <option value="one-time">One-Time Payment</option>
                        <option value="mixed">Mixed / Varies</option>
                      </select>
                    </Field>
                    <Field label="Service Area / Location">
                      <input style={inputStyle} value={form.location} onChange={e=>patchForm({location:e.target.value})} placeholder="e.g. London, Birmingham, UK-wide, Online"/>
                    </Field>
                  </div>
                </div>
              )}

              {/* Step 2 — Brand */}
              {gatherStep===2&&(
                <div>
                  <Field label="Logo URL (leave blank if no logo yet)" tip="Paste a direct image URL — or upload after build">
                    <input style={inputStyle} value={form.logoUrl} onChange={e=>patchForm({logoUrl:e.target.value})} placeholder="https://..."/>
                  </Field>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem'}}>
                    <Field label="Primary Color">
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <input type="color" value={form.colorPrimary} onChange={e=>patchForm({colorPrimary:e.target.value})} style={{width:42,height:38,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',background:'none',padding:2}}/>
                        <input style={{...inputStyle,flex:1}} value={form.colorPrimary} onChange={e=>patchForm({colorPrimary:e.target.value})}/>
                      </div>
                    </Field>
                    <Field label="Secondary Color">
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <input type="color" value={form.colorSecondary} onChange={e=>patchForm({colorSecondary:e.target.value})} style={{width:42,height:38,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',background:'none',padding:2}}/>
                        <input style={{...inputStyle,flex:1}} value={form.colorSecondary} onChange={e=>patchForm({colorSecondary:e.target.value})}/>
                      </div>
                    </Field>
                    <Field label="Accent Color">
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <input type="color" value={form.colorAccent} onChange={e=>patchForm({colorAccent:e.target.value})} style={{width:42,height:38,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',background:'none',padding:2}}/>
                        <input style={{...inputStyle,flex:1}} value={form.colorAccent} onChange={e=>patchForm({colorAccent:e.target.value})}/>
                      </div>
                    </Field>
                  </div>
                  <div style={{display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap'}}>
                    {['#6366f1','#8b5cf6','#10b981','#ef4444','#f59e0b','#06b6d4','#ec4899','#1d4ed8','#0f172a'].map(c=>(
                      <button key={c} onClick={()=>patchForm({colorPrimary:c})} style={{width:34,height:34,borderRadius:8,cursor:'pointer',background:c,border:form.colorPrimary===c?'3px solid #fff':'2px solid transparent'}}/>
                    ))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                    <Field label="Tone of Voice">
                      <select style={selectStyle} value={form.tone} onChange={e=>patchForm({tone:e.target.value as ToneType})}>
                        <option value="professional">Professional & Authoritative</option>
                        <option value="friendly">Friendly & Approachable</option>
                        <option value="bold">Bold & Energetic</option>
                        <option value="luxury">Luxury & Premium</option>
                        <option value="playful">Playful & Fun</option>
                      </select>
                    </Field>
                    <Field label="Font Style">
                      <select style={selectStyle} value={form.fontStyle} onChange={e=>patchForm({fontStyle:e.target.value as FontType})}>
                        <option value="modern">Modern Sans-Serif</option>
                        <option value="classic">Classic Serif</option>
                        <option value="minimal">Clean Minimal</option>
                        <option value="bold_font">Bold Impact</option>
                      </select>
                    </Field>
                  </div>
                </div>
              )}

              {/* Step 3 — Goals + Contact */}
              {gatherStep===3&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                  <Field label="Main CTA Goal">
                    <select style={selectStyle} value={form.ctaGoal} onChange={e=>patchForm({ctaGoal:e.target.value as CTAGoal})}>
                      <option value="quote">Get a Free Quote</option>
                      <option value="book">Book an Appointment</option>
                      <option value="buy">Buy Now / Shop</option>
                      <option value="signup">Sign Up / Register</option>
                      <option value="call">Call Us Now</option>
                    </select>
                  </Field>
                  <Field label="CTA Button Text" tip="What text goes on the main button?">
                    <input style={inputStyle} value={form.ctaText} onChange={e=>patchForm({ctaText:e.target.value})} placeholder="e.g. Get a Free Quote"/>
                  </Field>
                  <Field label="Phone">
                    <input style={inputStyle} value={form.phone} onChange={e=>patchForm({phone:e.target.value})} placeholder="+44 7700..."/>
                  </Field>
                  <Field label="Email">
                    <input style={inputStyle} value={form.email} onChange={e=>patchForm({email:e.target.value})} placeholder="hello@yourbusiness.com"/>
                  </Field>
                  <div style={{gridColumn:'1/-1'}}>
                    <Field label="Business Address">
                      <input style={inputStyle} value={form.address} onChange={e=>patchForm({address:e.target.value})} placeholder="123 High Street, London, UK"/>
                    </Field>
                  </div>
                  <div style={{gridColumn:'1/-1'}}>
                    <div style={{fontWeight:700,fontSize:'.8rem',marginBottom:'0.75rem',display:'flex',alignItems:'center',gap:7}}>
                      <Link2 size={13} style={{color:'#10b981'}}/> Social Media Links
                      {Object.keys(form.socialLinks).length>0&&<span style={{fontSize:'.68rem',color:'#4ade80',background:'rgba(16,185,129,.12)',border:'1px solid rgba(16,185,129,.2)',borderRadius:8,padding:'1px 7px'}}>{Object.keys(form.socialLinks).length} auto-linked from Social Hub</span>}
                    </div>
                    {['instagram','facebook','twitter','tiktok','youtube','linkedin'].map(pl=>(
                      <div key={pl} style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                        <span style={{fontSize:'1rem',width:24,textAlign:'center'}}>{'📸👥🐦🎵▶️💼'.split('').filter((_,i)=>i%2===0)[['instagram','facebook','twitter','tiktok','youtube','linkedin'].indexOf(pl)]||'🔗'}</span>
                        <span style={{fontSize:'.75rem',width:80,color:'var(--saas-text-muted)',textTransform:'capitalize'}}>{pl}</span>
                        <input style={{...inputStyle,flex:1}} value={form.socialLinks[pl]||''} onChange={e=>patchForm({socialLinks:{...form.socialLinks,[pl]:e.target.value}})} placeholder={`https://${pl}.com/yourpage`}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Nav buttons */}
            <div style={{display:'flex',gap:10,justifyContent:'space-between'}}>
              <button onClick={()=>gatherStep>0?setGatherStep((gatherStep-1) as GatherStep):setStage('welcome')} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:50,cursor:'pointer',background:'rgba(255,255,255,.05)',color:'var(--saas-text-muted)',border:'1px solid rgba(255,255,255,.08)',fontWeight:700,fontSize:'.85rem'}}>
                <ChevronLeft size={14}/> {gatherStep===0?'Back':'Previous'}
              </button>
              <button onClick={()=>gatherStep<3?setGatherStep((gatherStep+1) as GatherStep):setStage('competitor')} disabled={gatherStep===0&&!form.businessName.trim()} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 24px',borderRadius:50,cursor:'pointer',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',fontWeight:800,fontSize:'.88rem',opacity:gatherStep===0&&!form.businessName.trim()?.5:1}}>
                {gatherStep<3?'Next Step':'Continue to Competitors'} <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}

        {/* ══ COMPETITOR ══ */}
        {stage==='competitor'&&(
          <div>
            {/* Add competitor */}
            <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'1.25rem',marginBottom:'1.25rem'}}>
              <div style={{fontWeight:700,fontSize:'.88rem',marginBottom:'1rem'}}>Add Competitors (up to 10)</div>
              <div style={{display:'flex',gap:8}}>
                <input style={{...inputStyle,flex:1}} value={newCompName} onChange={e=>setNewCompName(e.target.value)} placeholder="Competitor name" onKeyDown={e=>e.key==='Enter'&&addCompetitor()}/>
                <input style={{...inputStyle,flex:2}} value={newCompUrl} onChange={e=>setNewCompUrl(e.target.value)} placeholder="https://theirwebsite.com" onKeyDown={e=>e.key==='Enter'&&addCompetitor()}/>
                <button onClick={addCompetitor} disabled={!newCompName.trim()||competitors.length>=10} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'9px 18px',borderRadius:8,cursor:'pointer',background:'rgba(99,102,241,.18)',color:'#818cf8',border:'1px solid rgba(99,102,241,.25)',fontWeight:700,fontSize:'.82rem',flexShrink:0,opacity:(!newCompName.trim()||competitors.length>=10)?.5:1}}>
                  <Plus size={13}/> Add
                </button>
              </div>
            </div>

            {/* Competitor list */}
            {competitors.length===0&&(
              <div style={{textAlign:'center',padding:'2rem',color:'var(--saas-text-muted)',fontSize:'.82rem',background:'rgba(255,255,255,.02)',border:'1px dashed rgba(255,255,255,.07)',borderRadius:12,marginBottom:'1.25rem'}}>
                No competitors added yet. Add at least 1 — or skip to go straight to planning.
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:'0.85rem',marginBottom:'1.25rem'}}>
              {competitors.map(comp=>(
                <div key={comp.id} style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)',borderRadius:12,padding:'1rem 1.2rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:comp.analysis?'0.85rem':0}}>
                    <Globe size={14} style={{color:'#6366f1',flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:'.88rem'}}>{comp.name}</div>
                      {comp.url&&<div style={{fontSize:'.72rem',color:'var(--saas-text-muted)'}}>{comp.url}</div>}
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      {comp.status==='idle'&&<button onClick={()=>analyzeCompetitor(comp.id)} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:7,cursor:'pointer',background:'rgba(99,102,241,.15)',color:'#818cf8',border:'1px solid rgba(99,102,241,.2)',fontSize:'.75rem',fontWeight:700}}><Search size={11}/> Analyze</button>}
                      {comp.status==='analyzing'&&<span style={{fontSize:'.75rem',color:'#6366f1',display:'flex',alignItems:'center',gap:5}}><RefreshCw size={11}/> Analyzing...</span>}
                      {comp.status==='done'&&<span style={{fontSize:'.72rem',fontWeight:700,color:'#4ade80',background:'rgba(16,185,129,.12)',border:'1px solid rgba(16,185,129,.2)',borderRadius:8,padding:'2px 8px'}}>✓ Done</span>}
                      <button onClick={()=>setCompetitors(prev=>prev.filter(c=>c.id!==comp.id))} style={{padding:'5px 7px',borderRadius:7,cursor:'pointer',background:'rgba(239,68,68,.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,.2)'}}>
                        <X size={11}/>
                      </button>
                    </div>
                  </div>
                  {comp.analysis&&(
                    <div style={{marginTop:'0.75rem'}}>
                      {/* Row 1: meta */}
                      <div style={{display:'flex',gap:12,marginBottom:'0.75rem',flexWrap:'wrap'}}>
                        <span style={{fontSize:'.72rem',background:'rgba(99,102,241,.12)',border:'1px solid rgba(99,102,241,.2)',borderRadius:7,padding:'2px 8px',color:'#818cf8'}}>🎨 Color tone: {comp.analysis.colorTone}</span>
                        <span style={{fontSize:'.72rem',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:7,padding:'2px 8px',color:'var(--saas-text-muted)'}}>📄 Sections: {comp.analysis.keySections.join(' → ')}</span>
                        <span style={{fontSize:'.72rem',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',borderRadius:7,padding:'2px 8px',color:'var(--saas-text-muted)'}}>CTA: "{comp.analysis.cta}"</span>
                      </div>
                      {/* Row 2: strengths + gaps */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'0.65rem'}}>
                        <div>
                          <div style={{fontSize:'.68rem',fontWeight:700,color:'var(--saas-text-muted)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.06em'}}>💪 Strengths</div>
                          {comp.analysis.strengths.map((s,i)=><div key={i} style={{fontSize:'.76rem',color:'#4ade80',display:'flex',gap:5,marginBottom:3}}><span style={{opacity:.5}}>•</span>{s}</div>)}
                        </div>
                        <div>
                          <div style={{fontSize:'.68rem',fontWeight:700,color:'var(--saas-text-muted)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.06em'}}>⚠️ Their Gaps</div>
                          {comp.analysis.gaps.map((g,i)=><div key={i} style={{fontSize:'.76rem',color:'#f59e0b',display:'flex',gap:5,marginBottom:3}}><span style={{opacity:.5}}>•</span>{g}</div>)}
                        </div>
                      </div>
                      {/* Opportunity */}
                      <div style={{background:'rgba(16,185,129,.07)',border:'1px solid rgba(16,185,129,.18)',borderRadius:8,padding:'.55rem .85rem',fontSize:'.76rem',color:'#4ade80'}}>
                        🎯 <strong>Your opportunity:</strong> {comp.analysis.opportunity}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {competitors.length>0&&competitors.some(c=>c.status==='idle')&&(
              <button onClick={()=>competitors.filter(c=>c.status==='idle').forEach(c=>analyzeCompetitor(c.id))} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'8px 18px',borderRadius:50,cursor:'pointer',background:'rgba(99,102,241,.15)',color:'#818cf8',border:'1px solid rgba(99,102,241,.2)',fontWeight:700,fontSize:'.82rem',marginBottom:'1rem'}}>
                <Search size={12}/> Analyze All
              </button>
            )}

            <div style={{display:'flex',gap:10,justifyContent:'space-between'}}>
              <button onClick={()=>setStage('gather')} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:50,cursor:'pointer',background:'rgba(255,255,255,.05)',color:'var(--saas-text-muted)',border:'1px solid rgba(255,255,255,.08)',fontWeight:700,fontSize:'.85rem'}}>
                <ChevronLeft size={14}/> Back
              </button>
              <button onClick={()=>setStage('logo')} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 24px',borderRadius:50,cursor:'pointer',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',fontWeight:800,fontSize:'.88rem'}}>
                Next: Logo & Brand <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}

        {/* ══ LOGO ══ */}
        {stage==='logo'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',marginBottom:'1.5rem'}}>

              {/* Logo input */}
              <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'1.25rem'}}>
                <div style={{fontWeight:700,fontSize:'.9rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:8}}>
                  <Image size={14} style={{color:'#818cf8'}}/> Logo
                </div>

                {/* Current logo preview */}
                <div style={{width:'100%',height:120,background:'rgba(99,102,241,.07)',border:'1px dashed rgba(99,102,241,.25)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'1rem',overflow:'hidden'}}>
                  {form.logoUrl
                    ? <img src={form.logoUrl} alt="logo" style={{maxHeight:100,maxWidth:'90%',objectFit:'contain'}} onError={e=>(e.currentTarget.style.display='none')}/>
                    : <div style={{textAlign:'center',color:'var(--saas-text-muted)',fontSize:'.8rem'}}>
                        <div style={{fontSize:'2rem',marginBottom:6}}>🏢</div>
                        <div style={{fontWeight:700,fontSize:'1.1rem',color:'var(--saas-text)'}}>{form.businessName||'Your Business'}</div>
                        <div style={{fontSize:'.7rem',marginTop:4}}>Text placeholder (no logo yet)</div>
                      </div>
                  }
                </div>

                {/* Options */}
                <div style={{display:'flex',flexDirection:'column',gap:'0.65rem'}}>
                  <div>
                    <label style={{fontSize:'.72rem',fontWeight:700,color:'var(--saas-text-muted)',display:'block',marginBottom:4}}>Paste Logo URL</label>
                    <div style={{display:'flex',gap:6}}>
                      <input style={{...inputStyle,flex:1}} value={form.logoUrl} onChange={e=>patchForm({logoUrl:e.target.value})} placeholder="https://yoursite.com/logo.png"/>
                      {form.logoUrl&&<button onClick={()=>patchForm({logoUrl:''})} style={{padding:'7px 10px',borderRadius:7,cursor:'pointer',background:'rgba(239,68,68,.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,.2)'}}><X size={11}/></button>}
                    </div>
                  </div>
                  <div>
                    <label style={{fontSize:'.72rem',fontWeight:700,color:'var(--saas-text-muted)',display:'block',marginBottom:4}}>Upload Logo File</label>
                    <label style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,cursor:'pointer',background:'rgba(99,102,241,.12)',color:'#818cf8',border:'1px solid rgba(99,102,241,.2)',fontSize:'.78rem',fontWeight:700}}>
                      <FileText size={12}/> Choose File
                      <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{
                        const file=e.target.files?.[0]; if(!file) return;
                        const reader=new FileReader();
                        reader.onload=ev=>{ if(ev.target?.result) patchForm({logoUrl:ev.target.result as string}); };
                        reader.readAsDataURL(file);
                      }}/>
                    </label>
                    <span style={{fontSize:'.7rem',color:'var(--saas-text-muted)',marginLeft:8}}>PNG, JPG, SVG</span>
                  </div>
                  <button onClick={()=>patchForm({logoUrl:''})} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,cursor:'pointer',background:'rgba(255,255,255,.04)',color:'var(--saas-text-muted)',border:'1px solid rgba(255,255,255,.07)',fontSize:'.78rem',fontWeight:600}}>
                    🔤 Use text placeholder (business name)
                  </button>
                </div>
              </div>

              {/* Color palette */}
              <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'1.25rem'}}>
                <div style={{fontWeight:700,fontSize:'.9rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:8}}>
                  <Palette size={14} style={{color:'#10b981'}}/> Brand Color Palette
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'0.85rem',marginBottom:'1rem'}}>
                  {([['Primary','colorPrimary'],['Secondary','colorSecondary'],['Accent','colorAccent']] as [string,keyof BizForm][]).map(([label,key])=>(
                    <div key={key} style={{display:'flex',alignItems:'center',gap:10}}>
                      <input type="color" value={form[key] as string} onChange={e=>patchForm({[key]:e.target.value} as Partial<BizForm>)} style={{width:38,height:36,borderRadius:8,border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',background:'none',padding:2,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'.72rem',color:'var(--saas-text-muted)',marginBottom:2}}>{label}</div>
                        <input style={{...inputStyle,padding:'5px 8px',fontSize:'.78rem'}} value={form[key] as string} onChange={e=>patchForm({[key]:e.target.value} as Partial<BizForm>)}/>
                      </div>
                      <div style={{width:36,height:36,borderRadius:8,background:form[key] as string,border:'1px solid rgba(255,255,255,.1)',flexShrink:0}}/>
                    </div>
                  ))}
                </div>
                {/* Quick palette presets */}
                <div style={{fontSize:'.72rem',color:'var(--saas-text-muted)',marginBottom:6,fontWeight:700}}>Quick Palettes</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[
                    {name:'Indigo',p:'#6366f1',s:'#8b5cf6',a:'#10b981'},
                    {name:'Emerald',p:'#10b981',s:'#059669',a:'#6366f1'},
                    {name:'Rose',p:'#f43f5e',s:'#e11d48',a:'#f59e0b'},
                    {name:'Amber',p:'#f59e0b',s:'#d97706',a:'#10b981'},
                    {name:'Sky',p:'#0ea5e9',s:'#0284c7',a:'#8b5cf6'},
                    {name:'Dark Pro',p:'#334155',s:'#1e293b',a:'#38bdf8'},
                  ].map(pal=>(
                    <button key={pal.name} onClick={()=>patchForm({colorPrimary:pal.p,colorSecondary:pal.s,colorAccent:pal.a})} style={{display:'flex',gap:5,alignItems:'center',padding:'5px 10px',borderRadius:8,cursor:'pointer',background:'rgba(255,255,255,.04)',border:`1px solid ${(form.colorPrimary===pal.p)?'rgba(255,255,255,.2)':'rgba(255,255,255,.07)'}`,fontSize:'.72rem',color:'var(--saas-text-muted)'}}>
                      {[pal.p,pal.s,pal.a].map(c=><span key={c} style={{width:10,height:10,borderRadius:2,background:c,display:'inline-block'}}/>)}
                      {pal.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Font pairing preview */}
            <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'1.25rem',marginBottom:'1.25rem'}}>
              <div style={{fontWeight:700,fontSize:'.9rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:8}}>
                <FileText size={14} style={{color:'#f59e0b'}}/> Font Style
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.75rem'}}>
                {([
                  {key:'modern',    label:'Modern Sans',  preview:'Clean & Contemporary', font:"'Inter','Segoe UI',sans-serif"},
                  {key:'classic',   label:'Classic Serif', preview:'Elegant & Trustworthy', font:"Georgia,serif"},
                  {key:'minimal',   label:'Minimal',      preview:'Simple & Focused',  font:"'Helvetica Neue',sans-serif"},
                  {key:'bold_font', label:'Bold Impact',  preview:'Strong & Confident', font:"Impact,sans-serif"},
                ] as {key:FontType;label:string;preview:string;font:string}[]).map(f=>(
                  <button key={f.key} onClick={()=>patchForm({fontStyle:f.key})} style={{padding:'1rem',borderRadius:10,cursor:'pointer',textAlign:'left',background:form.fontStyle===f.key?'rgba(99,102,241,.12)':'rgba(255,255,255,.03)',border:`1px solid ${form.fontStyle===f.key?'rgba(99,102,241,.35)':'rgba(255,255,255,.07)'}`,transition:'all .15s'}}>
                    <div style={{fontFamily:f.font,fontSize:'1.1rem',fontWeight:700,marginBottom:4,color:form.fontStyle===f.key?'#818cf8':'var(--saas-text)'}}>{f.label}</div>
                    <div style={{fontFamily:f.font,fontSize:'.72rem',color:'var(--saas-text-muted)',lineHeight:1.4}}>{f.preview}</div>
                    {form.fontStyle===f.key&&<div style={{marginTop:6,fontSize:'.65rem',color:'#818cf8',fontWeight:700}}>✓ Selected</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Existing website */}
            <div style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'1.25rem',marginBottom:'1.25rem'}}>
              <Field label="Existing Website URL (optional — for reference only)" tip="Miller AI uses this to understand your current style and avoid duplicating it">
                <input style={inputStyle} value={form.existingWebUrl} onChange={e=>patchForm({existingWebUrl:e.target.value})} placeholder="https://yourexistingsite.com"/>
              </Field>
            </div>

            <div style={{display:'flex',gap:10,justifyContent:'space-between'}}>
              <button onClick={()=>setStage('competitor')} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:50,cursor:'pointer',background:'rgba(255,255,255,.05)',color:'var(--saas-text-muted)',border:'1px solid rgba(255,255,255,.08)',fontWeight:700,fontSize:'.85rem'}}>
                <ChevronLeft size={14}/> Back
              </button>
              <button onClick={()=>{ setPlan(generatePlan(form,competitors)); setStage('plan'); }} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 24px',borderRadius:50,cursor:'pointer',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',fontWeight:800,fontSize:'.88rem'}}>
                Generate Flat Plan <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}

        {/* ══ PLAN ══ */}
        {stage==='plan'&&(
          <div>
            {/* Page type recommendation */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.75rem',marginBottom:'1.25rem'}}>
              {[
                {key:'1-page',    emoji:'📄', label:'Single Page',      sub:'All sections scroll on one page — best for service businesses'},
                {key:'multi-section',emoji:'🗂️',label:'Multi-Section',  sub:'Long scrolling page with anchor nav — best for agencies + platforms'},
                {key:'multi-page', emoji:'📑', label:'Multi-Page',      sub:'Separate pages per section — best for e-commerce + clinics'},
              ].map(pt=>{
                const recommended = pt.key===(form.services.filter(Boolean).length>5?'multi-section':'1-page');
                return (
                  <div key={pt.key} style={{background:recommended?'rgba(99,102,241,.09)':'rgba(255,255,255,.02)',border:`1px solid ${recommended?'rgba(99,102,241,.3)':'rgba(255,255,255,.07)'}`,borderRadius:10,padding:'.85rem 1rem',position:'relative'}}>
                    {recommended&&<div style={{position:'absolute',top:-10,right:12,background:'#6366f1',color:'#fff',fontSize:'.6rem',fontWeight:800,padding:'2px 10px',borderRadius:50,textTransform:'uppercase'}}>Miller AI Recommends</div>}
                    <div style={{fontSize:'1.2rem',marginBottom:4}}>{pt.emoji}</div>
                    <div style={{fontWeight:700,fontSize:'.82rem',marginBottom:3}}>{pt.label}</div>
                    <div style={{fontSize:'.7rem',color:'var(--saas-text-muted)',lineHeight:1.5}}>{pt.sub}</div>
                  </div>
                );
              })}
            </div>

            {/* Font + palette preview bar */}
            <div style={{marginBottom:'1rem',padding:'.8rem 1rem',background:'rgba(99,102,241,.06)',border:'1px solid rgba(99,102,241,.14)',borderRadius:10,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <Palette size={13} style={{color:'#818cf8',flexShrink:0}}/>
              <div style={{display:'flex',gap:5,alignItems:'center'}}>
                {[form.colorPrimary,form.colorSecondary,form.colorAccent].map((c,i)=>(
                  <span key={i} style={{display:'inline-block',width:20,height:20,background:c,borderRadius:5,border:'1px solid rgba(255,255,255,.15)'}}/>
                ))}
              </div>
              <span style={{fontSize:'.75rem',color:'var(--saas-text-muted)'}}>·</span>
              <span style={{fontSize:'.78rem',fontWeight:700,fontFamily:form.fontStyle==='classic'?'Georgia,serif':form.fontStyle==='bold_font'?'Impact,sans-serif':'Inter,sans-serif',color:'var(--saas-text)'}}>
                Aa — {form.fontStyle==='modern'?'Modern Sans':form.fontStyle==='classic'?'Classic Serif':form.fontStyle==='minimal'?'Minimal':'Bold Impact'}
              </span>
              <span style={{fontSize:'.75rem',color:'var(--saas-text-muted)'}}>·</span>
              <span style={{fontSize:'.75rem',color:'var(--saas-text-muted)'}}>Tone: {form.tone}</span>
              {form.logoUrl&&<span style={{fontSize:'.75rem',color:'#4ade80',display:'flex',alignItems:'center',gap:4}}><Check size={10}/> Logo set</span>}
              <button onClick={()=>setStage('logo')} style={{marginLeft:'auto',padding:'3px 10px',borderRadius:7,cursor:'pointer',background:'rgba(255,255,255,.05)',color:'var(--saas-text-muted)',border:'1px solid rgba(255,255,255,.08)',fontSize:'.7rem'}}>Edit brand</button>
            </div>

            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:'1.25rem'}}>
              <Layout size={15} style={{color:'#6366f1'}}/>
              <span style={{fontWeight:700,fontSize:'.95rem'}}>Section Blueprint</span>
              <span style={{fontSize:'.72rem',color:'var(--saas-text-muted)',marginLeft:'auto'}}>{plan.filter(p=>p.approved).length}/{plan.length} approved</span>
              <button onClick={()=>setPlan(prev=>prev.map(s=>({...s,approved:true})))} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:8,cursor:'pointer',background:'rgba(16,185,129,.12)',color:'#4ade80',border:'1px solid rgba(16,185,129,.2)',fontSize:'.75rem',fontWeight:700}}>
                <Check size={11}/> Approve All
              </button>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'0.75rem',marginBottom:'1.25rem'}}>
              {plan.map((section,idx)=>(
                <div key={section.id} style={{background:section.approved?'rgba(16,185,129,.06)':'rgba(255,255,255,.02)',border:`1px solid ${section.approved?'rgba(16,185,129,.25)':'rgba(255,255,255,.07)'}`,borderLeft:`3px solid ${section.approved?'#10b981':'#6366f1'}`,borderRadius:12,padding:'1rem 1.2rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:'1.2rem'}}>{section.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:'.88rem'}}>{section.name}</div>
                      <div style={{fontSize:'.72rem',color:'var(--saas-text-muted)'}}>{section.description}</div>
                    </div>
                    <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
                      <button onClick={()=>setPlan(prev=>prev.map(s=>s.id===section.id?{...s,editing:!s.editing}:s))} style={{padding:'4px 8px',borderRadius:7,cursor:'pointer',background:'rgba(255,255,255,.05)',color:'var(--saas-text-muted)',border:'1px solid rgba(255,255,255,.08)'}}><Edit2 size={11}/></button>
                      <button onClick={()=>setPlan(prev=>prev.map(s=>s.id===section.id?{...s,approved:!s.approved}:s))} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:7,cursor:'pointer',background:section.approved?'rgba(16,185,129,.15)':'rgba(255,255,255,.05)',color:section.approved?'#4ade80':'var(--saas-text-muted)',border:`1px solid ${section.approved?'rgba(16,185,129,.25)':'rgba(255,255,255,.08)'}`,fontSize:'.72rem',fontWeight:700}}>
                        {section.approved?<><Check size={10}/> Approved</>:<><Plus size={10}/> Approve</>}
                      </button>
                      <button onClick={()=>setPlan(prev=>prev.filter(s=>s.id!==section.id))} style={{padding:'4px 7px',borderRadius:7,cursor:'pointer',background:'rgba(239,68,68,.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,.2)'}}><X size={11}/></button>
                    </div>
                  </div>
                  {section.editing&&(
                    <div style={{marginTop:'0.75rem'}}>
                      <textarea value={section.content} onChange={e=>setPlan(prev=>prev.map(s=>s.id===section.id?{...s,content:e.target.value}:s))} style={{...inputStyle,height:72,resize:'vertical',fontFamily:'monospace',fontSize:'.78rem'}}/>
                    </div>
                  )}
                  {!section.editing&&(
                    <div style={{marginTop:'0.6rem',fontSize:'.77rem',color:'var(--saas-text-secondary)',lineHeight:1.6,paddingLeft:'2rem'}}>{section.content}</div>
                  )}
                </div>
              ))}
            </div>

            <div style={{marginBottom:'1.25rem',padding:'.85rem 1rem',background:'rgba(99,102,241,.07)',border:'1px solid rgba(99,102,241,.15)',borderRadius:10,display:'flex',alignItems:'center',gap:10}}>
              <Palette size={13} style={{color:'#818cf8',flexShrink:0}}/>
              <div style={{fontSize:'.78rem',flex:1}}>
                <span style={{fontWeight:700}}>Brand Preview: </span>
                {[form.colorPrimary,form.colorSecondary,form.colorAccent].map((c,i)=>(
                  <span key={i} style={{display:'inline-block',width:18,height:18,background:c,borderRadius:4,marginRight:5,verticalAlign:'middle',border:'1px solid rgba(255,255,255,.1)'}}/>
                ))}
                <span style={{color:'var(--saas-text-muted)'}}> · Font: {form.fontStyle} · Tone: {form.tone}</span>
              </div>
            </div>

            <div style={{display:'flex',gap:10,justifyContent:'space-between'}}>
              <button onClick={()=>setStage('logo')} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:50,cursor:'pointer',background:'rgba(255,255,255,.05)',color:'var(--saas-text-muted)',border:'1px solid rgba(255,255,255,.08)',fontWeight:700,fontSize:'.85rem'}}>
                <ChevronLeft size={14}/> Back to Logo
              </button>
              <button onClick={startBuild} disabled={plan.filter(p=>p.approved).length===0} style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 28px',borderRadius:50,cursor:'pointer',background:'linear-gradient(135deg,#6366f1,#10b981)',color:'#fff',border:'none',fontWeight:800,fontSize:'.92rem',boxShadow:'0 0 30px rgba(99,102,241,.35)',opacity:plan.filter(p=>p.approved).length===0?.5:1}}>
                <Rocket size={15}/> Approve All & Build
              </button>
            </div>
          </div>
        )}

        {/* ══ BUILD ══ */}
        {stage==='build'&&(
          <div style={{textAlign:'center',padding:'3rem 2rem'}}>
            <div style={{fontSize:'3rem',marginBottom:'1.5rem'}}>🏗️</div>
            <h2 style={{fontSize:'1.5rem',fontWeight:800,marginBottom:'0.75rem'}}>Miller AI is building your landing page...</h2>
            <p style={{color:'var(--saas-text-muted)',marginBottom:'2rem',fontSize:'.9rem'}}>
              {buildPct<30?'Applying brand colors and typography...':buildPct<60?'Generating sections from your plan...':buildPct<90?'Integrating social media links...':'Finalizing your page...'}
            </p>
            <div style={{maxWidth:480,margin:'0 auto',background:'rgba(255,255,255,.04)',borderRadius:12,height:12,overflow:'hidden',marginBottom:'1rem'}}>
              <div style={{height:'100%',background:'linear-gradient(90deg,#6366f1,#10b981)',borderRadius:12,transition:'width .4s ease',width:`${buildPct}%`}}/>
            </div>
            <div style={{fontSize:'.82rem',color:'#818cf8',fontWeight:700}}>{buildPct}% complete</div>
          </div>
        )}

        {/* ══ VIEW ══ */}
        {stage==='view'&&builtHtml&&(
          <div>
            {/* Action bar */}
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'1.25rem',flexWrap:'wrap'}}>
              <span style={{fontWeight:700,fontSize:'.88rem',flex:1}}>🌐 {form.businessName} — Landing Page</span>
              <button onClick={()=>setPreviewFull(v=>!v)} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:8,cursor:'pointer',background:'rgba(255,255,255,.06)',color:'var(--saas-text)',border:'1px solid rgba(255,255,255,.1)',fontSize:'.78rem',fontWeight:700}}>
                <Eye size={12}/> {previewFull?'Normal View':'Full Preview'}
              </button>
              <button onClick={copyCode} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:8,cursor:'pointer',background:'rgba(99,102,241,.15)',color:'#818cf8',border:'1px solid rgba(99,102,241,.2)',fontSize:'.78rem',fontWeight:700}}>
                <Copy size={12}/> {copied?'Copied!':'Copy HTML'}
              </button>
              <button onClick={downloadHtml} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 16px',borderRadius:8,cursor:'pointer',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',fontSize:'.78rem',fontWeight:800}}>
                <Download size={12}/> Download HTML
              </button>
              <button onClick={()=>{setStage('gather');setGatherStep(0);}} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:8,cursor:'pointer',background:'rgba(245,158,11,.12)',color:'#f59e0b',border:'1px solid rgba(245,158,11,.2)',fontSize:'.78rem',fontWeight:700}}>
                <Edit2 size={12}/> Edit Info & Rebuild
              </button>
              <button onClick={()=>setStage('plan')} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:8,cursor:'pointer',background:'rgba(16,185,129,.1)',color:'#4ade80',border:'1px solid rgba(16,185,129,.2)',fontSize:'.78rem',fontWeight:700}}>
                <Layout size={12}/> Edit Plan & Rebuild
              </button>
            </div>

            {/* Site stats */}
            <div style={{display:'flex',gap:'0.75rem',marginBottom:'1.25rem',flexWrap:'wrap'}}>
              {[
                {label:`${plan.length} sections`,color:'#6366f1'},
                {label:`${form.services.filter(Boolean).length} services`,color:'#8b5cf6'},
                {label:`${Object.keys(form.socialLinks).filter(k=>form.socialLinks[k]).length} social links`,color:'#10b981'},
                {label:`${competitors.filter(c=>c.status==='done').length} competitors analyzed`,color:'#f59e0b'},
              ].map(b=>(
                <span key={b.label} style={{fontSize:'.73rem',fontWeight:700,padding:'4px 12px',borderRadius:20,background:`${b.color}15`,border:`1px solid ${b.color}30`,color:b.color}}>{b.label}</span>
              ))}
            </div>

            {/* Preview iframe */}
            <div style={{borderRadius:14,overflow:'hidden',border:'1px solid rgba(255,255,255,.1)',boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}>
              <div style={{background:'rgba(255,255,255,.04)',padding:'.6rem 1rem',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid rgba(255,255,255,.07)'}}>
                <div style={{display:'flex',gap:5}}>
                  {['#ef4444','#f59e0b','#10b981'].map(c=><div key={c} style={{width:11,height:11,borderRadius:'50%',background:c}}/>)}
                </div>
                <div style={{flex:1,background:'rgba(255,255,255,.05)',borderRadius:6,padding:'3px 10px',fontSize:'.75rem',color:'var(--saas-text-muted)',fontFamily:'monospace'}}>
                  🔒 {form.businessName.toLowerCase().replace(/\s+/g,'-')}.com
                </div>
                <ExternalLink size={12} style={{color:'var(--saas-text-muted)'}}/>
              </div>
              <iframe
                srcDoc={builtHtml}
                style={{width:'100%',height:previewFull?'90vh':'580px',border:'none',display:'block'}}
                title="Landing Page Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
