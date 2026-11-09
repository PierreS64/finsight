import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('expo-router', async () => {
  const React = await import('react');
  return { useFocusEffect: React.useEffect };
});
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('react-native', () => ({
  StyleSheet: { create: (styles: object) => styles },
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  View: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('react-native-svg', () => ({
  default: ({ children }: { children: React.ReactNode }) => <svg>{children}</svg>,
  Circle: () => <circle />,
  Line: () => <line />,
  Path: ({ d }: { d: string }) => <path d={d} />,
}));
vi.mock('../src/session', () => ({ useSession: () => ({ session: { access_token: 'test-token' } }) }));
vi.mock('../src/components/Ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  common: { helper: {}, error: {} },
}));
vi.mock('../src/api', () => ({
  getExpenseForecast: vi.fn().mockResolvedValue({ month: '2026-11', elapsedDays: 1, remainingDays: 29, spendingDays: 0, spent: '0.00', projectedMonthEnd: null, confidence: 'INSUFFICIENT_DATA' }),
  getDashboard: vi.fn().mockResolvedValue({ budget: null }),
  getCharts: vi.fn().mockResolvedValue({ buckets: [], categories: [], expenseTotal: '0.00' }),
}));

import ExpenseForecastCard from '../src/components/ExpenseForecastCard';

afterEach(cleanup);

test('renders an empty forecast chart without dividing by zero', async () => {
  render(<ExpenseForecastCard />);

  expect(await screen.findByText('Biểu đồ đường đi chi tiêu')).toBeTruthy();
  const paths = Array.from(document.querySelectorAll('path'));
  expect(paths.length).toBeGreaterThan(0);
  for (const item of paths) expect(item.getAttribute('d')).not.toMatch(/NaN|Infinity/);
});
