import { supabase } from './supabaseClient';

export type UserRole = 'owner' | 'manager' | 'staff';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  store_id: string;
  avatar_emoji: string;
  is_demo?: boolean;
}

export const DEMO_USERS: Record<UserRole, AuthUser> = {
  owner: {
    id: 'usr-demo-owner',
    email: 'demo.owner@millersaashub.io',
    name: 'Alex Vance (Demo Owner)',
    role: 'owner',
    store_id: 'store-1',
    avatar_emoji: '👑',
    is_demo: true
  },
  manager: {
    id: 'usr-demo-manager',
    email: 'demo.manager@millersaashub.io',
    name: 'Sarah Connor (Demo Manager)',
    role: 'manager',
    store_id: 'store-1',
    avatar_emoji: '💼',
    is_demo: true
  },
  staff: {
    id: 'usr-demo-staff',
    email: 'demo.staff@millersaashub.io',
    name: 'Liam Smith (Demo Staff)',
    role: 'staff',
    store_id: 'store-1',
    avatar_emoji: '🛡️',
    is_demo: true
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
  return DEMO_USERS.owner;
}

export function setActiveUser(user: AuthUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  localStorage.setItem('active_store_id', user.store_id);
}

export async function logoutUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_KEY);
  try {
    await supabase.auth.signOut();
  } catch {
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

/**
 * Resolves current live Supabase Auth session or falls back to active stored user
 */
export async function resolveCurrentSession(): Promise<AuthUser> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const u = session.user;
      const role = (u.user_metadata?.role as UserRole) || 'owner';
      const storeId = u.user_metadata?.store_id || 'store-1';
      const liveUser: AuthUser = {
        id: u.id,
        email: u.email || 'user@example.com',
        name: u.user_metadata?.name || u.email?.split('@')[0] || 'Merchant User',
        role,
        store_id: storeId,
        avatar_emoji: role === 'owner' ? '👑' : role === 'manager' ? '💼' : '🛡️',
        is_demo: false
      };
      setActiveUser(liveUser);
      return liveUser;
    }
  } catch (err) {
    console.warn('Live session check failed, using stored context:', err);
  }
  return getActiveUser();
}
