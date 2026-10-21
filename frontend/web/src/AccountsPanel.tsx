import { useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd, sumBalances } from "./money";
import "./AccountsPanel.css";

type AccountType = "CASH" | "BANK" | "E_WALLET" | "OTHER";
export type Account = { id: string; name: string; accountType: AccountType; openingBalance: string; currencyCode: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const typeLabels: Record<AccountType, string> = { CASH: "Tiền mặt", BANK: "Tài khoản ngân hàng", E_WALLET: "Ví điện tử", OTHER: "Khác" };
const typeSymbols: Record<AccountType, string> = { CASH: "◈", BANK: "▤", E_WALLET: "▣", OTHER: "◫" };

export default function AccountsPanel({ session, accounts, onCreated }: { session: Session; accounts: Account[]; onCreated: (account: Account) => void }) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("CASH");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !name.trim()) return;
    const amount = openingBalance.trim().replace(",", ".");
    if (!/^-?\d{1,17}(?:\.\d{1,2})?$/.test(amount)) { setMessage("Số dư đầu kỳ phải là số có tối đa hai chữ số thập phân."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/accounts`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), accountType, openingBalance: amount }) });
      if (!response.ok) throw new Error(`Không tạo được tài khoản (HTTP ${response.status}).`);
      onCreated((await response.json()) as Account);
      setName(""); setOpeningBalance("0"); setMessage("Đã thêm tài khoản.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tạo tài khoản."); }
    finally { setBusy(false); }
  }

  return <><div className="account-stats"><div><small>TỔNG SỐ DƯ ĐẦU KỲ</small><strong>{formatVnd(sumBalances(accounts.map((item) => item.openingBalance)))}</strong><span>Chỉ từ các tài khoản bạn tự nhập</span></div><div><small>SỐ TÀI KHOẢN</small><strong>{accounts.length}</strong><span>Không có kết nối ngân hàng</span></div></div>
    <div className="accounts-layout"><section className="surface-card accounts-list-card"><div className="section-head"><div><p className="eyebrow">DANH SÁCH</p><h2>Tài khoản tài chính</h2></div><span className="small-badge">{accounts.length} tài khoản</span></div>
      {accounts.length ? <ul className="financial-account-list">{accounts.map((account) => <li key={account.id}><span className="list-icon">{typeSymbols[account.accountType]}</span><span className="account-list-name"><strong>{account.name}</strong><small>{typeLabels[account.accountType]}</small></span><span className="account-list-amount"><strong>{formatVnd(account.openingBalance)}</strong><small>Số dư đầu kỳ</small></span></li>)}</ul> : <div className="empty-state compact"><span>▣</span><h3>Chưa có tài khoản nào</h3><p>Hãy thêm tài khoản đầu tiên bằng biểu mẫu bên cạnh.</p></div>}
    </section><section className="surface-card account-create-card"><p className="eyebrow">TẠO MỚI</p><h2>Thêm tài khoản</h2><p className="muted">Dữ liệu được nhập thủ công và chỉ hiển thị cho bạn.</p><form className="account-create-form" onSubmit={createAccount}><label>Tên tài khoản<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="Ví dụ: Tiền mặt" /></label><label>Loại tài khoản<select value={accountType} onChange={(event) => setAccountType(event.target.value as AccountType)}>{Object.entries(typeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label><label>Số dư đầu kỳ (VND)<input type="text" inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} required /></label><button className="button-primary" disabled={busy || !name.trim()}>{busy ? "Đang lưu..." : "Thêm tài khoản →"}</button></form>{message && <p className="auth-message" role="status">{message}</p>}</section></div>
  </>;
}
