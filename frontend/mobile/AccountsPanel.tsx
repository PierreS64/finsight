import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type AccountType = "CASH" | "BANK" | "E_WALLET" | "OTHER";
type Account = { id: string; name: string; accountType: AccountType; openingBalance: string };
const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:8086";
const types: { value: AccountType; label: string }[] = [
  { value: "CASH", label: "Tiền mặt" },
  { value: "BANK", label: "Ngân hàng" },
  { value: "E_WALLET", label: "Ví điện tử" },
  { value: "OTHER", label: "Khác" },
];

function formatVnd(value: string) {
  const match = value.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return `${value} VND`;
  const fraction = match[3]?.replace(/0+$/, "");
  return `${match[1]}${new Intl.NumberFormat("vi-VN").format(BigInt(match[2]))}${fraction ? `,${fraction}` : ""} ₫`;
}

export default function AccountsPanel({ session }: { session: Session }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CASH");
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

  async function createAccount() {
    if (busy || !name.trim()) return;
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
        body: JSON.stringify({ name: name.trim(), accountType: type, openingBalance: amount }),
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
    <View style={styles.container}>
      <Text style={styles.title}>Tài khoản tài chính</Text>
      <Text style={styles.helper}>Do bạn tự nhập, không kết nối với ngân hàng.</Text>
      {accounts.length ? accounts.map((account) => (
        <View style={styles.row} key={account.id}>
          <View style={styles.rowName}>
            <Text style={styles.name}>{account.name}</Text>
            <Text style={styles.helper}>{types.find((item) => item.value === account.accountType)?.label}</Text>
          </View>
          <Text style={styles.balance}>{formatVnd(account.openingBalance)}</Text>
        </View>
      )) : <Text style={styles.helper}>Bạn chưa thêm tài khoản nào.</Text>}
      <Text style={styles.label}>Tên tài khoản</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={80} placeholder="Ví dụ: Tiền mặt" />
      <Text style={styles.label}>Loại tài khoản</Text>
      <View style={styles.types}>{types.map((item) => <Pressable key={item.value} onPress={() => setType(item.value)} style={[styles.typeButton, type === item.value && styles.activeType]}>
        <Text style={[styles.typeText, type === item.value && styles.activeTypeText]}>{item.label}</Text>
      </Pressable>)}</View>
      <Text style={styles.label}>Số dư đầu kỳ (VND)</Text>
      <TextInput style={styles.input} value={openingBalance} onChangeText={setOpeningBalance} keyboardType="decimal-pad" />
      <Pressable style={[styles.button, (busy || !name.trim()) && styles.disabled]} onPress={createAccount} disabled={busy || !name.trim()}>
        <Text style={styles.buttonText}>{busy ? "Đang lưu..." : "Thêm tài khoản"}</Text>
      </Pressable>
      {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderTopColor: "#C8DEC9", borderTopWidth: 1, marginTop: 27, paddingTop: 25 },
  title: { color: "#173D32", fontSize: 20, fontWeight: "800", marginBottom: 8 },
  helper: { color: "#567366", fontSize: 12, lineHeight: 18, marginBottom: 8 },
  row: { backgroundColor: "#F6FAF4", borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  rowName: { flex: 1 },
  name: { color: "#173D32", fontSize: 14, fontWeight: "700" },
  balance: { color: "#0A6A55", fontSize: 14, fontWeight: "800" },
  label: { color: "#173D32", fontSize: 13, fontWeight: "700", marginTop: 12, marginBottom: 7 },
  input: { backgroundColor: "#FFF", borderColor: "#BED9C9", borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, color: "#173D32" },
  types: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  typeButton: { borderColor: "#B8D3C2", borderWidth: 1, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 8 },
  activeType: { backgroundColor: "#0A6A55", borderColor: "#0A6A55" },
  typeText: { color: "#315A48", fontSize: 12, fontWeight: "700" },
  activeTypeText: { color: "#FFF" },
  button: { backgroundColor: "#0A6A55", borderRadius: 11, padding: 14, alignItems: "center", marginTop: 19 },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  message: { color: "#173D32", fontSize: 13, lineHeight: 20, marginTop: 13 },
});
