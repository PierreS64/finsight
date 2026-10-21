import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Account } from "./AccountsPanel";
import { formatVnd } from "./money";
import SpendingProfilePanel from "./SpendingProfilePanel";
import WhatIfPanel from "./WhatIfPanel";
import ChartsPanel from "./ChartsPanel";
import SpendingTrendsPanel from "./SpendingTrendsPanel";
import ExpenseForecastPanel from "./ExpenseForecastPanel";
import UpcomingExpensesPanel from "./UpcomingExpensesPanel";
import "./DashboardPanel.css";

type Dashboard = { month: string; accountCount: number; transactionCount: number; totalBalance: string; income: string; expense: string; netFlow: string; budget: { limitAmount: string; remaining: string; usedPercent: string } | null };
type InsightCard = { type: string; title: string; content: string; severity: "WARNING" | "CRITICAL"; period: string; currentAmount: string; referenceAmount: string; thresholdPercent: string };
type Insights = { month: string; cards: InsightCard[] };
type Explanation = { month: string; previousMonth: string; currentTotal: string; previousTotal: string; changeAmount: string; categories: { categoryId: string; categoryName: string; currentAmount: string; previousAmount: string; changeAmount: string; contributionPercent: string | null }[]; calculationRule: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const currentMonth = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; };

export default function DashboardPanel({ session, displayName, accounts, accountsLoaded, accountsError, onNavigate }: {
  session: Session; displayName: string | null; accounts: Account[]; accountsLoaded: boolean; accountsError: string;
  onNavigate: (page: "accounts" | "transactions" | "budgets") => void;
}) {
  const [month, setMonth] = useState(currentMonth);
  const [snapshot, setSnapshot] = useState<{ key: string; value: Dashboard } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [insightSnapshot, setInsightSnapshot] = useState<{ key: string; value: Insights } | null>(null);
  const [insightFailure, setInsightFailure] = useState<{ key: string; message: string } | null>(null);
  const [explanationSnapshot, setExplanationSnapshot] = useState<{ key: string; value: Explanation } | null>(null);
  const [explanationFailure, setExplanationFailure] = useState<{ key: string; message: string } | null>(null);
  const key = `${session.access_token}/${month}`;
  const dashboard = snapshot?.key === key ? snapshot.value : null;
  const error = failure?.key === key ? failure.message : "";
  const insights = insightSnapshot?.key === key ? insightSnapshot.value : null;
  const insightError = insightFailure?.key === key ? insightFailure.message : "";
  const explanation = explanationSnapshot?.key === key ? explanationSnapshot.value : null;
  const explanationError = explanationFailure?.key === key ? explanationFailure.message : "";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/dashboard?month=${month}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Không tải được tổng quan (HTTP ${response.status}).`);
      setSnapshot({ key, value: await response.json() as Dashboard });
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setFailure({ key, message: reason instanceof Error ? reason.message : "Không tải được tổng quan." });
    });
    return () => controller.abort();
  }, [session.access_token, month, key]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/spending-explanation?month=${month}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Không tải được giải thích chi tiêu (HTTP ${response.status}).`);
      setExplanationSnapshot({ key, value: await response.json() as Explanation });
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setExplanationFailure({ key, message: reason instanceof Error ? reason.message : "Không tải được giải thích chi tiêu." });
    });
    return () => controller.abort();
  }, [session.access_token, month, key]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/insights?month=${month}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Không tải được insight (HTTP ${response.status}).`);
      setInsightSnapshot({ key, value: await response.json() as Insights });
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setInsightFailure({ key, message: reason instanceof Error ? reason.message : "Không tải được insight." });
    });
    return () => controller.abort();
  }, [session.access_token, month, key]);

  return <><div className="page-heading dashboard-heading"><div><p className="eyebrow">TỔNG QUAN CỦA BẠN</p><h1>Chào {displayName || "bạn"}!</h1><p>Đây là những thông tin đã được lưu trong FinSight.</p></div><label>Tháng xem báo cáo<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label></div>
    {error && <p className="inline-error" role="alert">{error}</p>}
    {!dashboard && !error && <p className="muted">Đang tải tổng quan...</p>}
    <div className="metric-grid dashboard-metrics"><article className="metric-card featured"><small>TỔNG SỐ DƯ HIỆN TẠI</small><strong>{dashboard ? formatVnd(dashboard.totalBalance) : "—"}</strong><span>Từ {dashboard?.accountCount ?? "—"} tài khoản do bạn quản lý</span></article><article className="metric-card"><small>THU NHẬP THÁNG</small><strong className="money-in">{dashboard ? formatVnd(dashboard.income) : "—"}</strong><span>Giao dịch trong {month}</span></article><article className="metric-card"><small>CHI TIÊU THÁNG</small><strong className="money-out">{dashboard ? formatVnd(dashboard.expense) : "—"}</strong><span>Giao dịch trong {month}</span></article><article className="metric-card"><small>NGÂN SÁCH CÒN LẠI</small><strong className={dashboard?.budget?.remaining.startsWith("-") ? "dashboard-over" : ""}>{dashboard?.budget ? formatVnd(dashboard.budget.remaining) : "—"}</strong><span>{dashboard?.budget ? `Hạn mức ${formatVnd(dashboard.budget.limitAmount)}` : "Chưa đặt ngân sách tổng"}</span></article></div>
    <section className="surface-card insights-section"><div className="section-head"><div><p className="eyebrow">GÓC NHÌN TỰ ĐỘNG</p><h2>Insight trong {month}</h2></div><span className="small-badge">{insights?.cards.length ?? 0} thẻ</span></div>
      {insightError ? <p className="inline-error" role="alert">{insightError}</p> : !insights ? <p className="muted">Đang tính insight...</p> : insights.cards.length ? <div className="insight-card-grid">{insights.cards.map((card, index) => <article key={`${card.type}-${index}`} className={`insight-card ${card.severity.toLowerCase()}`}><span>{card.severity === "CRITICAL" ? "CẦN CHÚ Ý" : "CẢNH BÁO"}</span><h3>{card.title}</h3><p>{card.content}</p><small>Kỳ {card.period} · Ngưỡng {card.thresholdPercent}%</small></article>)}</div> : <div className="empty-state compact"><span>✦</span><h3>Chưa có insight cho tháng này</h3><p>Thẻ sẽ xuất hiện khi chi tiêu tăng rõ rệt hoặc ngân sách tiến gần hạn mức.</p></div>}
    </section>
    <section className="surface-card explanation-section"><div className="section-head"><div><p className="eyebrow">GIẢI THÍCH CHI TIÊU</p><h2>Điều gì đã thay đổi?</h2></div></div>
      {explanationError ? <p className="inline-error" role="alert">{explanationError}</p> : !explanation ? <p className="muted">Đang so sánh hai tháng...</p> : <><p className="muted">So sánh toàn bộ tháng {explanation.month} với {explanation.previousMonth}. Chỉ tính giao dịch chi tiêu; khoản thu/hoàn tiền được ghi là thu nhập và chuyển khoản không tính vào đây.</p><div className="explanation-totals"><div><small>THÁNG TRƯỚC</small><strong>{formatVnd(explanation.previousTotal)}</strong></div><div><small>THÁNG ĐANG XEM</small><strong>{formatVnd(explanation.currentTotal)}</strong></div><div><small>CHÊNH LỆCH</small><strong className={explanation.changeAmount.startsWith("-") ? "money-in" : "money-out"}>{formatVnd(explanation.changeAmount)}</strong></div></div>{explanation.categories.length ? <ul className="explanation-list">{explanation.categories.map((item) => <li key={item.categoryId}><span><strong>{item.categoryName}</strong><small>{formatVnd(item.previousAmount)} → {formatVnd(item.currentAmount)}</small></span><span><strong>{formatVnd(item.changeAmount)}</strong><small>{item.contributionPercent === null ? "Hai chiều bù trừ" : `${item.contributionPercent}% chênh lệch ròng`}</small></span></li>)}</ul> : <div className="empty-state compact"><span>◫</span><h3>Chi tiêu chưa thay đổi theo danh mục</h3><p>Thêm giao dịch chi tiêu để xem nguyên nhân tăng hoặc giảm.</p></div>}<p className="explanation-note">Tổng chênh lệch của từng danh mục bằng chênh lệch hai tháng. Tỷ lệ có thể lớn hơn 100% khi các danh mục tăng và giảm bù trừ nhau.</p></>}
    </section>
    <SpendingProfilePanel session={session} month={month} />
    <ChartsPanel session={session} month={month} />
    <SpendingTrendsPanel session={session} month={month} />
    {month === currentMonth() && <ExpenseForecastPanel session={session} />}
    <UpcomingExpensesPanel session={session} />
    <WhatIfPanel session={session} month={month} />
    {dashboard && dashboard.accountCount === 0 && dashboard.transactionCount === 0 && <div className="surface-card dashboard-empty"><h2>Chưa có dữ liệu tài chính</h2><p>Hãy thêm tài khoản và giao dịch đầu tiên để xem tổng quan tháng.</p><button className="button-primary" onClick={() => onNavigate("accounts")}>Thêm tài khoản</button></div>}
    {accountsError && <p className="inline-error" role="alert">{accountsError}</p>}
    <div className="workspace-grid"><section className="surface-card"><div className="section-head"><div><p className="eyebrow">TÀI KHOẢN</p><h2>Tài khoản của bạn</h2></div><button className="link-button" onClick={() => onNavigate("accounts")}>Xem tất cả →</button></div>{!accountsLoaded ? <p className="muted">Đang tải tài khoản...</p> : accounts.length ? <div className="mini-list">{accounts.slice(0, 4).map((account) => <div key={account.id}><span className="list-icon">▣</span><span><strong>{account.name}</strong><small>Số dư hiện tại</small></span><b>{formatVnd(account.currentBalance)}</b></div>)}</div> : <div className="empty-state compact"><span>▣</span><h3>Chưa có tài khoản</h3><p>Thêm tài khoản đầu tiên để bắt đầu.</p><button className="button-primary" onClick={() => onNavigate("accounts")}>Thêm tài khoản</button></div>}</section>
      <section className="surface-card next-card"><p className="eyebrow">DÒNG TIỀN THÁNG</p><h2>{dashboard?.transactionCount ?? "—"} giao dịch</h2><p>{dashboard ? `Thu trừ chi: ${formatVnd(dashboard.netFlow)}.` : "Đang tải dữ liệu."} {dashboard?.budget ? `Đã dùng ${dashboard.budget.usedPercent}% ngân sách.` : "Bạn có thể đặt hạn mức tháng."}</p><div className="dashboard-links"><button className="button-outline" onClick={() => onNavigate("transactions")}>Xem giao dịch</button><button className="button-outline" onClick={() => onNavigate("budgets")}>Ngân sách</button></div></section></div>
  </>;
}
