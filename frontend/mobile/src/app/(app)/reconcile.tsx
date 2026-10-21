import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { deleteReconciliation, getAccounts, getReconciliations, saveReconciliation, type Account, type AccountReconciliation } from '../../api';
import { Brand, Card, Page, PrimaryButton, common } from '../../components/Ui';
import { formatVnd } from '../../money';
import { useSession } from '../../session';
import { color } from '../../theme';

const labels = { BALANCED: 'Khớp', SURPLUS: 'Thực tế cao hơn', SHORTFALL: 'Thực tế thấp hơn' };

export default function Reconcile() {
  const { session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [history, setHistory] = useState<AccountReconciliation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [observedBalance, setObservedBalance] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const selected = accounts.some((item) => item.id === accountId) ? accountId : accounts[0]?.id ?? '';
  const account = accounts.find((item) => item.id === selected);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    getAccounts(session, controller.signal).then((items) => { setAccounts(items); setLoaded(true); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được tài khoản.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session]);

  useEffect(() => {
    if (!session || !selected) return;
    const controller = new AbortController();
    setHistoryLoaded(false); setHistory([]);
    getReconciliations(session, selected, controller.signal).then((items) => { setHistory(items); setHistoryLoaded(true); setError(''); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được lịch sử.'); setHistoryLoaded(true); } });
    return () => controller.abort();
  }, [session, selected]);

  async function save() {
    if (!session || !selected || busy) return;
    const amount = observedBalance.trim().replace(',', '.');
    if (!/^-?\d{1,17}(?:\.\d{1,2})?$/.test(amount)) { setMessage('Số dư thực tế phải có tối đa hai chữ số thập phân.'); return; }
    setBusy(true); setMessage('');
    try { const result = await saveReconciliation(session, selected, amount, note.trim() || null); setHistory((current) => [result, ...current]); setObservedBalance(''); setNote(''); setMessage('Đã lưu lần đối soát. Số dư FinSight không thay đổi.'); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không lưu được lần đối soát.'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!session || !selected || busy) return;
    setBusy(true); setMessage('');
    try { await deleteReconciliation(session, selected, id); setHistory((current) => current.filter((item) => item.id !== id)); setDeletingId(null); setMessage('Đã xóa lần đối soát.'); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không xóa được lần đối soát.'); }
    finally { setBusy(false); }
  }

  return <Page><Brand subtitle="TÀI KHOẢN CỦA BẠN" /><Text style={[common.title, styles.title]}>Đối soát số dư</Text><Text style={common.subtitle}>So số dư thực tế bạn quan sát với dữ liệu trong FinSight. Lần đối soát không tạo giao dịch điều chỉnh.</Text>
    {!loaded && <Text style={common.helper}>Đang tải tài khoản...</Text>}{!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {loaded && !accounts.length && !error && <Card><Text style={common.helper}>Hãy thêm tài khoản trước khi đối soát.</Text></Card>}
    {!!accounts.length && <><Card style={styles.form}><Text style={common.label}>Chọn tài khoản</Text><View style={styles.chips}>{accounts.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => { setAccountId(item.id); setDeletingId(null); }} style={[styles.chip, selected === item.id && styles.chipActive]}><Text style={[styles.chipText, selected === item.id && styles.chipTextActive]}>{item.name}</Text></Pressable>)}</View>{account && <View style={styles.expected}><Text style={styles.expectedLabel}>SỐ DƯ FINSIGHT HIỆN TẠI</Text><Text style={styles.expectedValue}>{formatVnd(account.currentBalance)}</Text></View>}<Text style={common.label}>Số dư thực tế quan sát được (VND)</Text><TextInput style={common.input} value={observedBalance} onChangeText={setObservedBalance} keyboardType="decimal-pad" placeholder="Ví dụ: 100000" placeholderTextColor={color.muted} /><Text style={common.label}>Ghi chú (tùy chọn)</Text><TextInput style={[common.input, styles.note]} value={note} onChangeText={setNote} multiline maxLength={500} /><PrimaryButton onPress={save} disabled={busy || !observedBalance.trim()}>{busy ? 'Đang lưu...' : 'Lưu lần đối soát'}</PrimaryButton></Card><Text style={styles.historyTitle}>Lịch sử đối soát</Text>{!historyLoaded && <Text style={common.helper}>Đang tải lịch sử...</Text>}{historyLoaded && !history.length && !error && <Card><Text style={common.helper}>Chưa có lần đối soát nào cho tài khoản này.</Text></Card>}{history.map((item) => <Card key={item.id} style={styles.record}><View style={styles.row}><Text style={styles.status}>{labels[item.status]}</Text><Text style={styles.detail}>{new Date(item.recordedAt).toLocaleDateString('vi-VN')}</Text></View><Text style={styles.detail}>FinSight: {formatVnd(item.expectedBalance)}</Text><Text style={styles.detail}>Thực tế: {formatVnd(item.observedBalance)}</Text><Text style={[styles.difference, item.status === 'SHORTFALL' && styles.shortfall]}>Chênh lệch {formatVnd(item.differenceAmount)}</Text>{!!item.note && <Text style={common.helper}>{item.note}</Text>}<Pressable accessibilityRole="button" onPress={() => setDeletingId(item.id)}><Text style={styles.delete}>Xóa</Text></Pressable>{deletingId === item.id && <View style={styles.confirm}><Text style={common.helper}>Xóa lần đối soát này?</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => remove(item.id)}><Text style={styles.delete}>Xác nhận xóa</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeletingId(null)}><Text style={styles.status}>Hủy</Text></Pressable></View>}</Card>)}</>}
    {!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}
  </Page>;
}

const styles = StyleSheet.create({ title: { marginTop: 28 }, form: { gap: 12, marginTop: 20 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: color.border, borderRadius: 18 }, chipActive: { backgroundColor: color.greenLight, borderColor: color.greenDark }, chipText: { color: color.muted, fontWeight: '700' }, chipTextActive: { color: color.greenDark }, expected: { backgroundColor: color.greenLight, borderRadius: 12, padding: 15, gap: 6 }, expectedLabel: { color: color.greenDark, fontSize: 10, fontWeight: '800' }, expectedValue: { color: color.navy, fontSize: 24, fontWeight: '800' }, note: { minHeight: 70, textAlignVertical: 'top' }, historyTitle: { color: color.navy, fontSize: 18, fontWeight: '800', marginTop: 26, marginBottom: 12 }, record: { gap: 9, marginBottom: 12 }, row: { flexDirection: 'row', justifyContent: 'space-between' }, status: { color: color.greenDark, fontWeight: '800' }, detail: { color: color.muted, fontSize: 12 }, difference: { color: color.greenDark, fontWeight: '800' }, shortfall: { color: '#b45309' }, delete: { color: '#b91c1c', fontWeight: '800' }, confirm: { backgroundColor: '#fff7f7', padding: 10, borderRadius: 9, gap: 8 } });
