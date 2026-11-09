import { useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd, sumBalances } from "./money";
import "./AccountsPanel.css";

type AccountType = "CASH" | "BANK" | "E_WALLET" | "OTHER";
export type Account = { id: string; name: string; accountType: AccountType; openingBalance: string; currentBalance: string; currencyCode: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const typeLabels: Record<AccountType, string> = { CASH: "Tiền mặt", BANK: "Tài khoản ngân hàng", E_WALLET: "Ví điện tử", OTHER: "Khác" };
const typeSymbols: Record<AccountType, string> = { CASH: "payments", BANK: "account_balance", E_WALLET: "account_balance_wallet", OTHER: "wallet" };

export default function AccountsPanel({ session, accounts, onCreated, onNavigate }: { session: Session; accounts: Account[]; onCreated: (account: Account) => void; onNavigate: (page: "transfers" | "reconcile") => void }) {
  const [view, setView] = useState<"list" | "create">("list");
  const [typeFilter, setTypeFilter] = useState<AccountType | "ALL">("ALL");
  const [search, setSearch] = useState("");
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
      setName(""); setOpeningBalance("0"); setView("list"); setMessage("Đã thêm tài khoản.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tạo tài khoản."); }
    finally { setBusy(false); }
  }

  const filteredAccounts = accounts.filter((account) => (typeFilter === "ALL" || account.accountType === typeFilter) && account.name.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  const balanceFor = (type: AccountType) => formatVnd(sumBalances(accounts.filter((account) => account.accountType === type).map((account) => account.currentBalance)));

  return <div className="account-workspace">
    <div className="account-toolbar"><label className="account-search"><span className="material-symbols-outlined" aria-hidden="true">search</span><input aria-label="Tìm tài khoản" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tài khoản…" /></label><div className="account-type-tabs" role="group" aria-label="Lọc loại tài khoản">{(["ALL", "BANK", "E_WALLET", "CASH", "OTHER"] as const).map((type) => <button key={type} aria-pressed={typeFilter === type} className={typeFilter === type ? "active" : ""} onClick={() => { setTypeFilter(type); setView("list"); }}>{type === "ALL" ? `Tất cả (${accounts.length})` : typeLabels[type]}</button>)}</div><div className="account-toolbar-actions"><button className="button-outline" onClick={() => onNavigate("transfers")}>Chuyển nội bộ</button><button className="button-outline" onClick={() => onNavigate("reconcile")}>Đối soát số dư</button><button className="button-primary" onClick={() => setView("create")}><span className="material-symbols-outlined" aria-hidden="true">add</span>Thêm tài khoản</button></div></div>
    {view === "list" ? <><div className="account-stats"><article className="metric-card"><small>Tổng số dư hiện tại</small><strong>{formatVnd(sumBalances(accounts.map((item) => item.currentBalance)))}</strong><span>{accounts.length} tài khoản do bạn quản lý</span></article><article className="metric-card"><small>Tài khoản ngân hàng</small><strong>{balanceFor("BANK")}</strong><span>{accounts.filter((item) => item.accountType === "BANK").length} tài khoản</span></article><article className="metric-card"><small>Ví điện tử</small><strong>{balanceFor("E_WALLET")}</strong><span>{accounts.filter((item) => item.accountType === "E_WALLET").length} tài khoản</span></article><article className="metric-card"><small>Tiền mặt</small><strong>{balanceFor("CASH")}</strong><span>{accounts.filter((item) => item.accountType === "CASH").length} tài khoản</span></article></div><section className="surface-card accounts-list-card"><div className="section-head"><h2>Chi tiết tài khoản đang quản lý</h2><span className="small-badge">{filteredAccounts.length} tài khoản</span></div>{filteredAccounts.length ? <div className="account-table-scroll"><table className="account-table"><thead><tr><th>Tên tài khoản</th><th>Loại</th><th>Số dư hiện tại</th><th>Số dư đầu kỳ</th><th>Trạng thái</th></tr></thead><tbody>{filteredAccounts.map((account) => <tr key={account.id}><td><span className="account-table-name"><span className="material-symbols-outlined" aria-hidden="true">{typeSymbols[account.accountType]}</span><strong>{account.name}</strong></span></td><td>{typeLabels[account.accountType]}</td><td><strong>{formatVnd(account.currentBalance)}</strong></td><td>{formatVnd(account.openingBalance)}</td><td><span className="small-badge">Đang theo dõi</span></td></tr>)}</tbody></table></div> : <div className="empty-state compact"><span className="material-symbols-outlined" aria-hidden="true">account_balance_wallet</span><h3>{accounts.length ? "Không có tài khoản phù hợp" : "Chưa có tài khoản nào"}</h3><p>{accounts.length ? "Thử đổi từ khóa hoặc loại tài khoản." : "Hãy thêm tài khoản đầu tiên để bắt đầu."}</p></div>}</section></> : <section className="surface-card account-create-card"><div className="section-head"><h2>Thêm tài khoản</h2><button className="link-button" onClick={() => setView("list")}>← Danh sách</button></div><p className="muted">Dữ liệu được nhập thủ công và chỉ hiển thị cho bạn.</p><form className="account-create-form" onSubmit={createAccount}><label>Tên tài khoản<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="Ví dụ: Tiền mặt" /></label><label>Loại tài khoản<select value={accountType} onChange={(event) => setAccountType(event.target.value as AccountType)}>{Object.entries(typeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label><label>Số dư đầu kỳ (VND)<input type="text" inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} required /></label><button type="submit" className="button-primary" disabled={busy || !name.trim()}>{busy ? "Đang lưu..." : "Thêm tài khoản →"}</button></form></section>}
    {message && <p className="auth-message" role="status">{message}</p>}
  </div>;
}
