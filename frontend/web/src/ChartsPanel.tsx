import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd } from "./money";
import "./ChartsPanel.css";

type Charts = { month: string; granularity: "week" | "month"; incomeTotal: string; expenseTotal: string;
  categories: { categoryId: string; categoryName: string; amount: string; percent: string }[];
  buckets: { from: string; to: string; income: string; expense: string }[]; calculationRule: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
function minor(value: string): bigint { const [whole, fraction = ""] = value.split("."); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0") || "0"); }
function width(value: string, maximum: bigint): string { return maximum === 0n ? "0%" : `${minor(value) * 100n / maximum}%`; }

export default function ChartsPanel({ session, month }: { session: Session; month: string }) {
  const [granularity, setGranularity] = useState<"week" | "month">("week");
  const [snapshot, setSnapshot] = useState<{ key: string; value: Charts } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const key = `${session.access_token}/${month}/${granularity}`;
  const charts = snapshot?.key === key ? snapshot.value : null;
  const error = failure?.key === key ? failure.message : "";
  const maximum = charts?.buckets.reduce((max, item) => {
    const value = minor(item.income) > minor(item.expense) ? minor(item.income) : minor(item.expense);
    return value > max ? value : max;
  }, 0n) ?? 0n;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/charts?month=${month}&granularity=${granularity}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Không tải được biểu đồ (HTTP ${response.status}).`);
      setSnapshot({ key, value: await response.json() as Charts });
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setFailure({ key, message: reason instanceof Error ? reason.message : "Không tải được biểu đồ." });
    });
    return () => controller.abort();
  }, [session.access_token, month, granularity, key]);

  return <section className="surface-card charts-section"><div className="section-head"><div><p className="eyebrow">TRỰC QUAN HÓA</p><h2>Cơ cấu và dòng tiền</h2></div><div className="chart-switch" role="group" aria-label="Khoảng thời gian biểu đồ"><button className={granularity === "week" ? "active" : ""} onClick={() => setGranularity("week")}>Theo tuần</button><button className={granularity === "month" ? "active" : ""} onClick={() => setGranularity("month")}>Theo tháng</button></div></div>
    {error ? <p className="inline-error" role="alert">{error}</p> : !charts ? <p className="muted">Đang tải biểu đồ...</p> : <div className="charts-grid">
      <div><h3>Chi tiêu theo danh mục · {month}</h3>{charts.categories.length ? <div className="chart-category-list">{charts.categories.map((item) => <div key={item.categoryId}><div className="chart-row-label"><strong>{item.categoryName}</strong><span>{formatVnd(item.amount)} · {item.percent}%</span></div><div className="chart-track"><i style={{ width: `${item.percent}%` }} /></div></div>)}</div> : <p className="muted">Chưa có chi tiêu trong tháng này.</p>}</div>
      <div><h3>Thu và chi {granularity === "week" ? "theo tuần trong tháng" : "trong 6 tháng"}</h3><div className="chart-legend"><span>● Thu nhập</span><span>● Chi tiêu</span></div>{maximum === 0n ? <p className="muted">Chưa có giao dịch trong các kỳ hiển thị.</p> : <div className="chart-time-list">{charts.buckets.map((item) => <div key={item.from}><strong>{granularity === "week" ? `${item.from.slice(8)}/${item.from.slice(5, 7)}–${item.to.slice(8)}/${item.to.slice(5, 7)}` : item.from.slice(0, 7)}</strong><div><div className="chart-track income"><i style={{ width: width(item.income, maximum) }} /></div><small>Thu {formatVnd(item.income)}</small><div className="chart-track expense"><i style={{ width: width(item.expense, maximum) }} /></div><small>Chi {formatVnd(item.expense)}</small></div></div>)}</div>}</div>
    </div>}
  </section>;
}
