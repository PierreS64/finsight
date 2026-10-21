import type { Session } from '@supabase/supabase-js';

const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:8086';
export type AccountType = 'CASH' | 'BANK' | 'E_WALLET' | 'OTHER';
export type Account = { id: string; name: string; accountType: AccountType; openingBalance: string; currencyCode: string };
export type Profile = { userId: string; displayName: string | null; currencyCode: string };

export async function getAccounts(session: Session, signal?: AbortSignal): Promise<Account[]> {
  const response = await fetch(`${apiBase}/api/v1/accounts`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal });
  if (!response.ok) throw new Error(`Không tải được tài khoản (HTTP ${response.status}).`);
  return (await response.json()) as Account[];
}

export async function createAccount(session: Session, account: { name: string; accountType: AccountType; openingBalance: string }): Promise<Account> {
  const response = await fetch(`${apiBase}/api/v1/accounts`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(account) });
  if (!response.ok) throw new Error(`Không tạo được tài khoản (HTTP ${response.status}).`);
  return (await response.json()) as Account;
}

export async function getProfile(session: Session, signal?: AbortSignal): Promise<Profile | null> {
  const response = await fetch(`${apiBase}/api/v1/profile`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Không tải được hồ sơ (HTTP ${response.status}).`);
  return (await response.json()) as Profile;
}

export async function saveProfile(session: Session, displayName: string): Promise<Profile> {
  const response = await fetch(`${apiBase}/api/v1/profile`, { method: 'PUT', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName }) });
  if (!response.ok) throw new Error(`Không lưu được hồ sơ (HTTP ${response.status}).`);
  return (await response.json()) as Profile;
}
