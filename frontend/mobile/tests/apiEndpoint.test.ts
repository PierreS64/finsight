import { expect, test, vi } from 'vitest';
import { createApiEndpointSelector } from '../src/apiEndpoint';

const healthy = () => ({ ok: true, json: async () => ({ status: 'UP' }) }) as Response;

test('uses the first reachable LAN API and caches it', async () => {
  const probe = vi.fn(async (url: string) => {
    if (url.includes('192.168.1.67')) throw new Error('Network unavailable');
    return healthy();
  });
  const selector = createApiEndpointSelector('http://192.168.1.67:8086', 'http://172.17.160.151:8086', probe);
  expect(await selector.select()).toBe('http://172.17.160.151:8086');
  expect(await selector.select()).toBe('http://172.17.160.151:8086');
  expect(probe).toHaveBeenCalledTimes(2);
});

test('rechecks the network after a transport failure invalidates the selection', async () => {
  let homeAvailable = true;
  const probe = vi.fn(async (url: string) => {
    if (url.includes('192.168.1.67') && !homeAvailable) throw new Error('Network unavailable');
    return healthy();
  });
  const selector = createApiEndpointSelector('http://192.168.1.67:8086', 'http://172.17.160.151:8086', probe);
  expect(await selector.select()).toBe('http://192.168.1.67:8086');
  homeAvailable = false;
  selector.invalidate();
  expect(await selector.select()).toBe('http://172.17.160.151:8086');
});

test('reports a useful error when neither address is reachable', async () => {
  const selector = createApiEndpointSelector('http://192.168.1.67:8086', 'http://172.17.160.151:8086', async () => { throw new Error('Offline'); });
  await expect(selector.select()).rejects.toThrow('Không kết nối được API FinSight');
});
