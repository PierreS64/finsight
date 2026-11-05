import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCharts, getDashboard, getSafeToSpend, getTransactionHistory, type SafeToSpend, type Transaction } from '../api';
import { Card, common, PrimaryButton } from './Ui';
import { formatVnd, sumBalances } from '../money';
import { reportDate, reportMonth } from '../reportDate';
import { useSession } from '../session';
import { color } from '../theme';

type Period = 'week' | 'month' | 'quarter' | 'year';
type Bar = { label: string; income: string; expense: string };
type Data = { income: string; expense: string; bars: Bar[]; daily: Bar[]; safe: SafeToSpend; scope: string };
const today = reportDate();
const month = reportMonth();
function minor(value: string) { const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value); return match ? (match[1] ? -1n : 1n) * (BigInt(match[2]) * 100n + BigInt((match[3] ?? '').padEnd(2, '0') || '0')) : 0n; }
function decimal(value: bigint) { return `${value / 100n}.${String(value < 0n ? -(value % 100n) : value % 100n).padStart(2, '0')}`; }
function monthOffset(value: string, offset: number) { const [year, part] = value.split('-').map(Number); const date = new Date(Date.UTC(year, part - 1 + offset, 1)); return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; }
function dateBars(items: Transaction[], from: string, to: string): Bar[] {
  const bars: Bar[] = [];
  for (let time = Date.parse(`${from}T00:00:00Z`); time <= Date.parse(`${to}T00:00:00Z`); time += 86400000) {
    const day = new Date(time).toISOString().slice(0, 10);
    const entries = items.filter((item) => item.occurredOn === day);
    bars.push({ label: day.slice(8), income: sumBalances(entries.filter((item) => item.kind === 'INCOME').map((item) => item.amount)), expense: sumBalances(entries.filter((item) => item.kind === 'EXPENSE').map((item) => item.amount)) });
  }
  return bars;
}
async function transactions(session: Parameters<typeof getTransactionHistory>[0], from: string, to: string, signal: AbortSignal) {
  const filters = { search: '', from, to, month: '', kind: '' as const, categoryId: '', sort: 'desc' as const };
  const first = await getTransactionHistory(session, filters, 0, signal);
  const others = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) => getTransactionHistory(session, filters, index + 1, signal)));
  return [first, ...others].flatMap((page) => page.items);
}

export default function AnalyticsTrends() {
  const { session } = useSession();
  const [period, setPeriod] = useState<Period>('month');
  const [byDay, setByDay] = useState(true);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setData(null); setError('');
    async function load() {
      if (!session) return;
      const [chart, safe] = await Promise.all([getCharts(session, month, 'week', controller.signal), getSafeToSpend(session, controller.signal)]);
      const current = chart.buckets.find((item) => item.from <= today && item.to >= today) ?? chart.buckets.at(-1);
      const monthNumber = Number(month.slice(5));
      const quarterStart = Math.floor((monthNumber - 1) / 3) * 3 + 1;
      const from = period === 'week' ? current?.from ?? today : period === 'quarter' ? `${month.slice(0, 4)}-${String(quarterStart).padStart(2, '0')}-01` : period === 'year' ? `${month.slice(0, 4)}-01-01` : `${month}-01`;
      const to = period === 'week' ? current?.to ?? today : today;
      const records = await transactions(session, from, to, controller.signal);
      let income: string; let expense: string; let bars: Bar[];
      if (period === 'week') {
        income = current?.income ?? '0'; expense = current?.expense ?? '0';
        bars = chart.buckets.map((item, index) => ({ label: `T${index + 1}`, income: item.income, expense: item.expense }));
      } else if (period === 'month') {
        income = chart.incomeTotal; expense = chart.expenseTotal;
        bars = chart.buckets.map((item, index) => ({ label: `T${index + 1}`, income: item.income, expense: item.expense }));
      } else {
        const count = period === 'quarter' ? monthNumber - quarterStart + 1 : monthNumber;
        const months = await Promise.all(Array.from({ length: count }, (_, index) => getDashboard(session, monthOffset(month, index - count + 1), controller.signal)));
        income = sumBalances(months.map((item) => item.income)); expense = sumBalances(months.map((item) => item.expense));
        bars = months.map((item) => ({ label: item.month.slice(5), income: item.income, expense: item.expense }));
      }
      if (!controller.signal.aborted) setData({ income, expense, bars, daily: dateBars(records, from, to), safe, scope: period === 'week' ? 'Tuần hiện tại' : period === 'quarter' ? 'Quý hiện tại' : period === 'year' ? `Năm ${month.slice(0, 4)}` : `Tháng ${month.slice(5)}/${month.slice(0, 4)}` });
    }
    load().catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được xu hướng thu chi.'); });
    return () => controller.abort();
  }, [session, period]));
  const net = data ? sumBalances([data.income, `-${data.expense}`]) : null;
  const netMinor = net === null ? null : minor(net);
  const ratio = data && minor(data.income) > 0n ? minor(data.expense) * 1000n / minor(data.income) : null;
  const bars = byDay ? data?.daily ?? [] : data?.bars ?? [];
  const maximum = bars.reduce((value, item) => [minor(item.income), minor(item.expense)].reduce((top, current) => current > top ? current : top, value), 0n);
  const average = data && data.daily.some((item) => minor(item.expense) > 0n) ? decimal(minor(data.daily.reduce((sum, item) => sumBalances([sum, item.expense]), '0')) / BigInt(data.daily.length)) : null;
  const withSpending = data?.daily.filter((item) => minor(item.expense) > 0n) ?? [];
  const highest = withSpending.reduce<Bar | null>((best, item) => !best || minor(item.expense) > minor(best.expense) ? item : best, null);
  const lowest = withSpending.reduce<Bar | null>((best, item) => !best || minor(item.expense) < minor(best.expense) ? item : best, null);
  return <View>
    <View style={styles.periods}>{([['week', 'Tuần'], ['month', 'Tháng'], ['quarter', 'Quý'], ['year', 'Năm']] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: period === key }} onPress={() => setPeriod(key)} style={[styles.period, period === key && styles.periodActive]}><Text style={[styles.periodText, period === key && styles.periodTextActive]}>{label}</Text></Pressable>)}</View>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!data && !error && <Text style={common.helper}>Đang tải xu hướng...</Text>}
    {data && <><View style={styles.hero}><Text style={styles.heroLabel}>Chênh lệch thu chi {data.scope}</Text><Text style={styles.heroNet}>{netMinor !== null && netMinor > 0n ? '+' : ''}{formatVnd(net ?? '0')} <Text style={styles.heroHint}>{netMinor === 0n ? '(Cân bằng)' : netMinor !== null && netMinor < 0n ? '(Thâm hụt)' : '(Thặng dư)'}</Text></Text><View style={styles.heroDivider} /><View style={styles.heroMetrics}><View style={styles.heroMetric}><Ionicons name="arrow-up-outline" size={21} color="#6ee7b7" /><View><Text style={styles.heroMetricLabel}>Thu nhập</Text><Text style={styles.heroMetricValue}>{formatVnd(data.income)}</Text></View></View><View style={styles.heroMetric}><Ionicons name="arrow-down-outline" size={21} color="#fda4af" /><View><Text style={styles.heroMetricLabel}>Chi tiêu</Text><Text style={styles.heroMetricValue}>{formatVnd(data.expense)}</Text></View></View></View><View style={styles.ratioHead}><Text style={styles.heroMetricLabel}>Tỷ lệ chi tiêu / thu nhập</Text><Text style={styles.heroMetricLabel}>{ratio === null ? '—' : `${ratio / 10n},${ratio % 10n}%`}</Text></View><View style={styles.track}><View style={[styles.trackFill, { width: `${ratio === null ? 0 : Math.min(100, Number(ratio / 10n))}%` }]} /></View></View>
      <Card style={styles.chartCard}><View style={styles.chartHeader}><View><Text style={styles.chartTitle}>Đối chiếu thu chi</Text><Text style={styles.chartSubtitle}>Đơn vị: VND</Text></View><View style={styles.chartTabs}><Pressable accessibilityRole="tab" accessibilityState={{ selected: !byDay }} onPress={() => setByDay(false)} style={[styles.chartTab, !byDay && styles.chartTabActive]}><Text style={styles.chartTabText}>Theo tuần</Text></Pressable><Pressable accessibilityRole="tab" accessibilityState={{ selected: byDay }} onPress={() => setByDay(true)} style={[styles.chartTab, byDay && styles.chartTabActive]}><Text style={styles.chartTabText}>Theo ngày</Text></Pressable></View></View><View style={styles.legend}><Text style={styles.legendText}>● Thu    <Text style={styles.expenseLegend}>● Chi</Text></Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll} contentContainerStyle={styles.chartBars}>{bars.map((item, index) => <View key={`${item.label}-${index}`} style={styles.barGroup}><View style={styles.barSpace}><View style={[styles.bar, styles.incomeBar, { height: maximum ? Math.max(2, Number(minor(item.income) * 140n / maximum)) : 2 }]} /><View style={[styles.bar, styles.expenseBar, { height: maximum ? Math.max(2, Number(minor(item.expense) * 140n / maximum)) : 2 }]} /></View><Text style={styles.barLabel}>{item.label}</Text></View>)}</ScrollView>{maximum === 0n && <Text style={styles.noChart}>Chưa có giao dịch trong kỳ hiển thị.</Text>}</Card>
      <Text style={styles.sectionTitle}>Tốc độ chi tiêu</Text><Card style={styles.pace}><View style={styles.paceIcon}><Ionicons name="speedometer-outline" size={23} color={color.greenDark} /></View><View style={{ flex: 1 }}><Text style={styles.paceLabel}>Tốc độ chi tiêu trung bình</Text><Text style={styles.paceValue}>{average ? `${formatVnd(average)} / ngày` : 'Chưa có dữ liệu'}</Text></View></Card><Card style={styles.pace}><View style={[styles.paceIcon, styles.paceIconRed]}><Ionicons name="bag-outline" size={22} color="#c52222" /></View><View style={{ flex: 1 }}><Text style={styles.paceLabel}>Ngày chi tiêu nhiều nhất</Text><Text style={styles.paceValue}>{highest ? `Ngày ${highest.label}` : 'Chưa có dữ liệu'}</Text></View><Text style={styles.paceAmount}>{highest ? formatVnd(highest.expense) : '—'}</Text></Card><Card style={styles.pace}><View style={styles.paceIcon}><Ionicons name="wallet-outline" size={22} color={color.greenDark} /></View><View style={{ flex: 1 }}><Text style={styles.paceLabel}>Ngày chi tiêu ít nhất</Text><Text style={styles.paceValue}>{lowest ? `Ngày ${lowest.label}` : 'Chưa có dữ liệu'}</Text></View><Text style={styles.paceAmount}>{lowest ? formatVnd(lowest.expense) : '—'}</Text></Card>
      <View style={styles.suggestion}><Ionicons name="sparkles-outline" size={25} color={color.greenDark} /><View style={{ flex: 1 }}><Text style={styles.suggestionTitle}>Gợi ý từ FinSight</Text><Text style={styles.suggestionText}>{data.safe.safePerDay ? `Mức chi an toàn hiện tại: ${formatVnd(data.safe.safePerDay)}/ngày.` : 'Đặt ngân sách để xem mức chi an toàn mỗi ngày.'}</Text></View></View><View style={styles.action}><PrimaryButton onPress={() => router.push('/transactions')} icon="arrow-forward">Xem toàn bộ dòng tiền tháng {month.slice(5)}</PrimaryButton></View>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  periods: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 18 }, period: { paddingHorizontal: 17, paddingVertical: 9, borderRadius: 20 }, periodActive: { backgroundColor: '#006948' }, periodText: { color: color.navy, fontSize: 13 }, periodTextActive: { color: color.white, fontWeight: '800' }, hero: { backgroundColor: '#063d32', borderRadius: 18, padding: 20, marginBottom: 20, gap: 9 }, heroLabel: { color: '#9debc7', fontSize: 13, fontWeight: '700' }, heroNet: { color: color.white, fontSize: 28, fontWeight: '800' }, heroHint: { color: '#a5d8c0', fontSize: 12 }, heroDivider: { borderBottomWidth: 1, borderColor: '#ffffff20', marginVertical: 6 }, heroMetrics: { flexDirection: 'row', gap: 15 }, heroMetric: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }, heroMetricLabel: { color: '#9debc7', fontSize: 11 }, heroMetricValue: { color: color.white, fontWeight: '800', fontSize: 13, marginTop: 4 }, ratioHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }, track: { height: 5, borderRadius: 5, backgroundColor: '#254f44' }, trackFill: { height: 5, borderRadius: 5, backgroundColor: '#5ee1ae' }, chartCard: { marginBottom: 22 }, chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, chartTitle: { color: color.navy, fontSize: 19, fontWeight: '800' }, chartSubtitle: { color: color.muted, fontSize: 11 }, chartTabs: { flexDirection: 'row', backgroundColor: '#e7f0fb', borderRadius: 9, padding: 3 }, chartTab: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7 }, chartTabActive: { backgroundColor: color.white }, chartTabText: { color: color.greenDark, fontSize: 11, fontWeight: '700' }, legend: { alignItems: 'flex-end', marginTop: 13 }, legendText: { color: color.greenDark, fontSize: 11 }, expenseLegend: { color: '#a56700' }, chartScroll: { height: 186, flexGrow: 0, marginTop: 8 }, chartBars: { gap: 8, alignItems: 'flex-end' }, barGroup: { width: 38, alignItems: 'center', gap: 6 }, barSpace: { flexDirection: 'row', height: 146, alignItems: 'flex-end', gap: 3 }, bar: { width: 11, borderRadius: 3 }, incomeBar: { backgroundColor: '#006948' }, expenseBar: { backgroundColor: '#a56700' }, barLabel: { color: color.muted, fontSize: 10 }, noChart: { color: color.muted, fontSize: 11, textAlign: 'center' }, sectionTitle: { color: color.navy, fontSize: 19, fontWeight: '800', marginBottom: 10 }, pace: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 10 }, paceIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#e8f8ef', alignItems: 'center', justifyContent: 'center' }, paceIconRed: { backgroundColor: '#fff0f0' }, paceLabel: { color: color.muted, fontSize: 12 }, paceValue: { color: color.navy, fontSize: 15, fontWeight: '800', marginTop: 3 }, paceAmount: { color: '#b91c1c', fontSize: 12, fontWeight: '800' }, suggestion: { backgroundColor: '#effbf6', borderWidth: 1, borderColor: '#a8d8c9', borderRadius: 15, padding: 15, flexDirection: 'row', gap: 10, marginTop: 8 }, suggestionTitle: { color: color.greenDark, fontSize: 13, fontWeight: '800' }, suggestionText: { color: color.navy, fontSize: 12, lineHeight: 18, marginTop: 4 }, action: { marginTop: 20, marginBottom: 15 },
});
