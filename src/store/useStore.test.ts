import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';
import type { User } from '@supabase/supabase-js';

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({ user: null, loading: true });
  });

  it('starts with no user and loading true', () => {
    const { user, loading } = useStore.getState();
    expect(user).toBeNull();
    expect(loading).toBe(true);
  });

  it('setUser stores the user', () => {
    const fakeUser = { id: 'abc-123' } as User;
    useStore.getState().setUser(fakeUser);
    expect(useStore.getState().user?.id).toBe('abc-123');
  });

  it('setLoading toggles loading', () => {
    useStore.getState().setLoading(false);
    expect(useStore.getState().loading).toBe(false);
  });

  it('setUser(null) clears user', () => {
    useStore.getState().setUser({ id: 'abc' } as User);
    useStore.getState().setUser(null);
    expect(useStore.getState().user).toBeNull();
  });
});
