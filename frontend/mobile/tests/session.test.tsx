import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../supabase', () => ({ supabase: { auth } }));

import { SessionProvider, useSession } from '../src/session';

function SessionStatus() {
  const { session, loading } = useSession();
  return <span>{loading ? 'loading' : session ? 'signed-in' : 'signed-out'}</span>;
}

beforeEach(() => {
  auth.getSession.mockReset();
  auth.onAuthStateChange.mockReset();
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});

afterEach(cleanup);

test('ends loading when restoring a mobile session fails', async () => {
  auth.getSession.mockRejectedValue(new Error('offline'));
  render(<SessionProvider><SessionStatus /></SessionProvider>);

  expect(screen.getByText('loading')).toBeTruthy();
  expect(await screen.findByText('signed-out')).toBeTruthy();
});

test('restores the existing mobile session when Supabase responds successfully', async () => {
  auth.getSession.mockResolvedValue({ data: { session: { access_token: 'restored-session' } } });
  render(<SessionProvider><SessionStatus /></SessionProvider>);

  expect(await screen.findByText('signed-in')).toBeTruthy();
});

test('keeps a newer auth event when a stale restoration fails', async () => {
  let authListener: (_event: string, session: object | null) => void = () => {};
  auth.onAuthStateChange.mockImplementation((listener) => {
    authListener = listener;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  let rejectRestore: (reason: Error) => void = () => {};
  auth.getSession.mockReturnValue(new Promise((_, reject) => { rejectRestore = reject; }));
  render(<SessionProvider><SessionStatus /></SessionProvider>);

  authListener('SIGNED_IN', { access_token: 'new-session' });
  expect(await screen.findByText('signed-in')).toBeTruthy();
  rejectRestore(new Error('stale restoration'));
  expect(screen.getByText('signed-in')).toBeTruthy();
});
