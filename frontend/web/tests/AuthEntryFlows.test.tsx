import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
}));
vi.mock('../src/supabase', () => ({ supabase: { auth }, initialRecoveryRedirect: false }));

import AuthPanel from '../src/AuthPanel';

beforeEach(() => {
  auth.signInWithPassword.mockReset();
  auth.signUp.mockReset().mockResolvedValue({ data: { session: null }, error: null });
  auth.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
  auth.resend.mockReset().mockResolvedValue({ error: null });
});

afterEach(cleanup);

test('rejects mismatched signup passwords and shows email confirmation after valid registration', async () => {
  const { container } = render(<AuthPanel initialMode="signup" close={vi.fn()} />);
  fireEvent.change(screen.getByPlaceholderText('Tên hiển thị của bạn'), { target: { value: 'Phong QA' } });
  fireEvent.change(screen.getByPlaceholderText('ban@example.com'), { target: { value: 'qa@example.test' } });
  const passwords = container.querySelectorAll<HTMLInputElement>('input[autocomplete="new-password"]');
  fireEvent.change(passwords[0], { target: { value: 'example123' } });
  fireEvent.change(passwords[1], { target: { value: 'different123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản →' }));
  expect(screen.getByRole('alert').textContent).toContain('Hai mật khẩu chưa khớp.');
  expect(auth.signUp).not.toHaveBeenCalled();

  fireEvent.change(passwords[1], { target: { value: 'example123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản →' }));
  await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith({
    email: 'qa@example.test', password: 'example123', options: { data: { display_name: 'Phong QA' } },
  }));
  expect(await screen.findByText('Kiểm tra hộp thư của bạn')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Gửi lại email xác nhận' }));
  await waitFor(() => expect(auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'qa@example.test' }));
});

test('requests a password recovery link for the entered email', async () => {
  render(<AuthPanel initialMode="signin" close={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Quên mật khẩu?' }));
  fireEvent.change(screen.getByPlaceholderText('ban@example.com'), { target: { value: 'qa@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi liên kết khôi phục →' }));

  await waitFor(() => expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
    'qa@example.test', { redirectTo: `${window.location.origin}/` },
  ));
  expect(await screen.findByText('Nếu email đã đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.')).toBeTruthy();
});
