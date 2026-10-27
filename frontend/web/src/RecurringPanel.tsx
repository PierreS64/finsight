import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Account } from "./AccountsPanel";
import { formatVnd } from "./money";
import { reportDate } from "./reportDate";
import "./RecurringPanel.css";

type Kind = "INCOME" | "EXPENSE";
type Cadence = "WEEKLY" | "MONTHLY";
type Category = { id: string; name: string; categoryType: Kind };
type Rule = { id: string; accountId: string; categoryId: string; name: string; kind: Kind; amount: string;
  cadence: Cadence; nextDueOn: string; active: boolean; note: string | null };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const validAmount = (value: string) => /^\d{1,17}(?:[.,]\d{1,2})?$/.test(value.trim()) && /[1-9]/.test(value);

export default function RecurringPanel({ session, accounts, onChanged }: { session: Session; accounts: Account[]; onChanged: () => void }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [kind, setKind] = useState<Kind>("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [cadence, setCadence] = useState<Cadence>("MONTHLY");
  const [nextDueOn, setNextDueOn] = useState(reportDate);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const headers = { Authorization: `Bearer ${session.access_token}` };
    Promise.all([
      fetch(`${apiBase}/api/v1/recurring-rules`, { headers, signal: controller.signal }),
      fetch(`${apiBase}/api/v1/categories`, { headers, signal: controller.signal }),
    ]).then(async ([rulesResponse, categoriesResponse]) => {
      if (!rulesResponse.ok || !categoriesResponse.ok) throw new Error("Không tải được giao dịch định kỳ hoặc danh mục.");
      setRules(await rulesResponse.json() as Rule[]); setCategories(await categoriesResponse.json() as Category[]); setLoaded(true);
    }).catch((reason: unknown) => { if (!controller.signal.aborted) { setMessage(reason instanceof Error ? reason.message : "Không tải được dữ liệu."); setLoaded(true); } });
    return () => controller.abort();
  }, [session.access_token]);

  const selectedAccount = accounts.some((item) => item.id === accountId) ? accountId : accounts[0]?.id ?? "";
  const availableCategories = categories.filter((item) => item.categoryType === kind);
  const selectedCategory = availableCategories.some((item) => item.id === categoryId) ? categoryId : availableCategories[0]?.id ?? "";
  const categoryName = (id: string) => categories.find((item) => item.id === id)?.name ?? "Danh mục đã thay đổi";
  const accountName = (id: string) => accounts.find((item) => item.id === id)?.name ?? "Tài khoản đã thay đổi";

  function reset() { setEditing(null); setName(""); setAccountId(""); setKind("EXPENSE"); setCategoryId(""); setAmount(""); setCadence("MONTHLY"); setNextDueOn(reportDate()); setNote(""); }
  function edit(rule: Rule) { setEditing(rule.id); setName(rule.name); setAccountId(rule.accountId); setKind(rule.kind); setCategoryId(rule.categoryId); setAmount(rule.amount); setCadence(rule.cadence); setNextDueOn(rule.nextDueOn); setNote(rule.note ?? ""); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAccount || !selectedCategory || !validAmount(amount) || !name.trim() || !nextDueOn) { setMessage("Nhập đầy đủ thông tin và số tiền hợp lệ."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/recurring-rules${editing ? `/${editing}` : ""}`, {
        method: editing ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccount, categoryId: selectedCategory, name: name.trim(), kind,
          amount: amount.trim().replace(",", "."), cadence, nextDueOn, active: editing ? rules.find((item) => item.id === editing)?.active ?? true : true, note: note.trim() || null }),
      });
      if (!response.ok) throw new Error(`Không lưu được lịch định kỳ (HTTP ${response.status}).`);
      const saved = await response.json() as Rule;
      setRules((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      reset(); setMessage("Đã lưu lịch định kỳ. Chưa có giao dịch nào được ghi tự động.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không lưu được lịch định kỳ."); }
    finally { setBusy(false); }
  }

  async function changeActive(rule: Rule) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/recurring-rules/${rule.id}`, {
        method: "PUT", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: rule.accountId, categoryId: rule.categoryId, name: rule.name, kind: rule.kind,
          amount: rule.amount, cadence: rule.cadence, nextDueOn: rule.nextDueOn, active: !rule.active, note: rule.note }),
      });
      if (!response.ok) throw new Error(`Không cập nhật được lịch (HTTP ${response.status}).`);
      const saved = await response.json() as Rule;
      setRules((current) => current.map((item) => item.id === saved.id ? saved : item));
      setMessage(saved.active ? "Đã tiếp tục lịch định kỳ." : "Đã tạm dừng lịch định kỳ.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không cập nhật được lịch."); }
    finally { setBusy(false); }
  }

  async function process(rule: Rule) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/recurring-rules/${rule.id}/process`, {
        method: "POST", headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error(response.status === 409 ? "Có quá nhiều kỳ đến hạn; hãy sửa ngày đến hạn trước." : `Không ghi nhận được kỳ đến hạn (HTTP ${response.status}).`);
      const result = await response.json() as { createdTransactions: number; nextDueOn: string };
      setRules((current) => current.map((item) => item.id === rule.id ? { ...item, nextDueOn: result.nextDueOn } : item));
      if (result.createdTransactions) onChanged();
      setMessage(`Đã ghi ${result.createdTransactions} giao dịch đến hạn. Kỳ tiếp theo: ${result.nextDueOn}.`);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không ghi nhận được kỳ đến hạn."); }
    finally { setBusy(false); }
  }

  return <><div className="recurring-info">Lịch chỉ nhắc khoản định kỳ. Giao dịch thật chỉ được tạo khi bạn bấm “Ghi nhận đến hạn”. Mỗi ngày đến hạn được ghi một lần.</div>
    <div className="recurring-layout"><section className="surface-card"><div className="section-head"><div><p className="eyebrow">LỊCH CỦA BẠN</p><h2>Khoản định kỳ</h2></div><span className="small-badge">{loaded ? rules.length : "—"} khoản</span></div>
      {!loaded ? <p className="muted">Đang tải lịch...</p> : rules.length ? <div className="recurring-list">{rules.map((rule) => <article key={rule.id}><div><strong>{rule.name}</strong><span>{rule.active ? "Đang chạy" : "Tạm dừng"}</span></div><p>{formatVnd(rule.amount)} · {rule.kind === "EXPENSE" ? "Chi" : "Thu"} · {rule.cadence === "WEEKLY" ? "Hàng tuần" : "Hàng tháng"}</p><small>{accountName(rule.accountId)} · {categoryName(rule.categoryId)} · đến hạn {rule.nextDueOn}</small><div className="recurring-actions"><button className="link-button" onClick={() => edit(rule)}>Sửa</button><button className="link-button" disabled={busy} onClick={() => changeActive(rule)}>{rule.active ? "Tạm dừng" : "Tiếp tục"}</button>{rule.active && rule.nextDueOn <= reportDate() && <button className="button-primary" disabled={busy} onClick={() => process(rule)}>Ghi nhận đến hạn</button>}</div></article>)}</div> : <div className="empty-state compact"><span>↻</span><h3>Chưa có khoản định kỳ</h3><p>Tạo lịch lương, tiền thuê hoặc dịch vụ thường kỳ.</p></div>}
    </section><section className="surface-card recurring-form"><p className="eyebrow">THIẾT LẬP</p><h2>{editing ? "Sửa lịch" : "Tạo lịch mới"}</h2><form onSubmit={save}>
      <label>Tên khoản<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required placeholder="Ví dụ: Internet" /></label>
      <label>Loại<select value={kind} onChange={(event) => { setKind(event.target.value as Kind); setCategoryId(""); }}><option value="EXPENSE">Chi tiêu</option><option value="INCOME">Thu nhập</option></select></label>
      <label>Tài khoản<select value={selectedAccount} onChange={(event) => setAccountId(event.target.value)} required>{!accounts.length && <option value="">Thêm tài khoản trước</option>}{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Danh mục<select value={selectedCategory} onChange={(event) => setCategoryId(event.target.value)} required>{!availableCategories.length && <option value="">Chưa có danh mục</option>}{availableCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Số tiền (VND)<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" required placeholder="Ví dụ: 250000" /></label>
      <label>Chu kỳ<select value={cadence} onChange={(event) => setCadence(event.target.value as Cadence)}><option value="WEEKLY">Hàng tuần</option><option value="MONTHLY">Hàng tháng</option></select></label>
      <label>Ngày đến hạn tiếp theo<input type="date" value={nextDueOn} onChange={(event) => setNextDueOn(event.target.value)} required /></label>
      <label>Ghi chú (tùy chọn)<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={500} /></label>
      <button className="button-primary" disabled={busy || !accounts.length || !availableCategories.length}>{busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo lịch"}</button>{editing && <button type="button" className="button-outline" onClick={reset}>Hủy sửa</button>}
    </form>{message && <p className="auth-message" role="status">{message}</p>}</section></div></>;
}
