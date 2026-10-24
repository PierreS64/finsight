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
    const error = value('error_description');
    if (error) return { kind: 'error', message: error };

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
