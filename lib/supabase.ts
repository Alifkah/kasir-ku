import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured =
  supabaseUrl !== '' &&
  supabaseAnonKey !== '' &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-public-key');

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase credentials are missing or configured as placeholders. ' +
    'KasirKu is running in LOCAL PERSISTENCE MODE (Zustand + LocalStorage).'
  );
}

// Chainable mock helper to prevent crashes during method chaining: supabase.from().select().eq()
const chainableMock = () => {
  const mockPromise = Promise.resolve({ data: null, error: new Error('Supabase not configured') });
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (prop === 'then') return mockPromise.then.bind(mockPromise);
      if (prop === 'catch') return mockPromise.catch.bind(mockPromise);
      return () => new Proxy({}, handler);
    }
  };
  return new Proxy({}, handler);
};

// Safe mock client proxy to prevent runtime crashes if Supabase is not configured
const createMockSupabase = () => {
  const authMock = {
    signInWithPassword: async () => ({
      data: { user: null, session: null },
      error: new Error('Supabase not configured'),
    }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({
      data: { session: null },
      error: null,
    }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
  };

  const handler: ProxyHandler<any> = {
    get(target, propKey) {
      if (propKey === 'auth') {
        return authMock;
      }
      if (propKey === 'from') {
        return () => chainableMock();
      }
      return () => new Proxy({}, handler);
    }
  };

  return new Proxy({}, handler);
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabase();
