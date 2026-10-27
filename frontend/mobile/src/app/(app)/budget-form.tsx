import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getBudget, getCategories, saveBudget, type BudgetSummary, type Category } from '../../api';
import { Card, Page, PrimaryButton, common } from '../../components/Ui';
import { formatVnd, sumBalances } from '../../money';
import { reportMonth } from '../../reportDate';
import { useSession } from '../../session';
import { color } from '../../theme';

const green = '#006948';
const validMoney = (value: string) => /^\d{1,17}(?:[.,]\d{1,2})?$/.test(value.trim()) && /[1-9]/.test(value);
const normalize = (value: string) => value.trim().replace(',', '.');
const categoryIcons: Record<Category['icon'], React.ComponentProps<typeof Ionicons>['name']> = { wallet: 'wallet-outline', gift: 'gift-outline', other: 'ellipsis-horizontal', food: 'restaurant-outline', transport: 'car-outline', home: 'home-outline', shopping: 'bag-outline', health: 'medkit-outline', education: 'school-outline' };
function minor(value: string): bigint {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  return match ? BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0') : 0n;
}
function percent(part: string, total: string): number {
  const denominator = minor(total);
  return denominator ? Number(minor(part) * 100n / denominator) : 0;
}
const barWidth = (part: string, total: string): `${number}%` => `${Math.min(100, Math.max(0, percent(part, total)))}%` as `${number}%`;
function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, number - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function BudgetForm() {
  const { session } = useSession();
  const params = useLocalSearchParams<{ month?: string; categoryId?: string }>();
  const [month, setMonth] = useState(/^\d{4}-(0[1-9]|1[0-2])$/.test(params.month || '') ? params.month! : reportMonth());
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState('');
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setLoaded(false); setError('');
    Promise.all([getBudget(session, month, controller.signal), getCategories(session, controller.signal)])
      .then(([summary, all]) => {
        if (controller.signal.aborted) return;
        setBudget(summary); setCategories(all.filter((item) => item.categoryType === 'EXPENSE'));
        setTotal(summary.total?.limitAmount || '');
        setAllocations(Object.fromEntries(summary.categories.map((item) => [item.categoryId, item.values.limitAmount])));
        setLoaded(true);
      }).catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được ngân sách.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session, month]));

  async function save() {
    if (!session || busy) return;
    if (!validMoney(total)) { setError('Tổng ngân sách phải lớn hơn 0.'); return; }
    const changes = categories.filter((item) => allocations[item.id]?.trim() && allocations[item.id]?.trim() !== (budget?.categories.find((line) => line.categoryId === item.id)?.values.limitAmount || ''));
    if (changes.some((item) => !validMoney(allocations[item.id]))) { setError('Hạn mức danh mục phải lớn hơn 0.'); return; }
    setBusy(true); setError('');
    try {
      if (normalize(total) !== budget?.total?.limitAmount) await saveBudget(session, month, normalize(total));
      for (const item of changes) await saveBudget(session, month, normalize(allocations[item.id]), item.id);
      router.back();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được ngân sách.'); }
    finally { setBusy(false); }
  }

  const allocated = sumBalances(categories.map((item) => allocations[item.id] && /^\d+(?:[.,]\d{1,2})?$/.test(allocations[item.id]) ? normalize(allocations[item.id]) : '0'));
  const allocatedPercent = percent(allocated, total);
  return <Page style={styles.page}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color="#121c26" /></Pressable><Text style={styles.heading}>Thiết lập ngân sách</Text><Pressable accessibilityRole="button" disabled={busy} onPress={save}><Text style={styles.save}>Lưu</Text></Pressable></View>
    <View style={styles.period}><Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" onPress={() => setMonth(shiftMonth(month, -1))}><Ionicons name="chevron-back" size={23} color="#3d4a42" /></Pressable><View style={styles.periodCenter}><Ionicons name="calendar-outline" size={22} color={green} /><Text style={styles.periodText}>Tháng {month.slice(5)}/{month.slice(0, 4)}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" onPress={() => setMonth(shiftMonth(month, 1))}><Ionicons name="chevron-forward" size={23} color="#3d4a42" /></Pressable></View>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!loaded && <Text style={common.helper}>Đang tải ngân sách...</Text>}
    {loaded && !error && <><View style={styles.hero}><View style={styles.heroLabel}><Ionicons name="wallet-outline" size={19} color="#d1fae5" /><Text style={styles.heroLabelText}>Tổng ngân sách dự kiến</Text><Text style={styles.heroPill}>Hạn mức tháng</Text></View><TextInput accessibilityLabel="Tổng ngân sách dự kiến" value={total} onChangeText={setTotal} keyboardType="decimal-pad" placeholder="0 ₫" placeholderTextColor="#a8d9c5" style={styles.totalInput} /><View style={styles.heroBottom}><Text style={styles.heroSmall}>✓ Đã phân bổ {allocatedPercent}%</Text><Text style={styles.heroSmall}>{formatVnd(allocated)} / {validMoney(total) ? formatVnd(normalize(total)) : '—'}</Text></View></View>
      <View style={styles.mode}><View style={styles.modeOff}><Ionicons name="sparkles-outline" size={18} color="#7d8c87" /><Text style={styles.modeOffText}>Tự động tính theo danh mục</Text></View><View style={styles.modeOn}><Ionicons name="options-outline" size={18} color={green} /><Text style={styles.modeOnText}>Nhập thủ công</Text></View></View>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Phân bổ ngân sách chi tiết</Text><Text style={styles.count}>{categories.length} hạng mục</Text></View>
      {categories.map((item) => {
        const amount = allocations[item.id] || '';
        const share = percent(amount || '0', total);
        return <Card key={item.id} style={[styles.categoryCard, params.categoryId === item.id && styles.focusCard]}><View style={styles.categoryTop}><View style={styles.categoryIcon}><Ionicons name={categoryIcons[item.icon]} size={22} color={green} /></View><View style={styles.categoryLabels}><Text style={styles.categoryName}>{item.name}</Text><Text style={styles.categoryPercent}>Chiếm {share}% tổng ngân sách</Text></View><TextInput accessibilityLabel={`Hạn mức ${item.name}`} value={amount} onChangeText={(value) => setAllocations((current) => ({ ...current, [item.id]: value }))} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#6d7a72" style={styles.categoryInput} /></View><View style={styles.track}><View style={[styles.fill, { width: barWidth(amount, total) }]} /></View></Card>;
      })}
      <PrimaryButton onPress={save} disabled={busy}>Áp dụng ngân sách tháng {month.slice(5)}</PrimaryButton>
    </>}
  </Page>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 5, paddingHorizontal: 16, paddingBottom: 42 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 23 }, heading: { color: '#121c26', fontSize: 19, fontWeight: '800' }, save: { color: green, fontSize: 15, fontWeight: '800' },
  period: { backgroundColor: color.white, borderWidth: 1, borderColor: '#dfe9f7', borderRadius: 13, paddingHorizontal: 16, minHeight: 58, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17 }, periodCenter: { flexDirection: 'row', alignItems: 'center', gap: 9 }, periodText: { color: '#121c26', fontSize: 19, fontWeight: '800' },
  hero: { backgroundColor: green, borderRadius: 15, padding: 18, marginBottom: 17 }, heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 }, heroLabelText: { color: '#d1fae5', fontSize: 12, fontWeight: '700', flex: 1 }, heroPill: { backgroundColor: '#ffffff44', color: color.white, fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 13 }, totalInput: { color: color.white, fontSize: 29, fontWeight: '800', paddingVertical: 10 }, heroBottom: { borderTopWidth: 1, borderColor: '#ffffff44', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, heroSmall: { color: color.white, fontSize: 11, fontWeight: '700' },
  mode: { flexDirection: 'row', backgroundColor: '#e4effd', borderRadius: 12, padding: 5, marginBottom: 19, gap: 4 }, modeOff: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 }, modeOffText: { color: '#7d8c87', fontSize: 10, fontWeight: '700', flexShrink: 1, textAlign: 'center' }, modeOn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, backgroundColor: color.white, borderRadius: 9, paddingVertical: 10 }, modeOnText: { color: green, fontSize: 11, fontWeight: '800' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 3, marginBottom: 10 }, sectionTitle: { color: '#121c26', fontSize: 14, fontWeight: '800' }, count: { color: '#6d7a72', fontSize: 11 }, categoryCard: { marginBottom: 10, gap: 16, padding: 14 }, focusCard: { borderColor: green }, categoryTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, categoryIcon: { width: 41, height: 41, borderRadius: 20, backgroundColor: '#ddfbef', alignItems: 'center', justifyContent: 'center' }, categoryLabels: { flex: 1 }, categoryName: { color: '#121c26', fontSize: 14, fontWeight: '800' }, categoryPercent: { color: '#3d4a42', fontSize: 10, marginTop: 3 }, categoryInput: { color: '#121c26', fontWeight: '800', fontSize: 15, textAlign: 'right', minWidth: 84, maxWidth: 130, borderBottomWidth: 1, borderBottomColor: '#dfe9f7', paddingVertical: 4 }, track: { height: 7, borderRadius: 5, backgroundColor: '#edf4ff', overflow: 'hidden' }, fill: { height: 7, backgroundColor: green, borderRadius: 5 },
});
