import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { deleteTransfer, getAccounts, getTransfers, saveTransfer, type Account, type Transfer } from '../../api';
import { formatVnd } from '../../money';
import { useSession } from '../../session';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function Transfers() {
  const { session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [occurredOn, setOccurredOn] = useState(today);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    Promise.all([getAccounts(session, controller.signal), getTransfers(session, controller.signal)])
      .then(([foundAccounts, foundTransfers]) => { setAccounts(foundAccounts); setTransfers(foundTransfers); setLoaded(true); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setMessage(reason instanceof Error ? reason.message : 'Không tải được chuyển khoản.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session]);

  const source = accounts.some((account) => account.id === fromAccountId) ? fromAccountId : accounts[0]?.id ?? '';
  const destination = accounts.some((account) => account.id === toAccountId && account.id !== source)
    ? toAccountId : accounts.find((account) => account.id !== source)?.id ?? '';
  const nameOf = (id: string) => accounts.find((account) => account.id === id)?.name ?? 'Tài khoản đã thay đổi';

  async function refreshAccounts() {
    if (!session) return;
    try { setAccounts(await getAccounts(session)); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không cập nhật được số dư.'); }
  }

  async function save() {
    if (!session || busy || !source || !destination || source === destination) return;
    const value = amount.trim().replace(',', '.');
    if (!/^\d{1,17}(?:\.\d{1,2})?$/.test(value) || !/[1-9]/.test(value)) { setMessage('Số tiền phải lớn hơn 0 và có tối đa hai chữ số thập phân.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) { setMessage('Ngày chuyển phải có dạng YYYY-MM-DD.'); return; }
    setBusy(true); setMessage('');
    try {
      const saved = await saveTransfer(session, { fromAccountId: source, toAccountId: destination, amount: value, occurredOn, note: note.trim() || null });
      setTransfers((current) => [saved, ...current].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.id.localeCompare(a.id)));
      setAmount(''); setNote(''); setOccurredOn(today()); setMessage('Đã lưu chuyển khoản.');
      await refreshAccounts();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không lưu được chuyển khoản.'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!session || busy) return;
    setBusy(true); setMessage('');
    try {
      await deleteTransfer(session, id);
      setTransfers((current) => current.filter((item) => item.id !== id)); setDeletingId(null); setMessage('Đã xóa chuyển khoản.');
      await refreshAccounts();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không xóa được chuyển khoản.'); }
    finally { setBusy(false); }
  }

  return <Page><View style={styles.header}><Brand subtitle="CHUYỂN KHOẢN" /><Pressable accessibilityRole="button" onPress={() => router.replace('/transactions')} style={styles.back}><Ionicons name="arrow-back-outline" size={22} color={color.greenDark} /></Pressable></View>
    <Text style={common.title}>Chuyển khoản</Text><Text style={[common.subtitle, styles.subtitle]}>Di chuyển tiền giữa các tài khoản do bạn tự quản lý.</Text>
    <Card style={styles.info}><Text style={styles.infoText}>Chuyển khoản không làm thay đổi tổng tài sản, thu nhập, chi tiêu hoặc ngân sách.</Text></Card>
    <Text style={[common.sectionTitle, styles.sectionTitle]}>Lịch sử chuyển khoản</Text>
    <Card>{!loaded ? <Text style={common.helper}>Đang tải chuyển khoản...</Text> : transfers.length ? transfers.map((item, index) => <View key={item.id} style={[styles.row, index > 0 && styles.divider]}><View style={styles.icon}><Ionicons name="swap-horizontal-outline" size={21} color={color.greenDark} /></View><View style={styles.rowMain}><Text style={styles.rowName}>{nameOf(item.fromAccountId)} → {nameOf(item.toAccountId)}</Text><Text style={styles.rowDetail}>{item.occurredOn.split('-').reverse().join('/')}</Text>{!!item.note && <Text style={styles.rowDetail}>{item.note}</Text>}<Text style={styles.amount}>{formatVnd(item.amount)}</Text><Pressable accessibilityRole="button" onPress={() => setDeletingId(item.id)}><Text style={styles.delete}>Xóa chuyển khoản</Text></Pressable>{deletingId === item.id && <View style={styles.confirm}><Pressable accessibilityRole="button" disabled={busy} onPress={() => remove(item.id)}><Text style={styles.delete}>Xác nhận xóa</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeletingId(null)}><Text style={styles.link}>Hủy</Text></Pressable></View>}</View></View>) : <View style={styles.empty}><Ionicons name="swap-horizontal-outline" size={31} color={color.greenDark} /><Text style={styles.emptyTitle}>Chưa có chuyển khoản</Text><Text style={common.helper}>Chọn hai tài khoản bên dưới để bắt đầu.</Text></View>}</Card>
    <Text style={[common.sectionTitle, styles.sectionTitle]}>Chuyển khoản mới</Text><Card>
      <Text style={common.label}>Từ tài khoản</Text><View style={styles.chips}>{accounts.map((account) => <Pressable accessibilityRole="button" key={account.id} onPress={() => setFromAccountId(account.id)} style={[styles.chip, source === account.id && styles.chipActive]}><Text style={[styles.chipText, source === account.id && styles.chipTextActive]}>{account.name} · {formatVnd(account.currentBalance)}</Text></Pressable>)}</View>
      <Text style={[common.label, styles.labelGap]}>Đến tài khoản</Text><View style={styles.chips}>{accounts.filter((account) => account.id !== source).map((account) => <Pressable accessibilityRole="button" key={account.id} onPress={() => setToAccountId(account.id)} style={[styles.chip, destination === account.id && styles.chipActive]}><Text style={[styles.chipText, destination === account.id && styles.chipTextActive]}>{account.name}</Text></Pressable>)}</View>{accounts.length < 2 && <Text style={common.helper}>Cần ít nhất hai tài khoản để chuyển tiền.</Text>}
      <Text style={[common.label, styles.labelGap]}>Số tiền (VND)</Text><TextInput style={common.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Ví dụ: 50000" placeholderTextColor="#94a3b8" />
      <Text style={[common.label, styles.labelGap]}>Ngày chuyển (YYYY-MM-DD)</Text><TextInput style={common.input} value={occurredOn} onChangeText={setOccurredOn} keyboardType="numbers-and-punctuation" placeholder="2026-10-21" placeholderTextColor="#94a3b8" />
      <Text style={[common.label, styles.labelGap]}>Ghi chú (tùy chọn)</Text><TextInput style={[common.input, styles.noteInput]} value={note} onChangeText={setNote} multiline maxLength={500} placeholder="Ghi chú chuyển khoản" placeholderTextColor="#94a3b8" />
      <PrimaryButton onPress={save} disabled={busy || !source || !destination || !amount.trim()}>{busy ? 'Đang lưu...' : 'Lưu chuyển khoản'}</PrimaryButton>
      <SecondaryButton onPress={() => router.replace('/transactions')}>Về giao dịch</SecondaryButton>
    </Card>{!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}
  </Page>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }, back: { width: 41, height: 41, backgroundColor: color.greenLight, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, subtitle: { marginTop: 7, marginBottom: 20 }, info: { backgroundColor: color.greenLight, borderColor: '#80e5b4' }, infoText: { color: color.greenDark, fontSize: 13, lineHeight: 20 }, sectionTitle: { marginTop: 24, marginBottom: 13 }, row: { flexDirection: 'row', gap: 10, paddingVertical: 12 }, divider: { borderTopWidth: 1, borderColor: color.border }, icon: { width: 41, height: 41, borderRadius: 12, backgroundColor: color.greenLight, alignItems: 'center', justifyContent: 'center' }, rowMain: { flex: 1, gap: 4 }, rowName: { color: color.navy, fontSize: 13, fontWeight: '800' }, rowDetail: { color: color.muted, fontSize: 11 }, amount: { color: color.greenDark, fontSize: 13, fontWeight: '800', marginTop: 4 }, delete: { color: '#b91c1c', fontSize: 12, fontWeight: '800', marginTop: 5 }, link: { color: color.greenDark, fontSize: 12, fontWeight: '800' }, confirm: { flexDirection: 'row', gap: 16, marginTop: 8 }, empty: { alignItems: 'center', paddingVertical: 22, gap: 9 }, emptyTitle: { color: color.navy, fontSize: 17, fontWeight: '800' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderRadius: 18, borderWidth: 1, borderColor: color.border, paddingHorizontal: 12, paddingVertical: 8 }, chipActive: { borderColor: '#6ee7b7', backgroundColor: color.greenLight }, chipText: { color: color.muted, fontSize: 11, fontWeight: '700' }, chipTextActive: { color: color.greenDark }, labelGap: { marginTop: 18 }, noteInput: { minHeight: 83, textAlignVertical: 'top', paddingTop: 13 },
});
