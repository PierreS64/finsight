import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd, sumBalances } from "./money";
import "./GoalPanel.css";

type Goal = { id: string; name: string; targetAmount: string; savedAmount: string; remainingAmount: string; progressPercent: string; targetDate: string | null; note: string | null; achieved: boolean; overdue: boolean };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const money = (value: string, positive: boolean) => /^\d{1,17}(?:[.,]\d{1,2})?$/.test(value.trim()) && (!positive || /[1-9]/.test(value));

export default function GoalPanel({ session }: { session: Session }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [savedAmount, setSavedAmount] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "achieved">("all");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/goals`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(`Không tải được mục tiêu (HTTP ${response.status}).`); setGoals(await response.json() as Goal[]); setLoaded(true); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Không tải được mục tiêu."); setLoaded(true); } });
    return () => controller.abort();
  }, [session.access_token]);

  function reset() { setEditingId(null); setName(""); setTargetAmount(""); setSavedAmount("0"); setTargetDate(""); setNote(""); }
  function edit(goal: Goal) { setEditingId(goal.id); setName(goal.name); setTargetAmount(goal.targetAmount); setSavedAmount(goal.savedAmount); setTargetDate(goal.targetDate ?? ""); setNote(goal.note ?? ""); setMessage(""); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!name.trim() || !money(targetAmount, true) || !money(savedAmount, false)) { setMessage("Nhập tên và số tiền hợp lệ, tối đa hai chữ số thập phân."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/goals${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), targetAmount: targetAmount.replace(",", "."), savedAmount: savedAmount.replace(",", "."), targetDate: targetDate || null, note: note.trim() || null }),
      });
      if (!response.ok) throw new Error(`Không lưu được mục tiêu (HTTP ${response.status}).`);
      const goal = await response.json() as Goal;
      setGoals((current) => editingId ? current.map((item) => item.id === editingId ? goal : item) : [goal, ...current]);
      reset(); setMessage("Đã lưu mục tiêu tiết kiệm.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không lưu được mục tiêu."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/goals/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) throw new Error(`Không xóa được mục tiêu (HTTP ${response.status}).`);
      setGoals((current) => current.filter((goal) => goal.id !== id)); if (editingId === id) reset(); setDeletingId(null); setMessage("Đã xóa mục tiêu.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không xóa được mục tiêu."); }
    finally { setBusy(false); }
  }

  const visible = goals.filter((goal) => (filter === "all" || (filter === "achieved" ? goal.achieved : !goal.achieved)) && goal.name.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi")));
  const activeCount = goals.filter((goal) => !goal.achieved).length;
  return <div className="goals-page"><div className="surface-card goals-toolbar"><div><label className="goal-search"><span className="material-symbols-outlined" aria-hidden="true">search</span><input aria-label="Tìm mục tiêu tiết kiệm" placeholder="Tìm mục tiêu tiết kiệm..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="goal-filters" role="group" aria-label="Lọc mục tiêu"><button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>Tất cả ({goals.length})</button><button className={filter === "active" ? "selected" : ""} onClick={() => setFilter("active")}>Đang tích lũy ({activeCount})</button><button className={filter === "achieved" ? "selected" : ""} onClick={() => setFilter("achieved")}>Đã hoàn thành ({goals.length - activeCount})</button></div></div><button className="button-primary" onClick={() => { reset(); document.getElementById("goal-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span className="material-symbols-outlined" aria-hidden="true">add</span> Tạo mục tiêu mới</button></div>
    <div className="goals-metrics"><div className="surface-card"><span>Tổng tiền đã tích lũy</span><strong>{formatVnd(sumBalances(goals.map((goal) => goal.savedAmount)))}</strong></div><div className="surface-card"><span>Mục tiêu đang chạy</span><strong>{activeCount} mục tiêu</strong></div><div className="surface-card"><span>Tổng kế hoạch</span><strong>{formatVnd(sumBalances(goals.map((goal) => goal.targetAmount)))}</strong></div></div>
    <section className="goals-list"><div className="section-head"><h2>Danh sách mục tiêu</h2><span className="muted">{visible.length} mục tiêu</span></div><p className="muted">Số tiền tích lũy do bạn tự theo dõi, không tự thay đổi số dư tài khoản.</p>
    {error && <p className="inline-error" role="alert">{error}</p>}{!loaded && <p className="muted">Đang tải mục tiêu...</p>}
    {loaded && !goals.length && !error && <div className="empty-state compact"><span>◎</span><h3>Chưa có mục tiêu</h3><p>Thêm mục tiêu đầu tiên để theo dõi kế hoạch tiết kiệm.</p></div>}
    <div className="goal-items">{visible.map((goal) => <article key={goal.id}><div className="goal-row"><div><h3>{goal.name}</h3><p>{goal.achieved ? "Đã hoàn thành" : goal.overdue ? "Đã quá hạn" : "Đang tích lũy"}</p></div><strong className="goal-percent">{goal.progressPercent}%</strong></div><div className="goal-amount"><span>Số tích lũy từ khi:</span><strong>{formatVnd(goal.savedAmount)} <small>/ {formatVnd(goal.targetAmount)}</small></strong></div><span className="goal-track"><i style={{ width: `${Math.min(100, Number.parseFloat(goal.progressPercent))}%` }} /></span><div className="goal-row goal-detail"><span>{goal.achieved ? "Đã đạt mục tiêu" : `Còn ${formatVnd(goal.remainingAmount)}`}</span><span>{goal.targetDate ? `Hạn ${goal.targetDate.split("-").reverse().join("/")}` : "Không đặt hạn"}</span></div>{goal.note && <p className="muted">{goal.note}</p>}<div className="goal-actions"><button className="button-primary" onClick={() => { edit(goal); document.getElementById("goal-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Cập nhật tích lũy</button><button className="button-outline" onClick={() => { edit(goal); document.getElementById("goal-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Sửa mục tiêu</button><button className="link-button danger" onClick={() => setDeletingId(goal.id)}>Xóa</button></div>{deletingId === goal.id && <div className="goal-confirm"><span>Xóa mục tiêu này?</span><button className="link-button danger" disabled={busy} onClick={() => remove(goal.id)}>Xác nhận xóa</button><button className="link-button" onClick={() => setDeletingId(null)}>Hủy</button></div>}</article>)}</div>{loaded && goals.length > 0 && visible.length === 0 && <div className="empty-state compact"><h3>Không tìm thấy mục tiêu</h3><p>Thử từ khóa hoặc trạng thái khác.</p></div>}
  </section><section id="goal-form" className="surface-card goals-form"><p className="eyebrow">KẾ HOẠCH TIẾT KIỆM</p><h2>{editingId ? "Cập nhật mục tiêu" : "Tạo mục tiêu mới"}</h2><form onSubmit={save}><label>Tên mục tiêu<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Quỹ học tập" /></label><label>Số tiền đích (VND)<input required inputMode="decimal" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder="Ví dụ: 10000000" /></label><label>Đã dành (VND)<input required inputMode="decimal" value={savedAmount} onChange={(event) => setSavedAmount(event.target.value)} /></label><label>Ngày muốn đạt (tùy chọn)<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></label><label>Ghi chú (tùy chọn)<textarea rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="button-primary" disabled={busy}>{busy ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm mục tiêu"}</button>{editingId && <button type="button" className="button-outline" onClick={reset}>Hủy chỉnh sửa</button>}</form>{message && <p className="auth-message" role="status">{message}</p>}</section></div>;
}
