import type { Session } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';

const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:8086';
export type AccountType = 'CASH' | 'BANK' | 'E_WALLET' | 'OTHER';
export type Account = { id: string; name: string; accountType: AccountType; openingBalance: string; currentBalance: string; currencyCode: string };
export type Profile = { userId: string; displayName: string | null; currencyCode: string };
export type CategoryType = 'INCOME' | 'EXPENSE';
export type CategoryIcon = 'wallet' | 'gift' | 'other' | 'food' | 'transport' | 'home' | 'shopping' | 'health' | 'education';
export type Category = { id: string; name: string; categoryType: CategoryType; icon: CategoryIcon; isDefault: boolean };
export type Transaction = { id: string; accountId: string; categoryId: string; kind: CategoryType; amount: string; occurredOn: string; note: string | null; hasReceipt: boolean };
export type TransactionHistoryFilters = { search: string; from: string; to: string; month: string; kind: CategoryType | ''; categoryId: string; sort: 'asc' | 'desc' };
export type TransactionHistory = { items: Transaction[]; page: number; size: number; totalElements: number; totalPages: number };
export type BudgetLine = { limitAmount: string; spent: string; remaining: string; usedPercent: string };
export type CategoryBudgetLine = { categoryId: string; categoryName: string; values: BudgetLine };
export type BudgetSummary = { month: string; totalSpent: string; total: BudgetLine | null; categories: CategoryBudgetLine[] };

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

export async function getTransactionHistory(session: Session, filters: TransactionHistoryFilters,
                                            page: number, signal?: AbortSignal): Promise<TransactionHistory> {
  const params = new URLSearchParams({ page: String(page), size: '10', sort: filters.sort });
  for (const key of ['search', 'from', 'to', 'month', 'kind', 'categoryId'] as const) {
    if (filters[key].trim()) params.set(key, filters[key].trim());
  }
  const response = await fetch(`${apiBase}/api/v1/transactions/history?${params}`,
    { headers: { Authorization: `Bearer ${session.access_token}` }, signal });
  if (!response.ok) throw new Error(`Không tải được lịch sử (HTTP ${response.status}).`);
  return (await response.json()) as TransactionHistory;
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

export async function uploadReceipt(session: Session, id: string, uri: string, mimeType: string): Promise<void> {
  const result = await FileSystem.uploadAsync(`${apiBase}/api/v1/transactions/${id}/receipt`, uri, {
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (result.status !== 204) throw new Error(`Không tải được ảnh hóa đơn (HTTP ${result.status}).`);
}

export async function downloadReceipt(session: Session, id: string): Promise<string> {
  if (!FileSystem.cacheDirectory) throw new Error('Thiết bị không có vùng lưu ảnh tạm.');
  const localPath = `${FileSystem.cacheDirectory}receipt-${id}-${Date.now()}`;
  const result = await FileSystem.downloadAsync(`${apiBase}/api/v1/transactions/${id}/receipt`, localPath,
    { headers: { Authorization: `Bearer ${session.access_token}` }, cache: false });
  if (result.status !== 200) {
    await FileSystem.deleteAsync(localPath, { idempotent: true });
    throw new Error(`Không xem được ảnh hóa đơn (HTTP ${result.status}).`);
  }
  return result.uri;
}

export async function deleteReceipt(session: Session, id: string): Promise<void> {
  const response = await fetch(`${apiBase}/api/v1/transactions/${id}/receipt`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } });
  if (!response.ok) throw new Error(`Không xóa được ảnh hóa đơn (HTTP ${response.status}).`);
}

export async function getBudget(session: Session, month: string, signal?: AbortSignal): Promise<BudgetSummary> {
  const response = await fetch(`${apiBase}/api/v1/budgets?month=${month}`,
    { headers: { Authorization: `Bearer ${session.access_token}` }, signal });
  if (!response.ok) throw new Error(`Không tải được ngân sách (HTTP ${response.status}).`);
  return (await response.json()) as BudgetSummary;
}

export async function saveBudget(session: Session, month: string, limitAmount: string, categoryId?: string): Promise<BudgetSummary> {
  const path = categoryId ? `/categories/${month}/${categoryId}` : `/total/${month}`;
  const response = await fetch(`${apiBase}/api/v1/budgets${path}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ limitAmount }),
  });
  if (!response.ok) throw new Error(`Không lưu được ngân sách (HTTP ${response.status}).`);
  return (await response.json()) as BudgetSummary;
}

export async function deleteBudget(session: Session, month: string, categoryId?: string): Promise<void> {
  const path = categoryId ? `/categories/${month}/${categoryId}` : `/total/${month}`;
  const response = await fetch(`${apiBase}/api/v1/budgets${path}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}` } });
  if (!response.ok) throw new Error(`Không xóa được ngân sách (HTTP ${response.status}).`);
}
