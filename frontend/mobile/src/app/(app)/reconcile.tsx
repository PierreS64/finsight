import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAccounts, getReconciliations, saveReconciliation, type Account, type AccountReconciliation } from '../../api';
import { Card, Page, PrimaryButton, common } from '../../components/Ui';
import { formatVnd, sumBalances } from '../../money';
import { useSession } from '../../session';
import { color } from '../../theme';

function difference(expected: string, observed: string) { return sumBalances([observed, expected.startsWith('-') ? expected.slice(1) : `-${expected}`]); }
const labels = { BALANCED: 'Khớp 100%', SURPLUS: 'Thực tế cao hơn', SHORTFALL: 'Thực tế thấp hơn' };

export default function Reconcile() {
  const { session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [observed, setObserved] = useState('');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<AccountReconciliation[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setLoaded(false); setError('');
    getAccounts(session, controller.signal).then((items) => { setAccounts(items); setLoaded(true); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được tài khoản.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session]));
  const account = accounts.find((item) => item.id === selectedId) ?? accounts[0];
  useFocusEffect(useCallback(() => {
    if (!session || !account) return;
    const controller = new AbortController();
    getReconciliations(session, account.id, controller.signal).then(setHistory)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được lịch sử đối soát.'); });
    return () => controller.abort();
  }, [session, account]));
  const value = observed.trim().replace(',', '.');
  const valid = /^-?\d{1,17}(?:\.\d{1,2})?$/.test(value);
  const diff = account && valid ? difference(account.currentBalance, value) : null;
  async function save() {
    if (!session || !account || busy) return;
    if (!valid) { setError('Số dư thực tế phải có tối đa hai chữ số thập phân.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await saveReconciliation(session, account.id, value, note.trim() || null);
      setHistory((items) => [result, ...items]); setObserved(''); setNote('');
      setMessage('Đã lưu lần đối soát. Số dư tài khoản không thay đổi.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được lần đối soát.'); }
    finally { setBusy(false); }
  }
  return <Page style={styles.page}>
    <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={color.navy} /></Pressable><Text style={styles.title}>Đối soát số dư</Text><View style={{ width: 25 }} /></View>
    <View style={styles.intro}><Ionicons name="information-circle" size={23} color={color.greenDark} /><Text style={styles.introText}><Text style={styles.introBold}>Cân bằng tài chính thực tế{'\n'}</Text>Đếm số tiền thực có trong ví hoặc kiểm tra số dư sao kê để đối chiếu với FinSight.</Text></View>
    {!loaded && <Text style={common.helper}>Đang tải tài khoản...</Text>}{!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {loaded && !account && !error && <Card><Text style={common.helper}>Hãy thêm tài khoản trước khi đối soát.</Text></Card>}
    {account && <>
      <Card style={styles.accountCard}><Text style={styles.label}>Tài khoản cần đối soát</Text><Pressable accessibilityRole="button" onPress={() => setChoosing(!choosing)} style={styles.accountChoice}><Ionicons name={account.accountType === 'CASH' ? 'cash-outline' : 'wallet-outline'} size={25} color={color.greenDark} /><Text style={styles.accountName}>{account.name}</Text><Ionicons name="chevron-down" size={18} color={color.muted} /></Pressable>{choosing && accounts.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => { setSelectedId(item.id); setChoosing(false); setObserved(''); }} style={styles.option}><Text style={styles.optionText}>{item.name}</Text></Pressable>)}<View style={styles.divider} /><View style={styles.balanceRow}><Text style={styles.label}>Số dư trên FinSight:</Text><Text style={styles.bookBalance}>{formatVnd(account.currentBalance)}</Text></View></Card>
      <Card style={styles.observedCard}><View style={styles.balanceRow}><Text style={styles.fieldTitle}>Số dư thực tế đếm được</Text><Text style={styles.label}>VND</Text></View><View style={styles.amountField}><TextInput accessibilityLabel="Số dư thực tế đếm được" value={observed} onChangeText={setObserved} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={color.muted} style={styles.amountInput} /><Text style={styles.currency}>₫</Text></View>{diff !== null && <View style={[styles.difference, diff.startsWith('-') && styles.shortfall]}><Ionicons name={diff.startsWith('-') ? 'trending-down' : 'trending-up'} size={22} color={diff.startsWith('-') ? '#b45309' : color.greenDark} /><View style={{ flex: 1 }}><Text style={styles.differenceTitle}>Chênh lệch phát hiện</Text><Text style={styles.label}>{diff.startsWith('-') ? 'Thiếu hụt so với sổ sách' : diff === '0.00' ? 'Đã khớp số dư' : 'Thực tế cao hơn sổ sách'}</Text></View><Text style={styles.differenceValue}>{formatVnd(diff)}</Text></View>}</Card>
      <Card style={styles.processing}><Text style={styles.processingTitle}>Xử lý chênh lệch thông minh</Text><View style={styles.processingNote}><Ionicons name="information-circle-outline" size={23} color={color.greenDark} /><Text style={styles.processingText}>Lần đối soát ghi lại chênh lệch để bạn kiểm tra. FinSight chưa tự tạo giao dịch điều chỉnh số dư.</Text></View><Text style={styles.label}>Ghi chú điều chỉnh</Text><TextInput accessibilityLabel="Ghi chú đối soát" style={common.input} value={note} onChangeText={setNote} maxLength={500} placeholder="Ví dụ: Kiểm kê tiền mặt cuối tuần" placeholderTextColor={color.muted} /></Card>
      <View style={styles.historyHead}><Text style={styles.historyTitle}>Lịch sử đối soát gần nhất</Text><Pressable accessibilityRole="button" onPress={() => router.push('/reconcile-history')}><Text style={styles.historyLink}>Xem tất cả</Text></Pressable></View><Card style={styles.historyCard}>{history.length ? history.slice(0, 2).map((item) => <View key={item.id} style={styles.historyRow}><Ionicons name="checkmark-circle-outline" size={22} color={color.greenDark} /><View style={{ flex: 1 }}><Text style={styles.historyName}>{accounts.find((candidate) => candidate.id === item.accountId)?.name ?? account.name}</Text><Text style={styles.label}>{new Date(item.recordedAt).toLocaleDateString('vi-VN')} · {labels[item.status]}</Text></View><Text style={styles.historyDiff}>{formatVnd(item.differenceAmount)}</Text></View>) : <Text style={common.helper}>Chưa có lần đối soát nào.</Text>}</Card>
      {!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}<View style={styles.action}><PrimaryButton onPress={save} disabled={busy || !observed.trim()} icon="checkmark-circle-outline">{busy ? 'Đang lưu...' : 'Lưu lần đối soát'}</PrimaryButton><Text style={styles.footnote}>Số dư FinSight không thay đổi khi lưu lần đối soát.</Text></View>
    </>}
  </Page>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 6 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 }, title: { color: color.navy, fontSize: 20, fontWeight: '800' }, intro: { backgroundColor: '#e9fbf2', borderColor: '#a6eaca', borderWidth: 1, borderRadius: 13, padding: 16, flexDirection: 'row', gap: 10, marginBottom: 20 }, introText: { color: '#244638', flex: 1, fontSize: 13, lineHeight: 20 }, introBold: { color: color.greenDark, fontWeight: '800' },
  accountCard: { gap: 10, marginBottom: 20 }, label: { color: '#68757a', fontSize: 12 }, accountChoice: { backgroundColor: '#f7f9ff', borderColor: color.border, borderWidth: 1, borderRadius: 13, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }, accountName: { flex: 1, color: color.navy, fontSize: 16, fontWeight: '700' }, option: { padding: 11, borderBottomWidth: 1, borderColor: color.border }, optionText: { color: color.navy, fontSize: 14 }, divider: { borderBottomWidth: 1, borderColor: color.border, marginTop: 8 }, balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, bookBalance: { color: color.navy, fontSize: 19, fontWeight: '800' },
  observedCard: { gap: 13, marginBottom: 20 }, fieldTitle: { color: color.navy, fontWeight: '800', fontSize: 15 }, amountField: { backgroundColor: '#f7f9ff', borderRadius: 13, borderWidth: 1, borderColor: color.muted, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }, amountInput: { color: color.navy, fontSize: 30, fontWeight: '800', flex: 1, height: 70 }, currency: { color: color.greenDark, fontWeight: '800', fontSize: 20 }, difference: { backgroundColor: '#e8f8ef', borderRadius: 13, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }, shortfall: { backgroundColor: '#fff7e7' }, differenceTitle: { color: '#ad4315', fontSize: 12, fontWeight: '800' }, differenceValue: { color: '#ad4315', fontSize: 17, fontWeight: '800' },
  processing: { gap: 13 }, processingTitle: { color: color.navy, fontSize: 19, fontWeight: '800', textAlign: 'center' }, processingNote: { backgroundColor: '#f7f9ff', padding: 14, borderRadius: 12, flexDirection: 'row', gap: 10 }, processingText: { color: color.navy, fontSize: 13, lineHeight: 19, flex: 1 }, historyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }, historyTitle: { color: color.navy, fontSize: 18, fontWeight: '800' }, historyLink: { color: color.greenDark, fontWeight: '700' }, historyCard: { gap: 12 }, historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, historyName: { color: color.navy, fontWeight: '700', fontSize: 13 }, historyDiff: { color: color.greenDark, fontWeight: '800', fontSize: 12 }, action: { marginTop: 22, marginBottom: 12 }, footnote: { color: color.muted, textAlign: 'center', fontSize: 11, marginTop: 13 },
});
