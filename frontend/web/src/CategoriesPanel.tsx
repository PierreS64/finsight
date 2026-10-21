import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import "./CategoriesPanel.css";

type CategoryType = "INCOME" | "EXPENSE";
type CategoryIcon = "wallet" | "gift" | "other" | "food" | "transport" | "home" | "shopping" | "health" | "education";
type Category = { id: string; name: string; categoryType: CategoryType; icon: CategoryIcon; isDefault: boolean };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const icons: { value: CategoryIcon; symbol: string; label: string }[] = [
  { value: "wallet", symbol: "▣", label: "Ví" }, { value: "gift", symbol: "✦", label: "Quà" },
  { value: "food", symbol: "◉", label: "Ăn uống" }, { value: "transport", symbol: "↗", label: "Di chuyển" },
  { value: "home", symbol: "⌂", label: "Nhà" }, { value: "shopping", symbol: "◇", label: "Mua sắm" },
  { value: "health", symbol: "✚", label: "Sức khỏe" }, { value: "education", symbol: "▤", label: "Học tập" },
  { value: "other", symbol: "•", label: "Khác" },
];

export default function CategoriesPanel({ session }: { session: Session }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<CategoryType>("EXPENSE");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<CategoryIcon>("other");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/categories`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(`Không tải được danh mục (HTTP ${response.status}).`); setCategories(await response.json() as Category[]); setLoading(false); })
      .catch((error: unknown) => { if (!controller.signal.aborted) { setMessage(error instanceof Error ? error.message : "Không tải được danh mục."); setLoading(false); } });
    return () => controller.abort();
  }, [session.access_token]);

  function resetForm() { setName(""); setIcon("other"); setEditingId(null); setDeletingId(null); }
  function startEdit(category: Category) { setType(category.categoryType); setName(category.name); setIcon(category.icon); setEditingId(category.id); setDeletingId(null); setMessage(""); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/categories${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), categoryType: type, icon }),
      });
      if (response.status === 409) throw new Error("Tên danh mục này đã tồn tại trong loại đã chọn.");
      if (!response.ok) throw new Error(`Không lưu được danh mục (HTTP ${response.status}).`);
      const saved = await response.json() as Category;
      setCategories((current) => editingId ? current.map((item) => item.id === editingId ? saved : item) : [...current, saved]);
      resetForm(); setMessage("Đã lưu danh mục.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không lưu được danh mục."); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
      if (response.status === 409) throw new Error("Danh mục đang được giao dịch hoặc ngân sách sử dụng. Hãy đổi danh mục của các mục đó trước khi xóa.");
      if (!response.ok) throw new Error(`Không xóa được danh mục (HTTP ${response.status}).`);
      setCategories((current) => current.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
      setDeletingId(null); setMessage("Đã xóa danh mục.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không xóa được danh mục."); }
    finally { setBusy(false); }
  }

  const visible = categories.filter((category) => category.categoryType === type);
  return <div className="categories-layout"><section className="surface-card categories-list"><div className="section-head"><div><p className="eyebrow">DANH MỤC CỦA BẠN</p><h2>Thu nhập & chi tiêu</h2></div><span className="small-badge">{visible.length} danh mục</span></div>
    <div className="category-tabs" role="group" aria-label="Loại danh mục"><button className={type === "EXPENSE" ? "active" : ""} onClick={() => { setType("EXPENSE"); resetForm(); }}>Chi tiêu</button><button className={type === "INCOME" ? "active" : ""} onClick={() => { setType("INCOME"); resetForm(); }}>Thu nhập</button></div>
    {loading ? <p className="muted">Đang tải danh mục...</p> : <ul className="category-list">{visible.map((category) => <li key={category.id}><span className="category-icon">{icons.find((item) => item.value === category.icon)?.symbol ?? "•"}</span><span className="category-name"><strong>{category.name}</strong><small>{category.isDefault ? "Mặc định · chỉ xem" : "Danh mục của bạn"}</small></span>{!category.isDefault && <span className="category-actions"><button className="link-button" onClick={() => startEdit(category)}>Sửa</button>{deletingId === category.id ? <><button className="link-button danger" onClick={() => remove(category.id)} disabled={busy}>Xác nhận xóa</button><button className="link-button" onClick={() => setDeletingId(null)}>Hủy</button></> : <button className="link-button danger" onClick={() => setDeletingId(category.id)}>Xóa</button>}</span>}</li>)}</ul>}
    {!loading && !visible.length && <p className="muted">Chưa có danh mục trong loại này.</p>}
    <p className="category-rule">Danh mục mặc định dùng chung và không thể sửa hoặc xóa. Danh mục riêng sẽ không thể xóa khi đã được giao dịch hoặc ngân sách sử dụng.</p>
  </section><section className="surface-card category-form-card"><p className="eyebrow">{editingId ? "CHỈNH SỬA" : "TẠO MỚI"}</p><h2>{editingId ? "Sửa danh mục" : "Thêm danh mục"}</h2><p className="muted">Dùng cùng ngôn ngữ hình ảnh của FinSight để nhóm các khoản thu chi.</p><form onSubmit={save}><label>Tên danh mục<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="Ví dụ: Cà phê" /></label><label>Loại<select value={type} onChange={(event) => setType(event.target.value as CategoryType)}><option value="EXPENSE">Chi tiêu</option><option value="INCOME">Thu nhập</option></select></label><fieldset><legend>Biểu tượng</legend><div className="category-icon-picker">{icons.map((item) => <button type="button" key={item.value} title={item.label} aria-label={item.label} aria-pressed={icon === item.value} className={icon === item.value ? "active" : ""} onClick={() => setIcon(item.value)}>{item.symbol}</button>)}</div></fieldset><button className="button-primary" disabled={busy || !name.trim()}>{busy ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm danh mục"}</button>{editingId && <button className="button-outline" type="button" onClick={resetForm}>Hủy chỉnh sửa</button>}</form>{message && <p className="auth-message" role="status">{message}</p>}</section></div>;
}
