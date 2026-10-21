import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Account } from "./AccountsPanel";
import { formatVnd } from "./money";
import "./DashboardPanel.css";

type Dashboard = { month: string; accountCount: number; transactionCount: number; totalBalance: string; income: string; expense: string; netFlow: string; budget: { limitAmount: string; remaining: string; usedPercent: string } | null };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const currentMonth = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; };

export default function DashboardPanel({ session, displayName, accounts, accountsLoaded, accountsError, onNavigate }: {
  session: Session; displayName: string | null; accounts: Account[]; accountsLoaded: boolean; accountsError: string;
  onNavigate: (page: "accounts" | "transactions" | "budgets") => void;
}) {
  const [month, setMonth] = useState(currentMonth);
  const [snapshot, setSnapshot] = useState<{ key: string; value: Dashboard } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const key = `${session.access_token}/${month}`;
  const dashboard = snapshot?.key === key ? snapshot.value : null;
  const error = failure?.key === key ? failure.message : "";

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

  return <><div className="page-heading dashboard-heading"><div><p className="eyebrow">TỔNG QUAN CỦA BẠN</p><h1>Chào {displayName || "bạn"}!</h1><p>Đây là những thông tin đã được lưu trong FinSight.</p></div><label>Tháng xem báo cáo<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label></div>
    {error && <p className="inline-error" role="alert">{error}</p>}
    {!dashboard && !error && <p className="muted">Đang tải tổng quan...</p>}
    <div className="metric-grid dashboard-metrics"><article className="metric-card featured"><small>TỔNG SỐ DƯ HIỆN TẠI</small><strong>{dashboard ? formatVnd(dashboard.totalBalance) : "—"}</strong><span>Từ {dashboard?.accountCount ?? "—"} tài khoản do bạn quản lý</span></article><article className="metric-card"><small>THU NHẬP THÁNG</small><strong className="money-in">{dashboard ? formatVnd(dashboard.income) : "—"}</strong><span>Giao dịch trong {month}</span></article><article className="metric-card"><small>CHI TIÊU THÁNG</small><strong className="money-out">{dashboard ? formatVnd(dashboard.expense) : "—"}</strong><span>Giao dịch trong {month}</span></article><article className="metric-card"><small>NGÂN SÁCH CÒN LẠI</small><strong className={dashboard?.budget?.remaining.startsWith("-") ? "dashboard-over" : ""}>{dashboard?.budget ? formatVnd(dashboard.budget.remaining) : "—"}</strong><span>{dashboard?.budget ? `Hạn mức ${formatVnd(dashboard.budget.limitAmount)}` : "Chưa đặt ngân sách tổng"}</span></article></div>
    {dashboard && dashboard.accountCount === 0 && dashboard.transactionCount === 0 && <div className="surface-card dashboard-empty"><h2>Chưa có dữ liệu tài chính</h2><p>Hãy thêm tài khoản và giao dịch đầu tiên để xem tổng quan tháng.</p><button className="button-primary" onClick={() => onNavigate("accounts")}>Thêm tài khoản</button></div>}
    {accountsError && <p className="inline-error" role="alert">{accountsError}</p>}
    <div className="workspace-grid"><section className="surface-card"><div className="section-head"><div><p className="eyebrow">TÀI KHOẢN</p><h2>Tài khoản của bạn</h2></div><button className="link-button" onClick={() => onNavigate("accounts")}>Xem tất cả →</button></div>{!accountsLoaded ? <p className="muted">Đang tải tài khoản...</p> : accounts.length ? <div className="mini-list">{accounts.slice(0, 4).map((account) => <div key={account.id}><span className="list-icon">▣</span><span><strong>{account.name}</strong><small>Số dư hiện tại</small></span><b>{formatVnd(account.currentBalance)}</b></div>)}</div> : <div className="empty-state compact"><span>▣</span><h3>Chưa có tài khoản</h3><p>Thêm tài khoản đầu tiên để bắt đầu.</p><button className="button-primary" onClick={() => onNavigate("accounts")}>Thêm tài khoản</button></div>}</section>
      <section className="surface-card next-card"><p className="eyebrow">DÒNG TIỀN THÁNG</p><h2>{dashboard?.transactionCount ?? "—"} giao dịch</h2><p>{dashboard ? `Thu trừ chi: ${formatVnd(dashboard.netFlow)}.` : "Đang tải dữ liệu."} {dashboard?.budget ? `Đã dùng ${dashboard.budget.usedPercent}% ngân sách.` : "Bạn có thể đặt hạn mức tháng."}</p><div className="dashboard-links"><button className="button-outline" onClick={() => onNavigate("transactions")}>Xem giao dịch</button><button className="button-outline" onClick={() => onNavigate("budgets")}>Ngân sách</button></div></section></div>
  </>;
}
