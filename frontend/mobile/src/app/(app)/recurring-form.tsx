import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAccounts, getCategories, getRecurringRules, saveRecurringRule, type Account, type Category, type CategoryType, type RecurringRule } from '../../api';
import { Card, Page, PrimaryButton, common } from '../../components/Ui';
import { formatVnd } from '../../money';
import { reportDate } from '../../reportDate';
import { useSession } from '../../session';
import { color } from '../../theme';

const green = '#006948';
const validMoney = (value: string) => /^\d{1,17}(?:[.,]\d{1,2})?$/.test(value.trim()) && /[1-9]/.test(value);
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

export default function RecurringForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [original, setOriginal] = useState<RecurringRule | null>(null);
  const [kind, setKind] = useState<CategoryType>('EXPENSE');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cadence, setCadence] = useState<'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [due, setDue] = useState(reportDate);
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setLoaded(false); setError('');
    Promise.all([getAccounts(session, controller.signal), getCategories(session, controller.signal), id ? getRecurringRules(session, controller.signal) : Promise.resolve([])])
      .then(([sources, items, rules]) => {
        if (controller.signal.aborted) return;
        setAccounts(sources); setCategories(items);
        const rule = rules.find((entry) => entry.id === id);
        if (id && !rule) { setError('Không tìm thấy khoản định kỳ.'); return; }
        if (rule) { setOriginal(rule); setKind(rule.kind); setName(rule.name); setAmount(rule.amount); setAccountId(rule.accountId); setCategoryId(rule.categoryId); setCadence(rule.cadence); setDue(rule.nextDueOn); setNote(rule.note || ''); }
        setLoaded(true);
      }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được biểu mẫu.'); });
    return () => controller.abort();
  }, [session, id]));
  const available = categories.filter((item) => item.categoryType === kind);
  const selectedAccount = accounts.some((item) => item.id === accountId) ? accountId : accounts[0]?.id || '';
  const selectedCategory = available.some((item) => item.id === categoryId) ? categoryId : available[0]?.id || '';
  async function save() {
    if (!session || busy) return;
    if (!name.trim() || !validMoney(amount) || !validDate(due) || !selectedAccount || !selectedCategory) { setError('Nhập tên, số tiền, tài khoản, danh mục và ngày đến hạn hợp lệ.'); return; }
    setBusy(true); setError('');
    try {
      await saveRecurringRule(session, { name: name.trim(), kind, amount: amount.trim().replace(',', '.'), accountId: selectedAccount, categoryId: selectedCategory, cadence, nextDueOn: due, active: original?.active ?? true, note: note.trim() || null }, id);
      router.back();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được khoản định kỳ.'); }
    finally { setBusy(false); }
  }
  return <Page style={styles.page}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color="#121c26" /></Pressable><Text style={styles.heading}>{id ? 'Sửa khoản định kỳ' : 'Thêm khoản định kỳ'}</Text><Pressable accessibilityRole="button" disabled={busy} onPress={save}><Text style={styles.save}>Lưu</Text></Pressable></View>
    <View style={styles.kindRow}>{([{ key: 'EXPENSE', label: 'Khoản chi', icon: 'trending-down-outline' }, { key: 'INCOME', label: 'Khoản thu', icon: 'trending-up-outline' }] as const).map((item) => <Pressable key={item.key} accessibilityRole="button" onPress={() => { setKind(item.key); setCategoryId(''); }} style={[styles.kindButton, kind === item.key && styles.kindSelected]}><Ionicons name={item.icon} size={18} color={kind === item.key ? item.key === 'EXPENSE' ? '#ba1a1a' : green : '#3d4a42'} /><Text style={[styles.kindText, kind === item.key && { color: item.key === 'EXPENSE' ? '#ba1a1a' : green }]}>{item.label}</Text></Pressable>)}</View>
    <View style={styles.hero}><Text style={styles.heroLabel}>Số tiền định kỳ mỗi kỳ</Text><View style={styles.heroAmount}><Text style={styles.sign}>{kind === 'EXPENSE' ? '−' : '+'}</Text><TextInput accessibilityLabel="Số tiền định kỳ" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#a8d9c5" style={styles.amountInput} /><Text style={styles.sign}>₫</Text></View><Text style={styles.heroHint}>Giao dịch chỉ được ghi nhận sau khi bạn xác nhận kỳ đến hạn.</Text></View>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!loaded && <Text style={common.helper}>Đang tải biểu mẫu...</Text>}
    {loaded && <><Card style={styles.card}><Text style={styles.label}>Tên khoản định kỳ</Text><TextInput value={name} onChangeText={setName} maxLength={100} placeholder="Tên khoản định kỳ" placeholderTextColor="#6d7a72" style={styles.input} /><Text style={styles.label}>Danh mục</Text><View style={styles.chips}>{available.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => setCategoryId(item.id)} style={[styles.chip, selectedCategory === item.id && styles.chipSelected]}><Text style={[styles.chipText, selectedCategory === item.id && styles.chipTextSelected]}>{item.name}</Text></Pressable>)}</View><Text style={styles.label}>Tài khoản thanh toán mặc định</Text><View style={styles.accounts}>{accounts.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => setAccountId(item.id)} style={[styles.account, selectedAccount === item.id && styles.accountSelected]}><Ionicons name={item.accountType === 'CASH' ? 'cash-outline' : 'wallet-outline'} size={22} color={green} /><Text style={styles.accountName}>{item.name}</Text></Pressable>)}</View></Card>
      <Card style={styles.card}><Text style={styles.cardTitle}>Cấu hình chu kỳ lặp lại</Text><Text style={styles.label}>Tần suất lặp</Text><View style={styles.cadences}>{([{ key: 'WEEKLY', label: 'Hàng tuần' }, { key: 'MONTHLY', label: 'Hàng tháng' }] as const).map((item) => <Pressable key={item.key} accessibilityRole="button" onPress={() => setCadence(item.key)} style={[styles.cadence, cadence === item.key && styles.cadenceSelected]}><Text style={[styles.chipText, cadence === item.key && styles.chipTextSelected]}>{item.label}</Text></Pressable>)}</View><Text style={styles.label}>Ngày đến hạn tiếp theo</Text><TextInput value={due} onChangeText={setDue} keyboardType="numbers-and-punctuation" placeholder="YYYY-MM-DD" placeholderTextColor="#6d7a72" style={styles.input} /><Text style={common.helper}>Ngày đầu tiên cần ghi nhận kỳ tiếp theo.</Text></Card>
      <Card style={styles.card}><Text style={styles.label}>Ghi chú</Text><TextInput value={note} onChangeText={setNote} maxLength={500} placeholder="Ghi chú tùy chọn" placeholderTextColor="#6d7a72" style={styles.input} /></Card>
      {!!amount && validMoney(amount) && <Text style={styles.preview}>Mỗi kỳ: {formatVnd(amount.replace(',', '.'))}</Text>}
      <PrimaryButton onPress={save} disabled={busy}>{id ? 'Lưu khoản định kỳ' : 'Xác nhận tạo định kỳ'}</PrimaryButton>
    </>}
  </Page>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 7, paddingHorizontal: 16, gap: 15, paddingBottom: 40 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { color: '#121c26', fontSize: 18, fontWeight: '800' }, save: { color: green, fontSize: 15, fontWeight: '800' }, kindRow: { flexDirection: 'row', backgroundColor: '#e4effd', borderRadius: 12, padding: 5 }, kindButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 39, borderRadius: 9 }, kindSelected: { backgroundColor: color.white }, kindText: { color: '#3d4a42', fontWeight: '700', fontSize: 13 },
  hero: { backgroundColor: green, borderRadius: 15, padding: 20, alignItems: 'center' }, heroLabel: { color: color.white, fontSize: 13, fontWeight: '700' }, heroAmount: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 9 }, sign: { color: color.white, fontSize: 27, fontWeight: '800' }, amountInput: { color: color.white, fontSize: 29, fontWeight: '800', minWidth: 120, textAlign: 'center', borderBottomWidth: 2, borderColor: '#68dba9' }, heroHint: { color: '#d1fae5', fontSize: 10, textAlign: 'center' },
  card: { gap: 12 }, label: { color: '#3d4a42', fontSize: 12, fontWeight: '700' }, cardTitle: { color: '#121c26', fontSize: 16, fontWeight: '800' }, input: { color: '#121c26', borderWidth: 1, borderColor: '#d9e3f1', borderRadius: 10, minHeight: 49, paddingHorizontal: 13, fontSize: 14 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 15, borderWidth: 1, borderColor: '#d9e3f1' }, chipSelected: { borderColor: green, backgroundColor: '#e7fbf2' }, chipText: { color: '#3d4a42', fontSize: 11, fontWeight: '700' }, chipTextSelected: { color: green }, accounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, account: { borderWidth: 1, borderColor: '#d9e3f1', borderRadius: 10, padding: 10, minWidth: 98, alignItems: 'center', gap: 6 }, accountSelected: { borderWidth: 2, borderColor: green, backgroundColor: '#e7fbf2' }, accountName: { color: '#121c26', fontSize: 11, fontWeight: '700' }, cadences: { flexDirection: 'row', gap: 8, backgroundColor: '#edf4ff', borderRadius: 9, padding: 4 }, cadence: { flex: 1, alignItems: 'center', padding: 9, borderRadius: 7 }, cadenceSelected: { backgroundColor: color.white }, preview: { color: green, fontWeight: '700', fontSize: 12 },
});
