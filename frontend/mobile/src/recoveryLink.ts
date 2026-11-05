export type RecoveryLink =
  | { kind: 'missing' }
  | { kind: 'invalid' }
  | { kind: 'error'; message: string }
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string };

export function parseRecoveryLink(url: string | null): RecoveryLink {
  if (!url) return { kind: 'missing' };

  try {
    const incoming = new URL(url);
    if (incoming.hostname !== 'reset-password' && !incoming.pathname.endsWith('/reset-password')) {
      return { kind: 'invalid' };
    }
    const fragment = new URLSearchParams(incoming.hash.replace(/^#/, ''));
    const value = (name: string) => fragment.get(name) || incoming.searchParams.get(name);
    const error = value('error') || value('error_description');
    if (error) return {
      kind: 'error',
      message: value('error_code') === 'otp_expired'
        ? 'Liên kết khôi phục đã hết hạn. Hãy yêu cầu email mới.'
        : 'Liên kết khôi phục không hợp lệ. Hãy yêu cầu email mới.',
    };

    const type = value('type');
    if (type && type !== 'recovery') return { kind: 'invalid' };

    const accessToken = value('access_token');
    const refreshToken = value('refresh_token');
    if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken };

    const code = value('code');
    if (code) return { kind: 'code', code };
  } catch {
    return { kind: 'invalid' };
  }

  return { kind: 'invalid' };
}

type RouteParams = Record<string, string | string[] | undefined>;

export function recoveryUrlFromRouteParams(params: RouteParams): string | null {
  const first = (name: string) => {
    const value = params[name];
    return Array.isArray(value) ? value[0] : value;
  };
  const hash = first('#')?.replace(/^#/, '');
  const query = new URLSearchParams();
  for (const key of ['access_token', 'refresh_token', 'code', 'type', 'error', 'error_code', 'error_description']) {
    const value = first(key);
    if (value) query.set(key, value);
  }
  if (!hash && !query.size) return null;
  return `finsight://reset-password${query.size ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

export function selectRecoveryUrl(...candidates: (string | null)[]): string | null {
  const valid = candidates.find((candidate) => {
    const kind = parseRecoveryLink(candidate).kind;
    return kind === 'tokens' || kind === 'code' || kind === 'error';
  });
  return valid ?? candidates.find((candidate) => candidate?.includes('reset-password')) ?? null;
}
