import type { Session } from '@supabase/supabase-js';

const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:8086';
export type AccountType = 'CASH' | 'BANK' | 'E_WALLET' | 'OTHER';
export type Account = { id: string; name: string; accountType: AccountType; openingBalance: string; currentBalance: string; currencyCode: string };
export type Profile = { userId: string; displayName: string | null; currencyCode: string };
export type CategoryType = 'INCOME' | 'EXPENSE';
export type CategoryIcon = 'wallet' | 'gift' | 'other' | 'food' | 'transport' | 'home' | 'shopping' | 'health' | 'education';
export type Category = { id: string; name: string; categoryType: CategoryType; icon: CategoryIcon; isDefault: boolean };
export type Transaction = { id: string; accountId: string; categoryId: string; kind: CategoryType; amount: string; occurredOn: string; note: string | null };

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

export async function getCategories(session: Session, signal?: AbortSignal): Promise<Category[]> {
  const response = await fetch(`${apiBase}/api/v1/categories`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal });
  if (!response.ok) throw new Error(`Không tải được danh mục (HTTP ${response.status}).`);
  return (await response.json()) as Category[];
}

export async function saveCategory(session: Session, category: { name: string; categoryType: CategoryType; icon: CategoryIcon }, id?: string): Promise<Category> {
  const response = await fetch(`${apiBase}/api/v1/categories${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(category),
  });
  if (response.status === 409) throw new Error('Tên danh mục đã tồn tại trong loại được chọn.');
  if (!response.ok) throw new Error(`Không lưu được danh mục (HTTP ${response.status}).`);
  return (await response.json()) as Category;
}

export async function deleteCategory(session: Session, id: string): Promise<void> {
  const response = await fetch(`${apiBase}/api/v1/categories/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } });
  if (response.status === 409) throw new Error('Danh mục đang được giao dịch hoặc ngân sách sử dụng. Hãy đổi danh mục của các mục đó trước khi xóa.');
  if (!response.ok) throw new Error(`Không xóa được danh mục (HTTP ${response.status}).`);
}

export async function getTransactions(session: Session, signal?: AbortSignal): Promise<Transaction[]> {
  const response = await fetch(`${apiBase}/api/v1/transactions`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal });
  if (!response.ok) throw new Error(`Không tải được giao dịch (HTTP ${response.status}).`);
  return (await response.json()) as Transaction[];
}

export async function saveTransaction(session: Session, transaction: { accountId: string; categoryId: string; kind: CategoryType; amount: string; occurredOn: string; note: string | null }, id?: string): Promise<Transaction> {
  const response = await fetch(`${apiBase}/api/v1/transactions${id ? `/${id}` : ''}`, {
    method: id ? 'PUT' : 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(transaction),
  });
  if (!response.ok) throw new Error(`Không lưu được giao dịch (HTTP ${response.status}).`);
  return (await response.json()) as Transaction;
}

export async function deleteTransaction(session: Session, id: string): Promise<void> {
  const response = await fetch(`${apiBase}/api/v1/transactions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } });
  if (!response.ok) throw new Error(`Không xóa được giao dịch (HTTP ${response.status}).`);
}
