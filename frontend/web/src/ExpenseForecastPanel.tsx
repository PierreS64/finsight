import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd } from "./money";
import "./ExpenseForecastPanel.css";

type Forecast = { month: string; elapsedDays: number; remainingDays: number; spendingDays: number;
  spent: string; averageDaily: string | null; projectedMonthEnd: string | null;
  expectedAdditional: string | null; confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA";
  calculationRule: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const confidenceLabels = { HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp", INSUFFICIENT_DATA: "Chưa đủ dữ liệu" };

export default function ExpenseForecastPanel({ session }: { session: Session }) {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/expense-forecast`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Không tải được dự báo (HTTP ${response.status}).`);
      setForecast(await response.json() as Forecast);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được dự báo.");
    });
    return () => controller.abort();
  }, [session.access_token]);
  return <section className="surface-card forecast-section"><div className="section-head"><div><p className="eyebrow">DỰ BÁO CHI TIÊU</p><h2>Cuối tháng có thể chi bao nhiêu?</h2></div><span className="small-badge">{forecast?.month ?? "Tháng hiện tại"}</span></div>
    {error ? <p className="inline-error" role="alert">{error}</p> : !forecast ? <p className="muted">Đang tính dự báo...</p> : forecast.projectedMonthEnd === null ? <p className="muted">Chưa đủ dữ liệu để dự báo: cần ít nhất 3 ngày trong tháng và 2 ngày có chi tiêu. Đã ghi {formatVnd(forecast.spent)}.</p> : <><div className="forecast-grid"><article><small>CHI ĐÃ GHI</small><strong>{formatVnd(forecast.spent)}</strong></article><article><small>DỰ KIẾN CUỐI THÁNG</small><strong>{formatVnd(forecast.projectedMonthEnd)}</strong></article><article><small>CHI DỰ KIẾN PHẦN CÒN LẠI</small><strong>{formatVnd(forecast.expectedAdditional ?? "0")}</strong></article></div>
      <p className="forecast-note">Trung bình {formatVnd(forecast.averageDaily ?? "0")}/ngày trên {forecast.elapsedDays} ngày, còn {forecast.remainingDays} ngày. Độ tin cậy: {confidenceLabels[forecast.confidence]}; dựa trên {forecast.spendingDays} ngày có chi. Đây là ước tính từ giao dịch đã ghi, không phải số tiền an toàn để chi.</p></>}
  </section>;
}
