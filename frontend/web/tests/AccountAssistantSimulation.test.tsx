import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import AccountsPanel from '../src/AccountsPanel';
import AssistantPanel from '../src/AssistantPanel';
import WhatIfPanel from '../src/WhatIfPanel';

const session = { access_token: 'test-token' } as Session;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('rejects an overprecise opening balance before creating an account', async () => {
  const request = vi.fn().mockResolvedValue(json({ id: 'account-1', name: 'Ví thử', accountType: 'CASH', openingBalance: '123.45', currentBalance: '123.45', currencyCode: 'VND' }));
  vi.stubGlobal('fetch', request);
  const onCreated = vi.fn();
  render(<AccountsPanel session={session} accounts={[]} onCreated={onCreated} onNavigate={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: /Thêm tài khoản/ }));
  fireEvent.change(screen.getByLabelText('Tên tài khoản'), { target: { value: 'Ví thử' } });
  fireEvent.change(screen.getByLabelText('Số dư đầu kỳ (VND)'), { target: { value: '123.456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm tài khoản →' }));
  expect(screen.getByText('Số dư đầu kỳ phải là số có tối đa hai chữ số thập phân.')).toBeTruthy();
  expect(request).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText('Số dư đầu kỳ (VND)'), { target: { value: '123,45' } });
  fireEvent.click(screen.getByRole('button', { name: 'Thêm tài khoản →' }));
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 'account-1' })));
  expect(JSON.parse(request.mock.calls[0][1].body).openingBalance).toBe('123.45');
});

test('keeps the assistant question visible when the provider is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'Trợ lý tạm thời chưa sẵn sàng.' }, 503)));
  render(<AssistantPanel session={session} />);

  fireEvent.change(screen.getByLabelText('Câu hỏi của bạn'), { target: { value: 'Tôi còn bao nhiêu tiền?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }));

  expect(await screen.findByText('Trợ lý tạm thời chưa sẵn sàng.')).toBeTruthy();
  expect(screen.getByDisplayValue('Tôi còn bao nhiêu tiền?')).toBeTruthy();
});

test('validates and then calculates a what-if scenario without saving a transaction', async () => {
  const request = vi.fn().mockResolvedValue(json({
    month: '2026-11', actualExpense: '1000.00', expenseAdjustment: '200.00', projectedExpense: '1200.00',
    actualBalance: '5000.00', projectedBalance: '4800.00', savedBudgetLimit: null,
    assumedBudgetLimit: null, projectedBudgetRemaining: null, usedPercent: null, alerts: [], calculationRule: 'test',
  }));
  vi.stubGlobal('fetch', request);
  render(<WhatIfPanel session={session} month="2026-11" />);

  fireEvent.change(screen.getByLabelText('Điều chỉnh chi tiêu (VND)'), { target: { value: 'abc' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xem kịch bản' }));
  expect(screen.getByText('Nhập số tiền hợp lệ, tối đa 2 chữ số thập phân. Hạn mức giả định phải dương.')).toBeTruthy();
  expect(request).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText('Điều chỉnh chi tiêu (VND)'), { target: { value: '200' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xem kịch bản' }));
  await waitFor(() => expect(request).toHaveBeenCalledOnce());
  expect(await screen.findByText('Kịch bản chưa phát sinh cảnh báo.')).toBeTruthy();
});
