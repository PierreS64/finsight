export type ConfirmationLink =
  | { kind: 'missing' }
  | { kind: 'invalid' }
  | { kind: 'error' }
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string };

export function parseConfirmationLink(url: string | null): ConfirmationLink {
  if (!url) return { kind: 'missing' };

  try {
    const incoming = new URL(url);
    if (incoming.hostname !== 'verify-email' && !incoming.pathname.endsWith('/verify-email')) {
      return { kind: 'invalid' };
    }
    const fragment = new URLSearchParams(incoming.hash.replace(/^#/, ''));
    const value = (name: string) => fragment.get(name) || incoming.searchParams.get(name);
    if (value('error') || value('error_description')) return { kind: 'error' };
    const type = value('type');
    if (type && type !== 'signup' && type !== 'email') return { kind: 'invalid' };
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
