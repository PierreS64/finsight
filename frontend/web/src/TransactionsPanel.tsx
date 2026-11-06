import { useEffect, useState, type FormEvent } from "react";
import CategorySuggestion from "./CategorySuggestion";
import type { Session } from "@supabase/supabase-js";
import type { Account } from "./AccountsPanel";
import { formatVnd, sumBalances } from "./money";
import { reportDate, reportMonth } from "./reportDate";
import "./TransactionsPanel.css";

type Kind = "INCOME" | "EXPENSE";
type Category = { id: string; name: string; categoryType: Kind; icon: string };
type Merchant = { id: string; name: string };
type Transaction = { id: string; accountId: string; categoryId: string; merchantId: string | null; kind: Kind; amount: string; occurredOn: string; note: string | null; hasReceipt: boolean };
type HistoryFilters = { search: string; from: string; to: string; month: string; kind: string; categoryId: string; sort: "asc" | "desc" };
type History = { items: Transaction[]; page: number; size: number; totalElements: number; totalPages: number };
type OcrResult = { merchant: string | null; occurredOn: string | null; amount: string | null; duplicateTransactionId: string | null; readable: boolean };
const emptyFilters: HistoryFilters = { search: "", from: "", to: "", month: reportMonth(), kind: "", categoryId: "", sort: "desc" };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function TransactionsPanel({ session, accounts, onChanged, onCategories, onMerchants, initialView = "list", onViewChange }: {
  session: Session; accounts: Account[]; onChanged: () => void; onCategories: () => void; onMerchants: () => void; initialView?: "list" | "ocr"; onViewChange?: (view: "list" | "form" | "ocr") => void;
}) {
  const [view, setView] = useState<"list" | "form" | "ocr">(initialView);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [kind, setKind] = useState<Kind>("EXPENSE");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(reportDate);
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [pendingReceipt, setPendingReceipt] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [filters, setFilters] = useState<HistoryFilters>(emptyFilters);
  const [applied, setApplied] = useState<HistoryFilters>(emptyFilters);
  const [historyResult, setHistoryResult] = useState<{ key: string; value: History } | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [historyFailure, setHistoryFailure] = useState<{ key: string; message: string } | null>(null);
  const [filterError, setFilterError] = useState("");
  const historyKey = JSON.stringify([session.access_token, applied, historyPage, historyRevision]);
  const history = historyResult?.key === historyKey ? historyResult.value : null;
  const historyError = historyFailure?.key === historyKey ? historyFailure.message : "";
  const historyLoading = !history && !historyError;

  function changeView(next: "list" | "form" | "ocr") { setView(next); onViewChange?.(next); }

  useEffect(() => { onViewChange?.(initialView); }, [initialView, onViewChange]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    const controller = new AbortController();
    const headers = { Authorization: `Bearer ${session.access_token}` };
    Promise.all([
      fetch(`${apiBase}/api/v1/transactions`, { headers, signal: controller.signal }),
      fetch(`${apiBase}/api/v1/categories`, { headers, signal: controller.signal }),
      fetch(`${apiBase}/api/v1/merchants`, { headers, signal: controller.signal }),
    ]).then(async ([transactionsResponse, categoriesResponse, merchantsResponse]) => {
      if (!transactionsResponse.ok || !categoriesResponse.ok || !merchantsResponse.ok) throw new Error("Không tải được giao dịch, danh mục hoặc nơi giao dịch.");
      setTransactions(await transactionsResponse.json() as Transaction[]);
      setCategories(await categoriesResponse.json() as Category[]);
      setMerchants(await merchantsResponse.json() as Merchant[]);
      setLoaded(true);
    }).catch((error: unknown) => { if (!controller.signal.aborted) { setMessage(error instanceof Error ? error.message : "Không thể tải dữ liệu."); setLoaded(true); } });
    return () => controller.abort();
  }, [session.access_token]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(historyPage), size: "10", sort: applied.sort });
    for (const key of ["search", "from", "to", "month", "kind", "categoryId"] as const) {
      if (applied[key].trim()) params.set(key, applied[key].trim());
    }
    fetch(`${apiBase}/api/v1/transactions/history?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Không tải được lịch sử (HTTP ${response.status}).`);
      const data = await response.json() as History;
      if (data.totalPages > 0 && historyPage >= data.totalPages) setHistoryPage(data.totalPages - 1);
      else setHistoryResult({ key: historyKey, value: data });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setHistoryFailure({ key: historyKey, message: error instanceof Error ? error.message : "Không tải được lịch sử." });
    });
    return () => controller.abort();
  }, [session.access_token, applied, historyPage, historyRevision, historyKey]);

  function applyHistory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (filters.from && filters.to && filters.from > filters.to) { setFilterError("Ngày bắt đầu phải trước ngày kết thúc."); return; }
    setFilterError("");
    setHistoryPage(0); setApplied({ ...filters });
  }

  const availableCategories = categories.filter((category) => category.categoryType === kind);
  const selectedCategory = availableCategories.some((category) => category.id === categoryId) ? categoryId : availableCategories[0]?.id ?? "";
  const selectedAccount = accounts.some((account) => account.id === accountId) ? accountId : accounts[0]?.id ?? "";
  const periodTransactions = transactions.filter((item) => !applied.month || item.occurredOn.startsWith(applied.month));
  const income = sumBalances(periodTransactions.filter((item) => item.kind === "INCOME").map((item) => item.amount));
  const expense = sumBalances(periodTransactions.filter((item) => item.kind === "EXPENSE").map((item) => item.amount));
  const netFlow = sumBalances([income, `-${expense}`]);

  function reset() { setAmount(""); setNote(""); setMerchantId(""); setOccurredOn(reportDate()); setEditingId(null); setDeletingId(null); setPendingReceipt(null); setOcrResult(null); setDuplicateConfirmed(false); }
  function edit(transaction: Transaction) {
    changeView("form");
    setPendingReceipt(null); setOcrResult(null); setDuplicateConfirmed(false);
    setEditingId(transaction.id); setKind(transaction.kind); setAccountId(transaction.accountId);
    setCategoryId(transaction.categoryId); setMerchantId(transaction.merchantId ?? ""); setAmount(transaction.amount); setOccurredOn(transaction.occurredOn);
    setNote(transaction.note || ""); setDeletingId(null); setMessage("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = amount.trim().replace(",", ".");
    if (!/^\d{1,17}(?:\.\d{1,2})?$/.test(value) || !/[1-9]/.test(value)) { setMessage("Số tiền phải lớn hơn 0 và có tối đa hai chữ số thập phân."); return; }
    if (!selectedAccount || !selectedCategory || !occurredOn || busy || (ocrResult?.duplicateTransactionId && !duplicateConfirmed)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/transactions${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccount, categoryId: selectedCategory, merchantId: merchantId || null, kind, amount: value, occurredOn, note: note.trim() || null }),
      });
      if (!response.ok) throw new Error(`Không lưu được giao dịch (HTTP ${response.status}).`);
      const saved = await response.json() as Transaction;
      let receiptAttached = false;
      if (pendingReceipt) {
        try {
          const form = new FormData(); form.append("file", pendingReceipt);
          const upload = await fetch(`${apiBase}/api/v1/transactions/${saved.id}/receipt`, {
            method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: form,
          });
          receiptAttached = upload.ok;
        } catch { receiptAttached = false; }
      }
      const completed = { ...saved, hasReceipt: saved.hasReceipt || receiptAttached };
      setTransactions((current) => (editingId ? current.map((item) => item.id === editingId ? completed : item) : [...current, completed])
        .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.id.localeCompare(a.id)));
      setHistoryRevision((value) => value + 1);
      reset(); changeView("list"); onChanged(); setMessage(pendingReceipt && !receiptAttached ? "Đã lưu giao dịch nhưng chưa lưu được ảnh hóa đơn. Bạn có thể thêm ảnh ở lịch sử." : "Đã lưu giao dịch.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không lưu được giao dịch."); }
    finally { setBusy(false); }
  }

  async function scanReceipt(file: File) {
    if (ocrBusy) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5_000_000) {
      setMessage('Chỉ hỗ trợ JPEG, PNG hoặc WebP tối đa 5 MB.'); return;
    }
    setOcrBusy(true); setMessage(''); setOcrResult(null); setPendingReceipt(file); setDuplicateConfirmed(false);
    try {
      const form = new FormData(); form.append('file', file);
      const response = await fetch(`${apiBase}/api/v1/receipts/recognize`, {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: form,
      });
      if (!response.ok) throw new Error(`Không đọc được hóa đơn (HTTP ${response.status}). Hãy nhập tay.`);
      const result = await response.json() as OcrResult;
      setOcrResult(result); setKind('EXPENSE'); setCategoryId(''); setMerchantId(''); setNote(''); setEditingId(null);
      if (result.amount) setAmount(result.amount);
      if (result.occurredOn) setOccurredOn(result.occurredOn);
      setMessage(result.readable ? 'Đã điền dữ liệu nhận diện. Hãy kiểm tra và sửa trước khi lưu.' : 'OCR chưa đọc được thông tin. Hãy nhập tay và kiểm tra ảnh trước khi lưu.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không đọc được hóa đơn. Hãy nhập tay.'); }
    finally { setOcrBusy(false); }
  }
  async function remove(id: string) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/transactions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) throw new Error(`Không xóa được giao dịch (HTTP ${response.status}).`);
      setTransactions((current) => current.filter((item) => item.id !== id));
      setHistoryRevision((value) => value + 1);
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
      setHistoryRevision((value) => value + 1);
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
      setHistoryRevision((value) => value + 1);
      setPreviewUrl(null); setMessage("Đã xóa ảnh hóa đơn.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không xóa được ảnh hóa đơn."); }
    finally { setReceiptBusy(false); }
  }

  return <div className={`transaction-workspace transaction-view-${view}${showAdvancedFilters ? " show-filters" : ""}`}><div className="transaction-toolbar"><span>{view === "list" ? "Danh sách giao dịch" : view === "ocr" ? "Tải ảnh hóa đơn & OCR" : editingId ? "Sửa giao dịch" : "Thêm giao dịch"}</span><div>{view !== "list" && <button type="button" className="button-outline" onClick={() => { reset(); changeView("list"); }}>← Danh sách</button>}{view === "list" && <button type="button" className="button-outline" onClick={() => setShowAdvancedFilters((value) => !value)} aria-expanded={showAdvancedFilters}><span className="material-symbols-outlined" aria-hidden="true">filter_alt</span>Bộ lọc</button>}<button type="button" className="button-outline" onClick={() => changeView("ocr")}><span className="material-symbols-outlined" aria-hidden="true">document_scanner</span>Quét hóa đơn</button><button type="button" className="button-primary" onClick={() => { reset(); changeView("form"); }}><span className="material-symbols-outlined" aria-hidden="true">add</span>Thêm giao dịch</button></div></div>      <form className="history-filters" onSubmit={applyHistory}>
        <label>Tìm kiếm<input value={filters.search} maxLength={100} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Ghi chú, danh mục, tài khoản" /></label>
        <label>Tháng<input type="month" value={filters.month} onChange={(event) => setFilters({ ...filters, month: event.target.value })} /></label>
        <label>Từ ngày<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
        <label>Đến ngày<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
        <label>Loại<select value={filters.kind} onChange={(event) => setFilters({ ...filters, kind: event.target.value, categoryId: "" })}><option value="">Tất cả</option><option value="INCOME">Thu nhập</option><option value="EXPENSE">Chi tiêu</option></select></label>
        <label>Danh mục<select value={filters.categoryId} onChange={(event) => setFilters({ ...filters, categoryId: event.target.value })}><option value="">Tất cả</option>{categories.filter((category) => !filters.kind || category.categoryType === filters.kind).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label>Sắp xếp<select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value as "asc" | "desc" })}><option value="desc">Mới nhất</option><option value="asc">Cũ nhất</option></select></label>
        <div className="history-actions"><button className="button-primary" type="submit">Áp dụng</button><button className="button-outline" type="button" onClick={() => { setFilters(emptyFilters); setApplied({ ...emptyFilters }); setHistoryPage(0); setFilterError(""); }}>Xóa lọc</button></div>
      </form><div className="transaction-totals"><article className="metric-card"><small>Tổng giao dịch</small><strong>{loaded ? periodTransactions.length : "—"}<span> giao dịch</span></strong><span>Chu kỳ: {applied.month || "Tất cả"}</span></article><article className="metric-card"><small>Tổng thu tháng</small><strong className="money-in">{loaded ? formatVnd(income) : "—"}</strong><span>Thu nhập đã ghi nhận</span></article><article className="metric-card"><small>Tổng chi tháng</small><strong className="money-out">{loaded ? formatVnd(expense) : "—"}</strong><span>Chi tiêu đã ghi nhận</span></article><article className="metric-card"><small>Chênh lệch tháng</small><strong className={netFlow.startsWith("-") ? "money-out" : "money-in"}>{loaded ? formatVnd(netFlow) : "—"}</strong><span>Thu trừ chi trong kỳ</span></article></div>
    <div className="transactions-layout"><section className="surface-card transactions-list-card"><div className="section-head"><h2>Danh sách giao dịch</h2><span className="small-badge">{history?.totalElements ?? 0} giao dịch</span></div>

      {(filterError || historyError) && <p className="auth-message" role="alert">{filterError || historyError}</p>}
      {historyLoading && !history ? <p className="muted">Đang tải giao dịch...</p> : history?.items.length ? <div className="transaction-table-scroll"><table className="transaction-table"><thead><tr><th>Ngày</th><th>Tên giao dịch</th><th>Danh mục</th><th>Tài khoản</th><th>Số tiền</th><th>Hóa đơn</th><th>Thao tác</th></tr></thead><tbody>{history.items.map((transaction) => <tr key={transaction.id}><td>{transaction.occurredOn.split("-").reverse().join("/")}</td><td><strong>{transaction.note || merchants.find((item) => item.id === transaction.merchantId)?.name || (transaction.kind === "INCOME" ? "Khoản thu" : "Khoản chi")}</strong>{transaction.merchantId && transaction.note && <small>{merchants.find((item) => item.id === transaction.merchantId)?.name}</small>}</td><td>{categories.find((category) => category.id === transaction.categoryId)?.name ?? "Danh mục đã thay đổi"}</td><td>{accounts.find((account) => account.id === transaction.accountId)?.name ?? "Tài khoản"}</td><td className={transaction.kind === "INCOME" ? "money-in" : "money-out"}>{transaction.kind === "INCOME" ? "+" : "−"}{formatVnd(transaction.amount)}</td><td><button className="link-button" onClick={() => showReceipt(transaction)}>{transaction.hasReceipt ? "Đã có ảnh" : "Thêm ảnh"}</button></td><td><div className="transaction-row-actions"><button className="link-button" title="Sửa giao dịch" aria-label="Sửa giao dịch" onClick={() => edit(transaction)}><span className="material-symbols-outlined" aria-hidden="true">edit</span></button><button className="link-button danger" title="Xóa giao dịch" aria-label="Xóa giao dịch" onClick={() => setDeletingId(transaction.id)}><span className="material-symbols-outlined" aria-hidden="true">delete</span></button></div>{deletingId === transaction.id && <div className="transaction-delete-actions"><button className="link-button danger" onClick={() => remove(transaction.id)} disabled={busy}>Xác nhận xóa</button><button className="link-button" onClick={() => setDeletingId(null)}>Hủy</button></div>}</td></tr>)}</tbody></table></div> : <div className="empty-state compact"><span>▤</span><h3>{applied.search || applied.from || applied.to || applied.kind || applied.categoryId ? "Không có giao dịch phù hợp" : applied.month ? "Chưa có giao dịch trong tháng này" : "Chưa có giao dịch"}</h3><p>Thử đổi bộ lọc hoặc thêm giao dịch mới.</p></div>}
      {!!history && history.totalPages > 1 && <nav className="history-pagination" aria-label="Phân trang giao dịch"><button className="button-outline" disabled={historyPage === 0 || historyLoading} onClick={() => setHistoryPage((value) => value - 1)}>Trang trước</button><span>Trang {historyPage + 1} / {history.totalPages}</span><button className="button-outline" disabled={historyPage + 1 >= history.totalPages || historyLoading} onClick={() => setHistoryPage((value) => value + 1)}>Trang sau</button></nav>}
      {receiptId && <div className="receipt-panel"><div className="section-head"><div><p className="eyebrow">ẢNH HÓA ĐƠN</p><h3>Giao dịch đã chọn</h3></div><button className="link-button" onClick={() => { setReceiptId(null); setPreviewUrl(null); }}>Đóng</button></div>{previewUrl && <img src={previewUrl} alt="Ảnh hóa đơn của giao dịch" className="receipt-preview" />}<label>Chọn ảnh JPEG, PNG hoặc WebP (tối đa 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={receiptBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadReceipt(file); event.target.value = ""; }} /></label>{transactions.find((item) => item.id === receiptId)?.hasReceipt && <button className="link-button danger" disabled={receiptBusy} onClick={deleteReceipt}>Xóa ảnh hóa đơn</button>}</div>}
    </section><section className="surface-card transaction-form-card"><p className="eyebrow">{editingId ? "CHỈNH SỬA" : "GHI NHẬN"}</p><h2>{editingId ? "Sửa giao dịch" : "Thêm giao dịch"}</h2><p className="muted">Nhập khoản thu hoặc chi từ tài khoản của bạn.</p><div className="ocr-panel"><strong>Quét hóa đơn</strong><p className="muted">Chọn ảnh để điền gợi ý. Giao dịch chỉ được lưu khi bạn xác nhận biểu mẫu.</p><label>Ảnh JPEG, PNG hoặc WebP (tối đa 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={ocrBusy || busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void scanReceipt(file); event.target.value = ""; }} /></label>{ocrBusy && <p role="status">Đang nhận diện hóa đơn...</p>}{pendingReceipt && <p className="muted">Ảnh chờ lưu: {pendingReceipt.name}</p>}{ocrResult?.duplicateTransactionId && <div className="ocr-warning" role="alert"><strong>Ảnh này đã gắn với một giao dịch của bạn.</strong><label><input type="checkbox" checked={duplicateConfirmed} onChange={(event) => setDuplicateConfirmed(event.target.checked)} /> Tôi đã kiểm tra và vẫn muốn lưu giao dịch này</label></div>}</div><form onSubmit={save}><div className="transaction-kind-tabs" role="group" aria-label="Loại giao dịch"><button type="button" className={kind === "EXPENSE" ? "active" : ""} onClick={() => { setKind("EXPENSE"); setCategoryId(""); }}>Chi tiêu</button><button type="button" className={kind === "INCOME" ? "active" : ""} onClick={() => { setKind("INCOME"); setCategoryId(""); }}>Thu nhập</button></div>
      <label>Số tiền (VND)<input type="text" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Ví dụ: 50000" /></label>
      <label>Tài khoản<select required value={selectedAccount} onChange={(event) => setAccountId(event.target.value)}>{!accounts.length && <option value="">Chưa có tài khoản</option>}{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <label>Danh mục<select required value={selectedCategory} onChange={(event) => setCategoryId(event.target.value)}>{!availableCategories.length && <option value="">Chưa có danh mục</option>}{availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <button type="button" className="link-button" onClick={onCategories}>Quản lý danh mục →</button>
      <label>Nơi giao dịch (tùy chọn)<select value={merchantId} onChange={(event) => setMerchantId(event.target.value)}><option value="">Không chọn</option>{merchants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <button type="button" className="link-button" onClick={onMerchants}>Quản lý nơi giao dịch →</button>
      <label>Ngày giao dịch<input type="date" required value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} /></label>
      <label>Ghi chú (tùy chọn)<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} placeholder="Ghi chú cho giao dịch" /></label>
      <CategorySuggestion session={session} kind={kind} merchantId={merchantId} note={note} onApply={setCategoryId} />
      <button className="button-primary" disabled={busy || ocrBusy || !selectedAccount || !selectedCategory || !!(ocrResult?.duplicateTransactionId && !duplicateConfirmed)}>{busy ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm giao dịch"}</button>{editingId && <button type="button" className="button-outline" onClick={reset}>Hủy chỉnh sửa</button>}</form>{message && <p className="auth-message" role="status">{message}</p>}</section></div>
   </div>;
}
