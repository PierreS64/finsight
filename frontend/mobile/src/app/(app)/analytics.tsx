import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCharts, getDashboard, getInsights, getSafeToSpend, type Charts, type Insights, type SafeToSpend } from '../../api';
import { useSession } from '../../session';
import { reportDate, reportMonth } from '../../reportDate';
import { formatVnd, sumBalances } from '../../money';
import { Brand, Card, common, Page } from '../../components/Ui';
import { color } from '../../theme';

type Period = 'week' | 'month' | 'year';
type Bucket = { label: string; income: string; expense: string };
type Metrics = { income: string; expense: string; net: string; buckets: Bucket[] };
const tools = [
  { key: 'trends', title: 'Xu hướng thu chi', caption: 'Biến động theo chu kỳ', icon: 'trending-up-outline' as const, tint: '#e5f0ff', ink: '#2563eb' },
  { key: 'health', title: 'Nhận xét tài chính', caption: 'Sức khỏe dòng tiền', icon: 'shield-checkmark-outline' as const, tint: '#e7fbf1', ink: '#006948' },
  { key: 'explanation', title: 'Giải thích chi tiêu', caption: 'Nguyên nhân biến động', icon: 'analytics-outline' as const, tint: '#fff7de', ink: '#ad7100' },
  { key: 'profile', title: 'Hồ sơ hành vi', caption: 'Thói quen tiêu dùng', icon: 'finger-print-outline' as const, tint: '#eff0ff', ink: '#7064c8' },
  { key: 'what-if', title: 'Mô phỏng What-If', caption: 'Kịch bản giả lập', icon: 'options-outline' as const, tint: '#faf0ff', ink: '#a547cf' },
  { key: 'forecast', title: 'Dự báo cuối tháng', caption: 'Ước tính chốt kỳ', icon: 'wallet-outline' as const, tint: '#e8faf4', ink: '#00846a' },
];
function minor(value: string) { const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value); return match ? (match[1] ? -1n : 1n) * (BigInt(match[2]) * 100n + BigInt((match[3] ?? '').padEnd(2, '0') || '0')) : 0n; }
function fromChart(chart: Charts, period: 'week' | 'month'): Metrics {
  if (period === 'month') return { income: chart.incomeTotal, expense: chart.expenseTotal, net: sumBalances([chart.incomeTotal, `-${chart.expenseTotal}`]), buckets: chart.buckets.map((item, index) => ({ label: `T${index + 1}`, income: item.income, expense: item.expense })) };
  const current = chart.buckets.find((item) => item.from <= reportDate() && item.to >= reportDate());
  return { income: current?.income ?? '0', expense: current?.expense ?? '0', net: sumBalances([current?.income ?? '0', `-${current?.expense ?? '0'}`]), buckets: chart.buckets.map((item, index) => ({ label: `T${index + 1}`, income: item.income, expense: item.expense })) };
}
function YearMonth(year: number, offset: number) { return `${year}-${String(offset).padStart(2, '0')}`; }

export default function Analytics() {
  const { session } = useSession();
  const [period, setPeriod] = useState<Period>('month');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [safe, setSafe] = useState<SafeToSpend | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setError(''); setMetrics(null);
    async function load() {
      if (!session) return;
      const [foundInsights, foundSafe] = await Promise.all([getInsights(session, reportMonth(), controller.signal), getSafeToSpend(session, controller.signal)]);
      let result: Metrics;
      if (period === 'year') {
        const year = Number(reportMonth().slice(0, 4));
        const months = await Promise.all(Array.from({ length: 12 }, (_, index) => getDashboard(session, YearMonth(year, index + 1), controller.signal)));
        const income = sumBalances(months.map((item) => item.income));
        const expense = sumBalances(months.map((item) => item.expense));
        result = { income, expense, net: sumBalances([income, `-${expense}`]), buckets: months.map((item, index) => ({ label: `${index + 1}`, income: item.income, expense: item.expense })) };
      } else {
        const chart = await getCharts(session, reportMonth(), 'week', controller.signal);
        result = fromChart(chart, period);
      }
      if (!controller.signal.aborted) { setInsights(foundInsights); setSafe(foundSafe); setMetrics(result); }
    }
    load().catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được phân tích.'); });
    return () => controller.abort();
  }, [session, period]));
  const max = metrics?.buckets.reduce((value, item) => [minor(item.income), minor(item.expense)].reduce((largest, current) => current > largest ? current : largest, value), 0n) ?? 0n;
  const incomeMinor = metrics ? minor(metrics.income) : 0n;
  const netMinor = metrics ? minor(metrics.net) : 0n;
  const savingsRate = incomeMinor > 0n ? (netMinor * 10000n) / incomeMinor : null;
  const periodText = period === 'year' ? `Năm ${reportMonth().slice(0, 4)}` : period === 'week' ? 'Tuần hiện tại' : `Tháng ${reportMonth().slice(5)}/${reportMonth().slice(0, 4)}`;
  return <Page style={styles.page}><View style={styles.header}><Brand /><Pressable accessibilityRole="button" accessibilityLabel="Hồ sơ" onPress={() => router.push('/profile')} style={styles.avatar}><Ionicons name="person-outline" size={22} color={color.greenDark} /></Pressable></View>
    <View style={styles.periodTabs}>{([['week', 'Tuần'], ['month', 'Tháng'], ['year', 'Năm']] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: period === key }} onPress={() => setPeriod(key)} style={[styles.periodTab, period === key && styles.periodActive]}><Text style={[styles.periodTabText, period === key && styles.periodActiveText]}>{label}</Text></Pressable>)}</View><View style={styles.periodLine}><Text style={styles.periodText}>▢  {periodText}</Text><Text style={styles.periodBadge}>{period === 'week' ? 'Chu kỳ 7 ngày' : period === 'year' ? 'Chu kỳ 12 tháng' : 'Chu kỳ tháng'}</Text></View>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!metrics && !error && <Text style={common.helper}>Đang tải phân tích...</Text>}
    {metrics && <><Card style={styles.insight}><View style={styles.insightIcon}><Ionicons name="trending-up-outline" size={23} color="#936000" /></View><View style={{ flex: 1 }}><Text style={styles.insightLabel}>TÓM LƯỢC TRỌNG YẾU •</Text><Text style={styles.insightText}>{insights?.cards[0]?.content ?? 'Chưa có nhận xét nổi bật từ dữ liệu tháng này.'}</Text></View></Card>
      <Card style={styles.summary}><View style={styles.summaryHead}><View><Text style={styles.metricLabel}>Thặng dư khả dụng</Text><Text style={styles.net}>{formatVnd(metrics.net)}</Text></View>{savingsRate !== null && <View style={styles.rate}><Text style={styles.rateTitle}>Tỷ lệ tích lũy</Text><Text style={styles.rateValue}>{savingsRate / 100n},{String(savingsRate < 0n ? -(savingsRate % 100n) : savingsRate % 100n).padStart(2, '0')}%</Text></View>}</View><View style={styles.metricRow}><View style={styles.metric}><Text style={styles.metricLabel}>↓  Tổng thu</Text><Text style={styles.income}>{formatVnd(metrics.income)}</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>↑  Tổng chi</Text><Text style={styles.expense}>{formatVnd(metrics.expense)}</Text></View></View><View style={styles.chartHeading}><Text style={styles.chartTitle}>Đối soát {period === 'year' ? '12 tháng' : 'các tuần'} gần nhất</Text><Text style={styles.legend}>● Thu   <Text style={{ color: '#c52222' }}>● Chi</Text></Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll} contentContainerStyle={styles.chart}>{metrics.buckets.map((item, index) => <View key={`${item.label}-${index}`} style={styles.barGroup}><View style={styles.barSpace}><View style={[styles.bar, styles.incomeBar, { height: max > 0n ? Math.max(2, Number(minor(item.income) * 98n / max)) : 2 }]} /><View style={[styles.bar, styles.expenseBar, { height: max > 0n ? Math.max(2, Number(minor(item.expense) * 98n / max)) : 2 }]} /></View><Text style={styles.barLabel}>{item.label}</Text></View>)}</ScrollView></Card>
      <Pressable accessibilityRole="button" onPress={() => router.push('/analytics-tool/safe')} style={styles.safeCard}><View style={styles.safeIcon}><Ionicons name="shield-checkmark-outline" size={25} color={color.white} /></View><View style={{ flex: 1 }}><Text style={styles.safeLabel}>KHUYẾN NGHỊ ĐIỀU TIẾT</Text><Text style={styles.safeText}>{safe?.safePerDay ? `Mức chi an toàn khuyến nghị: ${formatVnd(safe.safePerDay)}/ngày` : 'Xem mức chi an toàn theo ngân sách của bạn'}</Text></View></Pressable>
      <View style={styles.sectionHead}><Text style={styles.section}>Công cụ phân tích sâu</Text><Text style={styles.sectionCount}>7 chỉ báo</Text></View><View style={styles.grid}>{tools.map((tool) => <Pressable key={tool.key} accessibilityRole="button" onPress={() => router.push({ pathname: '/analytics-tool/[tool]', params: { tool: tool.key } })} style={styles.tool}><View style={[styles.toolIcon, { backgroundColor: tool.tint }]}><Ionicons name={tool.icon} size={23} color={tool.ink} /></View><Ionicons name="chevron-forward" size={17} color={color.muted} style={styles.toolArrow} /><Text style={styles.toolTitle}>{tool.title}</Text><Text style={styles.toolCaption}>{tool.caption}</Text></Pressable>)}</View><Pressable accessibilityRole="button" onPress={() => router.push('/analytics-tool/safe')} style={styles.safeTool}><View style={styles.safeToolIcon}><Ionicons name="shield-outline" size={22} color={color.greenDark} /></View><View style={{ flex: 1 }}><Text style={styles.toolTitle}>Chi tiêu an toàn</Text><Text style={styles.toolCaption}>Ngưỡng định mức bảo toàn tích lũy cá nhân</Text></View><Ionicons name="arrow-forward" size={21} color={color.greenDark} /></Pressable>
    </>}
  </Page>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 5 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17 }, avatar: { width: 39, height: 39, borderRadius: 20, backgroundColor: '#e4effd', alignItems: 'center', justifyContent: 'center' }, periodTabs: { flexDirection: 'row', padding: 4, backgroundColor: '#edf4ff', borderRadius: 13 }, periodTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 }, periodActive: { backgroundColor: color.white }, periodTabText: { color: color.navy, fontSize: 13 }, periodActiveText: { color: color.greenDark, fontWeight: '800' }, periodLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }, periodText: { color: color.greenDark, fontSize: 12, fontWeight: '700' }, periodBadge: { color: '#0064c1', backgroundColor: '#e9f1ff', fontSize: 11, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 }, insight: { flexDirection: 'row', gap: 11, backgroundColor: '#fffcf5', marginBottom: 16, padding: 14 }, insightIcon: { width: 39, height: 39, backgroundColor: '#fff7de', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, insightLabel: { color: '#936000', fontSize: 11, fontWeight: '800', marginBottom: 5 }, insightText: { color: color.navy, fontSize: 13, lineHeight: 19 }, summary: { marginBottom: 16, gap: 17 }, summaryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, metricLabel: { color: color.muted, fontSize: 12 }, net: { color: color.greenDark, fontSize: 26, fontWeight: '800', marginTop: 6 }, rate: { borderRadius: 20, backgroundColor: '#e9f8f1', paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' }, rateTitle: { color: color.greenDark, fontSize: 11, fontWeight: '800' }, rateValue: { color: color.greenDark, fontSize: 11, fontWeight: '800' }, metricRow: { flexDirection: 'row', gap: 9 }, metric: { flex: 1, backgroundColor: '#edf4ff', borderRadius: 12, padding: 10, gap: 6 }, income: { color: color.greenDark, fontSize: 14, fontWeight: '800' }, expense: { color: '#b91c1c', fontSize: 14, fontWeight: '800' }, chartHeading: { borderTopWidth: 1, borderColor: color.border, paddingTop: 13, flexDirection: 'row', justifyContent: 'space-between' }, chartTitle: { color: color.navy, fontSize: 12 }, legend: { color: color.greenDark, fontSize: 11 }, chartScroll: { height: 132, flexGrow: 0 }, chart: { gap: 9, alignItems: 'flex-end' }, barGroup: { alignItems: 'center', width: 44, gap: 7 }, barSpace: { flexDirection: 'row', alignItems: 'flex-end', height: 104, gap: 3 }, bar: { width: 11, borderRadius: 3 }, incomeBar: { backgroundColor: '#006948' }, expenseBar: { backgroundColor: '#c52222' }, barLabel: { color: color.muted, fontSize: 11 }, safeCard: { flexDirection: 'row', gap: 12, padding: 15, borderWidth: 1, borderColor: '#b8dbd0', borderRadius: 16, backgroundColor: '#f2fbf6', marginBottom: 22 }, safeIcon: { width: 40, height: 40, backgroundColor: '#006948', borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, safeLabel: { color: color.greenDark, fontSize: 11, fontWeight: '800' }, safeText: { color: color.navy, fontSize: 13, marginTop: 5, lineHeight: 19 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, section: { color: color.navy, fontSize: 20, fontWeight: '800' }, sectionCount: { color: color.muted, fontSize: 11 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }, tool: { width: '48%', backgroundColor: color.white, borderWidth: 1, borderColor: color.border, borderRadius: 15, padding: 14, minHeight: 109, gap: 4 }, toolIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, toolArrow: { position: 'absolute', right: 13, top: 19 }, toolTitle: { color: color.navy, fontSize: 13, fontWeight: '800', marginTop: 4 }, toolCaption: { color: color.muted, fontSize: 11 }, safeTool: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: color.white, borderWidth: 1, borderColor: color.border, borderRadius: 15, padding: 14, marginTop: 10, marginBottom: 20 }, safeToolIcon: { width: 35, height: 35, backgroundColor: '#e7fbf1', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
