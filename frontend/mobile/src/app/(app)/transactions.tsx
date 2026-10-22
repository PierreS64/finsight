import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { deleteReceipt, deleteTransaction, downloadReceipt, getAccounts, getCategories, getMerchants, getTransactionHistory, getTransactions, recognizeReceipt, saveTransaction, uploadReceipt, type Account, type Category, type CategoryType, type Merchant, type ReceiptRecognition, type Transaction, type TransactionHistory, type TransactionHistoryFilters } from '../../api';
import { formatVnd, sumBalances } from '../../money';
import { useSession } from '../../session';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
const emptyHistoryFilters: TransactionHistoryFilters = { search: '', from: '', to: '', month: '', kind: '', categoryId: '', sort: 'desc' };

export default function Transactions() {
  const { session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [kind, setKind] = useState<CategoryType>('EXPENSE');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [amount, setAmount] = useState('');
  const [occurredOn, setOccurredOn] = useState(today);
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptVersion, setReceiptVersion] = useState(0);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [pendingReceipt, setPendingReceipt] = useState<{ uri: string; mimeType: string } | null>(null);
  const [ocrResult, setOcrResult] = useState<ReceiptRecognition | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [filters, setFilters] = useState<TransactionHistoryFilters>(emptyHistoryFilters);
  const [applied, setApplied] = useState<TransactionHistoryFilters>(emptyHistoryFilters);
  const [history, setHistory] = useState<TransactionHistory | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    Promise.all([getAccounts(session, controller.signal), getCategories(session, controller.signal), getTransactions(session, controller.signal)])
      .then(([foundAccounts, foundCategories, foundTransactions]) => { setAccounts(foundAccounts); setCategories(foundCategories); setTransactions(foundTransactions); setLoaded(true); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setMessage(reason instanceof Error ? reason.message : 'Không tải được giao dịch.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session]);

  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController();
    getMerchants(session, controller.signal).then(setMerchants)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setMessage(reason instanceof Error ? reason.message : 'Không tải được nơi giao dịch.'); });
    return () => controller.abort();
  }, [session]));

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    setHistoryLoading(true); setHistory(null); setHistoryError('');
    getTransactionHistory(session, applied, historyPage, controller.signal).then((result) => {
      if (result.totalPages > 0 && historyPage >= result.totalPages) setHistoryPage(result.totalPages - 1);
      else setHistory(result);
    }).catch((reason: unknown) => { if (!controller.signal.aborted) setHistoryError(reason instanceof Error ? reason.message : 'Không tải được lịch sử.'); })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [session, applied, historyPage, historyRevision]);

  function applyHistory() {
    if (filters.from && !/^\d{4}-\d{2}-\d{2}$/.test(filters.from)) { setMessage('Ngày bắt đầu phải có dạng YYYY-MM-DD.'); return; }
    if (filters.to && !/^\d{4}-\d{2}-\d{2}$/.test(filters.to)) { setMessage('Ngày kết thúc phải có dạng YYYY-MM-DD.'); return; }
    if (filters.month && !/^\d{4}-\d{2}$/.test(filters.month)) { setMessage('Tháng phải có dạng YYYY-MM.'); return; }
    if (filters.from && filters.to && filters.from > filters.to) { setMessage('Ngày bắt đầu phải trước ngày kết thúc.'); return; }
    setHistoryPage(0); setApplied({ ...filters }); setMessage('');
  }

  useEffect(() => {
    let cancelled = false;
    let localUri: string | null = null;
    setReceiptUri(null);
    if (session && receiptId && transactions.some((item) => item.id === receiptId && item.hasReceipt)) {
      downloadReceipt(session, receiptId).then((uri) => {
        localUri = uri;
        if (!cancelled) setReceiptUri(uri);
        else void FileSystem.deleteAsync(uri, { idempotent: true });
      }).catch((reason: unknown) => { if (!cancelled) setMessage(reason instanceof Error ? reason.message : 'Không xem được hóa đơn.'); });
    }
    return () => {
      cancelled = true;
      if (localUri) void FileSystem.deleteAsync(localUri, { idempotent: true });
    };
    // A changed receipt version triggers a fresh private download.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, receiptId, receiptVersion]);

  const availableCategories = categories.filter((category) => category.categoryType === kind);
  const selectedCategory = availableCategories.some((category) => category.id === categoryId) ? categoryId : availableCategories[0]?.id ?? '';
  const selectedAccount = accounts.some((account) => account.id === accountId) ? accountId : accounts[0]?.id ?? '';
  const income = sumBalances(transactions.filter((item) => item.kind === 'INCOME').map((item) => item.amount));
  const expense = sumBalances(transactions.filter((item) => item.kind === 'EXPENSE').map((item) => item.amount));

  function reset() { setAmount(''); setNote(''); setMerchantId(''); setOccurredOn(today()); setEditingId(null); setDeletingId(null); setPendingReceipt(null); setOcrResult(null); setDuplicateConfirmed(false); }
  function edit(transaction: Transaction) {
    setPendingReceipt(null); setOcrResult(null); setDuplicateConfirmed(false);
    setEditingId(transaction.id); setKind(transaction.kind); setAccountId(transaction.accountId); setCategoryId(transaction.categoryId);
    setAmount(transaction.amount); setMerchantId(transaction.merchantId ?? ''); setOccurredOn(transaction.occurredOn); setNote(transaction.note || ''); setDeletingId(null); setMessage('Đang sửa giao dịch bên dưới.');
    setReceiptId(transaction.id);
  }
  async function save() {
    if (!session || busy || !selectedAccount || !selectedCategory || (ocrResult?.duplicateTransactionId && !duplicateConfirmed)) return;
    const value = amount.trim().replace(',', '.');
    if (!/^\d{1,17}(?:\.\d{1,2})?$/.test(value) || !/[1-9]/.test(value)) { setMessage('Số tiền phải lớn hơn 0 và có tối đa hai chữ số thập phân.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) { setMessage('Ngày giao dịch phải có dạng YYYY-MM-DD.'); return; }
    setBusy(true); setMessage('');
    try {
      const saved = await saveTransaction(session, { accountId: selectedAccount, categoryId: selectedCategory, merchantId: merchantId || null, kind, amount: value, occurredOn, note: note.trim() || null }, editingId ?? undefined);
      let receiptAttached = false;
      if (pendingReceipt) {
        try { await uploadReceipt(session, saved.id, pendingReceipt.uri, pendingReceipt.mimeType); receiptAttached = true; }
        catch { receiptAttached = false; }
      }
      const completed = { ...saved, hasReceipt: saved.hasReceipt || receiptAttached };
      setTransactions((current) => (editingId ? current.map((item) => item.id === editingId ? completed : item) : [...current, completed])
        .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.id.localeCompare(a.id)));
      setHistoryRevision((value) => value + 1);
      setReceiptId(saved.id);
      reset(); setMessage(pendingReceipt && !receiptAttached ? 'Đã lưu giao dịch nhưng chưa lưu được ảnh. Bạn có thể thêm ảnh trong lịch sử.' : 'Đã lưu giao dịch.');
      getAccounts(session).then(setAccounts).catch(() => setMessage('Đã lưu giao dịch, nhưng chưa làm mới được số dư tài khoản.'));
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không lưu được giao dịch.'); }
    finally { setBusy(false); }
  }
  async function scanReceipt(source: 'camera' | 'library') {
    if (!session || ocrBusy || busy) return;
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) { setMessage('Cần quyền camera để chụp hóa đơn. Bạn vẫn có thể chọn ảnh hoặc nhập tay.'); return; }
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.mimeType || !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType) || (asset.fileSize && asset.fileSize > 5_000_000)) {
      setMessage('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP tối đa 5 MB.'); return;
    }
    setOcrBusy(true); setMessage(''); setOcrResult(null); setDuplicateConfirmed(false);
    setPendingReceipt({ uri: asset.uri, mimeType: asset.mimeType });
    try {
      const found = await recognizeReceipt(session, asset.uri, asset.mimeType);
      setOcrResult(found); setKind('EXPENSE'); setCategoryId(''); setMerchantId(''); setEditingId(null);
      if (found.amount) setAmount(found.amount);
      if (found.occurredOn) setOccurredOn(found.occurredOn);
      if (found.merchant) { setNote(found.merchant); setMerchantId(merchants.find((item) => item.name.toLocaleLowerCase() === found.merchant?.trim().toLocaleLowerCase())?.id ?? ''); }
      setMessage(found.readable ? 'Đã điền dữ liệu nhận diện. Hãy kiểm tra và sửa trước khi lưu.' : 'OCR chưa đọc được thông tin. Hãy nhập tay trước khi lưu.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không đọc được hóa đơn. Hãy nhập tay.'); }
    finally { setOcrBusy(false); }
  }
  async function remove(id: string) {
    if (!session || busy) return;
    setBusy(true); setMessage('');
    try {
      await deleteTransaction(session, id); setTransactions((current) => current.filter((item) => item.id !== id));
      setHistoryRevision((value) => value + 1);
      if (receiptId === id) { setReceiptId(null); setReceiptUri(null); }
      if (editingId === id) reset(); setDeletingId(null); setMessage('Đã xóa giao dịch.');
      getAccounts(session).then(setAccounts).catch(() => setMessage('Đã xóa giao dịch, nhưng chưa làm mới được số dư tài khoản.'));
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không xóa được giao dịch.'); }
    finally { setBusy(false); }
  }

  async function addReceipt() {
    if (!session || !receiptId || receiptBusy) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.mimeType || !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType)) {
      setMessage('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.'); return;
    }
    if (asset.fileSize && asset.fileSize > 5_000_000) { setMessage('Ảnh hóa đơn tối đa 5 MB.'); return; }
    setReceiptBusy(true); setMessage('');
    try {
      await uploadReceipt(session, receiptId, asset.uri, asset.mimeType);
      setTransactions((current) => current.map((item) => item.id === receiptId ? { ...item, hasReceipt: true } : item));
      setHistoryRevision((value) => value + 1);
      setReceiptVersion((value) => value + 1); setMessage('Đã lưu ảnh hóa đơn.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không tải được ảnh hóa đơn.'); }
    finally { setReceiptBusy(false); }
  }
  async function removeReceipt() {
    if (!session || !receiptId || receiptBusy) return;
    setReceiptBusy(true); setMessage('');
    try {
      await deleteReceipt(session, receiptId);
      setTransactions((current) => current.map((item) => item.id === receiptId ? { ...item, hasReceipt: false } : item));
      setHistoryRevision((value) => value + 1);
      setReceiptVersion((value) => value + 1); setMessage('Đã xóa ảnh hóa đơn.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không xóa được ảnh hóa đơn.'); }
    finally { setReceiptBusy(false); }
  }

  return <Page><View style={styles.header}><Brand subtitle="GIAO DỊCH" /><Pressable accessibilityRole="button" onPress={() => router.push('/categories')} style={styles.categoryShortcut}><Ionicons name="pricetags-outline" size={22} color={color.greenDark} /></Pressable></View>
    <Text style={common.title}>Lịch sử giao dịch</Text><Text style={[common.subtitle, styles.subtitle]}>Ghi khoản thu, chi và xem lịch sử từ dữ liệu bạn tự nhập.</Text><SecondaryButton onPress={() => router.push('/statements')}>Nhập sao kê CSV/Excel →</SecondaryButton><SecondaryButton onPress={() => router.push('/transfers')}>Chuyển khoản giữa tài khoản →</SecondaryButton><SecondaryButton onPress={() => router.push('/recurring')}>Giao dịch định kỳ →</SecondaryButton><SecondaryButton onPress={() => router.push('/merchants')}>Nơi giao dịch →</SecondaryButton>
    <View style={styles.summary}><Card style={styles.summaryCard}><Text style={styles.summaryLabel}>TỔNG THU</Text><Text style={[styles.summaryValue, styles.income]}>{loaded ? formatVnd(income) : '—'}</Text><Text style={common.helper}>Giao dịch đã lưu</Text></Card><Card style={styles.summaryCard}><Text style={styles.summaryLabel}>TỔNG CHI</Text><Text style={[styles.summaryValue, styles.expense]}>{loaded ? formatVnd(expense) : '—'}</Text><Text style={common.helper}>Giao dịch đã lưu</Text></Card></View>
    <View style={styles.sectionHead}><Text style={common.sectionTitle}>Giao dịch của bạn</Text><Pressable accessibilityRole="button" onPress={() => setFiltersOpen((value) => !value)}><Text style={styles.link}>{filtersOpen ? 'Ẩn bộ lọc' : 'Lọc & tìm kiếm'}</Text></Pressable></View>
    {filtersOpen && <Card style={styles.filtersCard}>
      <Text style={common.label}>Tìm trong ghi chú, danh mục, tài khoản</Text><TextInput style={common.input} value={filters.search} maxLength={100} onChangeText={(search) => setFilters({ ...filters, search })} placeholder="Nhập từ khóa" placeholderTextColor="#94a3b8" />
      <Text style={common.label}>Tháng (YYYY-MM)</Text><TextInput style={common.input} value={filters.month} onChangeText={(month) => setFilters({ ...filters, month })} placeholder="Ví dụ: 2026-10" placeholderTextColor="#94a3b8" />
      <Text style={common.label}>Từ ngày (YYYY-MM-DD)</Text><TextInput style={common.input} value={filters.from} onChangeText={(from) => setFilters({ ...filters, from })} placeholder="Ngày bắt đầu" placeholderTextColor="#94a3b8" />
      <Text style={common.label}>Đến ngày (YYYY-MM-DD)</Text><TextInput style={common.input} value={filters.to} onChangeText={(to) => setFilters({ ...filters, to })} placeholder="Ngày kết thúc" placeholderTextColor="#94a3b8" />
      <Text style={common.label}>Loại giao dịch</Text><View style={styles.chips}>{([{ value: '', label: 'Tất cả' }, { value: 'INCOME', label: 'Thu nhập' }, { value: 'EXPENSE', label: 'Chi tiêu' }] as const).map((choice) => <Pressable accessibilityRole="button" key={choice.value} onPress={() => setFilters({ ...filters, kind: choice.value, categoryId: '' })} style={[styles.chip, filters.kind === choice.value && styles.chipActive]}><Text style={[styles.chipText, filters.kind === choice.value && styles.chipTextActive]}>{choice.label}</Text></Pressable>)}</View>
      <Text style={common.label}>Danh mục</Text><View style={styles.chips}><Pressable accessibilityRole="button" onPress={() => setFilters({ ...filters, categoryId: '' })} style={[styles.chip, !filters.categoryId && styles.chipActive]}><Text style={[styles.chipText, !filters.categoryId && styles.chipTextActive]}>Tất cả</Text></Pressable>{categories.filter((category) => !filters.kind || category.categoryType === filters.kind).map((category) => <Pressable accessibilityRole="button" key={category.id} onPress={() => setFilters({ ...filters, categoryId: category.id })} style={[styles.chip, filters.categoryId === category.id && styles.chipActive]}><Text style={[styles.chipText, filters.categoryId === category.id && styles.chipTextActive]}>{category.name}</Text></Pressable>)}</View>
      <Text style={common.label}>Sắp xếp theo ngày</Text><View style={styles.chips}><Pressable accessibilityRole="button" onPress={() => setFilters({ ...filters, sort: 'desc' })} style={[styles.chip, filters.sort === 'desc' && styles.chipActive]}><Text style={[styles.chipText, filters.sort === 'desc' && styles.chipTextActive]}>Mới nhất</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setFilters({ ...filters, sort: 'asc' })} style={[styles.chip, filters.sort === 'asc' && styles.chipActive]}><Text style={[styles.chipText, filters.sort === 'asc' && styles.chipTextActive]}>Cũ nhất</Text></Pressable></View>
      <PrimaryButton onPress={applyHistory}>Áp dụng bộ lọc</PrimaryButton><SecondaryButton onPress={() => { setFilters(emptyHistoryFilters); setApplied({ ...emptyHistoryFilters }); setHistoryPage(0); setMessage(''); }}>Xóa lọc</SecondaryButton>
    </Card>}
    <Text style={styles.count}>{history?.totalElements ?? 0} giao dịch phù hợp</Text>
    {!!history && history.totalPages > 1 && <View style={styles.pagination}><Pressable accessibilityRole="button" disabled={historyPage === 0 || historyLoading} onPress={() => setHistoryPage((value) => value - 1)}><Text style={[styles.link, historyPage === 0 && styles.disabled]}>Trang trước</Text></Pressable><Text style={common.helper}>Trang {historyPage + 1} / {history.totalPages}</Text><Pressable accessibilityRole="button" disabled={historyPage + 1 >= history.totalPages || historyLoading} onPress={() => setHistoryPage((value) => value + 1)}><Text style={[styles.link, historyPage + 1 >= history.totalPages && styles.disabled]}>Trang sau</Text></Pressable></View>}
    <Card>{!loaded || historyLoading ? <Text style={common.helper}>Đang tải giao dịch...</Text> : historyError ? <Text style={common.message}>{historyError}</Text> : history?.items.length ? history.items.map((transaction, index) => <View key={transaction.id} style={[styles.row, index > 0 && styles.divider]}><View style={[styles.rowIcon, transaction.kind === 'INCOME' ? styles.incomeBg : styles.expenseBg]}><Ionicons name={transaction.kind === 'INCOME' ? 'arrow-up-outline' : 'arrow-down-outline'} size={23} color={transaction.kind === 'INCOME' ? color.greenDark : '#b45309'} /></View><View style={styles.rowMain}><Text style={styles.rowName}>{categories.find((category) => category.id === transaction.categoryId)?.name ?? 'Danh mục'}</Text><Text style={styles.rowDetail}>{transaction.occurredOn.split('-').reverse().join('/')} · {accounts.find((account) => account.id === transaction.accountId)?.name ?? 'Tài khoản'}</Text>{transaction.merchantId && <Text style={styles.rowDetail}>Nơi giao dịch: {merchants.find((item) => item.id === transaction.merchantId)?.name ?? 'Đã đổi'}</Text>}{!!transaction.note && <Text style={styles.rowDetail}>{transaction.note}</Text>}<View style={styles.rowActions}><Pressable accessibilityRole="button" onPress={() => setReceiptId(transaction.id)}><Text style={styles.link}>{transaction.hasReceipt ? 'Xem hóa đơn' : 'Thêm hóa đơn'}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => edit(transaction)}><Text style={styles.link}>Sửa</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeletingId(transaction.id)}><Text style={styles.delete}>Xóa</Text></Pressable></View></View><Text style={[styles.rowAmount, transaction.kind === 'INCOME' ? styles.income : styles.expense]}>{transaction.kind === 'INCOME' ? '+' : '−'}{formatVnd(transaction.amount)}</Text>{deletingId === transaction.id && <View style={styles.confirm}><Text style={common.helper}>Xóa giao dịch này?</Text><Pressable accessibilityRole="button" onPress={() => remove(transaction.id)} disabled={busy}><Text style={styles.delete}>Xác nhận xóa</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeletingId(null)}><Text style={styles.link}>Hủy</Text></Pressable></View>}</View>) : <View style={styles.empty}><Ionicons name="receipt-outline" size={35} color={color.greenDark} /><Text style={styles.emptyTitle}>{applied.search || applied.month || applied.from || applied.to || applied.kind || applied.categoryId ? 'Không có giao dịch phù hợp' : 'Chưa có giao dịch'}</Text><Text style={common.helper}>Thử đổi bộ lọc hoặc thêm giao dịch mới.</Text></View>}</Card>
    {receiptId && <Card style={styles.receiptCard}><View style={styles.receiptHead}><Text style={common.sectionTitle}>Ảnh hóa đơn</Text><Pressable accessibilityRole="button" onPress={() => setReceiptId(null)}><Text style={styles.link}>Đóng</Text></Pressable></View>{receiptUri && <Image source={{ uri: receiptUri }} style={styles.receiptImage} resizeMode="contain" />}<Text style={common.helper}>JPEG, PNG hoặc WebP · tối đa 5 MB</Text><PrimaryButton onPress={addReceipt} disabled={receiptBusy}>{receiptBusy ? 'Đang xử lý...' : 'Chọn ảnh từ thư viện'}</PrimaryButton>{transactions.find((item) => item.id === receiptId)?.hasReceipt && <Pressable accessibilityRole="button" onPress={removeReceipt} disabled={receiptBusy}><Text style={styles.delete}>Xóa ảnh hóa đơn</Text></Pressable>}</Card>}
    <Text style={[common.sectionTitle, styles.sectionTitle]}>{editingId ? 'Sửa giao dịch' : 'Thêm giao dịch'}</Text><Card style={styles.ocrCard}><Text style={common.sectionTitle}>Quét hóa đơn</Text><Text style={common.helper}>Ảnh chỉ gợi ý dữ liệu. Kiểm tra biểu mẫu trước khi lưu giao dịch.</Text><View style={styles.ocrActions}><PrimaryButton onPress={() => scanReceipt('camera')} disabled={ocrBusy || busy}>Chụp ảnh</PrimaryButton><SecondaryButton onPress={() => scanReceipt('library')}>Chọn ảnh</SecondaryButton></View>{ocrBusy && <Text style={common.helper}>Đang nhận diện hóa đơn...</Text>}{pendingReceipt && <Image source={{ uri: pendingReceipt.uri }} style={styles.receiptImage} resizeMode="contain" />}{ocrResult?.duplicateTransactionId && <View style={styles.ocrWarning}><Text style={styles.ocrWarningText}>Ảnh này đã gắn với một giao dịch của bạn.</Text><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: duplicateConfirmed }} onPress={() => setDuplicateConfirmed((value) => !value)}><Text style={styles.ocrWarningText}>{duplicateConfirmed ? '☑' : '□'} Tôi đã kiểm tra và vẫn muốn lưu</Text></Pressable></View>}</Card><Card><View style={styles.kindTabs}><Pressable accessibilityRole="button" onPress={() => { setKind('EXPENSE'); setCategoryId(''); }} style={[styles.kindTab, kind === 'EXPENSE' && styles.kindActive]}><Text style={[styles.kindText, kind === 'EXPENSE' && styles.kindActiveText]}>Chi tiêu</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setKind('INCOME'); setCategoryId(''); }} style={[styles.kindTab, kind === 'INCOME' && styles.kindActive]}><Text style={[styles.kindText, kind === 'INCOME' && styles.kindActiveText]}>Thu nhập</Text></Pressable></View>
      <Text style={common.label}>Số tiền (VND)</Text><TextInput style={common.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Ví dụ: 50000" placeholderTextColor="#94a3b8" />
      <Text style={[common.label, styles.labelGap]}>Tài khoản</Text><View style={styles.chips}>{accounts.map((account) => <Pressable accessibilityRole="button" key={account.id} onPress={() => setAccountId(account.id)} style={[styles.chip, selectedAccount === account.id && styles.chipActive]}><Text style={[styles.chipText, selectedAccount === account.id && styles.chipTextActive]}>{account.name}</Text></Pressable>)}</View>{!accounts.length && <Text style={common.helper}>Hãy thêm tài khoản trước khi ghi giao dịch.</Text>}
      <Text style={[common.label, styles.labelGap]}>Danh mục</Text><View style={styles.chips}>{availableCategories.map((category) => <Pressable accessibilityRole="button" key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.chip, selectedCategory === category.id && styles.chipActive]}><Text style={[styles.chipText, selectedCategory === category.id && styles.chipTextActive]}>{category.name}</Text></Pressable>)}</View><Pressable accessibilityRole="button" onPress={() => router.push('/categories')} style={styles.manage}><Text style={styles.link}>Quản lý danh mục →</Text></Pressable>
      <Text style={[common.label, styles.labelGap]}>Nơi giao dịch (tùy chọn)</Text><View style={styles.chips}><Pressable accessibilityRole="button" onPress={() => setMerchantId('')} style={[styles.chip, !merchantId && styles.chipActive]}><Text style={[styles.chipText, !merchantId && styles.chipTextActive]}>Không chọn</Text></Pressable>{merchants.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => setMerchantId(item.id)} style={[styles.chip, merchantId === item.id && styles.chipActive]}><Text style={[styles.chipText, merchantId === item.id && styles.chipTextActive]}>{item.name}</Text></Pressable>)}</View><Pressable accessibilityRole="button" onPress={() => router.push('/merchants')} style={styles.manage}><Text style={styles.link}>Quản lý nơi giao dịch →</Text></Pressable>
      <Text style={[common.label, styles.labelGap]}>Ngày giao dịch (YYYY-MM-DD)</Text><TextInput style={common.input} value={occurredOn} onChangeText={setOccurredOn} keyboardType="numbers-and-punctuation" placeholder="2026-10-21" placeholderTextColor="#94a3b8" />
      <Text style={[common.label, styles.labelGap]}>Ghi chú (tùy chọn)</Text><TextInput style={[common.input, styles.noteInput]} value={note} onChangeText={setNote} multiline maxLength={500} placeholder="Ghi chú cho giao dịch" placeholderTextColor="#94a3b8" />
      <PrimaryButton onPress={save} disabled={busy || ocrBusy || !selectedAccount || !selectedCategory || !amount.trim() || !!(ocrResult?.duplicateTransactionId && !duplicateConfirmed)}>{busy ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm giao dịch'}</PrimaryButton>{editingId && <SecondaryButton onPress={reset}>Hủy chỉnh sửa</SecondaryButton>}</Card>
    {!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}
  </Page>;
}

const styles = StyleSheet.create({
  filtersCard: { gap: 10, marginBottom: 14 }, pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, disabled: { opacity: 0.35 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }, categoryShortcut: { width: 41, height: 41, backgroundColor: color.greenLight, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, subtitle: { marginTop: 7, marginBottom: 24 },
  summary: { flexDirection: 'row', gap: 10, marginBottom: 23 }, summaryCard: { flex: 1 }, summaryLabel: { color: color.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, summaryValue: { fontSize: 20, fontWeight: '800', marginVertical: 15 }, income: { color: color.greenDark }, expense: { color: '#b45309' }, incomeBg: { backgroundColor: color.greenLight }, expenseBg: { backgroundColor: '#fff5e9' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, count: { color: color.greenDark, fontSize: 11, fontWeight: '800' }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', paddingVertical: 13, gap: 10 }, divider: { borderTopWidth: 1, borderColor: color.border }, rowIcon: { width: 41, height: 41, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, rowMain: { flex: 1 }, rowName: { color: color.navy, fontWeight: '800', fontSize: 13 }, rowDetail: { color: color.muted, fontSize: 10, lineHeight: 16, marginTop: 3 }, rowAmount: { fontSize: 12, fontWeight: '800', maxWidth: 105, textAlign: 'right' }, rowActions: { flexDirection: 'row', gap: 12, marginTop: 6 }, link: { color: color.greenDark, fontSize: 12, fontWeight: '800' }, delete: { color: '#b91c1c', fontSize: 12, fontWeight: '800' }, confirm: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12, backgroundColor: '#fff7f7', padding: 10, borderRadius: 9 }, empty: { alignItems: 'center', paddingVertical: 24, gap: 9 }, emptyTitle: { color: color.navy, fontSize: 17, fontWeight: '800' },
  sectionTitle: { marginTop: 27, marginBottom: 13 }, kindTabs: { flexDirection: 'row', gap: 8, marginBottom: 19 }, kindTab: { borderColor: color.border, borderWidth: 1, backgroundColor: color.canvas, borderRadius: 11, paddingHorizontal: 18, paddingVertical: 11 }, kindActive: { borderColor: '#6ee7b7', backgroundColor: color.greenLight }, kindText: { color: color.muted, fontSize: 13, fontWeight: '700' }, kindActiveText: { color: color.greenDark }, labelGap: { marginTop: 18 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { borderRadius: 18, borderWidth: 1, borderColor: color.border, paddingHorizontal: 12, paddingVertical: 8 }, chipActive: { borderColor: '#6ee7b7', backgroundColor: color.greenLight }, chipText: { color: color.muted, fontSize: 11, fontWeight: '700' }, chipTextActive: { color: color.greenDark }, manage: { marginTop: 12 }, noteInput: { minHeight: 83, textAlignVertical: 'top', paddingTop: 13 },
  receiptCard: { marginTop: 14, gap: 12 }, receiptHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, receiptImage: { width: '100%', height: 240, backgroundColor: color.canvas, borderRadius: 12 },
  ocrCard: { gap: 12, marginBottom: 14 }, ocrActions: { gap: 8 }, ocrWarning: { padding: 12, gap: 10, borderRadius: 10, backgroundColor: '#fff7ed' }, ocrWarningText: { color: '#92400e', fontWeight: '700' },
});
