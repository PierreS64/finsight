import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import type { Account } from '../src/AccountsPanel';
import RecurringPanel from '../src/RecurringPanel';
import StatementImportPanel from '../src/StatementImportPanel';
import TransactionsPanel from '../src/TransactionsPanel';

const session = { access_token: 'test-token' } as Session;
const accounts = [{ id: 'cash', name: 'Tiền mặt', accountType: 'CASH', openingBalance: '100000.00', currentBalance: '100000.00', currencyCode: 'VND' }] as Account[];
const categories = [{ id: 'food', name: 'Ăn uống', categoryType: 'EXPENSE' }];
const json = (body: unknown) => new Response(JSON.stringify(body), {
  status: 200, headers: { 'Content-Type': 'application/json' },
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('creates and pauses a recurring expense without generating a transaction', async () => {
  const rule = { id: 'rule-1', accountId: 'cash', categoryId: 'food', name: 'Internet', kind: 'EXPENSE', amount: '200000.00', cadence: 'MONTHLY', nextDueOn: '2026-12-01', active: true, note: null };
  const request = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    if (options?.method === 'POST') return json(rule);
    if (options?.method === 'PUT') return json({ ...rule, active: false });
    return json(url.endsWith('/categories') ? categories : []);
  });
  vi.stubGlobal('fetch', request);
  const onChanged = vi.fn();
  render(<RecurringPanel session={session} accounts={accounts} onChanged={onChanged} />);

  await screen.findByText('Chưa có khoản định kỳ');
  fireEvent.change(screen.getByLabelText('Tên khoản'), { target: { value: 'Internet' } });
  fireEvent.change(screen.getByLabelText('Số tiền (VND)'), { target: { value: '200000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Tạo lịch' }));

  expect(await screen.findByText('Đã lưu lịch định kỳ. Chưa có giao dịch nào được ghi tự động.')).toBeTruthy();
  expect(onChanged).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng' }));
  expect(await screen.findByText('Đã tạm dừng lịch định kỳ.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeTruthy();
});

test('previews a CSV statement before enabling import review', async () => {
  const preview = { sourceHash: 'synthetic-hash', rows: [{ rowNumber: 1, occurredOn: '2026-11-09', description: 'Thử nghiệm', amount: '1000.00', kind: 'EXPENSE', alreadyImported: false, possibleDuplicate: false }] };
  const request = vi.fn().mockImplementation(async (url: string) =>
    json(url.includes('/preview') ? preview : categories));
  vi.stubGlobal('fetch', request);
  const { container } = render(<StatementImportPanel session={session} accounts={accounts} onChanged={vi.fn()} onCategories={vi.fn()} />);

  const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
  expect(fileInput).not.toBeNull();
  fireEvent.change(fileInput!, { target: { files: [new File(['date,description,amount,type\n2026-11-09,Demo,1000,expense'], 'demo.csv', { type: 'text/csv' })] } });
  fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }));

  expect(await screen.findByText('Đã đọc 1 dòng. Chọn danh mục và kiểm tra trước khi lưu.')).toBeTruthy();
  expect(screen.getByText('Thử nghiệm')).toBeTruthy();
  await waitFor(() => expect(request).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/statements/preview?accountId=cash'),
    expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
  ));
});

test('requires category and explicit duplicate confirmation before importing a statement row', async () => {
  const preview = { sourceHash: 'synthetic-hash', rows: [
    { rowNumber: 1, occurredOn: '2026-11-09', description: 'Khoản thử', amount: '1000.00', kind: 'EXPENSE', alreadyImported: false, possibleDuplicate: true },
    { rowNumber: 2, occurredOn: '2026-11-08', description: 'Đã nhập', amount: '2000.00', kind: 'EXPENSE', alreadyImported: true, possibleDuplicate: false },
  ] };
  const request = vi.fn().mockImplementation(async (url: string) =>
    json(url.includes('/preview') ? preview : url.endsWith('/import') ? { importedCount: 1 } : categories));
  vi.stubGlobal('fetch', request);
  const onChanged = vi.fn();
  const { container } = render(<StatementImportPanel session={session} accounts={accounts} onChanged={onChanged} onCategories={vi.fn()} />);
  fireEvent.change(container.querySelector<HTMLInputElement>('input[type="file"]')!, {
    target: { files: [new File(['demo'], 'demo.csv', { type: 'text/csv' })] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }));

  expect(await screen.findByText('Còn 1 dòng chưa chọn danh mục.')).toBeTruthy();
  const rows = container.querySelectorAll<HTMLElement>('.statement-row');
  expect(within(rows[1]).getByRole('checkbox').hasAttribute('disabled')).toBe(true);
  fireEvent.change(within(rows[0]).getByRole('combobox', { name: 'Danh mục' }), { target: { value: 'food' } });
  expect(screen.getByText('Còn 1 dòng có thể trùng cần xác nhận.')).toBeTruthy();
  fireEvent.click(within(rows[0]).getByRole('checkbox', { name: /Có giao dịch giống ngày/ }));
  expect(screen.getByText('1 giao dịch đã sẵn sàng để nhập.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Nhập 1 giao dịch đã chọn' }));

  await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
  const body = JSON.parse(request.mock.calls.find(([url]) => String(url).endsWith('/import'))![1].body);
  expect(body.rows).toEqual([{ rowNumber: 1, categoryId: 'food', kind: 'EXPENSE', amount: '1000.00', occurredOn: '2026-11-09', description: 'Khoản thử', allowPossibleDuplicate: true }]);
});

test('validates and saves a manual expense with the owned account and category', async () => {
  const saved = { id: 'tx-1', accountId: 'cash', categoryId: 'food', merchantId: null, kind: 'EXPENSE', amount: '1000.00', occurredOn: '2026-11-09', note: null, hasReceipt: false };
  const request = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    if (options?.method === 'POST') return json(saved);
    if (url.includes('/history?')) return json({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    if (url.endsWith('/categories')) return json(categories);
    return json([]);
  });
  vi.stubGlobal('fetch', request);
  const onChanged = vi.fn();
  const { container } = render(<TransactionsPanel session={session} accounts={accounts} onChanged={onChanged} onCategories={vi.fn()} onMerchants={vi.fn()} />);

  const submit = container.querySelector<HTMLButtonElement>('.transaction-form-card button[type="submit"]');
  expect(submit).not.toBeNull();
  await waitFor(() => expect(submit!.disabled).toBe(false));
  const amount = screen.getByLabelText('Số tiền (VND)');
  fireEvent.change(amount, { target: { value: '1.001' } });
  fireEvent.click(submit!);
  expect(screen.getByText('Số tiền phải lớn hơn 0 và có tối đa hai chữ số thập phân.')).toBeTruthy();
  expect(request.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);

  fireEvent.change(amount, { target: { value: '1000' } });
  fireEvent.click(submit!);
  await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
  expect(JSON.parse(request.mock.calls.find(([, options]) => options?.method === 'POST')![1].body).accountId).toBe('cash');
});
