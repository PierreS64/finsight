import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import GoalPanel from '../src/GoalPanel';
import NetWorthPanel from '../src/NetWorthPanel';

const session = { access_token: 'test-token' } as Session;
const json = (body: unknown) => new Response(JSON.stringify(body), {
  status: 200, headers: { 'Content-Type': 'application/json' },
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('saves a savings goal with exact VND and shows its progress', async () => {
  const request = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) =>
    options?.method === 'POST'
      ? json({ id: 'goal-1', name: 'Quỹ học tập', targetAmount: '5000000.00', savedAmount: '1000000.00', remainingAmount: '4000000.00', progressPercent: '20.00', targetDate: null, note: null, achieved: false, overdue: false })
      : json([]));
  vi.stubGlobal('fetch', request);
  render(<GoalPanel session={session} />);

  await screen.findByText('Chưa có mục tiêu');
  fireEvent.change(screen.getByLabelText('Tên mục tiêu'), { target: { value: 'Quỹ học tập' } });
  fireEvent.change(screen.getByLabelText('Số tiền đích (VND)'), { target: { value: '5000000' } });
  fireEvent.change(screen.getByLabelText('Đã dành (VND)'), { target: { value: '1000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm mục tiêu' }));

  expect(await screen.findByText('Đã lưu mục tiêu tiết kiệm.')).toBeTruthy();
  expect(screen.getByText('Quỹ học tập')).toBeTruthy();
  await waitFor(() => expect(request).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/goals'), expect.objectContaining({ method: 'POST' }),
  ));
});

test('adds an asset and reloads the net-worth summary', async () => {
  const empty = { month: '2026-11', totalAssets: '0.00', totalLiabilities: '0.00', netWorth: '0.00', accounts: [], items: [] };
  const updated = { ...empty, totalAssets: '500000.00', netWorth: '500000.00', items: [{ id: 'asset-1', name: 'Xe thử', kind: 'ASSET', amount: '500000.00', note: null }] };
  let reads = 0;
  const request = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    if (options?.method === 'POST') return json(updated.items[0]);
    if (url.endsWith('/api/v1/net-worth')) return json(reads++ === 0 ? empty : updated);
    throw new Error('Unexpected request');
  });
  vi.stubGlobal('fetch', request);
  render(<NetWorthPanel session={session} />);

  await screen.findByText('Chưa có khoản mục');
  fireEvent.change(screen.getByLabelText('Tên'), { target: { value: 'Xe thử' } });
  fireEvent.change(screen.getByLabelText('Giá trị hiện tại (VND)'), { target: { value: '500000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm khoản mục' }));

  expect(await screen.findByText('Đã cập nhật bản kê tài sản ròng.')).toBeTruthy();
  expect(screen.getByText('Xe thử')).toBeTruthy();
  expect(screen.getAllByText('500.000 ₫').length).toBeGreaterThan(0);
});
