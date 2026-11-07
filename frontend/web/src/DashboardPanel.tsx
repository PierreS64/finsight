import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Account } from "./AccountsPanel";
import { formatVnd } from "./money";
import { reportMonth } from "./reportDate";
import SpendingProfilePanel from "./SpendingProfilePanel";
import WhatIfPanel from "./WhatIfPanel";
import ChartsPanel from "./ChartsPanel";
import SpendingTrendsPanel from "./SpendingTrendsPanel";
import ExpenseForecastPanel from "./ExpenseForecastPanel";
import UpcomingExpensesPanel from "./UpcomingExpensesPanel";
import SafeToSpendPanel from "./SafeToSpendPanel";
import FinancialHealthPanel from "./FinancialHealthPanel";
import "./DashboardPanel.css";

type Dashboard = { month: string; accountCount: number; transactionCount: number; totalBalance: string; income: string; expense: string; netFlow: string; budget: { limitAmount: string; remaining: string; usedPercent: string } | null };
type InsightCard = { type: string; title: string; content: string; severity: "WARNING" | "CRITICAL"; period: string; currentAmount: string; referenceAmount: string; thresholdPercent: string };
type Insights = { month: string; cards: InsightCard[] };
type Explanation = { month: string; previousMonth: string; currentTotal: string; previousTotal: string; changeAmount: string; categories: { categoryId: string; categoryName: string; currentAmount: string; previousAmount: string; changeAmount: string; contributionPercent: string | null }[]; calculationRule: string };
type RecentTransaction = { id: string; accountId: string; categoryId: string; kind: "INCOME" | "EXPENSE"; amount: string; occurredOn: string; note: string | null };
type Category = { id: string; name: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function DashboardPanel({ session, accounts, accountsLoaded, accountsError, onNavigate }: {
  session: Session; accounts: Account[]; accountsLoaded: boolean; accountsError: string;
  onNavigate: (page: "accounts" | "transactions" | "budgets" | "receipts") => void;
}) {
  const [month, setMonth] = useState(reportMonth);
  const [snapshot, setSnapshot] = useState<{ key: string; value: Dashboard } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [insightSnapshot, setInsightSnapshot] = useState<{ key: string; value: Insights } | null>(null);
  const [insightFailure, setInsightFailure] = useState<{ key: string; message: string } | null>(null);
  const [explanationSnapshot, setExplanationSnapshot] = useState<{ key: string; value: Explanation } | null>(null);
  const [explanationFailure, setExplanationFailure] = useState<{ key: string; message: string } | null>(null);
  const [recentSnapshot, setRecentSnapshot] = useState<{ key: string; transactions: RecentTransaction[]; categories: Category[] } | null>(null);
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

  useEffect(() => {
    const controller = new AbortController();
    const headers = { Authorization: `Bearer ${session.access_token}` };
    Promise.all([
      fetch(`${apiBase}/api/v1/transactions`, { headers, signal: controller.signal }),
      fetch(`${apiBase}/api/v1/categories`, { headers, signal: controller.signal }),
    ]).then(async ([transactionsResponse, categoriesResponse]) => {
      if (!transactionsResponse.ok || !categoriesResponse.ok) return;
      setRecentSnapshot({ key, transactions: await transactionsResponse.json() as RecentTransaction[], categories: await categoriesResponse.json() as Category[] });
    }).catch(() => { /* The dashboard remains usable when recent rows cannot load. */ });
    return () => controller.abort();
  }, [session.access_token, key]);

  const recent = recentSnapshot?.key === key ? recentSnapshot.transactions.filter((item) => item.occurredOn.startsWith(month)).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)).slice(0, 5) : [];
  const categoryNames = new Map((recentSnapshot?.key === key ? recentSnapshot.categories : []).map((item) => [item.id, item.name]));
  const accountNames = new Map(accounts.map((item) => [item.id, item.name]));

  return <><div className="dashboard-intro"><div><h1>Tổng quan tài chính</h1><p>Số dư hiện tại và dòng tiền từ những giao dịch bạn đã ghi.</p></div><span className="dashboard-source">Dữ liệu do bạn quản lý</span></div><div className="dashboard-toolbar"><label><span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>Kỳ báo cáo <input type="month" aria-label="Tháng xem báo cáo" value={month} onChange={(event) => setMonth(event.target.value)} /></label><div><button className="button-outline" onClick={() => onNavigate("receipts")}><span className="material-symbols-outlined" aria-hidden="true">document_scanner</span>Quét hóa đơn</button><button className="button-primary" onClick={() => onNavigate("transactions")}><span className="material-symbols-outlined" aria-hidden="true">add</span>Thêm giao dịch</button></div></div>
    {error && <p className="inline-error" role="alert">{error}</p>}
    {!dashboard && !error && <p className="dashboard-loading" role="status">Đang tải tổng quan...</p>}
    <div className="metric-grid dashboard-metrics"><article className="metric-card featured"><small>Số dư các tài khoản hiện tại</small><strong>{dashboard ? formatVnd(dashboard.totalBalance) : "—"}</strong><span>{dashboard ? `${dashboard.accountCount} tài khoản do bạn quản lý · không gồm tài sản khác` : "Đang tải số dư tài khoản"}</span></article><article className="metric-card"><small>Thu trong tháng {month}</small><strong className="money-in">{dashboard ? formatVnd(dashboard.income) : "—"}</strong><span>Không tính chuyển khoản nội bộ</span></article><article className="metric-card"><small>Chi trong tháng {month}</small><strong className="money-out">{dashboard ? formatVnd(dashboard.expense) : "—"}</strong><span>Không tính chuyển khoản nội bộ</span></article></div>
    <p className="dashboard-net-flow"><span>Dòng tiền ròng tháng {month}</span><strong>{dashboard ? formatVnd(dashboard.netFlow) : "—"}</strong><span>Thu trừ chi từ giao dịch đã ghi</span></p>
    <div className={`dashboard-main-grid ${month === reportMonth() ? "" : "historical-month"}`}>{month === reportMonth() && <SafeToSpendPanel session={session} />}<section className="surface-card dashboard-budget-card"><div className="section-head"><h2>Ngân sách tháng {month}</h2></div>{dashboard?.budget ? <><div className="dashboard-budget-total"><span>Đã chi / hạn mức tổng</span><strong>{formatVnd(dashboard.expense)} / {formatVnd(dashboard.budget.limitAmount)}</strong></div><div className="dashboard-budget-track" role="progressbar" aria-label="Ngân sách đã dùng" aria-valuenow={Math.min(100, Math.max(0, Number.parseFloat(dashboard.budget.usedPercent) || 0))} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.min(100, Math.max(0, Number.parseFloat(dashboard.budget.usedPercent) || 0))}%` }} /></div><div className="dashboard-budget-total"><span>{Number.parseFloat(dashboard.budget.usedPercent) >= 100 ? "Đã đạt hoặc vượt hạn mức" : Number.parseFloat(dashboard.budget.usedPercent) >= 80 ? "Sắp chạm hạn mức" : "Trong hạn mức"} · {dashboard.budget.usedPercent}% đã dùng</span><span>Còn lại: {formatVnd(dashboard.budget.remaining)}</span></div></> : <p className="muted">Chưa đặt ngân sách tổng cho tháng này.</p>}<button className="link-button" onClick={() => onNavigate("budgets")}>Xem ngân sách</button></section></div>
    <div className="dashboard-lower-grid"><div className="dashboard-trend"><ChartsPanel session={session} month={month} /></div><section className="surface-card dashboard-recent"><div className="section-head"><h2>Giao dịch gần đây</h2><button className="link-button" onClick={() => onNavigate("transactions")}>Tất cả giao dịch</button></div>{recent.length ? <div className="dashboard-recent-table"><table><thead><tr><th>Ngày</th><th>Tên giao dịch</th><th>Danh mục</th><th>Tài khoản</th><th>Số tiền</th></tr></thead><tbody>{recent.map((item) => <tr key={item.id}><td>{item.occurredOn.slice(8)}/{item.occurredOn.slice(5, 7)}</td><td>{item.note || (item.kind === "INCOME" ? "Khoản thu" : "Khoản chi")}</td><td>{categoryNames.get(item.categoryId) || "—"}</td><td>{accountNames.get(item.accountId) || "—"}</td><td className={item.kind === "INCOME" ? "money-in" : "money-out"}>{item.kind === "INCOME" ? "+" : "−"}{formatVnd(item.amount)}</td></tr>)}</tbody></table></div> : <p className="muted">Chưa có giao dịch nào trong tháng đang xem.</p>}<p className="dashboard-recent-foot">Hiển thị {recent.length} / {dashboard?.transactionCount ?? 0} giao dịch tháng {month}</p></section></div>
    <section className="surface-card insights-section"><div className="section-head"><div><p className="eyebrow">GÓC NHÌN TỰ ĐỘNG</p><h2>Insight trong {month}</h2></div><span className="small-badge">{insights?.cards.length ?? 0} thẻ</span></div>
      {insightError ? <p className="inline-error" role="alert">{insightError}</p> : !insights ? <p className="muted">Đang tính insight...</p> : insights.cards.length ? <div className="insight-card-grid">{insights.cards.map((card, index) => <article key={`${card.type}-${index}`} className={`insight-card ${card.severity.toLowerCase()}`}><span>{card.severity === "CRITICAL" ? "CẦN CHÚ Ý" : "CẢNH BÁO"}</span><h3>{card.title}</h3><p>{card.content}</p><small>Kỳ {card.period} · Ngưỡng {card.thresholdPercent}%</small></article>)}</div> : <div className="empty-state compact"><span>✦</span><h3>Chưa có insight cho tháng này</h3><p>Thẻ sẽ xuất hiện khi chi tiêu tăng rõ rệt hoặc ngân sách tiến gần hạn mức.</p></div>}
    </section>
    <section className="surface-card explanation-section"><div className="section-head"><div><p className="eyebrow">GIẢI THÍCH CHI TIÊU</p><h2>Điều gì đã thay đổi?</h2></div></div>
      {explanationError ? <p className="inline-error" role="alert">{explanationError}</p> : !explanation ? <p className="muted">Đang so sánh hai tháng...</p> : <><p className="muted">So sánh toàn bộ tháng {explanation.month} với {explanation.previousMonth}. Chỉ tính giao dịch chi tiêu; khoản thu/hoàn tiền được ghi là thu nhập và chuyển khoản không tính vào đây.</p><div className="explanation-totals"><div><small>THÁNG TRƯỚC</small><strong>{formatVnd(explanation.previousTotal)}</strong></div><div><small>THÁNG ĐANG XEM</small><strong>{formatVnd(explanation.currentTotal)}</strong></div><div><small>CHÊNH LỆCH</small><strong className={explanation.changeAmount.startsWith("-") ? "money-in" : "money-out"}>{formatVnd(explanation.changeAmount)}</strong></div></div>{explanation.categories.length ? <ul className="explanation-list">{explanation.categories.map((item) => <li key={item.categoryId}><span><strong>{item.categoryName}</strong><small>{formatVnd(item.previousAmount)} → {formatVnd(item.currentAmount)}</small></span><span><strong>{formatVnd(item.changeAmount)}</strong><small>{item.contributionPercent === null ? "Hai chiều bù trừ" : `${item.contributionPercent}% chênh lệch ròng`}</small></span></li>)}</ul> : <div className="empty-state compact"><span>◫</span><h3>Chi tiêu chưa thay đổi theo danh mục</h3><p>Thêm giao dịch chi tiêu để xem nguyên nhân tăng hoặc giảm.</p></div>}<p className="explanation-note">Tổng chênh lệch của từng danh mục bằng chênh lệch hai tháng. Tỷ lệ có thể lớn hơn 100% khi các danh mục tăng và giảm bù trừ nhau.</p></>}
    </section>
    <SpendingProfilePanel session={session} month={month} />
    {month === reportMonth() && <FinancialHealthPanel session={session} />}
    <SpendingTrendsPanel session={session} month={month} />
    {month === reportMonth() && <ExpenseForecastPanel session={session} />}
    <UpcomingExpensesPanel session={session} />
    <WhatIfPanel session={session} month={month} />
    {dashboard && dashboard.accountCount === 0 && dashboard.transactionCount === 0 && <div className="surface-card dashboard-empty"><h2>Chưa có dữ liệu tài chính</h2><p>Hãy thêm tài khoản và giao dịch đầu tiên để xem tổng quan tháng.</p><button className="button-primary" onClick={() => onNavigate("accounts")}>Thêm tài khoản</button></div>}
    {accountsError && <p className="inline-error" role="alert">{accountsError}</p>}
    <div className="workspace-grid"><section className="surface-card"><div className="section-head"><div><p className="eyebrow">TÀI KHOẢN</p><h2>Tài khoản của bạn</h2></div><button className="link-button" onClick={() => onNavigate("accounts")}>Xem tất cả →</button></div>{!accountsLoaded ? <p className="muted">Đang tải tài khoản...</p> : accounts.length ? <div className="mini-list">{accounts.slice(0, 4).map((account) => <div key={account.id}><span className="list-icon">▣</span><span><strong>{account.name}</strong><small>Số dư hiện tại</small></span><b>{formatVnd(account.currentBalance)}</b></div>)}</div> : <div className="empty-state compact"><span>▣</span><h3>Chưa có tài khoản</h3><p>Thêm tài khoản đầu tiên để bắt đầu.</p><button className="button-primary" onClick={() => onNavigate("accounts")}>Thêm tài khoản</button></div>}</section>
      <section className="surface-card next-card"><p className="eyebrow">DÒNG TIỀN THÁNG</p><h2>{dashboard?.transactionCount ?? "—"} giao dịch</h2><p>{dashboard ? `Thu trừ chi: ${formatVnd(dashboard.netFlow)}.` : "Đang tải dữ liệu."} {dashboard?.budget ? `Đã dùng ${dashboard.budget.usedPercent}% ngân sách.` : "Bạn có thể đặt hạn mức tháng."}</p><div className="dashboard-links"><button className="button-outline" onClick={() => onNavigate("transactions")}>Xem giao dịch</button><button className="button-outline" onClick={() => onNavigate("budgets")}>Ngân sách</button></div></section></div>
  </>;
}
