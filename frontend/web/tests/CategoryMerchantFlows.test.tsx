import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import CategoriesPanel from '../src/CategoriesPanel';
import MerchantsPanel from '../src/MerchantsPanel';

const session = { access_token: 'test-token' } as Session;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('creates an expense category and shows it in the filtered list', async () => {
  const request = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) =>
    options?.method === 'POST'
      ? json({ id: 'cat-1', name: 'Thử nghiệm', categoryType: 'EXPENSE', icon: 'other', isDefault: false })
      : json([]));
  vi.stubGlobal('fetch', request);
  render(<CategoriesPanel session={session} />);

  await screen.findAllByText('Chưa có danh mục phù hợp.');
  fireEvent.change(screen.getByLabelText('Tên danh mục'), { target: { value: 'Thử nghiệm' } });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm danh mục' }));

  expect(await screen.findByText('Đã lưu danh mục.')).toBeTruthy();
  expect(screen.getByText('Thử nghiệm')).toBeTruthy();
  await waitFor(() => expect(request).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/categories'),
    expect.objectContaining({ method: 'POST', body: expect.stringContaining('Thử nghiệm') }),
  ));
});

test('keeps a merchant form open when the server rejects a duplicate name', async () => {
  const request = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) =>
    options?.method === 'POST' ? json({}, 409) : json([]));
  vi.stubGlobal('fetch', request);
  render(<MerchantsPanel session={session} />);

  await screen.findByText('Chưa có nơi giao dịch');
  fireEvent.change(screen.getByLabelText('Tên cửa hàng hoặc đơn vị'), { target: { value: 'Cửa hàng thử' } });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm mới' }));

  expect(await screen.findByText('Tên nơi giao dịch đã tồn tại.')).toBeTruthy();
  expect(screen.getByDisplayValue('Cửa hàng thử')).toBeTruthy();
});
