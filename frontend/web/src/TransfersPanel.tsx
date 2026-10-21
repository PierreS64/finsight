import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Account } from "./AccountsPanel";
import { formatVnd } from "./money";
import "./TransfersPanel.css";

type Transfer = { id: string; fromAccountId: string; toAccountId: string; amount: string; occurredOn: string; note: string | null };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function TransfersPanel({ session, accounts, onChanged }: { session: Session; accounts: Account[]; onChanged: () => void }) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState(today);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/transfers`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Không tải được chuyển khoản (HTTP ${response.status}).`);
        setTransfers(await response.json() as Transfer[]); setLoaded(true);
      }).catch((error: unknown) => { if (!controller.signal.aborted) { setMessage(error instanceof Error ? error.message : "Không tải được chuyển khoản."); setLoaded(true); } });
    return () => controller.abort();
  }, [session.access_token]);

  const source = accounts.some((account) => account.id === fromAccountId) ? fromAccountId : accounts[0]?.id ?? "";
  const destination = accounts.some((account) => account.id === toAccountId && account.id !== source)
    ? toAccountId : accounts.find((account) => account.id !== source)?.id ?? "";
  const accountName = (id: string) => accounts.find((account) => account.id === id)?.name ?? "Tài khoản đã thay đổi";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = amount.trim().replace(",", ".");
    if (!/^\d{1,17}(?:\.\d{1,2})?$/.test(value) || !/[1-9]/.test(value)) { setMessage("Số tiền phải lớn hơn 0 và có tối đa hai chữ số thập phân."); return; }
    if (!source || !destination || source === destination || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/transfers`, {
        method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fromAccountId: source, toAccountId: destination, amount: value, occurredOn, note: note.trim() || null }),
      });
      if (!response.ok) throw new Error(`Không lưu được chuyển khoản (HTTP ${response.status}).`);
      const saved = await response.json() as Transfer;
      setTransfers((current) => [saved, ...current].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.id.localeCompare(a.id)));
      setAmount(""); setNote(""); setOccurredOn(today()); onChanged(); setMessage("Đã lưu chuyển khoản.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không lưu được chuyển khoản."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/transfers/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) throw new Error(`Không xóa được chuyển khoản (HTTP ${response.status}).`);
      setTransfers((current) => current.filter((item) => item.id !== id)); setDeletingId(null); onChanged(); setMessage("Đã xóa chuyển khoản.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không xóa được chuyển khoản."); }
    finally { setBusy(false); }
  }

  return <><div className="transfer-info">↔ Chuyển khoản chỉ di chuyển tiền giữa hai tài khoản của bạn. Tổng tài sản, thu nhập, chi tiêu và ngân sách không đổi.</div>
    <div className="transfers-layout"><section className="surface-card transfers-list-card"><div className="section-head"><div><p className="eyebrow">LỊCH SỬ</p><h2>Các lần chuyển khoản</h2></div><span className="small-badge">{loaded ? transfers.length : "—"} lần</span></div>
      {!loaded ? <p className="muted">Đang tải chuyển khoản...</p> : transfers.length ? <ul className="transfer-list">{transfers.map((item) => <li key={item.id}><span className="transfer-icon">↔</span><span className="transfer-main"><strong>{accountName(item.fromAccountId)} → {accountName(item.toAccountId)}</strong><small>{item.occurredOn.split("-").reverse().join("/")}</small>{item.note && <small>{item.note}</small>}</span><span className="transfer-side"><strong>{formatVnd(item.amount)}</strong><button className="link-button danger" onClick={() => setDeletingId(item.id)}>Xóa</button>{deletingId === item.id && <span><button className="link-button danger" disabled={busy} onClick={() => remove(item.id)}>Xác nhận</button><button className="link-button" onClick={() => setDeletingId(null)}>Hủy</button></span>}</span></li>)}</ul> : <div className="empty-state compact"><span>↔</span><h3>Chưa có chuyển khoản</h3><p>Chọn hai tài khoản bên cạnh để ghi lần chuyển đầu tiên.</p></div>}
    </section><section className="surface-card transfer-form-card"><p className="eyebrow">DI CHUYỂN TIỀN</p><h2>Chuyển khoản mới</h2><p className="muted">Cần ít nhất hai tài khoản do bạn quản lý.</p><form onSubmit={save}>
      <label>Từ tài khoản<select required value={source} onChange={(event) => setFromAccountId(event.target.value)}>{!accounts.length && <option value="">Chưa có tài khoản</option>}{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <label>Đến tài khoản<select required value={destination} onChange={(event) => setToAccountId(event.target.value)}>{accounts.length < 2 && <option value="">Cần thêm tài khoản</option>}{accounts.filter((account) => account.id !== source).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <label>Số tiền (VND)<input type="text" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Ví dụ: 50000" /></label>
      <label>Ngày chuyển<input type="date" required value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} /></label>
      <label>Ghi chú (tùy chọn)<textarea rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú chuyển khoản" /></label>
      <button className="button-primary" disabled={busy || !source || !destination || !amount.trim()}>{busy ? "Đang lưu..." : "Lưu chuyển khoản"}</button>
    </form>{message && <p className="auth-message" role="alert">{message}</p>}</section></div></>;
}
