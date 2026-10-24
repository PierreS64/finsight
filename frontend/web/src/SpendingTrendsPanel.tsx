import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd } from "./money";
import "./SpendingTrendsPanel.css";

type Comparison = { from: string; to: string; previousFrom: string; previousTo: string;
  expense: string; previousExpense: string; changeAmount: string; changePercent: string | null;
  direction: "INCREASE" | "DECREASE" | "STABLE" | "INSUFFICIENT_DATA" };
type Trends = { month: string; week: Comparison; monthComparison: Comparison; calculationRule: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const labels = { INCREASE: "Tăng", DECREASE: "Giảm", STABLE: "Ổn định", INSUFFICIENT_DATA: "Chưa đủ dữ liệu" };

export default function SpendingTrendsPanel({ session, month }: { session: Session; month: string }) {
  const [snapshot, setSnapshot] = useState<{ key: string; value: Trends } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const key = `${session.access_token}/${month}`;
  const trends = snapshot?.key === key ? snapshot.value : null;
  const error = failure?.key === key ? failure.message : "";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/spending-trends?month=${month}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(response.status === 400 ? "Chỉ xem xu hướng đến tháng hiện tại." : `Không tải được xu hướng (HTTP ${response.status}).`);
      setSnapshot({ key, value: await response.json() as Trends });
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setFailure({ key, message: reason instanceof Error ? reason.message : "Không tải được xu hướng." });
    });
    return () => controller.abort();
  }, [session.access_token, month, key]);

  function card(title: string, item: Comparison) {
    return <article><small>{title}</small><strong>{labels[item.direction]}</strong><span>{formatVnd(item.changeAmount)}{item.changePercent === null ? " · chưa có mức chi kỳ trước" : ` · ${item.changePercent}%`}</span>
      <p>Kỳ này {item.from} – {item.to}: {formatVnd(item.expense)}</p>
      <p>Kỳ trước {item.previousFrom} – {item.previousTo}: {formatVnd(item.previousExpense)}</p></article>;
  }
  return <section className="surface-card spending-trends-section"><div className="section-head"><div><p className="eyebrow">XU HƯỚNG CHI TIÊU</p><h2>Tuần này và tháng này</h2></div><span className="small-badge">{month}</span></div>
    {error ? <p className="inline-error" role="alert">{error}</p> : !trends ? <p className="muted">Đang so sánh các kỳ...</p> : <><div className="spending-trends-grid">{card("SO VỚI TUẦN TRƯỚC", trends.week)}{card("SO VỚI THÁNG TRƯỚC", trends.monthComparison)}</div><p className="spending-trends-note">Tăng hoặc giảm từ 10%; kỳ hiện tại chưa kết thúc được so với phần tương ứng của kỳ trước. Không tính khoản thu và chuyển khoản.</p></>}
  </section>;
}
