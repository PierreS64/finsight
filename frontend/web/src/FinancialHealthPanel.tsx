import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import "./FinancialHealthPanel.css";

type Health = { month: string; score: string | null; coveragePercent: number; status: "COMPLETE" | "PARTIAL" | "INSUFFICIENT_DATA"; components: { key: string; label: string; weight: number; points: string | null; explanation: string }[]; calculationRule: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function FinancialHealthPanel({ session }: { session: Session }) {
  const [snapshot, setSnapshot] = useState<{ key: string; value: Health } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const key = session.access_token;
  const health = snapshot?.key === key ? snapshot.value : null;
  const error = failure?.key === key ? failure.message : "";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/financial-health`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Không tải được điểm sức khỏe tài chính (HTTP ${response.status}).`);
        setSnapshot({ key, value: await response.json() as Health });
      }).catch((reason: unknown) => {
        if (!controller.signal.aborted) setFailure({ key, message: reason instanceof Error ? reason.message : "Không tải được điểm sức khỏe tài chính." });
      });
    return () => controller.abort();
  }, [session.access_token, key]);

  return <section className="surface-card health-section"><div className="section-head"><div><p className="eyebrow">BỨC TRANH TÀI CHÍNH</p><h2>Điểm sức khỏe tài chính</h2></div><span className="small-badge">Tháng hiện tại</span></div>
    {error ? <p className="inline-error" role="alert">{error}</p> : !health ? <p className="muted">Đang tính điểm...</p> : <><div className="health-summary"><strong>{health.score === null ? "—" : `${health.score}/100`}</strong><span>{health.status === "COMPLETE" ? "Đủ ba thành phần" : health.status === "PARTIAL" ? `Tạm tính · có dữ liệu cho ${health.coveragePercent}% trọng số` : "Chưa đủ dữ liệu để tính điểm"}</span></div><div className="health-components">{health.components.map((part) => <article key={part.key}><div><strong>{part.label}</strong><b>{part.points === null ? "—" : `${part.points}/${part.weight}`}</b></div><p>{part.explanation}</p></article>)}</div><p className="muted">Điểm là chỉ số tham khảo dựa trên dữ liệu bạn tự nhập; không phải đánh giá tín dụng. Khi thiếu thành phần, điểm chỉ là tạm tính.</p></>}
  </section>;
}
