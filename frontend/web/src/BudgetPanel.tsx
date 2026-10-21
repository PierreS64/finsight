import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd } from "./money";
import "./BudgetPanel.css";

type BudgetLine = { limitAmount: string; spent: string; remaining: string; usedPercent: string };
type CategoryLine = { categoryId: string; categoryName: string; values: BudgetLine };
type BudgetSummary = { month: string; totalSpent: string; total: BudgetLine | null; categories: CategoryLine[] };
type Category = { id: string; name: string; categoryType: "INCOME" | "EXPENSE" };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const currentMonth = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; };
const validAmount = (amount: string) => /^\d{1,17}(?:[.,]\d{1,2})?$/.test(amount.trim()) && /[1-9]/.test(amount);
const barWidth = (percent: string) => `${Math.min(100, Math.max(0, Number.parseFloat(percent) || 0))}%`;

export default function BudgetPanel({ session }: { session: Session }) {
  const [month, setMonth] = useState(currentMonth);
  const [snapshot, setSnapshot] = useState<{ key: string; value: BudgetSummary } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalLimit, setTotalLimit] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryLimit, setCategoryLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState<{ key: string; message: string } | null>(null);
  const key = `${session.access_token}/${month}`;
  const budget = snapshot?.key === key ? snapshot.value : null;
  const error = loadError?.key === key ? loadError.message : "";
  const expenseCategories = categories.filter((item) => item.categoryType === "EXPENSE");

  useEffect(() => {
    const controller = new AbortController();
    const headers = { Authorization: `Bearer ${session.access_token}` };
    Promise.all([
      fetch(`${apiBase}/api/v1/budgets?month=${month}`, { headers, signal: controller.signal }),
      fetch(`${apiBase}/api/v1/categories`, { headers, signal: controller.signal }),
    ]).then(async ([budgetResponse, categoryResponse]) => {
      if (!budgetResponse.ok || !categoryResponse.ok) throw new Error("Không tải được ngân sách hoặc danh mục.");
      const data = await budgetResponse.json() as BudgetSummary;
      setSnapshot({ key, value: data });
      setTotalLimit(data.total?.limitAmount ?? "");
      setCategories(await categoryResponse.json() as Category[]);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setLoadError({ key, message: reason instanceof Error ? reason.message : "Không tải được ngân sách." });
    });
    return () => controller.abort();
  }, [session.access_token, month, key]);

  async function request(path: string, method: "PUT" | "DELETE", amount?: string): Promise<BudgetSummary | null> {
    const response = await fetch(`${apiBase}/api/v1/budgets${path}`, {
      method, headers: { Authorization: `Bearer ${session.access_token}`, ...(amount ? { "Content-Type": "application/json" } : {}) },
      body: amount ? JSON.stringify({ limitAmount: amount.trim().replace(",", ".") }) : undefined,
    });
    if (!response.ok) throw new Error(`Không lưu được ngân sách (HTTP ${response.status}).`);
    if (method === "PUT") return await response.json() as BudgetSummary;
    const refreshed = await fetch(`${apiBase}/api/v1/budgets?month=${month}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!refreshed.ok) throw new Error("Đã xóa, nhưng không tải lại được ngân sách.");
    return await refreshed.json() as BudgetSummary;
  }

  async function saveTotal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validAmount(totalLimit) || busy) { setMessage("Hạn mức phải lớn hơn 0 và có tối đa hai chữ số thập phân."); return; }
    setBusy(true); setMessage("");
    try { const data = await request(`/total/${month}`, "PUT", totalLimit); if (data) setSnapshot({ key, value: data }); setMessage("Đã lưu ngân sách tổng."); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không lưu được ngân sách."); }
    finally { setBusy(false); }
  }
  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryId || !validAmount(categoryLimit) || busy) { setMessage("Chọn danh mục chi và nhập hạn mức hợp lệ."); return; }
    setBusy(true); setMessage("");
    try { const data = await request(`/categories/${month}/${categoryId}`, "PUT", categoryLimit); if (data) setSnapshot({ key, value: data }); setCategoryLimit(""); setMessage("Đã lưu ngân sách danh mục."); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không lưu được ngân sách."); }
    finally { setBusy(false); }
  }
  async function remove(path: string) {
    if (busy) return;
    setBusy(true); setMessage("");
    try { const data = await request(path, "DELETE"); if (data) setSnapshot({ key, value: data }); if (path.startsWith("/total")) setTotalLimit(""); setMessage("Đã xóa ngân sách."); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không xóa được ngân sách."); }
    finally { setBusy(false); }
  }

  return <div className="budget-layout">
    <section className="surface-card budget-overview"><div className="section-head"><div><p className="eyebrow">KẾ HOẠCH CHI TIÊU</p><h2>Ngân sách tháng</h2></div><input aria-label="Tháng ngân sách" type="month" value={month} onChange={(event) => { setMonth(event.target.value); setCategoryId(""); setCategoryLimit(""); }} /></div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {!budget && !error && <p className="muted">Đang tải ngân sách...</p>}
      {budget && <><div className="budget-total"><small>CHI TIÊU TRONG THÁNG</small><strong>{formatVnd(budget.totalSpent)}</strong><span>{budget.total ? `Hạn mức ${formatVnd(budget.total.limitAmount)}` : "Bạn chưa đặt hạn mức tổng cho tháng này"}</span></div>
        {budget.total && <div className="budget-progress"><div><span>Đã dùng {budget.total.usedPercent}%</span><strong className={budget.total.remaining.startsWith("-") ? "over-budget" : ""}>Còn lại {formatVnd(budget.total.remaining)}</strong></div><span className="budget-track"><i style={{ width: barWidth(budget.total.usedPercent) }} /></span><button className="link-button danger" disabled={busy} onClick={() => remove(`/total/${month}`)}>Xóa hạn mức tổng</button></div>}
        <h3>Danh mục đã đặt ngân sách</h3>{budget.categories.length ? <div className="budget-category-list">{budget.categories.map((item) => <article key={item.categoryId}><div><strong>{item.categoryName}</strong><small>{formatVnd(item.values.spent)} / {formatVnd(item.values.limitAmount)}</small></div><span className="budget-track"><i style={{ width: barWidth(item.values.usedPercent) }} /></span><div><span>{item.values.usedPercent}% · Còn lại <b className={item.values.remaining.startsWith("-") ? "over-budget" : ""}>{formatVnd(item.values.remaining)}</b></span><span><button className="link-button" onClick={() => { setCategoryId(item.categoryId); setCategoryLimit(item.values.limitAmount); }}>Sửa</button><button className="link-button danger" disabled={busy} onClick={() => remove(`/categories/${month}/${item.categoryId}`)}>Xóa</button></span></div></article>)}</div> : <p className="muted">Chưa có ngân sách danh mục trong tháng này.</p>}</>}
    </section>
    <section className="surface-card budget-form"><p className="eyebrow">THIẾT LẬP</p><h2>Đặt hạn mức</h2><p className="muted">Số đã chi lấy từ giao dịch chi tiêu bạn ghi trong tháng đã chọn.</p>
      <form onSubmit={saveTotal}><h3>Ngân sách tổng</h3><label>Hạn mức tháng (VND)<input inputMode="decimal" value={totalLimit} onChange={(event) => setTotalLimit(event.target.value)} placeholder="Ví dụ: 5000000" required /></label><button className="button-primary" disabled={busy}>Lưu ngân sách tổng</button></form>
      <form onSubmit={saveCategory}><h3>Theo danh mục chi</h3><label>Danh mục<select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setCategoryLimit(budget?.categories.find((item) => item.categoryId === event.target.value)?.values.limitAmount ?? ""); }} required><option value="">Chọn danh mục</option>{expenseCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Hạn mức (VND)<input inputMode="decimal" value={categoryLimit} onChange={(event) => setCategoryLimit(event.target.value)} placeholder="Ví dụ: 1000000" required /></label><button className="button-primary" disabled={busy || !categoryId}>Lưu danh mục</button></form>{message && <p className="auth-message" role="status">{message}</p>}
    </section>
  </div>;
}
