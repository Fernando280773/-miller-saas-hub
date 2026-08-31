import { supabase } from './supabaseClient';

export type UserRole = 'owner' | 'manager' | 'staff';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  store_id: string;
  avatar_emoji: string;
}

export const DEMO_USERS: Record<UserRole, AuthUser> = {
  owner: {
    id: 'usr-owner-01',
    email: 'alex.owner@millersaashub.io',
    name: 'Alex Vance (Store Owner)',
    role: 'owner',
    store_id: 'store-1',
    avatar_emoji: '👑'
  },
  manager: {
    id: 'usr-manager-02',
    email: 'sarah.manager@millersaashub.io',
    name: 'Sarah Connor (Store Manager)',
    role: 'manager',
    store_id: 'store-1',
    avatar_emoji: '💼'
  },
  staff: {
    id: 'usr-staff-03',
    email: 'liam.staff@millersaashub.io',
    name: 'Liam Smith (Staff Operator)',
    role: 'staff',
    store_id: 'store-1',
    avatar_emoji: '🛡️'
  }
};

const AUTH_KEY = 'miller_auth_user_v2';

export function getActiveUser(): AuthUser {
  if (typeof window === 'undefined') return DEMO_USERS.owner;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse auth user:', err);
  }
  // Default to Owner if none stored
  return DEMO_USERS.owner;
}

export function setActiveUser(user: AuthUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  // Keep active_store_id in sync
  localStorage.setItem('active_store_id', user.store_id);
}

export function logoutUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_KEY);
  try {
    supabase.auth.signOut();
  } catch (e) {
    // ignore
  }
}

export function hasPermission(role: UserRole, requiredLevel: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    owner: 3,
    manager: 2,
    staff: 1
  };
  return hierarchy[role] >= hierarchy[requiredLevel];
}
