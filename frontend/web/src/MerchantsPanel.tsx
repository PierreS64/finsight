import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import "./CategoriesPanel.css";

type Merchant = { id: string; name: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function MerchantsPanel({ session }: { session: Session }) {
  const [items, setItems] = useState<Merchant[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/merchants`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(`Không tải được nơi giao dịch (HTTP ${response.status}).`); setItems(await response.json() as Merchant[]); setLoading(false); })
      .catch((error: unknown) => { if (!controller.signal.aborted) { setMessage(error instanceof Error ? error.message : "Không tải được nơi giao dịch."); setLoading(false); } });
    return () => controller.abort();
  }, [session.access_token]);

  function reset() { setName(""); setEditingId(null); setDeletingId(null); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/merchants${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (response.status === 409) throw new Error("Tên nơi giao dịch đã tồn tại.");
      if (!response.ok) throw new Error(`Không lưu được nơi giao dịch (HTTP ${response.status}).`);
      const saved = await response.json() as Merchant;
      setItems((current) => editingId ? current.map((item) => item.id === editingId ? saved : item) : [...current, saved]);
      reset(); setMessage("Đã lưu nơi giao dịch.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không lưu được nơi giao dịch."); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/merchants/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (response.status === 409) throw new Error("Nơi giao dịch đang được sử dụng. Hãy đổi giao dịch trước khi xóa.");
      if (!response.ok) throw new Error(`Không xóa được nơi giao dịch (HTTP ${response.status}).`);
      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) reset();
      setDeletingId(null); setMessage("Đã xóa nơi giao dịch.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không xóa được nơi giao dịch."); }
    finally { setBusy(false); }
  }

  return <div className="categories-layout"><section className="surface-card categories-list"><div className="section-head"><div><p className="eyebrow">NƠI GIAO DỊCH</p><h2>Danh sách của bạn</h2></div><span className="small-badge">{items.length} nơi</span></div>
    {loading ? <p className="muted">Đang tải...</p> : items.length ? <ul className="category-list">{items.map((item) => <li key={item.id}><span className="category-icon">▣</span><span className="category-name"><strong>{item.name}</strong><small>Chỉ thuộc tài khoản của bạn</small></span><span className="category-actions"><button className="link-button" onClick={() => { setName(item.name); setEditingId(item.id); setDeletingId(null); }}>Sửa</button>{deletingId === item.id ? <><button className="link-button danger" disabled={busy} onClick={() => remove(item.id)}>Xác nhận xóa</button><button className="link-button" onClick={() => setDeletingId(null)}>Hủy</button></> : <button className="link-button danger" onClick={() => setDeletingId(item.id)}>Xóa</button>}</span></li>)}</ul> : <p className="muted">Chưa có nơi giao dịch nào.</p>}
    <p className="category-rule">Có thể gắn nơi giao dịch vào khoản thu hoặc chi. Hãy đổi các giao dịch liên quan trước khi xóa.</p>
  </section><section className="surface-card category-form-card"><p className="eyebrow">{editingId ? "CHỈNH SỬA" : "TẠO MỚI"}</p><h2>{editingId ? "Sửa nơi giao dịch" : "Thêm nơi giao dịch"}</h2><p className="muted">Lưu cửa hàng hoặc đơn vị thường gặp để chọn nhanh khi ghi giao dịch.</p><form onSubmit={save}><label>Tên cửa hàng hoặc đơn vị<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required placeholder="Ví dụ: Siêu thị An" /></label><button className="button-primary" disabled={busy || !name.trim()}>{busy ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm mới"}</button>{editingId && <button type="button" className="button-outline" onClick={reset}>Hủy chỉnh sửa</button>}</form>{message && <p className="auth-message" role="status">{message}</p>}</section></div>;
}
