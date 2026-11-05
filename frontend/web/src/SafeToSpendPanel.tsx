import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd } from "./money";
import "./SafeToSpendPanel.css";

type Result = { month: string; remainingDays: number; budgetLimit: string | null; spent: string;
  budgetRemaining: string | null; upcomingExpense: string; availableAfterReservations: string | null;
  safePerDay: string | null; status: "NO_BUDGET" | "BUDGET_EXHAUSTED" | "UPCOMING_EXCEEDS_BUDGET" | "AVAILABLE"; calculationRule: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function SafeToSpendPanel({ session }: { session: Session }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/safe-to-spend`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Không tải được mức chi an toàn (HTTP ${response.status}).`);
        setResult(await response.json() as Result);
      }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được dữ liệu."); });
    return () => controller.abort();
  }, [session.access_token]);
  return <section className="surface-card safe-panel"><div className="section-head"><div><p className="eyebrow">NGÂN SÁCH MỖI NGÀY</p><h2>Mức chi an toàn</h2></div><span className="small-badge">{result?.month ?? "Tháng này"}</span></div>
    {error ? <p className="inline-error" role="alert">{error}</p> : !result ? <p className="muted">Đang tính mức chi...</p> : result.status === "NO_BUDGET" ? <p className="muted">Chưa đặt ngân sách tổng tháng. Hãy đặt hạn mức để tính mức chi an toàn mỗi ngày.</p> : <><strong className="safe-amount">{formatVnd(result.safePerDay ?? "0")}<small> / ngày</small></strong><p className="muted">{result.status === "BUDGET_EXHAUSTED" ? "Ngân sách đã cạn hoặc vượt hạn mức." : result.status === "UPCOMING_EXCEEDS_BUDGET" ? "Khoản chi sắp đến hạn đã dùng hết phần ngân sách còn lại." : `Còn ${result.remainingDays} ngày tính cả hôm nay.`}</p><div className="safe-details"><span>Ngân sách còn: <b>{formatVnd(result.budgetRemaining ?? "0")}</b></span><span>Dành cho khoản định kỳ chưa ghi: <b>{formatVnd(result.upcomingExpense)}</b></span><span>Còn để phân bổ: <b>{formatVnd(result.availableAfterReservations ?? "0")}</b></span></div><p className="muted">Lấy phần còn để phân bổ, tối thiểu 0, chia cho {result.remainingDays} ngày còn lại. Kỳ đã ghi nhận nằm trong chi tiêu và không bị trừ thêm lần nữa.</p></>}
  </section>;
}
