import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Account } from "./AccountsPanel";
import { formatVnd } from "./money";
import "./StatementImportPanel.css";

type Kind = "INCOME" | "EXPENSE";
type Category = { id: string; name: string; categoryType: Kind };
type ImportRow = { rowNumber: number; occurredOn: string; description: string; amount: string; kind: Kind; alreadyImported: boolean; possibleDuplicate: boolean };
type Preview = { sourceHash: string; rows: ImportRow[] };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function StatementImportPanel({ session, accounts, onCategories }: { session: Session; accounts: Account[]; onCategories: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [categoryByRow, setCategoryByRow] = useState<Record<number, string>>({});
  const [allowed, setAllowed] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const activeAccount = accounts.some((item) => item.id === accountId) ? accountId : accounts[0]?.id ?? "";

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/categories`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error("Không tải được danh mục."); setCategories(await response.json() as Category[]); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Không tải được danh mục."); });
    return () => controller.abort();
  }, [session.access_token]);

  async function inspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !activeAccount || busy) return;
    setBusy(true); setMessage(""); setPreview(null);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch(`${apiBase}/api/v1/statements/preview?accountId=${encodeURIComponent(activeAccount)}`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: form });
      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(error.detail || `Không đọc được sao kê (HTTP ${response.status}). Dùng mẫu cột date, description, amount, type.`);
      }
      const result = await response.json() as Preview;
      setPreview(result); setSelected(result.rows.filter((row) => !row.alreadyImported).map((row) => row.rowNumber));
      setCategoryByRow({}); setAllowed([]);
      setMessage(`Đã đọc ${result.rows.length} dòng. Chọn danh mục và kiểm tra trước khi lưu.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không đọc được sao kê."); }
    finally { setBusy(false); }
  }

  async function commit() {
    if (!preview || busy) return;
    const rows = preview.rows.filter((row) => selected.includes(row.rowNumber) && !row.alreadyImported);
    if (!rows.length) { setMessage("Hãy chọn ít nhất một dòng chưa nhập."); return; }
    if (rows.some((row) => !categoryByRow[row.rowNumber])) { setMessage("Hãy chọn danh mục cho mọi dòng sẽ nhập."); return; }
    if (rows.some((row) => row.possibleDuplicate && !allowed.includes(row.rowNumber))) {
      setMessage("Hãy kiểm tra và xác nhận từng dòng có thể trùng trước khi nhập."); return;
    }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/statements/import`, {
        method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: activeAccount, sourceHash: preview.sourceHash, rows: rows.map((row) => ({
          rowNumber: row.rowNumber, categoryId: categoryByRow[row.rowNumber], kind: row.kind,
          amount: row.amount, occurredOn: row.occurredOn, description: row.description,
          allowPossibleDuplicate: allowed.includes(row.rowNumber),
        })) }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(error.detail || `Không nhập được sao kê (HTTP ${response.status}). Hãy xem trước lại tệp nếu có dòng trùng.`);
      }
      const result = await response.json() as { importedCount: number };
      setPreview(null); setSelected([]); setMessage(`Đã nhập ${result.importedCount} giao dịch. Xem trước lại tệp để kiểm tra các dòng đã nhập.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không nhập được sao kê."); }
    finally { setBusy(false); }
  }

  return <div className="statement-layout"><section className="surface-card statement-intro"><p className="eyebrow">TỆP CỦA BẠN</p><h2>Chọn sao kê</h2><p className="muted">Chỉ đọc tệp CSV UTF-8 hoặc XLSX tối đa 2 MB, 200 dòng. FinSight không kết nối hoặc lấy thông tin đăng nhập ngân hàng.</p>
    <p className="muted">Hàng đầu tiên cần bốn cột <code>date,description,amount,type</code>. Ngày: YYYY-MM-DD hoặc DD/MM/YYYY; số tiền dương VND; loại: <code>income</code> hoặc <code>expense</code>. Có thể dùng tiêu đề tiếng Việt tương ứng.</p>
    <form onSubmit={inspect}><label>Tài khoản nhận giao dịch<select value={activeAccount} required onChange={(event) => { setAccountId(event.target.value); setPreview(null); }}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Tệp CSV/XLSX<input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); }} /></label><button className="button-primary" disabled={busy || !file || !activeAccount}>{busy ? "Đang đọc..." : "Xem trước"}</button></form><button className="link-button" onClick={onCategories}>Quản lý danh mục →</button>
  </section>{preview && <section className="surface-card statement-preview"><div className="section-head"><div><p className="eyebrow">KIỂM TRA TRƯỚC KHI LƯU</p><h2>{preview.rows.length} dòng sao kê</h2></div><span className="small-badge">{selected.length} đã chọn</span></div><p className="muted">Mỗi dòng cần danh mục đúng loại. Dòng đã nhập từ cùng tệp sẽ không được nhập lại.</p>
    <div className="statement-rows">{preview.rows.map((row) => { const enabled = selected.includes(row.rowNumber); const choices = categories.filter((item) => item.categoryType === row.kind); return <article key={row.rowNumber} className="statement-row"><label className="statement-select"><input type="checkbox" checked={enabled} disabled={row.alreadyImported || busy} onChange={(event) => setSelected((current) => event.target.checked ? [...current, row.rowNumber] : current.filter((value) => value !== row.rowNumber))} /> Dòng {row.rowNumber}</label><div><strong>{row.description}</strong><small>{row.occurredOn} · {row.kind === "INCOME" ? "Thu" : "Chi"} · {formatVnd(row.amount)}</small></div>{row.alreadyImported ? <span className="statement-warning">Đã nhập từ tệp này</span> : <><label>Danh mục<select value={categoryByRow[row.rowNumber] ?? ""} disabled={!enabled || busy} onChange={(event) => setCategoryByRow((current) => ({ ...current, [row.rowNumber]: event.target.value }))}><option value="">Chọn danh mục</option>{choices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{row.possibleDuplicate && <label className="statement-warning"><input type="checkbox" disabled={!enabled || busy} checked={allowed.includes(row.rowNumber)} onChange={(event) => setAllowed((current) => event.target.checked ? [...current, row.rowNumber] : current.filter((value) => value !== row.rowNumber))} /> Có giao dịch giống ngày, số tiền và mô tả; tôi đã kiểm tra</label>}</>}</article>; })}</div>
    <button className="button-primary" disabled={busy || !selected.length} onClick={() => void commit()}>{busy ? "Đang lưu..." : `Nhập ${selected.length} giao dịch đã chọn`}</button>
  </section>}{message && <p className="auth-message" role="status">{message}</p>}</div>;
}
