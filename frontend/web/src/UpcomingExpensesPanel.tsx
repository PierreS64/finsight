import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd } from "./money";
import "./UpcomingExpensesPanel.css";

type Item = { ruleId: string; name: string; amount: string; dueOn: string; overdue: boolean };
type Summary = { from: string; to: string; total: string; count: number; items: Item[]; calculationRule: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const dateValue = (offset: number) => {
  const date = new Date(); date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function UpcomingExpensesPanel({ session }: { session: Session }) {
  const [from, setFrom] = useState(() => dateValue(-30));
  const [to, setTo] = useState(() => dateValue(30));
  const [range, setRange] = useState({ from, to });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/upcoming-expenses?from=${range.from}&to=${range.to}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Không tải được khoản sắp đến hạn (HTTP ${response.status}).`);
      setSummary(await response.json() as Summary);
    }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được dữ liệu."); });
    return () => controller.abort();
  }, [session.access_token, range]);
  function apply() {
    if (!from || !to || from > to || (new Date(to).getTime() - new Date(from).getTime()) > 366 * 86400000) {
      setError("Chọn khoảng ngày hợp lệ, tối đa 366 ngày."); return;
    }
    setError(""); setSummary(null); setRange({ from, to });
  }
  return <section className="surface-card upcoming-panel"><div className="section-head"><div><p className="eyebrow">KẾ HOẠCH SẮP TỚI</p><h2>Khoản chi đến hạn</h2></div><strong>{summary ? formatVnd(summary.total) : "—"}</strong></div>
    <div className="upcoming-range"><label>Từ ngày<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Đến ngày<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><button className="button-outline" onClick={apply}>Xem khoảng</button></div>
    {error && <p className="inline-error" role="alert">{error}</p>}
    {!summary && !error && <p className="muted">Đang tải lịch chi...</p>}
    {summary && (summary.items.length ? <ul className="upcoming-list">{summary.items.map((item) => <li key={`${item.ruleId}-${item.dueOn}`}><span><strong>{item.name}</strong><small>{item.dueOn}{item.overdue ? " · Quá hạn" : ""}</small></span><b>{formatVnd(item.amount)}</b></li>)}</ul> : <div className="empty-state compact"><span>◷</span><h3>Không có khoản chi đến hạn</h3><p>Thêm lịch chi định kỳ hoặc chọn khoảng ngày khác.</p></div>)}
    <p className="muted">Chỉ tính lịch chi đang hoạt động và kỳ chưa ghi nhận. Số tiền dự kiến chưa trừ khỏi số dư.</p>
  </section>;
}
