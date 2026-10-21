import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { deleteBudget, getBudget, getCategories, saveBudget, type BudgetSummary, type Category } from '../../api';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../../components/Ui';
import { formatVnd } from '../../money';
import { useSession } from '../../session';
import { color } from '../../theme';

const currentMonth = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };
const validAmount = (amount: string) => /^\d{1,17}(?:[.,]\d{1,2})?$/.test(amount.trim()) && /[1-9]/.test(amount);
const barWidth = (percent: string): `${number}%` => `${Math.min(100, Math.max(0, Number.parseFloat(percent) || 0))}%` as `${number}%`;
const alertLabel = (threshold: number) => threshold === 100 ? 'Đã đạt hoặc vượt 100% hạn mức' : `Đã đạt ngưỡng ${threshold}% hạn mức`;

export default function Budgets() {
  const { session } = useSession();
  const [month, setMonth] = useState(currentMonth);
  const [monthInput, setMonthInput] = useState(currentMonth);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalLimit, setTotalLimit] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryLimit, setCategoryLimit] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController();
    Promise.all([getBudget(session, month, controller.signal), getCategories(session, controller.signal)])
      .then(([foundBudget, foundCategories]) => {
        setBudget(foundBudget); setCategories(foundCategories); setTotalLimit(foundBudget.total?.limitAmount ?? '');
        setLoading(false); setError('');
      }).catch((reason: unknown) => {
        if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được ngân sách.'); setLoading(false); }
      });
    return () => controller.abort();
  }, [session, month]));

  function viewMonth() {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthInput)) { setMessage('Tháng phải có dạng YYYY-MM.'); return; }
    setMonth(monthInput); setBudget(null); setLoading(true); setCategoryId(''); setCategoryLimit(''); setMessage('');
  }
  async function saveTotal() {
    if (!session || busy) return;
    if (!validAmount(totalLimit)) { setMessage('Hạn mức phải lớn hơn 0 và có tối đa hai chữ số thập phân.'); return; }
    setBusy(true); setMessage('');
    try { setBudget(await saveBudget(session, month, totalLimit.trim().replace(',', '.'))); setMessage('Đã lưu ngân sách tổng.'); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không lưu được ngân sách.'); }
    finally { setBusy(false); }
  }
  async function saveCategory() {
    if (!session || busy || !categoryId) return;
    if (!validAmount(categoryLimit)) { setMessage('Hạn mức phải lớn hơn 0 và có tối đa hai chữ số thập phân.'); return; }
    setBusy(true); setMessage('');
    try { setBudget(await saveBudget(session, month, categoryLimit.trim().replace(',', '.'), categoryId)); setCategoryLimit(''); setMessage('Đã lưu ngân sách danh mục.'); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không lưu được ngân sách.'); }
    finally { setBusy(false); }
  }
  async function remove(category?: string) {
    if (!session || busy) return;
    const target = category ?? 'total';
    if (confirmDelete !== target) { setConfirmDelete(target); return; }
    setBusy(true); setMessage('');
    try {
      await deleteBudget(session, month, category);
      setBudget(await getBudget(session, month));
      if (!category) setTotalLimit('');
      setConfirmDelete(null); setMessage('Đã xóa ngân sách.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không xóa được ngân sách.'); }
    finally { setBusy(false); }
  }

  const expenseCategories = categories.filter((category) => category.categoryType === 'EXPENSE');
  return <Page><View style={styles.header}><Brand subtitle="NGÂN SÁCH" /><View style={styles.headerIcon}><Ionicons name="pie-chart-outline" size={22} color={color.greenDark} /></View></View>
    <Text style={common.title}>Kế hoạch chi tiêu</Text><Text style={[common.subtitle, styles.intro]}>Đặt hạn mức tháng và theo dõi chi tiêu từ giao dịch đã ghi.</Text>
    <Card style={styles.monthCard}><Text style={common.label}>Tháng ngân sách (YYYY-MM)</Text><View style={styles.monthRow}><TextInput style={[common.input, styles.monthInput]} value={monthInput} onChangeText={setMonthInput} placeholder="2026-10" placeholderTextColor="#94a3b8" /><Pressable accessibilityRole="button" onPress={viewMonth} style={styles.monthButton}><Text style={styles.monthButtonText}>Xem</Text></Pressable></View></Card>
    {loading && <Text style={common.helper}>Đang tải ngân sách...</Text>}{!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {budget && <><Card style={styles.totalCard}><Text style={styles.totalLabel}>CHI TIÊU TRONG THÁNG</Text><Text style={styles.totalValue}>{formatVnd(budget.totalSpent)}</Text><Text style={common.helper}>{budget.total ? `Hạn mức ${formatVnd(budget.total.limitAmount)}` : 'Chưa đặt hạn mức tổng cho tháng này'}</Text>{budget.total && <View style={styles.totalProgress}><View style={styles.line}><Text style={common.helper}>Đã dùng {budget.total.usedPercent}%</Text><Text style={[styles.remaining, budget.total.remaining.startsWith('-') && styles.over]}>{formatVnd(budget.total.remaining)}</Text></View><View style={styles.track}><View style={[styles.fill, { width: barWidth(budget.total.usedPercent) }]} /></View><Pressable accessibilityRole="button" onPress={() => remove()} disabled={busy}><Text style={styles.delete}>{confirmDelete === 'total' ? 'Xác nhận xóa hạn mức tổng' : 'Xóa hạn mức tổng'}</Text></Pressable></View>}</Card>
      {budget.total && budget.total.alertThresholdPercent > 0 && <Text accessibilityRole="alert" style={[styles.alert, budget.total.alertThresholdPercent === 100 && styles.criticalAlert]}>Ngân sách tổng: {alertLabel(budget.total.alertThresholdPercent)}</Text>}
      <Text style={[common.sectionTitle, styles.sectionTitle]}>Theo danh mục</Text><Card>{budget.categories.length ? budget.categories.map((item, index) => <View key={item.categoryId} style={[styles.categoryRow, index > 0 && styles.divider]}><View style={styles.line}><Text style={styles.categoryName}>{item.categoryName}</Text><Text style={styles.percent}>{item.values.usedPercent}%</Text></View><Text style={common.helper}>{formatVnd(item.values.spent)} / {formatVnd(item.values.limitAmount)}</Text><View style={styles.track}><View style={[styles.fill, { width: barWidth(item.values.usedPercent) }]} /></View>{item.values.alertThresholdPercent > 0 && <Text accessibilityRole="alert" style={[styles.alert, item.values.alertThresholdPercent === 100 && styles.criticalAlert]}>{alertLabel(item.values.alertThresholdPercent)}</Text>}<View style={styles.line}><Text style={[styles.remaining, item.values.remaining.startsWith('-') && styles.over]}>Còn lại {formatVnd(item.values.remaining)}</Text><View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => { setCategoryId(item.categoryId); setCategoryLimit(item.values.limitAmount); }}><Text style={styles.link}>Sửa</Text></Pressable><Pressable accessibilityRole="button" onPress={() => remove(item.categoryId)} disabled={busy}><Text style={styles.delete}>{confirmDelete === item.categoryId ? 'Xác nhận xóa' : 'Xóa'}</Text></Pressable></View></View></View>) : <Text style={common.helper}>Chưa có ngân sách danh mục trong tháng này.</Text>}</Card></>}
    <Text style={[common.sectionTitle, styles.sectionTitle]}>Đặt hạn mức</Text><Card><Text style={common.label}>Ngân sách tổng (VND)</Text><TextInput style={common.input} value={totalLimit} onChangeText={setTotalLimit} keyboardType="decimal-pad" placeholder="Ví dụ: 5000000" placeholderTextColor="#94a3b8" /><PrimaryButton onPress={saveTotal} disabled={busy}>Lưu ngân sách tổng</PrimaryButton><View style={styles.formDivider} /><Text style={common.label}>Danh mục chi</Text><View style={styles.chips}>{expenseCategories.map((category) => <Pressable accessibilityRole="button" key={category.id} onPress={() => { setCategoryId(category.id); setCategoryLimit(budget?.categories.find((item) => item.categoryId === category.id)?.values.limitAmount ?? ''); }} style={[styles.chip, categoryId === category.id && styles.chipActive]}><Text style={[styles.chipText, categoryId === category.id && styles.chipTextActive]}>{category.name}</Text></Pressable>)}</View><Text style={[common.label, styles.amountLabel]}>Hạn mức danh mục (VND)</Text><TextInput style={common.input} value={categoryLimit} onChangeText={setCategoryLimit} keyboardType="decimal-pad" placeholder="Ví dụ: 1000000" placeholderTextColor="#94a3b8" /><PrimaryButton onPress={saveCategory} disabled={busy || !categoryId}>Lưu danh mục</PrimaryButton><SecondaryButton onPress={() => { setCategoryId(''); setCategoryLimit(''); }}>Bỏ chọn danh mục</SecondaryButton></Card>
    {!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}
  </Page>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }, headerIcon: { width: 41, height: 41, backgroundColor: color.greenLight, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, intro: { marginTop: 7, marginBottom: 24 },
  monthCard: { marginBottom: 17 }, monthRow: { flexDirection: 'row', gap: 10 }, monthInput: { flex: 1 }, monthButton: { minWidth: 70, backgroundColor: color.green, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, monthButtonText: { color: color.white, fontWeight: '800' },
  totalCard: { backgroundColor: color.greenLight, marginBottom: 8 }, totalLabel: { color: color.greenDark, fontSize: 11, fontWeight: '800', letterSpacing: 1 }, totalValue: { color: color.navy, fontSize: 29, fontWeight: '800', marginVertical: 13 }, totalProgress: { gap: 10, marginTop: 18 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, remaining: { color: color.greenDark, fontWeight: '800', fontSize: 12 }, over: { color: '#b91c1c' }, track: { height: 8, backgroundColor: color.border, borderRadius: 8, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: color.green, borderRadius: 8 },
  sectionTitle: { marginTop: 24, marginBottom: 13 }, categoryRow: { gap: 9, paddingVertical: 11 }, divider: { borderTopWidth: 1, borderColor: color.border }, categoryName: { color: color.navy, fontSize: 13, fontWeight: '800' }, percent: { color: color.greenDark, fontSize: 12, fontWeight: '800' }, actions: { flexDirection: 'row', gap: 12 }, link: { color: color.greenDark, fontSize: 12, fontWeight: '800' }, delete: { color: '#b91c1c', fontSize: 12, fontWeight: '800' },
  alert: { backgroundColor: '#fff7ed', color: '#9a3412', borderRadius: 9, padding: 10, fontSize: 12, fontWeight: '700' }, criticalAlert: { backgroundColor: '#fef2f2', color: '#b91c1c' },
  formDivider: { height: 1, backgroundColor: color.border, marginVertical: 21 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, chip: { borderRadius: 18, borderWidth: 1, borderColor: color.border, paddingHorizontal: 12, paddingVertical: 8 }, chipActive: { borderColor: '#6ee7b7', backgroundColor: color.greenLight }, chipText: { color: color.muted, fontSize: 11, fontWeight: '700' }, chipTextActive: { color: color.greenDark }, amountLabel: { marginTop: 18 },
});
