"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Layers,
  ArrowLeft,
  Sliders,
  Megaphone,
  Bot,
  Share2,
  Link2,
  Users,
  Truck,
  Globe,
  Target
} from 'lucide-react';

interface SidebarProps {
  storeName?: string;
  storeLogo?: string;
}

export default function DashboardSidebar({ storeName = "Aura Artisans", storeLogo = "🏺" }: SidebarProps) {
  const pathname = usePathname();

  const links = [
    { name: 'Analytics Console', href: '/dashboard', icon: TrendingUp },
    { name: 'Product Catalog', href: '/dashboard/products', icon: Package },
    { name: 'Orders Logs', href: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Competitor Repricing', href: '/dashboard/competitor', icon: Sliders },
    { name: 'Ad Intelligence', href: '/dashboard/ads', icon: Megaphone },
    { name: 'AI Product Scraper', href: '/dashboard/scraper', icon: Bot },
    { name: 'Integrations Panel', href: '/dashboard/integrations', icon: Layers },
    { name: 'Social Media Hub', href: '/dashboard/social-setup', icon: Share2 },
    { name: 'Platform Connector', href: '/dashboard/connect', icon: Link2 },
    { name: 'Social Accounts', href: '/dashboard/social-accounts', icon: Users },
    { name: 'Purchase Hub', href: '/dashboard/purchases', icon: Truck },
    { name: 'Landing Builder', href: '/dashboard/landing-builder', icon: Globe },
    { name: 'Lead Management', href: '/dashboard/leads', icon: Target },
  ];

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-logo">
        <Layers size={22} style={{ color: 'var(--saas-primary)' }} />
        <span>Miller SaaS Hub</span>
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem', 
        padding: '0.75rem 1rem', 
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.04)'
      }}>
        <span style={{ fontSize: '1.5rem' }}>{storeLogo}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{storeName}</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--saas-text-muted)' }}>Tenant Store</span>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexGrow: 1 }}>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href}
              href={link.href} 
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--saas-border)' }}>
        <Link href="/" className="sidebar-link" style={{ color: 'var(--saas-text-muted)' }}>
          <ArrowLeft size={16} />
          <span>Exit Console</span>
        </Link>
      </div>
    </aside>
  );
}
