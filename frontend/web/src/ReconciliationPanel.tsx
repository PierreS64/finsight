import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Account } from "./AccountsPanel";
import { formatVnd } from "./money";
import "./ReconciliationPanel.css";

type Reconciliation = { id: string; accountId: string; expectedBalance: string; observedBalance: string; differenceAmount: string; status: "BALANCED" | "SURPLUS" | "SHORTFALL"; note: string | null; recordedAt: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const labels = { BALANCED: "Khớp", SURPLUS: "Thực tế cao hơn", SHORTFALL: "Thực tế thấp hơn" };

export default function ReconciliationPanel({ session, accounts }: { session: Session; accounts: Account[] }) {
  const [accountId, setAccountId] = useState("");
  const [history, setHistory] = useState<Reconciliation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [observedBalance, setObservedBalance] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const selected = accounts.some((account) => account.id === accountId) ? accountId : accounts[0]?.id ?? "";
  const account = accounts.find((item) => item.id === selected);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/accounts/${selected}/reconciliations`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(`Không tải được lịch sử đối soát (HTTP ${response.status}).`); setHistory(await response.json() as Reconciliation[]); setLoaded(true); setError(""); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Không tải được lịch sử đối soát."); setLoaded(true); } });
    return () => controller.abort();
  }, [session.access_token, selected]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = observedBalance.trim().replace(",", ".");
    if (!selected || busy) return;
    if (!/^-?\d{1,17}(?:\.\d{1,2})?$/.test(amount)) { setMessage("Số dư thực tế phải có tối đa hai chữ số thập phân."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/accounts/${selected}/reconciliations`, {
        method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ observedBalance: amount, note: note.trim() || null }),
      });
      if (!response.ok) throw new Error(`Không lưu được lần đối soát (HTTP ${response.status}).`);
      const saved = await response.json() as Reconciliation;
      setHistory((current) => [saved, ...current]); setObservedBalance(""); setNote(""); setMessage("Đã lưu lần đối soát. Số dư FinSight không thay đổi.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không lưu được lần đối soát."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!selected || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/accounts/${selected}/reconciliations/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) throw new Error(`Không xóa được lần đối soát (HTTP ${response.status}).`);
      setHistory((current) => current.filter((item) => item.id !== id)); setDeletingId(null); setMessage("Đã xóa lần đối soát.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không xóa được lần đối soát."); }
    finally { setBusy(false); }
  }

  return <div className="reconcile-layout"><section className="surface-card reconcile-history"><p className="eyebrow">LỊCH SỬ</p><h2>Các lần đối soát</h2><p className="muted">Chênh lệch = số dư thực tế bạn nhập trừ số dư FinSight tại thời điểm ghi nhận.</p>{error && <p className="inline-error" role="alert">{error}</p>}{!loaded && selected && <p className="muted">Đang tải lịch sử...</p>}{!selected && <p className="muted">Hãy tạo tài khoản trước khi đối soát.</p>}{loaded && selected && !history.length && !error && <div className="empty-state compact"><span>◎</span><h3>Chưa có lần đối soát</h3><p>Nhập số dư quan sát được để ghi lại lần kiểm tra đầu tiên.</p></div>}
    <div className="reconcile-items">{history.map((item) => <article key={item.id}><div className="reconcile-row"><strong>{labels[item.status]}</strong><small>{new Date(item.recordedAt).toLocaleString("vi-VN")}</small></div><p>FinSight: {formatVnd(item.expectedBalance)} · Thực tế: {formatVnd(item.observedBalance)}</p><b className={item.status === "SHORTFALL" ? "shortfall" : ""}>Chênh lệch {formatVnd(item.differenceAmount)}</b>{item.note && <p>{item.note}</p>}<div className="reconcile-actions"><button className="link-button danger" onClick={() => setDeletingId(item.id)}>Xóa</button>{deletingId === item.id && <><span>Xóa lần đối soát này?</span><button className="link-button danger" disabled={busy} onClick={() => remove(item.id)}>Xác nhận</button><button className="link-button" onClick={() => setDeletingId(null)}>Hủy</button></>}</div></article>)}</div>
  </section><section className="surface-card reconcile-form"><p className="eyebrow">KIỂM TRA SỐ DƯ</p><h2>Đối soát tài khoản</h2><p className="muted">Bản ghi này không tạo giao dịch điều chỉnh và không đổi số dư tài khoản.</p><form onSubmit={save}><label>Tài khoản<select value={selected} onChange={(event) => { setAccountId(event.target.value); setLoaded(false); setHistory([]); setDeletingId(null); }} required>{!accounts.length && <option value="">Chưa có tài khoản</option>}{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{account && <div className="reconcile-expected"><small>SỐ DƯ FINSIGHT HIỆN TẠI</small><strong>{formatVnd(account.currentBalance)}</strong></div>}<label>Số dư thực tế quan sát được (VND)<input inputMode="decimal" required value={observedBalance} onChange={(event) => setObservedBalance(event.target.value)} placeholder="Ví dụ: 100000" /></label><label>Ghi chú (tùy chọn)<textarea rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="button-primary" disabled={busy || !selected}>{busy ? "Đang lưu..." : "Lưu lần đối soát"}</button></form>{message && <p className="auth-message" role="status">{message}</p>}</section></div>;
}
