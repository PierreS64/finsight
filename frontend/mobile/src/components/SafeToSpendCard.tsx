import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { getSafeToSpend, getTransactionHistory, type SafeToSpend, type Transaction, type TransactionHistoryFilters } from '../api';
import { formatVnd, sumBalances } from '../money';
import { reportDatePlusDays } from '../reportDate';
import { useSession } from '../session';
import { color } from '../theme';
import { Card, common } from './Ui';

const filters: TransactionHistoryFilters = { search: '', from: '', to: '', month: '', kind: 'EXPENSE', categoryId: '', sort: 'desc' };
const minor = (value: string) => { const [whole, cents = ''] = value.split('.'); return BigInt(whole) * 100n + BigInt(cents.padEnd(2, '0') || '0'); };
const asMoney = (value: bigint) => `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;

async function lastSevenExpenses(session: Parameters<typeof getTransactionHistory>[0], signal: AbortSignal): Promise<Transaction[]> {
  const range = { ...filters, from: reportDatePlusDays(-6), to: reportDatePlusDays(0) };
  const first = await getTransactionHistory(session, range, 0, signal);
  const items = [...first.items];
  for (let page = 1; page < first.totalPages; page += 1) {
    const next = await getTransactionHistory(session, range, page, signal);
    items.push(...next.items);
  }
  return items;
}

export default function SafeToSpendCard() {
  const { session } = useSession();
  const [result, setResult] = useState<SafeToSpend | null>(null);
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController();
    setResult(null); setExpenses([]); setError('');
    Promise.all([getSafeToSpend(session, controller.signal), lastSevenExpenses(session, controller.signal)])
      .then(([safe, history]) => { setResult(safe); setExpenses(history); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu chi tiêu.'); });
    return () => controller.abort();
  }, [session]));

  const daily = Array.from({ length: 7 }, (_, index) => {
    const date = reportDatePlusDays(-index);
    const amount = sumBalances(expenses.filter((item) => item.occurredOn === date && item.kind === 'EXPENSE').map((item) => item.amount));
    return { date, label: index === 0 ? 'Hôm nay' : index === 1 ? 'Hôm qua' : `${index} ngày trước`, amount };
  });
  const safeRemaining = result?.status === 'AVAILABLE' && result.safePerDay ? minor(result.safePerDay) : null;
  const cap = safeRemaining === null ? null : safeRemaining + minor(daily[0].amount);
  const remaining = safeRemaining;
  const progress = cap && cap > 0n ? Math.min(100, Number(minor(daily[0].amount) * 100n / cap)) : 0;
  const safeDays = cap === null ? 0 : daily.filter((day) => minor(day.amount) <= cap).length;
  return <View style={styles.wrapper}>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {!result && !error && <Text style={common.helper}>Đang tính mức chi...</Text>}
    {result && <>
      <View style={styles.hero}>
        <View style={styles.heroTop}><Text style={styles.heroLabel}>●  Hạn mức chi tiêu an toàn hôm nay</Text><Text style={styles.heroBadge}>Tháng {result.month.slice(5)}</Text></View>
        <Text style={styles.heroAmount}>{cap === null ? '—' : formatVnd(asMoney(cap))}<Text style={styles.perDay}>{cap === null ? '' : ' / ngày'}</Text></Text>
        <Text style={styles.heroSubtitle}>{result.status === 'NO_BUDGET' ? 'Chưa đặt ngân sách tổng tháng để tính hạn mức.' : result.status === 'BUDGET_EXHAUSTED' ? 'Ngân sách tháng đã hết hoặc bị vượt.' : result.status === 'UPCOMING_EXCEEDS_BUDGET' ? 'Khoản định kỳ sắp tới đã dùng hết ngân sách còn lại.' : `Còn ${formatVnd(result.availableAfterReservations ?? '0')} cho ${result.remainingDays} ngày còn lại trong tháng.`}</Text>
        {cap !== null && <View style={styles.tracker}><View style={styles.trackerRow}><Text style={styles.trackerText}>Đã chi: <Text style={styles.trackerStrong}>{formatVnd(daily[0].amount)}</Text></Text><Text style={styles.trackerText}>Khả dụng: <Text style={styles.trackerStrong}>{formatVnd(asMoney(remaining! > 0n ? remaining! : 0n))}</Text></Text></View><View style={styles.track}><View style={[styles.fill, { width: `${progress}%` }]} /></View></View>}
      </View>
      <Card style={styles.formulaCard}><View style={styles.cardHeading}><View style={styles.iconBox}><Text style={styles.sigma}>Σ</Text></View><View><Text style={styles.cardTitle}>Cơ chế tính toán thông minh</Text><Text style={styles.cardSubtitle}>Công thức cân đối theo thời gian thực</Text></View></View><View style={styles.formula}><Text style={styles.formulaText}>Hạn mức = (Ngân sách còn - Khoản định kỳ sắp tới) ÷ Số ngày còn lại</Text></View>
        <View style={styles.line}><Text style={styles.lineLabel}>●  Ngân sách khả dụng còn lại:</Text><Text style={styles.lineValue}>{result.budgetRemaining === null ? 'Chưa đặt' : formatVnd(result.budgetRemaining)}</Text></View>
        <View style={styles.line}><Text style={styles.lineLabel}>●  Trừ khoản định kỳ sắp tới:</Text><Text style={styles.lineValue}>- {formatVnd(result.upcomingExpense)}</Text></View>
        <View style={styles.line}><Text style={styles.lineLabel}>●  Số ngày còn lại trong tháng:</Text><Text style={styles.lineValue}>{result.remainingDays} ngày</Text></View>
        <View style={styles.formulaBottom}><Text style={styles.idealLabel}>Còn phân bổ mỗi ngày:</Text><Text style={styles.idealValue}>{cap === null ? 'Chưa tính được' : formatVnd(result.safePerDay!)}</Text></View>
      </Card>
      <Card style={styles.historyCard}><View style={styles.historyHead}><View style={{ flex: 1 }}><Text style={styles.historyTitle}>Theo dõi 7 ngày gần nhất</Text><Text style={styles.cardSubtitle}>Đối chiếu với hạn mức hiện tại</Text></View>{cap !== null && <Text style={styles.countBadge}>{safeDays}/7 An toàn</Text>}</View>
        {daily.map((day) => { const over = cap !== null && minor(day.amount) > cap; const delta = cap === null ? null : cap - minor(day.amount); return <View key={day.date} style={styles.dayRow}><View style={[styles.dayIcon, over && styles.dayIconWarning, cap === null && styles.dayIconNeutral]}><Ionicons name={cap === null ? 'ellipse-outline' : over ? 'warning-outline' : 'checkmark-circle-outline'} size={22} color={cap === null ? color.muted : over ? '#a36700' : color.greenDark} /></View><View style={styles.dayInfo}><View style={styles.dayNameRow}><Text style={styles.dayName}>{day.label}</Text>{cap !== null && <Text style={[styles.dayBadge, over && styles.dayBadgeWarning]}>{over ? 'Vượt mức' : 'An toàn'}</Text>}</View><Text style={[styles.dayHint, over && styles.warningText]}>{cap === null ? day.date : over ? `Vượt ${formatVnd(asMoney(-delta!))}` : `Còn ${formatVnd(asMoney(delta!))}`}</Text></View><View style={styles.dayMoney}><Text style={[styles.dayAmount, over && styles.warningText]}>{formatVnd(day.amount)}</Text>{cap !== null && <Text style={styles.dayCap}>/ {formatVnd(asMoney(cap))}</Text>}</View></View>; })}
        {cap !== null && <Text style={styles.footnote}>Các ngày trước được đối chiếu với mức hiện tại; hạn mức của từng ngày trong quá khứ không được lưu.</Text>}
      </Card>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 20, paddingBottom: 22 }, hero: { backgroundColor: '#063d32', borderRadius: 20, padding: 20, gap: 13 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }, heroLabel: { flex: 1, color: '#baf2d6', fontSize: 12, lineHeight: 17, fontWeight: '700' }, heroBadge: { color: '#baf2d6', fontSize: 11, fontWeight: '700', backgroundColor: '#032f27', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 }, heroAmount: { color: color.white, fontSize: 30, fontWeight: '800' }, perDay: { color: '#bcdecf', fontSize: 13, fontWeight: '500' }, heroSubtitle: { color: '#c7e5d7', fontSize: 13, lineHeight: 19, marginBottom: 6 }, tracker: { backgroundColor: '#04332b', padding: 14, borderRadius: 14, gap: 12 }, trackerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, trackerText: { color: '#baf2d6', fontSize: 11 }, trackerStrong: { color: color.white, fontWeight: '700' }, track: { backgroundColor: '#0e2820', height: 10, borderRadius: 7, padding: 2 }, fill: { backgroundColor: '#34d399', height: 6, borderRadius: 5 }, formulaCard: { gap: 13, padding: 17 }, cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, iconBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#edf4ff', alignItems: 'center', justifyContent: 'center' }, sigma: { color: color.greenDark, fontSize: 19, fontWeight: '800' }, cardTitle: { color: color.navy, fontSize: 15, fontWeight: '800' }, cardSubtitle: { color: color.muted, fontSize: 11, lineHeight: 17 }, formula: { backgroundColor: '#edf4ff', borderRadius: 9, padding: 12 }, formulaText: { color: color.navy, fontSize: 12, fontStyle: 'italic', lineHeight: 18 }, line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7, borderBottomWidth: 1, borderColor: '#e5ecf4', paddingVertical: 10 }, lineLabel: { color: color.muted, fontSize: 11, flex: 1 }, lineValue: { color: color.navy, fontSize: 12, fontWeight: '700' }, formulaBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, idealLabel: { color: color.greenDark, fontSize: 12, fontWeight: '700' }, idealValue: { color: color.greenDark, fontSize: 13, fontWeight: '800' }, historyCard: { gap: 5, padding: 17 }, historyHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }, historyTitle: { color: color.navy, fontSize: 17, fontWeight: '800' }, countBadge: { color: '#003e2b', backgroundColor: '#98f5ce', fontSize: 10, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, fontWeight: '700' }, dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e5ecf4' }, dayIcon: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }, dayIconWarning: { backgroundColor: '#fffbeb' }, dayIconNeutral: { backgroundColor: '#edf4ff' }, dayInfo: { flex: 1 }, dayNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }, dayName: { color: color.navy, fontSize: 12, fontWeight: '700' }, dayBadge: { color: color.greenDark, backgroundColor: '#d1fae5', fontSize: 9, borderRadius: 9, paddingHorizontal: 5, paddingVertical: 3, fontWeight: '700' }, dayBadgeWarning: { color: '#825100', backgroundColor: '#fef3c7' }, dayHint: { color: color.muted, fontSize: 10, marginTop: 3 }, warningText: { color: '#825100' }, dayMoney: { alignItems: 'flex-end' }, dayAmount: { color: color.navy, fontSize: 12, fontWeight: '700' }, dayCap: { color: color.muted, fontSize: 10 }, footnote: { color: color.muted, fontSize: 10, lineHeight: 15, marginTop: 8 },
});
