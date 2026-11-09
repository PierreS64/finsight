import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import type { Account } from '../src/AccountsPanel';
import BudgetPanel from '../src/BudgetPanel';
import TransfersPanel from '../src/TransfersPanel';
import ReconciliationPanel from '../src/ReconciliationPanel';

const session = { access_token: 'test-token' } as Session;
const accounts = [
  { id: 'cash', name: 'Tiền mặt', accountType: 'CASH', openingBalance: '100000.00', currentBalance: '100000.00', currencyCode: 'VND' },
  { id: 'wallet', name: 'Ví thử', accountType: 'E_WALLET', openingBalance: '50000.00', currentBalance: '50000.00', currencyCode: 'VND' },
] as Account[];
const json = (body: unknown) => new Response(JSON.stringify(body), {
  status: 200, headers: { 'Content-Type': 'application/json' },
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('saves both total and category budgets after validating the amount', async () => {
  const empty = { month: '2026-11', totalSpent: '0.00', total: null, categories: [] };
  const total = { ...empty, total: { limitAmount: '1000000.00', spent: '0.00', remaining: '1000000.00', usedPercent: '0', alertThresholdPercent: 80 } };
  const category = { ...total, categories: [{ categoryId: 'food', categoryName: 'Ăn uống', values: { limitAmount: '300000.00', spent: '0.00', remaining: '300000.00', usedPercent: '0', alertThresholdPercent: 80 } }] };
  const request = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    if (options?.method === 'PUT') return json(url.includes('/total/') ? total : category);
    return json(url.includes('/categories') ? [{ id: 'food', name: 'Ăn uống', categoryType: 'EXPENSE' }] : empty);
  });
  vi.stubGlobal('fetch', request);
  render(<BudgetPanel session={session} />);

  await screen.findByText('Chưa có ngân sách danh mục trong tháng này.');
  fireEvent.change(screen.getByLabelText('Hạn mức tháng (VND)'), { target: { value: '1000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu ngân sách tổng' }));
  expect(await screen.findByText('Đã lưu ngân sách tổng.')).toBeTruthy();

  fireEvent.change(screen.getByLabelText('Danh mục'), { target: { value: 'food' } });
  fireEvent.change(screen.getByLabelText('Hạn mức (VND)'), { target: { value: '300000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu danh mục' }));
  expect(await screen.findByText('Đã lưu ngân sách danh mục.')).toBeTruthy();
  expect(request.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(2);
});

test('moves money between two owned accounts without changing the supplied balances', async () => {
  const request = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) =>
    options?.method === 'POST'
      ? json({ id: 'transfer-1', fromAccountId: 'cash', toAccountId: 'wallet', amount: '1000.00', occurredOn: '2026-11-09', note: null })
      : json([]));
  vi.stubGlobal('fetch', request);
  const onChanged = vi.fn();
  render(<TransfersPanel session={session} accounts={accounts} onChanged={onChanged} />);

  await screen.findByText('Chưa có chuyển khoản');
  fireEvent.change(screen.getByLabelText('Từ tài khoản'), { target: { value: 'cash' } });
  fireEvent.change(screen.getByLabelText('Đến tài khoản'), { target: { value: 'wallet' } });
  fireEvent.change(screen.getByLabelText('Số tiền (VND)'), { target: { value: '1000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu chuyển khoản' }));

  await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
  expect(accounts[0].currentBalance).toBe('100000.00');
  expect(accounts[1].currentBalance).toBe('50000.00');
});

test('records a balance discrepancy without changing the account balance', async () => {
  const request = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) =>
    options?.method === 'POST'
      ? json({ id: 'reconcile-1', accountId: 'cash', expectedBalance: '100000.00', observedBalance: '99000.00', differenceAmount: '-1000.00', status: 'SHORTFALL', note: null, recordedAt: '2026-11-09T00:00:00Z' })
      : json([]));
  vi.stubGlobal('fetch', request);
  render(<ReconciliationPanel session={session} accounts={[accounts[0]]} />);

  await screen.findByText('Chưa có lần đối soát');
  fireEvent.change(screen.getByLabelText('Số dư thực tế quan sát được (VND)'), { target: { value: '99000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu lần đối soát' }));

  expect(await screen.findByText('Đã lưu lần đối soát. Số dư FinSight không thay đổi.')).toBeTruthy();
  expect(accounts[0].currentBalance).toBe('100000.00');
});
