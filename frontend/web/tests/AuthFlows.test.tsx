import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';

const auth = vi.hoisted(() => ({ updateUser: vi.fn() }));
vi.mock('../src/supabase', () => ({ supabase: { auth }, initialRecoveryRedirect: false }));

import { PasswordResetPanel, ProfilePanel } from '../src/AuthPanel';

const session = {
  access_token: 'test-token',
  user: { email: 'demo@example.test', user_metadata: { display_name: 'Phong' } },
} as Session;

beforeEach(() => {
  auth.updateUser.mockReset();
  auth.updateUser.mockResolvedValue({ error: null });
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('loads and saves a profile after the user changes its display name', async () => {
  const request = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => ({
    ok: true,
    json: async () => ({ userId: 'owner', displayName: options?.method === 'PUT' ? 'Phong QA' : 'Phong', currencyCode: 'VND' }),
  }));
  vi.stubGlobal('fetch', request);
  const onDisplayName = vi.fn();
  render(<ProfilePanel session={session} onDisplayName={onDisplayName} />);

  expect(await screen.findByDisplayValue('Phong')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Họ và tên hiển thị'), { target: { value: 'Phong QA' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu thông tin cá nhân' }));

  await waitFor(() => expect(request).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/profile'),
    expect.objectContaining({ method: 'PUT', body: JSON.stringify({ displayName: 'Phong QA' }) }),
  ));
  expect(onDisplayName).toHaveBeenCalledWith('Phong QA');
});

test('enables the recovery submit only for matching passwords and completes the update', async () => {
  const onFinished = vi.fn();
  const { container } = render(<PasswordResetPanel onFinished={onFinished} />);
  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="password"]');
  const submit = screen.getByRole('button', { name: 'Cập nhật mật khẩu →' });

  expect(submit.hasAttribute('disabled')).toBe(true);
  fireEvent.change(inputs[0], { target: { value: 'example123' } });
  fireEvent.change(inputs[1], { target: { value: 'different123' } });
  expect(submit.hasAttribute('disabled')).toBe(true);
  fireEvent.change(inputs[1], { target: { value: 'example123' } });
  expect(submit.hasAttribute('disabled')).toBe(false);
  fireEvent.click(submit);

  await waitFor(() => expect(auth.updateUser).toHaveBeenCalledWith({ password: 'example123' }));
  await waitFor(() => expect(onFinished).toHaveBeenCalledOnce());
});
