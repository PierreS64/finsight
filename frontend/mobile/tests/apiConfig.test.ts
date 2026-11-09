import { afterEach, expect, test, vi } from 'vitest';

vi.mock('expo-file-system', () => ({}));

const previousBase = process.env.EXPO_PUBLIC_API_BASE_URL;

afterEach(() => {
  if (previousBase === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
  else process.env.EXPO_PUBLIC_API_BASE_URL = previousBase;
  vi.resetModules();
});

test('mobile API fails clearly without a configured endpoint', async () => {
  delete process.env.EXPO_PUBLIC_API_BASE_URL;
  vi.resetModules();
  await expect(import('../src/api')).rejects.toThrow('Cần cấu hình EXPO_PUBLIC_API_BASE_URL');
});

test('mobile API loads with an explicitly configured endpoint', async () => {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:8086';
  vi.resetModules();
  await expect(import('../src/api')).resolves.toHaveProperty('getDashboard');
});
