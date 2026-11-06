import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd } from "./money";
import { reportMonth } from "./reportDate";
import ChartsPanel from "./ChartsPanel";
import FinancialHealthPanel from "./FinancialHealthPanel";
import SpendingTrendsPanel from "./SpendingTrendsPanel";
import SpendingProfilePanel from "./SpendingProfilePanel";
import WhatIfPanel from "./WhatIfPanel";
import ExpenseForecastPanel from "./ExpenseForecastPanel";
import SafeToSpendPanel from "./SafeToSpendPanel";
import "./AnalyticsPanel.css";

type View = "overview" | "trends" | "insights" | "explanation" | "profile" | "what-if" | "forecast" | "safe";
type Dashboard = { totalBalance: string; income: string; expense: string; netFlow: string; budget: { limitAmount: string; usedPercent: string } | null };
type Insight = { type: string; title: string; content: string; severity: "WARNING" | "CRITICAL"; period: string };
type Insights = { cards: Insight[] };
type Explanation = { month: string; previousMonth: string; currentTotal: string; previousTotal: string; changeAmount: string; categories: { categoryId: string; categoryName: string; currentAmount: string; previousAmount: string; changeAmount: string }[] };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const views: { id: View; label: string }[] = [
  { id: "overview", label: "Tổng quan" }, { id: "trends", label: "Xu hướng thu chi" },
  { id: "insights", label: "Nhận xét chi tiêu" }, { id: "explanation", label: "Biến động" },
  { id: "profile", label: "Hồ sơ chi tiêu" }, { id: "what-if", label: "Mô phỏng" },
  { id: "forecast", label: "Dự báo" }, { id: "safe", label: "Mức chi an toàn" },
];

export default function AnalyticsPanel({ session, onAssistant }: { session: Session; onAssistant: () => void }) {
  const [view, setView] = useState<View>("overview");
  const [month, setMonth] = useState(reportMonth);
  const [dashboardSnapshot, setDashboardSnapshot] = useState<{ key: string; value: Dashboard } | null>(null);
  const [insightSnapshot, setInsightSnapshot] = useState<{ key: string; value: Insights } | null>(null);
  const [explanationSnapshot, setExplanationSnapshot] = useState<{ key: string; value: Explanation } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const key = `${session.access_token}/${month}`;
  const dashboard = dashboardSnapshot?.key === key ? dashboardSnapshot.value : null;
  const insights = insightSnapshot?.key === key ? insightSnapshot.value : null;
  const explanation = explanationSnapshot?.key === key ? explanationSnapshot.value : null;
  const error = failure?.key === key ? failure.message : "";

  useEffect(() => {
    const controller = new AbortController();
    const headers = { Authorization: `Bearer ${session.access_token}` };
    Promise.allSettled([
      fetch(`${apiBase}/api/v1/dashboard?month=${month}`, { headers, signal: controller.signal }).then(async (r) => { if (!r.ok) throw new Error("Không tải được chỉ số phân tích."); return r.json() as Promise<Dashboard>; }),
      fetch(`${apiBase}/api/v1/insights?month=${month}`, { headers, signal: controller.signal }).then(async (r) => { if (!r.ok) throw new Error("Không tải được nhận xét chi tiêu."); return r.json() as Promise<Insights>; }),
      fetch(`${apiBase}/api/v1/spending-explanation?month=${month}`, { headers, signal: controller.signal }).then(async (r) => { if (!r.ok) throw new Error("Không tải được biến động chi tiêu."); return r.json() as Promise<Explanation>; }),
    ]).then(([dashboardResult, insightResult, explanationResult]) => {
      if (controller.signal.aborted) return;
      if (dashboardResult.status === "fulfilled") setDashboardSnapshot({ key, value: dashboardResult.value }); else setFailure({ key, message: "Không tải được chỉ số phân tích." });
      if (insightResult.status === "fulfilled") setInsightSnapshot({ key, value: insightResult.value });
      if (explanationResult.status === "fulfilled") setExplanationSnapshot({ key, value: explanationResult.value });
    });
    return () => controller.abort();
  }, [session.access_token, month, key]);

  return <div className="analytics-panel">
    <div className="analytics-toolbar"><label><span className="material-symbols-outlined" aria-hidden="true">calendar_month</span><input aria-label="Tháng phân tích" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label><span className="analytics-balance">Tổng số dư hiện tại: <strong>{dashboard ? formatVnd(dashboard.totalBalance) : "—"}</strong></span><button className="button-outline" onClick={onAssistant}>Trợ lý AI →</button></div>
    <nav className="analytics-tabs" aria-label="Báo cáo phân tích">{views.map((item) => <button key={item.id} className={view === item.id ? "selected" : ""} onClick={() => setView(item.id)}>{item.label}</button>)}</nav>
    {error && <p className="inline-error" role="alert">{error}</p>}
    {view === "overview" && <><div className="analytics-metrics"><article className="metric-card"><small>Tổng chi tiêu thực tế</small><strong className="money-out">{dashboard ? formatVnd(dashboard.expense) : "—"}</strong><span>{dashboard?.budget ? `Đã dùng ${dashboard.budget.usedPercent}% ngân sách` : "Chưa đặt ngân sách tổng"}</span></article><article className="metric-card"><small>Tổng thu nhập thực tế</small><strong className="money-in">{dashboard ? formatVnd(dashboard.income) : "—"}</strong><span>Giao dịch thu trong {month}</span></article><article className="metric-card"><small>Thặng dư tài chính</small><strong className={dashboard?.netFlow.startsWith("-") ? "money-out" : "money-in"}>{dashboard ? formatVnd(dashboard.netFlow) : "—"}</strong><span>Thu trừ chi trong kỳ</span></article><article className="metric-card"><small>Mức chi an toàn / ngày</small><button className="link-button" onClick={() => setView("safe")}>Xem chỉ số →</button><span>Được tính từ ngân sách và khoản chi sắp tới</span></article></div><div className="analytics-overview-grid"><ChartsPanel session={session} month={month} />{month === reportMonth() && <FinancialHealthPanel session={session} />}</div><section className="surface-card analytics-highlight"><div className="section-head"><h2>Nhận xét nổi bật</h2><button className="link-button" onClick={() => setView("insights")}>Xem tất cả →</button></div>{insights?.cards.length ? <><strong>{insights.cards[0].title}</strong><p>{insights.cards[0].content}</p></> : <p className="muted">Chưa có nhận xét cần chú ý trong tháng này.</p>}</section></>}
    {view === "trends" && <><ChartsPanel session={session} month={month} /><SpendingTrendsPanel session={session} month={month} /></>}
    {view === "insights" && <section className="surface-card"><div className="section-head"><h2>Nhận xét chi tiêu · {month}</h2></div>{insights ? insights.cards.length ? <div className="analytics-insight-grid">{insights.cards.map((item, index) => <article key={`${item.type}-${index}`} className={item.severity === "CRITICAL" ? "critical" : ""}><small>{item.severity === "CRITICAL" ? "CẦN CHÚ Ý" : "CẢNH BÁO"}</small><h3>{item.title}</h3><p>{item.content}</p><span>Kỳ {item.period}</span></article>)}</div> : <p className="muted">Chưa có nhận xét cần chú ý trong tháng này.</p> : <p className="muted">Đang tải nhận xét...</p>}</section>}
    {view === "explanation" && <section className="surface-card"><div className="section-head"><h2>Biến động chi tiêu</h2></div>{explanation ? <><p className="muted">So sánh tháng {explanation.month} với {explanation.previousMonth}.</p><div className="analytics-explanation-totals"><div><small>THÁNG TRƯỚC</small><strong>{formatVnd(explanation.previousTotal)}</strong></div><div><small>THÁNG ĐANG XEM</small><strong>{formatVnd(explanation.currentTotal)}</strong></div><div><small>CHÊNH LỆCH</small><strong>{formatVnd(explanation.changeAmount)}</strong></div></div>{explanation.categories.length ? <div className="analytics-explanation-list">{explanation.categories.map((item) => <div key={item.categoryId}><strong>{item.categoryName}</strong><span>{formatVnd(item.previousAmount)} → {formatVnd(item.currentAmount)}</span><b>{formatVnd(item.changeAmount)}</b></div>)}</div> : <p className="muted">Chưa có biến động theo danh mục.</p>}</> : <p className="muted">Đang tải biến động...</p>}</section>}
    {view === "profile" && <SpendingProfilePanel session={session} month={month} />}
    {view === "what-if" && <WhatIfPanel session={session} month={month} />}
    {view === "forecast" && (month === reportMonth() ? <ExpenseForecastPanel session={session} /> : <p className="muted">Dự báo chỉ áp dụng cho tháng hiện tại.</p>)}
    {view === "safe" && (month === reportMonth() ? <SafeToSpendPanel session={session} /> : <p className="muted">Mức chi an toàn chỉ áp dụng cho tháng hiện tại.</p>)}
  </div>;
}
