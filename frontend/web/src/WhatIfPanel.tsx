import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd } from "./money";
import "./WhatIfPanel.css";

type Scenario = { month: string; actualExpense: string; expenseAdjustment: string; projectedExpense: string;
  actualBalance: string; projectedBalance: string; savedBudgetLimit: string | null;
  assumedBudgetLimit: string | null; projectedBudgetRemaining: string | null; usedPercent: string | null;
  alerts: ("NEGATIVE_BALANCE" | "OVER_BUDGET" | "NEAR_BUDGET")[]; calculationRule: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const moneyPattern = /^-?\d+(?:[.,]\d{1,2})?$/;
const alertLabels = { NEGATIVE_BALANCE: "Số dư dự kiến âm", OVER_BUDGET: "Vượt ngân sách", NEAR_BUDGET: "Đã dùng ít nhất 80% ngân sách" };

export default function WhatIfPanel({ session, month }: { session: Session; month: string }) {
  const [adjustment, setAdjustment] = useState("0");
  const [budget, setBudget] = useState("");
  const [result, setResult] = useState<{ key: string; value: Scenario } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const key = `${session.access_token}/${month}`;
  const scenario = result?.key === key ? result.value : null;

  async function simulate(event: React.FormEvent) {
    event.preventDefault(); setError(""); setResult(null);
    if (!moneyPattern.test(adjustment.trim()) || (budget.trim() && (!moneyPattern.test(budget.trim()) || budget.trim().startsWith("-")))) {
      setError("Nhập số tiền hợp lệ, tối đa 2 chữ số thập phân. Hạn mức giả định phải dương."); return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/v1/what-if`, {
        method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ month, expenseAdjustment: adjustment.trim().replace(",", "."),
          assumedBudgetLimit: budget.trim() ? budget.trim().replace(",", ".") : null }),
      });
      if (!response.ok) throw new Error(response.status === 400 ? "Kịch bản không hợp lệ: chi dự kiến không được âm và hạn mức phải lớn hơn 0." : `Không tính được kịch bản (HTTP ${response.status}).`);
      setResult({ key, value: await response.json() as Scenario });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không tính được kịch bản."); }
    finally { setBusy(false); }
  }

  return <section className="surface-card what-if-section"><div className="section-head"><div><p className="eyebrow">MÔ PHỎNG TẠM THỜI</p><h2>Nếu tôi thay đổi chi tiêu?</h2></div><span className="small-badge">{month}</span></div>
    <p className="muted">Nhập mức tăng hoặc giảm chi tiêu của tháng đang xem. Bỏ trống hạn mức để dùng ngân sách đã lưu. Tải lại trang sẽ xóa kịch bản.</p>
    <form className="what-if-form" onSubmit={simulate}><label>Điều chỉnh chi tiêu (VND)<input value={adjustment} onChange={(event) => { setAdjustment(event.target.value); setResult(null); }} inputMode="decimal" placeholder="Ví dụ: 500000 hoặc -100000" /></label>
      <label>Hạn mức giả định (VND, không bắt buộc)<input value={budget} onChange={(event) => { setBudget(event.target.value); setResult(null); }} inputMode="decimal" placeholder="Dùng hạn mức đã lưu" /></label>
      <button className="button-primary" disabled={busy}>{busy ? "Đang tính..." : "Xem kịch bản"}</button></form>
    {!!error && <p className="inline-error" role="alert">{error}</p>}
    {scenario && <><div className="what-if-results"><article><small>CHI TIÊU DỰ KIẾN</small><strong>{formatVnd(scenario.projectedExpense)}</strong><span>Đã ghi {formatVnd(scenario.actualExpense)} · điều chỉnh {formatVnd(scenario.expenseAdjustment)}</span></article>
      <article><small>SỐ DƯ DỰ KIẾN</small><strong>{formatVnd(scenario.projectedBalance)}</strong><span>Số dư hiện tại {formatVnd(scenario.actualBalance)}</span></article>
      <article><small>NGÂN SÁCH CÒN LẠI</small><strong>{scenario.projectedBudgetRemaining === null ? "—" : formatVnd(scenario.projectedBudgetRemaining)}</strong><span>{scenario.assumedBudgetLimit === null ? "Chưa có hạn mức" : `Hạn mức ${formatVnd(scenario.assumedBudgetLimit)} · dùng ${scenario.usedPercent}%`}</span></article></div>
      <p className={scenario.alerts.length ? "what-if-alert" : "what-if-ok"}>{scenario.alerts.length ? scenario.alerts.map((alert) => alertLabels[alert]).join(" · ") : "Kịch bản chưa phát sinh cảnh báo."}</p>
      <p className="what-if-note">Đây chỉ là phép tính. Không có giao dịch hoặc ngân sách nào được lưu.</p></>}
  </section>;
}
