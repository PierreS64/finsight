import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import "./AccountsPanel.css";

type AccountType = "CASH" | "BANK" | "E_WALLET" | "OTHER";
type Account = { id: string; name: string; accountType: AccountType; openingBalance: string; currencyCode: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const typeLabels: Record<AccountType, string> = {
  CASH: "Tiền mặt", BANK: "Tài khoản ngân hàng", E_WALLET: "Ví điện tử", OTHER: "Khác",
};

function formatVnd(value: string) {
  const match = value.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return `${value} VND`;
  const fraction = match[3]?.replace(/0+$/, "");
  return `${match[1]}${new Intl.NumberFormat("vi-VN").format(BigInt(match[2]))}${fraction ? `,${fraction}` : ""} ₫`;
}

export default function AccountsPanel({ session }: { session: Session }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("CASH");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/accounts`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Không tải được tài khoản (HTTP ${response.status}).`);
      setAccounts((await response.json()) as Account[]);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Không thể tải tài khoản.");
    });
    return () => controller.abort();
  }, [session.access_token]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const amount = openingBalance.trim().replace(",", ".");
    if (!/^-?\d{1,17}(?:\.\d{1,2})?$/.test(amount)) {
      setMessage("Số dư đầu kỳ phải là số có tối đa hai chữ số thập phân.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/accounts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), accountType, openingBalance: amount }),
      });
      if (!response.ok) throw new Error(`Không tạo được tài khoản (HTTP ${response.status}).`);
      const created = (await response.json()) as Account;
      setAccounts((current) => [...current, created]);
      setName("");
      setOpeningBalance("0");
      setMessage("Đã thêm tài khoản.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạo tài khoản.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="financial-accounts">
      <h3>Tài khoản tài chính</h3>
      <p className="account-helper">Các tài khoản này do bạn tự nhập; FinSight không kết nối với ngân hàng.</p>
      {accounts.length ? (
        <ul className="financial-account-list">
          {accounts.map((account) => <li key={account.id}>
            <div><strong>{account.name}</strong><small>{typeLabels[account.accountType]}</small></div>
            <span>{formatVnd(account.openingBalance)}</span>
          </li>)}
        </ul>
      ) : <p className="account-helper">Bạn chưa thêm tài khoản nào.</p>}
      <form className="account-form" onSubmit={createAccount}>
        <label htmlFor="account-name">Tên tài khoản</label>
        <input id="account-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required placeholder="Ví dụ: Tiền mặt" />
        <label htmlFor="account-type">Loại tài khoản</label>
        <select id="account-type" value={accountType} onChange={(event) => setAccountType(event.target.value as AccountType)}>
          {Object.entries(typeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
        </select>
        <label htmlFor="opening-balance">Số dư đầu kỳ (VND)</label>
        <input id="opening-balance" type="text" inputMode="decimal" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value)} required />
        <button type="submit" disabled={busy || !name.trim()}>{busy ? "Đang lưu..." : "Thêm tài khoản"}</button>
      </form>
      {message && <p className="account-message" role="status">{message}</p>}
    </div>
  );
}
