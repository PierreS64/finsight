import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('../src/supabase', () => ({
  initialRecoveryRedirect: false,
  supabase: { auth },
}));

import App from '../src/App';

beforeEach(() => {
  window.location.hash = '#account';
  sessionStorage.clear();
  auth.getSession.mockReset();
  auth.onAuthStateChange.mockReset();
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});

afterEach(() => {
  cleanup();
  window.location.hash = '';
});

test('shows sign-in when the saved Supabase session cannot be restored', async () => {
  auth.getSession.mockRejectedValue(new Error('offline'));
  render(<App />);

  expect(screen.getByText('Đang mở FinSight...')).toBeTruthy();
  expect(await screen.findByRole('button', { name: 'Đăng nhập →' })).toBeTruthy();
  expect(screen.queryByText('Đang mở FinSight...')).toBeNull();
});

test('shows sign-in when Supabase reports no saved session', async () => {
  auth.getSession.mockResolvedValue({ data: { session: null } });
  render(<App />);

  expect(await screen.findByRole('button', { name: 'Đăng nhập →' })).toBeTruthy();
});
