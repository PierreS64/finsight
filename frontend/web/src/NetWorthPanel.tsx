import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd } from "./money";
import "./GoalPanel.css";
import "./NetWorthPanel.css";

type Item = { id: string; name: string; kind: "ASSET" | "LIABILITY"; amount: string; note: string | null };
type NetWorth = { accountAssets: string; accountLiabilities: string; totalAssets: string; totalLiabilities: string; netWorth: string; accounts: { id: string; name: string; balance: string }[]; items: Item[] };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const validMoney = (value: string) => /^\d{1,17}(?:[.,]\d{1,2})?$/.test(value.trim());

export default function NetWorthPanel({ session }: { session: Session }) {
  const [data, setData] = useState<NetWorth | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Item["kind"]>("ASSET");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  async function refresh(signal?: AbortSignal) {
    const response = await fetch(`${apiBase}/api/v1/net-worth`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal });
    if (!response.ok) throw new Error(`Không tải được tài sản ròng (HTTP ${response.status}).`);
    setData(await response.json() as NetWorth); setError("");
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/net-worth`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Không tải được tài sản ròng (HTTP ${response.status}).`);
        setData(await response.json() as NetWorth); setError("");
      }).catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không tải được tài sản ròng.");
      });
    return () => controller.abort();
  }, [session.access_token]);

  function reset() { setEditingId(null); setName(""); setKind("ASSET"); setAmount(""); setNote(""); }
  function edit(item: Item) { setEditingId(item.id); setName(item.name); setKind(item.kind); setAmount(item.amount); setNote(item.note ?? ""); setMessage(""); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!name.trim() || !validMoney(amount)) { setMessage("Nhập tên và số tiền không âm, tối đa hai chữ số thập phân."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/net-worth/items${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), kind, amount: amount.replace(",", "."), note: note.trim() || null }),
      });
      if (!response.ok) throw new Error(`Không lưu được khoản mục (HTTP ${response.status}).`);
      await refresh(); reset(); setMessage("Đã cập nhật bản kê tài sản ròng.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không lưu được khoản mục."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/net-worth/items/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) throw new Error(`Không xóa được khoản mục (HTTP ${response.status}).`);
      await refresh(); if (editingId === id) reset(); setDeletingId(null); setMessage("Đã xóa khoản mục.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Không xóa được khoản mục."); }
    finally { setBusy(false); }
  }

  return <><div className="page-heading"><p className="eyebrow">BỨC TRANH TÀI CHÍNH</p><h1>Tài sản ròng</h1><p>Số dư tài khoản hiện tại cộng tài sản tự khai báo, trừ khoản nợ tự khai báo. Không tự định giá tài sản.</p></div>
    {error && <p className="inline-error" role="alert">{error}</p>}{!data && !error && <p className="muted">Đang tải bản kê...</p>}
    {data && <><div className="metric-grid net-worth-metrics"><article className="metric-card featured"><small>TÀI SẢN RÒNG</small><strong>{formatVnd(data.netWorth)}</strong><span>Tổng tài sản trừ tổng nợ</span></article><article className="metric-card"><small>TỔNG TÀI SẢN</small><strong className="money-in">{formatVnd(data.totalAssets)}</strong><span>Gồm số dư dương {formatVnd(data.accountAssets)}</span></article><article className="metric-card"><small>TỔNG NỢ</small><strong className="money-out">{formatVnd(data.totalLiabilities)}</strong><span>Gồm số dư âm {formatVnd(data.accountLiabilities)}</span></article></div>
      <div className="goals-layout"><section className="surface-card goals-list"><p className="eyebrow">BẢN KÊ</p><h2>Các khoản mục</h2><p className="muted">Số dư tài khoản được tính tự động. Mục tiêu tiết kiệm không cộng thêm để tránh tính hai lần.</p>
        {!data.accounts.length && !data.items.length && <div className="empty-state compact"><span>◫</span><h3>Chưa có khoản mục</h3><p>Thêm tài khoản hoặc tài sản, khoản nợ bên cạnh.</p></div>}
        <div className="goal-items">{data.accounts.map((account) => <article key={account.id}><div className="goal-row"><div><h3>{account.name}</h3><p>Số dư tài khoản · tự cập nhật từ giao dịch</p></div><strong>{formatVnd(account.balance)}</strong></div></article>)}
          {data.items.map((item) => <article key={item.id}><div className="goal-row"><div><h3>{item.name}</h3><p>{item.kind === "ASSET" ? "Tài sản" : "Khoản nợ"} · Giá trị do bạn tự nhập</p></div><strong>{formatVnd(item.amount)}</strong></div>{item.note && <p className="muted">{item.note}</p>}<div className="goal-actions"><button className="link-button" onClick={() => edit(item)}>Sửa</button><button className="link-button danger" onClick={() => setDeletingId(item.id)}>Xóa</button></div>{deletingId === item.id && <div className="goal-confirm"><span>Xóa khoản mục này?</span><button className="link-button danger" disabled={busy} onClick={() => remove(item.id)}>Xác nhận xóa</button><button className="link-button" onClick={() => setDeletingId(null)}>Hủy</button></div>}</article>)}</div>
      </section><section className="surface-card goals-form"><p className="eyebrow">GIÁ TRỊ TỰ KHAI BÁO</p><h2>{editingId ? "Sửa khoản mục" : "Thêm khoản mục"}</h2><form onSubmit={save}><label>Tên<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Xe máy hoặc khoản vay" /></label><label>Loại<select value={kind} onChange={(event) => setKind(event.target.value as Item["kind"])}><option value="ASSET">Tài sản</option><option value="LIABILITY">Khoản nợ</option></select></label><label>Giá trị hiện tại (VND)<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Ví dụ: 1000000" /></label><label>Ghi chú (tùy chọn)<textarea rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></label><button className="button-primary" disabled={busy}>{busy ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm khoản mục"}</button>{editingId && <button type="button" className="button-outline" onClick={reset}>Hủy chỉnh sửa</button>}</form>{message && <p className="auth-message" role="status">{message}</p>}</section></div></>}
  </>;
}
