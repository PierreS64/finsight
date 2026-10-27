import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAccounts, getCategories, getMerchants, getTransactions, saveTransaction, uploadReceipt, type Account, type Category, type CategoryType, type Merchant, type ReceiptRecognition, type Transaction } from '../api';
import { useSession } from '../session';
import { formatVnd } from '../money';
import { color } from '../theme';
import { Card, Page, PrimaryButton, SecondaryButton, common } from './Ui';
import CategorySuggestion from './CategorySuggestion';

type Props = { recognition?: ReceiptRecognition; receiptUri?: string; receiptMimeType?: string; transactionId?: string };
type Picker = 'account' | 'category' | 'merchant' | null;
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };

export default function TransactionEditor({ recognition, receiptUri, receiptMimeType, transactionId }: Props) {
  const { session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [kind, setKind] = useState<CategoryType>('EXPENSE');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [amount, setAmount] = useState(recognition?.amount ?? '');
  const [date, setDate] = useState(recognition?.occurredOn ?? today());
  const [note, setNote] = useState(recognition?.merchant ?? '');
  const [picker, setPicker] = useState<Picker>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<Transaction | null>(null);
  const [receiptWarning, setReceiptWarning] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!session) return;
    let active = true;
    Promise.all([getAccounts(session), getCategories(session), getMerchants(session)]).then(([newAccounts, newCategories, newMerchants]) => {
      if (!active) return;
      setAccounts(newAccounts); setCategories(newCategories); setMerchants(newMerchants); setLoaded(true);
      if (recognition?.merchant) setMerchantId(newMerchants.find((item) => item.name.toLocaleLowerCase() === recognition.merchant?.trim().toLocaleLowerCase())?.id ?? '');
    }).catch((reason: unknown) => { if (active) { setError(reason instanceof Error ? reason.message : 'Không tải được tài khoản và danh mục.'); setLoaded(true); } });
    return () => { active = false; };
  }, [session, recognition?.merchant]);

  useEffect(() => {
    if (!session || !transactionId) return;
    let active = true;
    getTransactions(session).then((items) => {
      if (!active) return;
      const found = items.find((item) => item.id === transactionId);
      if (!found) { setError('Không tìm thấy giao dịch cần sửa.'); return; }
      setKind(found.kind); setAccountId(found.accountId); setCategoryId(found.categoryId); setMerchantId(found.merchantId ?? ''); setAmount(found.amount); setDate(found.occurredOn); setNote(found.note ?? '');
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được giao dịch cần sửa.'); });
    return () => { active = false; };
  }, [session, transactionId]);

  const available = useMemo(() => categories.filter((item) => item.categoryType === kind), [categories, kind]);
  const selectedAccount = accounts.find((item) => item.id === accountId);
  const selectedCategory = categories.find((item) => item.id === categoryId);

  async function save() {
    if (!session || busy) return;
    const value = amount.trim().replace(',', '.');
    if (!accountId || !categoryId) { setError('Chọn tài khoản và danh mục trước khi lưu.'); return; }
    if (!/^\d{1,17}(?:\.\d{1,2})?$/.test(value) || !/[1-9]/.test(value)) { setError('Số tiền phải lớn hơn 0 và có tối đa hai chữ số thập phân.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError('Ngày giao dịch phải có dạng YYYY-MM-DD.'); return; }
    if (recognition?.duplicateTransactionId && !duplicateConfirmed) { setError('Kiểm tra ảnh trùng trước khi lưu.'); return; }
    setBusy(true); setError('');
    try {
      const transaction = await saveTransaction(session, { accountId, categoryId, merchantId: merchantId || null, kind, amount: value, occurredOn: date, note: note.trim() || null }, transactionId);
      if (receiptUri && receiptMimeType) {
        try { await uploadReceipt(session, transaction.id, receiptUri, receiptMimeType); }
        catch { setReceiptWarning('Đã lưu giao dịch, nhưng chưa đính kèm được ảnh. Bạn có thể thêm ảnh trong lịch sử.'); }
      }
      setSaved(transaction);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được giao dịch.'); }
    finally { setBusy(false); }
  }

  return <Page style={styles.page}>
    <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={color.navy} /></Pressable><Text style={styles.title}>{recognition ? 'Kết quả nhận diện OCR' : transactionId ? 'Sửa giao dịch' : 'Thêm giao dịch'}</Text><View style={{ width: 25 }} /></View>
    {recognition && <Card style={styles.ocrSummary}><Text style={styles.ocrLabel}>Dữ liệu nhận diện được · kiểm tra trước khi lưu</Text><Text style={styles.ocrMerchant}>{recognition.merchant || 'Chưa nhận diện cửa hàng'}</Text><Text style={common.helper}>Ngày: {recognition.occurredOn || 'Chưa nhận diện'}</Text><Text style={styles.ocrAmount}>{recognition.amount ? formatVnd(recognition.amount) : 'Chưa nhận diện số tiền'}</Text>{!!receiptUri && <Image source={{ uri: receiptUri }} style={styles.receiptThumbnail} resizeMode="cover" />}</Card>}
    <View style={styles.tabs}><Pressable onPress={() => { setKind('EXPENSE'); setCategoryId(''); }} style={[styles.tab, kind === 'EXPENSE' && styles.tabActive]}><Text style={styles.tabText}>Chi tiền</Text></Pressable><Pressable onPress={() => { setKind('INCOME'); setCategoryId(''); }} style={[styles.tab, kind === 'INCOME' && styles.tabActive]}><Text style={styles.tabText}>Thu tiền</Text></Pressable><Pressable onPress={() => router.push('/transfers')} style={styles.tab}><Text style={styles.tabText}>Chuyển khoản</Text></Pressable></View>
    <Card style={styles.amountCard}><Text style={styles.fieldTitle}>Số tiền giao dịch</Text><View style={styles.amountRow}><TextInput accessibilityLabel="Số tiền giao dịch" style={styles.amountInput} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={color.muted} /><Text style={styles.currency}>đ</Text></View></Card>
    <Card style={styles.selectionCard}><Pressable accessibilityRole="button" onPress={() => setPicker('category')} style={styles.selection}><View style={styles.selectionIcon}><Ionicons name="pricetags-outline" size={23} color={color.greenDark} /></View><View style={{ flex: 1 }}><Text style={styles.selectionLabel}>Danh mục</Text><Text style={styles.selectionValue}>{selectedCategory?.name || 'Chọn danh mục'}</Text></View><Ionicons name="chevron-forward" size={20} color={color.muted} /></Pressable><Pressable accessibilityRole="button" onPress={() => setPicker('account')} style={styles.selection}><View style={styles.selectionIcon}><Ionicons name="wallet-outline" size={23} color={color.blue} /></View><View style={{ flex: 1 }}><Text style={styles.selectionLabel}>Tài khoản {kind === 'EXPENSE' ? 'chi trả' : 'nhận tiền'}</Text><Text style={styles.selectionValue}>{selectedAccount?.name || 'Chọn tài khoản'}</Text>{selectedAccount && <Text style={common.helper}>Số dư: {formatVnd(selectedAccount.currentBalance)}</Text>}</View><Ionicons name="chevron-forward" size={20} color={color.muted} /></Pressable><View style={styles.selection}><View style={styles.selectionIcon}><Ionicons name="calendar-outline" size={23} color={color.navy} /></View><View style={{ flex: 1 }}><Text style={styles.selectionLabel}>Thời gian</Text><TextInput style={styles.dateInput} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={color.muted} /></View></View></Card>
    <Card style={styles.noteCard}><Text style={styles.selectionLabel}>Ghi chú giao dịch</Text><TextInput style={common.input} value={note} onChangeText={setNote} maxLength={500} placeholder="Không bắt buộc" placeholderTextColor={color.muted} /><CategorySuggestion session={session} kind={kind} merchantId={merchantId} note={note} onApply={setCategoryId} /></Card>
    <Pressable accessibilityRole="button" onPress={() => setPicker('merchant')} style={styles.merchantRow}><Text style={styles.selectionLabel}>Nơi giao dịch: {merchants.find((item) => item.id === merchantId)?.name || 'Không chọn'}</Text><Ionicons name="chevron-forward" size={18} color={color.muted} /></Pressable>
    {!!receiptUri && <Card style={styles.noteCard}><Text style={styles.selectionLabel}>Hóa đơn & Chứng từ</Text><Image source={{ uri: receiptUri }} style={styles.receiptImage} resizeMode="contain" /></Card>}
    {recognition?.duplicateTransactionId && <Card style={styles.duplicate}><Text style={styles.duplicateText}>Ảnh này đã gắn với một giao dịch của bạn.</Text><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: duplicateConfirmed }} onPress={() => setDuplicateConfirmed((value) => !value)}><Text style={styles.duplicateText}>{duplicateConfirmed ? '☑' : '□'} Tôi đã kiểm tra và vẫn muốn ghi nhận</Text></Pressable></Card>}
    {!loaded && <Text style={common.helper}>Đang tải tài khoản và danh mục...</Text>}{!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    <PrimaryButton onPress={save} disabled={busy || !loaded || !accountId || !categoryId || !!(recognition?.duplicateTransactionId && !duplicateConfirmed)}>{busy ? 'Đang lưu...' : recognition ? 'Xác nhận & Lưu' : transactionId ? 'Lưu thay đổi' : 'Lưu giao dịch'}</PrimaryButton>

    <Modal transparent visible={picker !== null} animationType="slide" onRequestClose={() => setPicker(null)}><View style={styles.modalBackdrop}><View style={styles.sheet}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{picker === 'account' ? 'Chọn tài khoản nguồn' : picker === 'category' ? 'Chọn danh mục' : 'Chọn nơi giao dịch'}</Text><Pressable accessibilityRole="button" onPress={() => setPicker(null)}><Ionicons name="close" size={25} color={color.navy} /></Pressable></View><ScrollView style={styles.sheetList}>{picker === 'account' ? accounts.map((item) => <Pressable key={item.id} onPress={() => { setAccountId(item.id); setPicker(null); }} style={[styles.sheetItem, item.id === accountId && styles.sheetItemSelected]}><Ionicons name={item.accountType === 'CASH' ? 'cash-outline' : 'wallet-outline'} size={26} color={color.greenDark} /><View style={{ flex: 1 }}><Text style={styles.selectionValue}>{item.name}</Text><Text style={common.helper}>{formatVnd(item.currentBalance)}</Text></View><Ionicons name={item.id === accountId ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={color.greenDark} /></Pressable>) : picker === 'category' ? available.map((item) => <Pressable key={item.id} onPress={() => { setCategoryId(item.id); setPicker(null); }} style={[styles.sheetItem, item.id === categoryId && styles.sheetItemSelected]}><Ionicons name="pricetags-outline" size={23} color={color.greenDark} /><Text style={[styles.selectionValue, { flex: 1 }]}>{item.name}</Text><Ionicons name={item.id === categoryId ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={color.greenDark} /></Pressable>) : <><Pressable onPress={() => { setMerchantId(''); setPicker(null); }} style={styles.sheetItem}><Text style={styles.selectionValue}>Không chọn</Text></Pressable>{merchants.map((item) => <Pressable key={item.id} onPress={() => { setMerchantId(item.id); setPicker(null); }} style={[styles.sheetItem, item.id === merchantId && styles.sheetItemSelected]}><Text style={[styles.selectionValue, { flex: 1 }]}>{item.name}</Text><Ionicons name={item.id === merchantId ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={color.greenDark} /></Pressable>)}</>}</ScrollView><SecondaryButton onPress={() => { const target = picker === 'account' ? '/accounts' : picker === 'category' ? '/categories' : '/merchants'; setPicker(null); router.push(target); }}>{picker === 'account' ? '+ Thêm tài khoản mới' : picker === 'category' ? '+ Thêm danh mục mới' : '+ Thêm nơi giao dịch'}</SecondaryButton></View></View></Modal>

    <Modal transparent visible={!!saved} animationType="slide" onRequestClose={() => { setSaved(null); router.replace('/transactions'); }}><View style={styles.modalBackdrop}><View style={styles.successSheet}><View style={styles.sheetHandle} /><Ionicons name="checkmark-circle" size={68} color={color.greenDark} /><Text style={styles.successTitle}>Đã lưu giao dịch thành công!</Text>{saved && <Text style={styles.successAmount}>{formatVnd(saved.amount)}</Text>}{!!receiptWarning && <Text accessibilityRole="alert" style={common.error}>{receiptWarning}</Text>}<View style={styles.successActions}><PrimaryButton onPress={() => { const id = saved?.id; setSaved(null); if (id) router.replace({ pathname: '/transaction-detail', params: { id } }); }}>Xem chi tiết giao dịch</PrimaryButton><Pressable accessibilityRole="button" onPress={() => { setSaved(null); router.replace('/dashboard'); }} style={styles.successOverview}><Text style={styles.successOverviewText}>Về màn hình Tổng quan</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setSaved(null); router.replace('/camera'); }} style={styles.scanAgain}><Text style={styles.scanAgainText}>Tiếp tục quét hóa đơn khác</Text></Pressable></View></View></View></Modal>
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 7, paddingBottom: 38 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }, title: { color: color.navy, fontSize: 19, fontWeight: '800' }, tabs: { flexDirection: 'row', backgroundColor: '#edf4ff', borderRadius: 14, padding: 4, marginBottom: 16 }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 11 }, tabActive: { backgroundColor: color.white }, tabText: { color: color.navy, fontWeight: '700', fontSize: 13 }, amountCard: { alignItems: 'center', marginBottom: 16 }, fieldTitle: { color: color.muted, fontSize: 13, marginBottom: 5 }, amountRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: color.border, paddingHorizontal: 15 }, amountInput: { color: color.navy, fontSize: 32, fontWeight: '800', textAlign: 'center', minWidth: 100, flex: 1 }, currency: { color: color.greenDark, fontSize: 20, fontWeight: '800' }, selectionCard: { padding: 0, overflow: 'hidden', marginBottom: 16 }, selection: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, borderBottomWidth: 1, borderBottomColor: color.border }, selectionIcon: { width: 41, height: 41, borderRadius: 21, backgroundColor: '#edf4ff', alignItems: 'center', justifyContent: 'center' }, selectionLabel: { color: color.muted, fontSize: 12, marginBottom: 3 }, selectionValue: { color: color.navy, fontSize: 15, fontWeight: '700' }, dateInput: { color: color.navy, fontSize: 15, padding: 0 }, noteCard: { marginBottom: 16, gap: 8 }, merchantRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15, backgroundColor: color.white, borderRadius: 12, marginBottom: 16 }, receiptImage: { width: '100%', height: 180 }, duplicate: { backgroundColor: '#fff7ed', gap: 10, marginBottom: 15 }, duplicateText: { color: '#92400e', fontWeight: '700' }, ocrSummary: { marginBottom: 16, backgroundColor: '#f2fbf6' }, ocrLabel: { color: color.greenDark, fontSize: 12, fontWeight: '700' }, ocrMerchant: { color: color.navy, fontSize: 19, fontWeight: '800', marginVertical: 7 }, ocrAmount: { color: '#b91c1c', fontSize: 25, fontWeight: '800', marginTop: 12 }, receiptThumbnail: { position: 'absolute', right: 16, top: 17, width: 49, height: 60, borderRadius: 6 }, modalBackdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' }, sheet: { maxHeight: '78%', backgroundColor: color.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 }, sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#d6ded9', alignSelf: 'center', marginBottom: 18 }, sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 17 }, sheetTitle: { color: color.navy, fontSize: 22, fontWeight: '800' }, sheetList: { maxHeight: 440 }, sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderColor: color.border, borderRadius: 14, padding: 14, marginBottom: 9 }, sheetItemSelected: { borderColor: color.greenDark, backgroundColor: '#f2fbf6' }, successSheet: { backgroundColor: color.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, alignItems: 'center', gap: 14 }, successTitle: { color: color.navy, fontSize: 24, textAlign: 'center', fontWeight: '800' }, successAmount: { color: color.navy, fontSize: 30, fontWeight: '800' }, successActions: { width: '100%' }, successOverview: { minHeight: 52, paddingHorizontal: 18, marginTop: 10, borderRadius: 14, backgroundColor: '#cde9e0', alignItems: 'center', justifyContent: 'center' }, successOverviewText: { color: color.greenDark, fontSize: 15, fontWeight: '700' }, scanAgain: { minHeight: 52, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' }, scanAgainText: { color: color.greenDark, fontWeight: '700' } });
