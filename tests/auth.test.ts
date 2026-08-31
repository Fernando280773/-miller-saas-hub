import { describe, it, expect, beforeEach } from 'vitest';
import { hasPermission, DEMO_USERS, getActiveUser, setActiveUser } from '@/lib/auth';

describe('auth — RBAC permission hierarchy', () => {
  it('owner can do everything', () => {
    expect(hasPermission('owner', 'owner')).toBe(true);
    expect(hasPermission('owner', 'manager')).toBe(true);
    expect(hasPermission('owner', 'staff')).toBe(true);
  });

  it('manager can manage but not own', () => {
    expect(hasPermission('manager', 'manager')).toBe(true);
    expect(hasPermission('manager', 'staff')).toBe(true);
    expect(hasPermission('manager', 'owner')).toBe(false);
  });

  it('staff can only perform staff-level actions', () => {
    expect(hasPermission('staff', 'staff')).toBe(true);
    expect(hasPermission('staff', 'manager')).toBe(false);
    expect(hasPermission('staff', 'owner')).toBe(false);
  });
});

describe('auth — demo users & session helpers', () => {
  beforeEach(() => localStorage.clear());

  it('defines one demo user per role on the default tenant', () => {
    expect(DEMO_USERS.owner.role).toBe('owner');
    expect(DEMO_USERS.manager.role).toBe('manager');
    expect(DEMO_USERS.staff.role).toBe('staff');
    for (const u of Object.values(DEMO_USERS)) {
      expect(u.store_id).toBe('00000000-0000-0000-0000-000000000001');
      expect(u.is_demo).toBe(true);
    }
  });

  it('falls back to the demo owner when nothing is stored', () => {
    const user = getActiveUser();
    expect(user.email).toBe('demo.owner@millersaashub.io');
    expect(user.role).toBe('owner');
  });

  it('persists and returns the active user plus the active store id', () => {
    setActiveUser(DEMO_USERS.manager);
    const user = getActiveUser();
    expect(user.role).toBe('manager');
    expect(localStorage.getItem('active_store_id')).toBe(DEMO_USERS.manager.store_id);
  });
});
