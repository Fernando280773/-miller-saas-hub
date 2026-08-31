"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Target,
  Shield,
  LogOut,
  ChevronDown,
  CreditCard
} from 'lucide-react';
import { getActiveUser, setActiveUser, logoutUser, DEMO_USERS, AuthUser, UserRole } from '@/lib/auth';

interface SidebarProps {
  storeName?: string;
  storeLogo?: string;
}

export default function DashboardSidebar({ storeName = "Aura Artisans", storeLogo = "🏺" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser>(DEMO_USERS.owner);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    setUser(getActiveUser());
  }, []);

  const handleRoleChange = (role: UserRole) => {
    const newUser = DEMO_USERS[role];
    setActiveUser(newUser);
    setUser(newUser);
    setShowRoleMenu(false);
  };

  const handleLogout = () => {
    logoutUser();
    router.push('/login');
  };

  const links = [
    { name: 'Analytics Console', href: '/dashboard', icon: TrendingUp, minRole: 'staff' },
    { name: 'Product Catalog', href: '/dashboard/products', icon: Package, minRole: 'staff' },
    { name: 'Orders Logs', href: '/dashboard/orders', icon: ShoppingBag, minRole: 'staff' },
    { name: 'Competitor Repricing', href: '/dashboard/competitor', icon: Sliders, minRole: 'manager' },
    { name: 'Ad Intelligence', href: '/dashboard/ads', icon: Megaphone, minRole: 'manager' },
    { name: 'AI Product Scraper', href: '/dashboard/scraper', icon: Bot, minRole: 'manager' },
    { name: 'Integrations Panel', href: '/dashboard/integrations', icon: Layers, minRole: 'owner' },
    { name: 'Social Media Hub', href: '/dashboard/social-setup', icon: Share2, minRole: 'manager' },
    { name: 'Platform Connector', href: '/dashboard/connect', icon: Link2, minRole: 'owner' },
    { name: 'Social Accounts', href: '/dashboard/social-accounts', icon: Users, minRole: 'manager' },
    { name: 'Purchase Hub', href: '/dashboard/purchases', icon: Truck, minRole: 'staff' },
    { name: 'Landing Builder', href: '/dashboard/landing-builder', icon: Globe, minRole: 'manager' },
    { name: 'Lead Management', href: '/dashboard/leads', icon: Target, minRole: 'staff' },
    { name: 'Billing & Plans', href: '/dashboard/billing', icon: CreditCard, minRole: 'owner' },
  ];

  const roleColors: Record<UserRole, { label: string; color: string; border: string }> = {
    owner: { label: 'Store Owner', color: '#f472b6', border: 'rgba(239,23,142,0.4)' },
    manager: { label: 'Store Manager', color: '#c084fc', border: 'rgba(142,84,233,0.4)' },
    staff: { label: 'Staff Operator', color: '#2dd4bf', border: 'rgba(28,216,210,0.4)' }
  };

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-logo">
        <Layers size={22} style={{ color: 'var(--saas-primary)' }} />
        <span>Miller SaaS Hub</span>
      </div>

      {/* Tenant Store Info */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem', 
        padding: '0.75rem 1rem', 
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.04)'
      }}>
        <span style={{ fontSize: '1.5rem' }}>{storeLogo}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{storeName}</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--saas-text-muted)' }}>Tenant Store</span>
        </div>
      </div>

      {/* User RBAC Profile Strip */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <div 
          onClick={() => setShowRoleMenu(s => !s)}
          style={{
            padding: '0.55rem 0.85rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 10,
            border: `1px solid ${roleColors[user.role].border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>{user.avatar_emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name.split('(')[0].trim()}
            </div>
            <div style={{ fontSize: '0.68rem', color: roleColors[user.role].color, fontWeight: 600 }}>
              {roleColors[user.role].label}
            </div>
          </div>
          <ChevronDown size={12} style={{ color: 'var(--saas-text-muted)', transform: showRoleMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        {/* Role Switcher Menu */}
        {showRoleMenu && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 10,
            padding: '0.35rem',
            zIndex: 100,
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--saas-text-muted)', padding: '4px 8px', textTransform: 'uppercase' }}>
              Switch Role (RBAC)
            </div>
            {(['owner', 'manager', 'staff'] as UserRole[]).map(r => (
              <button
                key={r}
                onClick={() => handleRoleChange(r)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  background: user.role === r ? 'rgba(255,255,255,0.08)' : 'none',
                  border: 'none',
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <span>{DEMO_USERS[r].avatar_emoji}</span>
                <span style={{ color: roleColors[r].color, fontWeight: user.role === r ? 700 : 500 }}>
                  {roleColors[r].label}
                </span>
              </button>
            ))}
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 8px',
                background: 'none',
                border: 'none',
                borderRadius: 6,
                color: '#ef4444',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <LogOut size={12} />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
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

      {/* Footer Navigation */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--saas-border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Link href="/login" className="sidebar-link" style={{ color: 'var(--saas-text-muted)', fontSize: '0.8rem' }}>
          <Shield size={15} />
          <span>Auth &amp; Team Portal</span>
        </Link>
        <Link href="/" className="sidebar-link" style={{ color: 'var(--saas-text-muted)', fontSize: '0.8rem' }}>
          <ArrowLeft size={15} />
          <span>Exit Console</span>
        </Link>
      </div>
    </aside>
  );
}
