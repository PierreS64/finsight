import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd } from "./money";
import "./SpendingProfilePanel.css";

type SpendingProfile = {
  month: string; elapsedDays: number; income: string; expense: string; savingsRatePercent: string | null;
  averageDailyExpense: string | null; stabilityScore: string | null;
  topExpenseCategory: { categoryId: string; categoryName: string; amount: string } | null;
  trend: "INCREASE" | "DECREASE" | "STABLE" | "INSUFFICIENT_DATA";
  trendPercent: string | null; previousMonth: string; calculationRule: string;
};
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const trendLabels = { INCREASE: "Tăng", DECREASE: "Giảm", STABLE: "Ổn định", INSUFFICIENT_DATA: "Chưa đủ dữ liệu" };

export default function SpendingProfilePanel({ session, month }: { session: Session; month: string }) {
  const [snapshot, setSnapshot] = useState<{ key: string; value: SpendingProfile } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const key = `${session.access_token}/${month}`;
  const profile = snapshot?.key === key ? snapshot.value : null;
  const error = failure?.key === key ? failure.message : "";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/spending-profile?month=${month}`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Không tải được hồ sơ chi tiêu (HTTP ${response.status}).`);
      setSnapshot({ key, value: await response.json() as SpendingProfile });
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setFailure({ key, message: reason instanceof Error ? reason.message : "Không tải được hồ sơ chi tiêu." });
    });
    return () => controller.abort();
  }, [session.access_token, month, key]);

  return <section className="surface-card spending-profile-section"><div className="section-head"><div><p className="eyebrow">HỒ SƠ HÀNH VI</p><h2>Nhịp chi tiêu của bạn</h2></div><span className="small-badge">{month}</span></div>
    {error ? <p className="inline-error" role="alert">{error}</p> : !profile ? <p className="muted">Đang tính các chỉ số...</p> : <><p className="muted">Dựa trên {profile.elapsedDays} ngày đã trôi qua trong tháng. Các chỉ số thiếu dữ liệu sẽ để trống.</p><div className="spending-profile-grid">
      <article><small>TỶ LỆ TIẾT KIỆM</small><strong>{profile.savingsRatePercent === null ? "—" : `${profile.savingsRatePercent}%`}</strong><span>{profile.savingsRatePercent === null ? "Cần có thu nhập trong tháng" : "(Thu nhập − chi tiêu) / thu nhập"}</span></article>
      <article><small>DANH MỤC CHI NHIỀU NHẤT</small><strong>{profile.topExpenseCategory?.categoryName ?? "—"}</strong><span>{profile.topExpenseCategory ? formatVnd(profile.topExpenseCategory.amount) : "Chưa có chi tiêu"}</span></article>
      <article><small>CHI TIÊU TRUNG BÌNH / NGÀY</small><strong>{profile.averageDailyExpense === null ? "—" : formatVnd(profile.averageDailyExpense)}</strong><span>{profile.elapsedDays} ngày trong kỳ tính</span></article>
      <article><small>ĐỘ ỔN ĐỊNH</small><strong>{profile.stabilityScore === null ? "—" : `${profile.stabilityScore}/100`}</strong><span>{profile.stabilityScore === null ? "Cần từ 7 ngày và có chi tiêu" : "Cao hơn khi chi tiêu các ngày ít dao động"}</span></article>
      <article><small>XU HƯỚNG SO VỚI {profile.previousMonth}</small><strong>{trendLabels[profile.trend]}</strong><span>{profile.trendPercent === null ? "Chưa có mức chi tháng trước" : `${profile.trendPercent}% theo trung bình/ngày`}</span></article>
    </div><p className="spending-profile-note">Khoản thu, hoàn tiền ghi là thu nhập và chuyển khoản không tính vào chi tiêu. Tháng hiện tại chỉ tính đến hôm nay; tháng cũ tính đủ số ngày.</p></>}
  </section>;
}
