type HealthFetch = (url: string, init: RequestInit) => Promise<Response>;

export function createApiEndpointSelector(primary: string, fallback?: string, healthFetch: HealthFetch = fetch) {
  const endpoints = [...new Set([primary, fallback].filter((url): url is string => Boolean(url)))].map(url => url.replace(/\/$/, ''));
  let selected: string | undefined;
  let pending: Promise<string> | undefined;

  async function probe(url: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    try {
      const response = await healthFetch(`${url}/actuator/health`, { signal: controller.signal });
      return response.ok && (await response.json() as { status?: string }).status === 'UP';
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async select(): Promise<string> {
      if (selected) return selected;
      pending ??= (async () => {
        for (const url of endpoints) {
          if (await probe(url)) {
            selected = url;
            return url;
          }
        }
        throw new Error('Không kết nối được API FinSight. Hãy kiểm tra Wi-Fi của điện thoại và máy chủ demo.');
      })().finally(() => { pending = undefined; });
      return pending;
    },
    invalidate(): void { selected = undefined; },
  };
}
