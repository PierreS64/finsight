import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd } from "./money";
import { reportDatePlusDays } from "./reportDate";
import "./UpcomingExpensesPanel.css";

type Item = { ruleId: string; name: string; amount: string; dueOn: string; overdue: boolean };
type Summary = { from: string; to: string; total: string; count: number; items: Item[]; calculationRule: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function UpcomingExpensesPanel({ session }: { session: Session }) {
  const [from, setFrom] = useState(() => reportDatePlusDays(-30));
  const [to, setTo] = useState(() => reportDatePlusDays(30));
  const [range, setRange] = useState({ from, to });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
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
  function quickRange(days: number) { const start = reportDatePlusDays(0); const end = reportDatePlusDays(days); setFrom(start); setTo(end); setError(""); setSummary(null); setRange({ from: start, to: end }); }
  const visible = summary?.items.filter((item) => item.name.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"))) ?? [];
  return <div className="upcoming-page"><div className="upcoming-metrics"><div className="surface-card"><span>Khoản chi trong khoảng đã chọn</span><strong>{summary ? formatVnd(summary.total) : "—"}</strong><small>{summary ? `${summary.count} kỳ đến hạn` : "Đang tải..."}</small></div><div className="surface-card"><span>Khoảng xem</span><strong>{range.from.split("-").reverse().join("/")} – {range.to.split("-").reverse().join("/")}</strong><small>Chỉ gồm quy tắc chi đang hoạt động</small></div></div>
    <div className="surface-card upcoming-toolbar"><div className="upcoming-quick" role="group" aria-label="Chọn nhanh khoảng ngày"><button onClick={() => quickRange(7)}>7 ngày tới</button><button onClick={() => quickRange(14)}>14 ngày tới</button><button onClick={() => quickRange(30)}>30 ngày tới</button></div><label className="upcoming-search"><span className="material-symbols-outlined" aria-hidden="true">search</span><input aria-label="Tìm khoản chi sắp tới" placeholder="Tìm theo tên khoản chi..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="upcoming-range"><label>Từ ngày<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>Đến ngày<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><button className="button-outline" onClick={apply}>Áp dụng</button></div></div>
    <section className="upcoming-panel"><div className="section-head"><h2>Lịch trình nghĩa vụ tài chính</h2><span className="muted">{visible.length} khoản</span></div>
    {error && <p className="inline-error" role="alert">{error}</p>}
    {!summary && !error && <p className="muted">Đang tải lịch chi...</p>}
    {summary && (visible.length ? <ul className="upcoming-list">{visible.map((item) => <li key={`${item.ruleId}-${item.dueOn}`} className={item.overdue ? "overdue" : ""}><span className="upcoming-icon material-symbols-outlined" aria-hidden="true">event</span><span className="upcoming-detail"><strong>{item.name}</strong><small>Hạn: {item.dueOn.split("-").reverse().join("/")}{item.overdue ? " · Quá hạn" : ""}</small></span><b>{formatVnd(item.amount)}</b></li>)}</ul> : <div className="empty-state compact"><span>◷</span><h3>Không có khoản chi phù hợp</h3><p>Thêm lịch chi định kỳ hoặc chọn khoảng ngày khác.</p></div>)}
    <p className="muted">Số tiền dự kiến chưa trừ khỏi số dư. Ghi nhận khoản đến hạn trong tab Giao dịch định kỳ.</p></section></div>;
}
