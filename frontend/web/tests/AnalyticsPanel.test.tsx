import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';

vi.mock('../src/ChartsPanel', () => ({ default: () => null }));
vi.mock('../src/FinancialHealthPanel', () => ({ default: () => null }));
vi.mock('../src/SpendingTrendsPanel', () => ({ default: () => null }));
vi.mock('../src/SpendingProfilePanel', () => ({ default: () => null }));
vi.mock('../src/WhatIfPanel', () => ({ default: () => null }));
vi.mock('../src/ExpenseForecastPanel', () => ({ default: () => null }));
vi.mock('../src/SafeToSpendPanel', () => ({ default: () => null }));

import AnalyticsPanel from '../src/AnalyticsPanel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('shows separate errors when all three analytics requests fail', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  render(<AnalyticsPanel session={{ access_token: 'test-token' } as Session} onAssistant={vi.fn()} />);

  expect(await screen.findByText('Không tải được chỉ số phân tích.')).toBeTruthy();
  expect(screen.getByText('Không tải được nhận xét chi tiêu. Hãy chọn lại kỳ báo cáo hoặc tải lại trang.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Biến động' }));
  expect(screen.getByText('Không tải được biến động chi tiêu. Hãy chọn lại kỳ báo cáo hoặc tải lại trang.')).toBeTruthy();
});
