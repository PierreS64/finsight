import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAccounts, saveTransfer, type Account } from '../../api';
import { formatVnd, sumBalances } from '../../money';
import { reportDate } from '../../reportDate';
import { useSession } from '../../session';
import { Card, Page, PrimaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

function iconFor(account: Account) {
  return account.accountType === 'BANK' ? 'business-outline' : account.accountType === 'CASH' ? 'cash-outline' : 'wallet-outline';
}

function validAmount(value: string) { return /^\d{1,17}(?:\.\d{1,2})?$/.test(value) && /[1-9]/.test(value); }

export default function Transfers() {
  const { session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(reportDate);
  const [note, setNote] = useState('');
  const [picker, setPicker] = useState<'source' | 'destination' | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setLoaded(false); setError('');
    getAccounts(session, controller.signal).then((items) => { setAccounts(items); setLoaded(true); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được tài khoản.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session]));
  const source = accounts.find((item) => item.id === sourceId) ?? accounts[0];
  const destination = accounts.find((item) => item.id === destinationId && item.id !== source?.id) ?? accounts.find((item) => item.id !== source?.id);
  const value = amount.trim().replace(',', '.');
  const canTransfer = !!source && !!destination && validAmount(value) && !sumBalances([source.currentBalance, `-${value}`]).startsWith('-');
  function review() {
    if (!validAmount(value)) { setError('Nhập số tiền lớn hơn 0, tối đa hai chữ số thập phân.'); return; }
    if (!source || !destination) { setError('Cần ít nhất hai tài khoản để chuyển nội bộ.'); return; }
    if (!canTransfer) { setError('Số tiền chuyển vượt quá số dư tài khoản nguồn.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) { setError('Ngày thực hiện phải có dạng YYYY-MM-DD.'); return; }
    setError(''); setConfirm(true);
  }
  async function transfer() {
    if (!session || !source || !destination || !canTransfer || busy) return;
    setBusy(true); setError('');
    try {
      await saveTransfer(session, { fromAccountId: source.id, toAccountId: destination.id, amount: value, occurredOn: date, note: note.trim() || null });
      setConfirm(false); router.replace('/accounts');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được chuyển khoản.'); setConfirm(false); }
    finally { setBusy(false); }
  }
  return <Page style={styles.page}>
    <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={color.navy} /></Pressable><Text style={styles.title}>Chuyển khoản nội bộ</Text><View style={{ width: 25 }} /></View>
    {!loaded && <Text style={common.helper}>Đang tải tài khoản...</Text>}{!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {loaded && !error && accounts.length < 2 && <Card><Text style={common.helper}>Cần ít nhất hai tài khoản để chuyển nội bộ.</Text></Card>}
    {source && destination && <>
      <Card style={styles.accounts}>
        <Pressable accessibilityRole="button" onPress={() => setPicker('source')} style={styles.accountRow}><View style={styles.bankIcon}><Ionicons name={iconFor(source)} size={27} color={color.blue} /></View><View style={styles.accountMain}><Text style={styles.eyebrow}>Từ tài khoản nguồn</Text><Text style={styles.accountName}>{source.name}  ⌄</Text><Text style={styles.sourceBalance}>Số dư: {formatVnd(source.currentBalance)}</Text></View></Pressable>
        <View style={styles.swapLine}><Ionicons name="swap-vertical" size={22} color={color.greenDark} /></View>
        <Pressable accessibilityRole="button" onPress={() => setPicker('destination')} style={styles.accountRow}><View style={styles.walletIcon}><Ionicons name={iconFor(destination)} size={27} color="#dc277a" /></View><View style={styles.accountMain}><Text style={styles.eyebrow}>Đến tài khoản nhận</Text><Text style={styles.accountName}>{destination.name}</Text><Text style={styles.balance}>Số dư hiện tại: {formatVnd(destination.currentBalance)}</Text></View><Ionicons name="chevron-forward" size={21} color={color.muted} /></Pressable>
      </Card>
      <Card style={styles.amountCard}><Text style={styles.eyebrow}>Số tiền cần chuyển</Text><View style={styles.amountRow}><TextInput accessibilityLabel="Số tiền cần chuyển" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={styles.amountInput} placeholder="0" placeholderTextColor={color.muted} /><Text style={styles.currency}>₫</Text><Pressable accessibilityRole="button" accessibilityLabel="Xóa số tiền" onPress={() => setAmount('')}><Ionicons name="close-circle-outline" size={22} color={color.muted} /></Pressable></View><View style={styles.quickAmounts}>{['100000', '200000', '500000', 'all'].map((quick) => <Pressable key={quick} accessibilityRole="button" onPress={() => setAmount(quick === 'all' ? source.currentBalance : sumBalances([value && validAmount(value) ? value : '0', quick]))} style={styles.quick}><Text style={styles.quickText}>{quick === 'all' ? 'Tất cả' : `+${Number(quick) / 1000}k`}</Text></Pressable>)}</View></Card>
      <Card style={styles.details}><View style={styles.dateRow}><View style={styles.dateIcon}><Ionicons name="calendar-outline" size={23} color={color.muted} /></View><View style={{ flex: 1 }}><Text style={styles.eyebrow}>Ngày thực hiện</Text><Text style={styles.dateValue}>{date === reportDate() ? 'Hôm nay, ' : ''}{date.split('-').reverse().join('/')}</Text></View><Text style={styles.change}>Thay đổi</Text></View><TextInput accessibilityLabel="Ngày thực hiện YYYY-MM-DD" style={styles.dateInput} value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" /><View style={styles.separator} /><Text style={styles.eyebrow}>Ghi chú giao dịch</Text><TextInput value={note} onChangeText={setNote} maxLength={500} placeholder="Nhập nội dung chuyển khoản" placeholderTextColor={color.muted} style={common.input} /></Card>
      <View style={styles.notice}><Ionicons name="information-circle" size={23} color={color.greenDark} /><Text style={styles.noticeText}><Text style={styles.noticeStrong}>Lưu ý phân loại tài chính{'\n'}</Text>Giao dịch chuyển nội bộ chỉ thay đổi số dư giữa các tài khoản, hoàn toàn <Text style={styles.noticeStrong}>không tính vào</Text> tổng thu hoặc tổng chi tiêu của bạn.</Text></View>
      <View style={styles.action}><PrimaryButton onPress={review} disabled={!canTransfer || busy} icon="arrow-forward">Xác nhận chuyển {validAmount(value) ? formatVnd(value) : '0 ₫'}</PrimaryButton></View>
    </>}
    <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}><View style={styles.scrim}><View style={styles.sheet}><View style={styles.handle} /><View style={styles.sheetHead}><Text style={styles.sheetTitle}>{picker === 'source' ? 'Chọn tài khoản nguồn' : 'Chọn tài khoản nhận'}</Text><Pressable onPress={() => setPicker(null)}><Ionicons name="close" size={25} color={color.navy} /></Pressable></View>{accounts.filter((item) => picker === 'source' || item.id !== source?.id).map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => { if (picker === 'source') setSourceId(item.id); else setDestinationId(item.id); setPicker(null); }} style={styles.choice}><Ionicons name={iconFor(item)} size={25} color={color.greenDark} /><View style={{ flex: 1 }}><Text style={styles.accountName}>{item.name}</Text><Text style={styles.eyebrow}>{formatVnd(item.currentBalance)}</Text></View><Ionicons name="chevron-forward" size={20} color={color.muted} /></Pressable>)}</View></View></Modal>
    <Modal visible={confirm} transparent animationType="slide" onRequestClose={() => setConfirm(false)}><View style={styles.scrim}><View style={styles.sheet}><View style={styles.handle} /><View style={styles.sheetHead}><Text style={styles.sheetTitle}>Xác nhận chuyển khoản nội bộ</Text><Pressable onPress={() => setConfirm(false)}><Ionicons name="close" size={25} color={color.navy} /></Pressable></View>{source && destination && <><View style={styles.confirmAmount}><Text style={styles.eyebrow}>SỐ TIỀN CHUYỂN GIAO</Text><Text style={styles.confirmValue}>{formatVnd(value)}</Text><Text style={styles.sourceBalance}>Miễn phí (Nội bộ FinSight)</Text></View><View style={styles.confirmAccounts}><Text style={styles.eyebrow}>Từ tài khoản nguồn</Text><Text style={styles.accountName}>{source.name}</Text><Text style={styles.balance}>Hiện tại: {formatVnd(source.currentBalance)} · Sau chuyển: {formatVnd(sumBalances([source.currentBalance, `-${value}`]))}</Text><View style={styles.separator} /><Text style={styles.eyebrow}>Đến tài khoản nhận</Text><Text style={styles.accountName}>{destination.name}</Text><Text style={styles.balance}>Hiện tại: {formatVnd(destination.currentBalance)} · Sau chuyển: {formatVnd(sumBalances([destination.currentBalance, value]))}</Text></View><Card style={styles.confirmDetails}><Text style={styles.balance}>Thời gian giao dịch: {date.split('-').reverse().join('/')}</Text><Text style={styles.balance}>Nội dung ghi chú: {note.trim() || '—'}</Text><Text style={styles.sourceBalance}>Phí giao dịch: Miễn phí (Nội bộ FinSight)</Text></Card><View style={styles.assurance}><Text style={styles.noticeText}><Text style={styles.noticeStrong}>Cam kết bảo toàn tài sản{'\n'}</Text>Giao dịch chuyển tiền nội bộ không làm thay đổi tổng tài sản ròng của bạn.</Text></View><PrimaryButton onPress={transfer} disabled={busy} icon="checkmark-circle-outline">{busy ? 'Đang lưu...' : 'Xác nhận chuyển ngay'}</PrimaryButton><Pressable onPress={() => setConfirm(false)} style={styles.cancel}><Text style={styles.balance}>Hủy giao dịch</Text></Pressable></>}</View></View></Modal>
  </Page>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 7 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }, title: { color: color.navy, fontSize: 20, fontWeight: '800' },
  accounts: { gap: 2, marginBottom: 20 }, accountRow: { backgroundColor: '#f7f9ff', padding: 13, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 95 }, accountMain: { flex: 1, gap: 3 }, bankIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e9f3ff', alignItems: 'center', justifyContent: 'center' }, walletIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fdf0f8', alignItems: 'center', justifyContent: 'center' }, eyebrow: { color: '#68757a', fontSize: 13 }, accountName: { color: color.navy, fontSize: 17, fontWeight: '700' }, sourceBalance: { color: color.greenDark, fontSize: 14, fontWeight: '700' }, balance: { color: '#45534e', fontSize: 13 }, swapLine: { alignItems: 'center', marginVertical: -7, zIndex: 1 },
  amountCard: { marginBottom: 20, gap: 9, padding: 22 }, amountRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: color.border, gap: 9 }, amountInput: { flex: 1, fontSize: 36, fontWeight: '800', color: color.navy, minHeight: 74 }, currency: { fontSize: 21, fontWeight: '800', color: color.greenDark }, quickAmounts: { flexDirection: 'row', gap: 6, marginTop: 7 }, quick: { flex: 1, minHeight: 39, borderRadius: 11, borderWidth: 1, borderColor: color.border, backgroundColor: '#f7f9ff', justifyContent: 'center', alignItems: 'center' }, quickText: { color: color.navy, fontSize: 12, fontWeight: '700' },
  details: { marginBottom: 20, gap: 10 }, dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, dateIcon: { backgroundColor: '#edf4ff', width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, dateValue: { color: color.navy, fontSize: 15, marginTop: 3 }, change: { color: color.greenDark, fontWeight: '700', fontSize: 12 }, dateInput: { color: color.muted, fontSize: 12, borderBottomWidth: 1, borderColor: color.border, paddingVertical: 8 }, separator: { borderBottomWidth: 1, borderColor: color.border, marginVertical: 5 }, notice: { backgroundColor: '#e7fbf1', borderWidth: 1, borderColor: '#9ce8c5', borderRadius: 14, padding: 16, flexDirection: 'row', gap: 10 }, noticeText: { flex: 1, color: '#15573d', fontSize: 14, lineHeight: 23 }, noticeStrong: { color: '#006948', fontWeight: '800' }, action: { marginTop: 25, marginBottom: 20 },
  scrim: { flex: 1, backgroundColor: '#1a273980', justifyContent: 'flex-end' }, sheet: { backgroundColor: color.white, borderTopLeftRadius: 29, borderTopRightRadius: 29, padding: 22, maxHeight: '92%', gap: 15 }, handle: { width: 48, height: 5, borderRadius: 3, backgroundColor: '#d8e1dc', alignSelf: 'center', marginBottom: 6 }, sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sheetTitle: { color: color.navy, fontSize: 20, fontWeight: '800', flex: 1 }, choice: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderColor: color.border }, confirmAmount: { backgroundColor: '#f7f9ff', borderRadius: 17, padding: 20, alignItems: 'center', gap: 7 }, confirmValue: { color: '#006948', fontSize: 31, fontWeight: '800' }, confirmAccounts: { backgroundColor: '#f7f9ff', borderRadius: 17, padding: 17, gap: 6 }, confirmDetails: { gap: 11 }, assurance: { backgroundColor: '#e9f1ff', padding: 17, borderRadius: 15 }, cancel: { alignItems: 'center', padding: 13 },
});
