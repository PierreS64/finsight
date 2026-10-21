import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Account } from "./AccountsPanel";
import { formatVnd, sumBalances } from "./money";
import "./TransactionsPanel.css";

type Kind = "INCOME" | "EXPENSE";
type Category = { id: string; name: string; categoryType: Kind; icon: string };
type Transaction = { id: string; accountId: string; categoryId: string; kind: Kind; amount: string; occurredOn: string; note: string | null; hasReceipt: boolean };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function TransactionsPanel({ session, accounts, onChanged, onCategories }: {
  session: Session; accounts: Account[]; onChanged: () => void; onCategories: () => void;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [kind, setKind] = useState<Kind>("EXPENSE");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(today);
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    const controller = new AbortController();
    const headers = { Authorization: `Bearer ${session.access_token}` };
    Promise.all([
      fetch(`${apiBase}/api/v1/transactions`, { headers, signal: controller.signal }),
      fetch(`${apiBase}/api/v1/categories`, { headers, signal: controller.signal }),
    ]).then(async ([transactionsResponse, categoriesResponse]) => {
      if (!transactionsResponse.ok || !categoriesResponse.ok) throw new Error("Không tải được giao dịch hoặc danh mục.");
      setTransactions(await transactionsResponse.json() as Transaction[]);
      setCategories(await categoriesResponse.json() as Category[]);
      setLoaded(true);
    }).catch((error: unknown) => { if (!controller.signal.aborted) { setMessage(error instanceof Error ? error.message : "Không thể tải dữ liệu."); setLoaded(true); } });
    return () => controller.abort();
  }, [session.access_token]);

  const availableCategories = categories.filter((category) => category.categoryType === kind);
  const selectedCategory = availableCategories.some((category) => category.id === categoryId) ? categoryId : availableCategories[0]?.id ?? "";
  const selectedAccount = accounts.some((account) => account.id === accountId) ? accountId : accounts[0]?.id ?? "";
  const income = sumBalances(transactions.filter((item) => item.kind === "INCOME").map((item) => item.amount));
  const expense = sumBalances(transactions.filter((item) => item.kind === "EXPENSE").map((item) => item.amount));

  function reset() { setAmount(""); setNote(""); setOccurredOn(today()); setEditingId(null); setDeletingId(null); }
  function edit(transaction: Transaction) {
    setEditingId(transaction.id); setKind(transaction.kind); setAccountId(transaction.accountId);
    setCategoryId(transaction.categoryId); setAmount(transaction.amount); setOccurredOn(transaction.occurredOn);
    setNote(transaction.note || ""); setDeletingId(null); setMessage("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = amount.trim().replace(",", ".");
    if (!/^\d{1,17}(?:\.\d{1,2})?$/.test(value) || !/[1-9]/.test(value)) { setMessage("Số tiền phải lớn hơn 0 và có tối đa hai chữ số thập phân."); return; }
    if (!selectedAccount || !selectedCategory || !occurredOn || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/transactions${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccount, categoryId: selectedCategory, kind, amount: value, occurredOn, note: note.trim() || null }),
      });
      if (!response.ok) throw new Error(`Không lưu được giao dịch (HTTP ${response.status}).`);
      const saved = await response.json() as Transaction;
      setTransactions((current) => (editingId ? current.map((item) => item.id === editingId ? saved : item) : [...current, saved])
        .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.id.localeCompare(a.id)));
      reset(); onChanged(); setMessage("Đã lưu giao dịch.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không lưu được giao dịch."); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/transactions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) throw new Error(`Không xóa được giao dịch (HTTP ${response.status}).`);
      setTransactions((current) => current.filter((item) => item.id !== id));
      if (receiptId === id) { setReceiptId(null); setPreviewUrl(null); }
      if (editingId === id) reset();
      setDeletingId(null); onChanged(); setMessage("Đã xóa giao dịch.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không xóa được giao dịch."); }
    finally { setBusy(false); }
  }

  async function showReceipt(transaction: Transaction) {
    setReceiptId(transaction.id); setPreviewUrl(null); setMessage("");
    if (!transaction.hasReceipt) return;
    try {
      const response = await fetch(`${apiBase}/api/v1/transactions/${transaction.id}/receipt`,
        { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) throw new Error(`Không xem được ảnh hóa đơn (HTTP ${response.status}).`);
      setPreviewUrl(URL.createObjectURL(await response.blob()));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không xem được ảnh hóa đơn."); }
  }
  async function uploadReceipt(file: File) {
    if (!receiptId || receiptBusy) return;
    if (file.size > 5_000_000) { setMessage("Ảnh hóa đơn tối đa 5 MB."); return; }
    setReceiptBusy(true); setMessage("");
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch(`${apiBase}/api/v1/transactions/${receiptId}/receipt`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body });
      if (!response.ok) throw new Error(`Không tải được ảnh hóa đơn (HTTP ${response.status}).`);
      setTransactions((current) => current.map((item) => item.id === receiptId ? { ...item, hasReceipt: true } : item));
      setPreviewUrl(URL.createObjectURL(file)); setMessage("Đã lưu ảnh hóa đơn.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không tải được ảnh hóa đơn."); }
    finally { setReceiptBusy(false); }
  }
  async function deleteReceipt() {
    if (!receiptId || receiptBusy) return;
    setReceiptBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/transactions/${receiptId}/receipt`,
        { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) throw new Error(`Không xóa được ảnh hóa đơn (HTTP ${response.status}).`);
      setTransactions((current) => current.map((item) => item.id === receiptId ? { ...item, hasReceipt: false } : item));
      setPreviewUrl(null); setMessage("Đã xóa ảnh hóa đơn.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không xóa được ảnh hóa đơn."); }
    finally { setReceiptBusy(false); }
  }

  return <><div className="transaction-totals"><article className="metric-card"><small>TỔNG THU NHẬP</small><strong className="money-in">{loaded ? formatVnd(income) : "—"}</strong><span>Từ giao dịch đã lưu</span></article><article className="metric-card"><small>TỔNG CHI TIÊU</small><strong className="money-out">{loaded ? formatVnd(expense) : "—"}</strong><span>Từ giao dịch đã lưu</span></article><article className="metric-card"><small>SỐ GIAO DỊCH</small><strong>{loaded ? transactions.length : "—"}</strong><span>Thu nhập và chi tiêu</span></article></div>
    <div className="transactions-layout"><section className="surface-card transactions-list-card"><div className="section-head"><div><p className="eyebrow">LỊCH SỬ</p><h2>Giao dịch của bạn</h2></div><span className="small-badge">{transactions.length} giao dịch</span></div>
      {!loaded ? <p className="muted">Đang tải giao dịch...</p> : transactions.length ? <ul className="transaction-list">{transactions.map((transaction) => <li key={transaction.id}><span className={`transaction-kind ${transaction.kind.toLowerCase()}`}>{transaction.kind === "INCOME" ? "↗" : "↘"}</span><span className="transaction-main"><strong>{categories.find((category) => category.id === transaction.categoryId)?.name ?? "Danh mục đã thay đổi"}</strong><small>{transaction.occurredOn.split("-").reverse().join("/")} · {accounts.find((account) => account.id === transaction.accountId)?.name ?? "Tài khoản"}</small>{transaction.note && <small>{transaction.note}</small>}</span><span className="transaction-side"><strong className={transaction.kind === "INCOME" ? "money-in" : "money-out"}>{transaction.kind === "INCOME" ? "+" : "−"}{formatVnd(transaction.amount)}</strong><span><button className="link-button" onClick={() => showReceipt(transaction)}>{transaction.hasReceipt ? "Xem hóa đơn" : "Thêm hóa đơn"}</button><button className="link-button" onClick={() => edit(transaction)}>Sửa</button><button className="link-button danger" onClick={() => setDeletingId(transaction.id)}>Xóa</button></span>{deletingId === transaction.id && <span><button className="link-button danger" onClick={() => remove(transaction.id)} disabled={busy}>Xác nhận</button><button className="link-button" onClick={() => setDeletingId(null)}>Hủy</button></span>}</span></li>)}</ul> : <div className="empty-state compact"><span>▤</span><h3>Chưa có giao dịch</h3><p>Giao dịch bạn nhập sẽ xuất hiện ở đây, không dùng dữ liệu minh họa.</p></div>}
      {receiptId && <div className="receipt-panel"><div className="section-head"><div><p className="eyebrow">ẢNH HÓA ĐƠN</p><h3>Giao dịch đã chọn</h3></div><button className="link-button" onClick={() => { setReceiptId(null); setPreviewUrl(null); }}>Đóng</button></div>{previewUrl && <img src={previewUrl} alt="Ảnh hóa đơn của giao dịch" className="receipt-preview" />}<label>Chọn ảnh JPEG, PNG hoặc WebP (tối đa 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={receiptBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadReceipt(file); event.target.value = ""; }} /></label>{transactions.find((item) => item.id === receiptId)?.hasReceipt && <button className="link-button danger" disabled={receiptBusy} onClick={deleteReceipt}>Xóa ảnh hóa đơn</button>}</div>}
    </section><section className="surface-card transaction-form-card"><p className="eyebrow">{editingId ? "CHỈNH SỬA" : "GHI NHẬN"}</p><h2>{editingId ? "Sửa giao dịch" : "Thêm giao dịch"}</h2><p className="muted">Nhập khoản thu hoặc chi từ tài khoản của bạn.</p><form onSubmit={save}><div className="transaction-kind-tabs" role="group" aria-label="Loại giao dịch"><button type="button" className={kind === "EXPENSE" ? "active" : ""} onClick={() => { setKind("EXPENSE"); setCategoryId(""); }}>Chi tiêu</button><button type="button" className={kind === "INCOME" ? "active" : ""} onClick={() => { setKind("INCOME"); setCategoryId(""); }}>Thu nhập</button></div>
      <label>Số tiền (VND)<input type="text" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Ví dụ: 50000" /></label>
      <label>Tài khoản<select required value={selectedAccount} onChange={(event) => setAccountId(event.target.value)}>{!accounts.length && <option value="">Chưa có tài khoản</option>}{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <label>Danh mục<select required value={selectedCategory} onChange={(event) => setCategoryId(event.target.value)}>{!availableCategories.length && <option value="">Chưa có danh mục</option>}{availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <button type="button" className="link-button" onClick={onCategories}>Quản lý danh mục →</button>
      <label>Ngày giao dịch<input type="date" required value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} /></label>
      <label>Ghi chú (tùy chọn)<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} placeholder="Ghi chú cho giao dịch" /></label>
      <button className="button-primary" disabled={busy || !selectedAccount || !selectedCategory}>{busy ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm giao dịch"}</button>{editingId && <button type="button" className="button-outline" onClick={reset}>Hủy chỉnh sửa</button>}</form>{message && <p className="auth-message" role="status">{message}</p>}</section></div>
  </>;
}
