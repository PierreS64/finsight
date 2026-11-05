import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd } from "./money";
import "./SubscriptionSuggestionsPanel.css";

type Suggestion = { accountId: string; categoryId: string; merchantId: string | null; label: string; estimatedAmount: string; observedPayments: number; lastPaymentOn: string; nextExpectedOn: string };
type Suggestions = { items: Suggestion[]; calculationRule: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function SubscriptionSuggestionsPanel({ session }: { session: Session }) {
  const [data, setData] = useState<Suggestions | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/subscription-suggestions`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Không tải được gợi ý đăng ký (HTTP ${response.status}).`);
        setData(await response.json() as Suggestions);
      }).catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được gợi ý đăng ký.");
      });
    return () => controller.abort();
  }, [session.access_token]);
  return <section className="surface-card subscription-suggestions"><div className="section-head"><div><p className="eyebrow">TỪ LỊCH SỬ CHI TIÊU</p><h2>Gợi ý đăng ký hàng tháng</h2></div><span className="small-badge">{data?.items.length ?? 0} gợi ý</span></div>
    {error ? <p className="inline-error" role="alert">{error}</p> : !data ? <p className="muted">Đang kiểm tra lịch sử...</p> : data.items.length ? <div className="subscription-list">{data.items.map((item) => <article key={`${item.accountId}-${item.categoryId}-${item.merchantId ?? item.label}`}><div><strong>{item.label}</strong><span>{item.observedPayments} khoản chi gần nhất · dự kiến {item.nextExpectedOn}</span></div><b>{formatVnd(item.estimatedAmount)}</b></article>)}</div> : <p className="muted">Chưa có ba khoản chi hàng tháng đủ đều để gợi ý. Bạn vẫn có thể tạo lịch thủ công bên dưới.</p>}
    <p className="muted">Đây chỉ là gợi ý từ lịch sử. Hãy kiểm tra trước khi tự tạo lịch; FinSight không tự ghi khoản chi mới.</p>
  </section>;
}
