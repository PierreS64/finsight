import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { getCharts, getDashboard, getExpenseForecast, type Charts, type DashboardSummary, type ExpenseForecast } from '../api';
import { formatVnd } from '../money';
import { reportMonth } from '../reportDate';
import { useSession } from '../session';
import { color } from '../theme';
import { Card, common } from './Ui';

const minor = (value: string) => { const [whole, cents = ''] = value.split('.'); return BigInt(whole) * 100n + BigInt(cents.padEnd(2, '0') || '0'); };
const money = (value: bigint) => `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
const percent = (part: bigint, total: bigint) => total > 0n ? Math.min(100, Number(part * 100n / total)) : 0;

function SpendingPath({ forecast, charts, limit }: { forecast: ExpenseForecast; charts: Charts; limit: string | null }) {
  const monthDays = forecast.elapsedDays + forecast.remainingDays;
  const max = [minor(forecast.projectedMonthEnd ?? forecast.spent), minor(limit ?? '0'), minor(forecast.spent), 1n].reduce((a, b) => a > b ? a : b);
  const x = (day: number) => 8 + 304 * day / monthDays;
  const y = (amount: bigint) => 158 - Number(amount * 143n / max);
  let running = 0n;
  const points = [`${x(0)},${y(0n)}`];
  for (const bucket of charts.buckets) {
    if (Number(bucket.from.slice(8)) > forecast.elapsedDays) break;
    running += minor(bucket.expense);
    const end = Math.min(Number(bucket.to.slice(8)), forecast.elapsedDays);
    points.push(`${x(end)},${y(running)}`);
  }
  if (points.length === 1 || !points[points.length - 1].startsWith(`${x(forecast.elapsedDays)},`)) points.push(`${x(forecast.elapsedDays)},${y(minor(forecast.spent))}`);
  const actual = `M ${points.join(' L ')}`;
  const projected = forecast.projectedMonthEnd === null ? null : `M ${x(forecast.elapsedDays)} ${y(minor(forecast.spent))} L ${x(monthDays)} ${y(minor(forecast.projectedMonthEnd))}`;
  return <View><Svg width="100%" height={180} viewBox="0 0 320 170">
    {[15, 60, 110, 158].map((line) => <Line key={line} x1={8} y1={line} x2={312} y2={line} stroke="#e5ecf4" strokeWidth={1} />)}
    {limit && <Line x1={8} y1={y(minor(limit))} x2={312} y2={y(minor(limit))} stroke="#ba1a1a" strokeWidth={1.5} strokeDasharray="5 4" />}
    <Path d={actual} fill="none" stroke="#006948" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    {projected && <Path d={projected} fill="none" stroke="#34d399" strokeWidth={2.5} strokeDasharray="5 4" strokeLinecap="round" />}
    <Circle cx={x(forecast.elapsedDays)} cy={y(minor(forecast.spent))} r={4} fill="#006948" />
    {projected && <Circle cx={x(monthDays)} cy={y(minor(forecast.projectedMonthEnd!))} r={4} fill="#34d399" />}
  </Svg><View style={styles.axis}><Text style={styles.axisText}>N1</Text><Text style={styles.axisText}>N{forecast.elapsedDays} (H.tại)</Text><Text style={styles.axisText}>N{monthDays}</Text></View><View style={styles.legend}><Text style={styles.legendActual}>━  Thực tế</Text>{projected && <Text style={styles.legendFuture}>┄  Dự báo</Text>}{limit && <Text style={styles.legendLimit}>┄  Hạn mức</Text>}</View></View>;
}

export default function ExpenseForecastCard() {
  const { session } = useSession();
  const [forecast, setForecast] = useState<ExpenseForecast | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController();
    setForecast(null); setDashboard(null); setCharts(null); setError('');
    Promise.all([getExpenseForecast(session, controller.signal), getDashboard(session, reportMonth(), controller.signal), getCharts(session, reportMonth(), 'week', controller.signal)])
      .then(([foundForecast, foundDashboard, foundCharts]) => { setForecast(foundForecast); setDashboard(foundDashboard); setCharts(foundCharts); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được dự báo.'); });
    return () => controller.abort();
  }, [session]));
  const limit = dashboard?.budget?.limitAmount ?? null;
  const projected = forecast?.projectedMonthEnd;
  const gap = projected && limit ? minor(limit) - minor(projected) : null;
  const pace = projected && limit ? percent(minor(projected), minor(limit)) : 0;
  const neededDaily = gap !== null && gap < 0n && forecast?.remainingDays ? (-gap + BigInt(forecast.remainingDays - 1)) / BigInt(forecast.remainingDays) : null;
  return <View style={styles.wrapper}>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {!forecast && !error && <Text style={common.helper}>Đang tính dự báo...</Text>}
    {forecast && dashboard && charts && <>
      <View style={styles.hero}><View style={styles.heroTop}><Text style={styles.heroLabel}>Dự báo chi tiêu hết Tháng {forecast.month.slice(5)}/{forecast.month.slice(0, 4)}</Text><Text style={styles.heroBadge}>{forecast.confidence === 'INSUFFICIENT_DATA' ? 'Chưa đủ dữ liệu' : forecast.confidence === 'HIGH' ? 'Tin cậy cao' : forecast.confidence === 'MEDIUM' ? 'Tin cậy vừa' : 'Ước tính sớm'}</Text></View>
        <Text style={styles.heroAmount}>{projected == null ? '—' : formatVnd(projected)}</Text><Text style={styles.heroSub}>{projected == null ? `Đã ghi ${formatVnd(forecast.spent)}. Cần ít nhất 3 ngày trong tháng và 2 ngày có chi tiêu để dự báo.` : gap === null ? `Đã ghi ${formatVnd(forecast.spent)} · Chưa đặt ngân sách tổng.` : gap >= 0n ? `Dưới ngân sách dự kiến ${formatVnd(money(gap))} (Ngân sách: ${formatVnd(limit!)})` : `Vượt ngân sách dự kiến ${formatVnd(money(-gap))} (Ngân sách: ${formatVnd(limit!)})`}</Text>
        {projected && limit && <><View style={styles.heroTrackHead}><Text style={styles.heroTrackLabel}>Tiến độ dự báo: {pace}%</Text><Text style={styles.heroTrackLabel}>Hạn mức: {formatVnd(limit)}</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${pace}%` }]} /></View></>}
      </View>
      <Card style={styles.chartCard}><View style={styles.chartHead}><View style={{ flex: 1 }}><Text style={styles.section}>Biểu đồ đường đi chi tiêu</Text><Text style={styles.subtitle}>Dữ liệu thực tế đến ngày {forecast.elapsedDays}/{forecast.month.slice(5)}</Text></View><Text style={styles.dayBadge}>{forecast.elapsedDays + forecast.remainingDays} Ngày</Text></View><SpendingPath forecast={forecast} charts={charts} limit={limit} /></Card>
      <View style={styles.sectionHead}><Text style={styles.section}>Chi tiết theo danh mục</Text><Text style={styles.subtitle}>{charts.categories.length} danh mục</Text></View>
      {charts.categories.length ? charts.categories.map((category) => <Card key={category.categoryId} style={styles.categoryCard}><View style={styles.categoryRow}><View style={styles.categoryIcon}><Ionicons name="pricetag-outline" size={19} color={color.greenDark} /></View><View style={{ flex: 1 }}><Text style={styles.categoryName}>{category.categoryName}</Text><Text style={styles.subtitle}>Đã chi: {formatVnd(category.amount)}</Text></View><Text style={styles.categoryMoney}>{category.percent}%</Text></View><View style={styles.categoryTrack}><View style={[styles.categoryFill, { width: `${percent(minor(category.amount), minor(charts.expenseTotal))}%` }]} /></View></Card>) : <Card><Text style={common.helper}>Chưa có khoản chi theo danh mục trong tháng.</Text></Card>}
      {neededDaily !== null && <View style={styles.tip}><View style={styles.tipIcon}><Ionicons name="bulb-outline" size={22} color={color.white} /></View><View style={{ flex: 1 }}><Text style={styles.tipTitle}>Kịch bản đề xuất hành động</Text><Text style={styles.tipText}>Để dự báo không vượt ngân sách, cần giảm bình quân ít nhất {formatVnd(money(neededDaily))}/ngày trong {forecast.remainingDays} ngày còn lại.</Text></View></View>}
      <Text style={styles.footnote}>Dự báo tổng tháng dựa trên nhịp chi đến hôm nay. Các danh mục phía trên chỉ là số đã ghi, chưa có dự báo riêng.</Text>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 18, paddingBottom: 20 }, hero: { backgroundColor: '#063d32', borderRadius: 18, padding: 20, gap: 12 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 9 }, heroLabel: { flex: 1, color: '#bdebd1', fontSize: 12, fontWeight: '700', lineHeight: 18 }, heroBadge: { color: '#94f2c6', fontSize: 10, backgroundColor: '#07543d', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14 }, heroAmount: { color: color.white, fontSize: 30, fontWeight: '800' }, heroSub: { color: '#c5e7d4', fontSize: 12, lineHeight: 18 }, heroTrackHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, heroTrackLabel: { color: '#b4e2cc', fontSize: 10 }, track: { height: 7, backgroundColor: '#125a43', borderRadius: 5 }, fill: { height: 7, backgroundColor: '#34d399', borderRadius: 5 }, chartCard: { gap: 15 }, chartHead: { flexDirection: 'row', alignItems: 'center', gap: 8 }, section: { color: color.navy, fontSize: 18, fontWeight: '800' }, subtitle: { color: color.muted, fontSize: 11, lineHeight: 17 }, dayBadge: { color: color.greenDark, backgroundColor: '#edf4ff', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, fontSize: 10 }, axis: { flexDirection: 'row', justifyContent: 'space-between' }, axisText: { color: color.muted, fontSize: 10 }, legend: { flexDirection: 'row', gap: 13, borderTopWidth: 1, borderColor: '#e5ecf4', paddingTop: 12, marginTop: 6 }, legendActual: { color: color.greenDark, fontSize: 11 }, legendFuture: { color: '#10b981', fontSize: 11 }, legendLimit: { color: '#ba1a1a', fontSize: 11 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, categoryCard: { gap: 12 }, categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, categoryIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' }, categoryName: { color: color.navy, fontSize: 13, fontWeight: '700' }, categoryMoney: { color: color.greenDark, fontSize: 12, fontWeight: '800' }, categoryTrack: { height: 5, backgroundColor: '#dfe9f7', borderRadius: 5 }, categoryFill: { height: 5, backgroundColor: color.greenDark, borderRadius: 5 }, tip: { flexDirection: 'row', gap: 12, backgroundColor: '#e9fbf4', borderWidth: 1, borderColor: '#c4f1dd', borderRadius: 17, padding: 18 }, tipIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: color.greenDark, alignItems: 'center', justifyContent: 'center' }, tipTitle: { color: color.greenDark, fontSize: 13, fontWeight: '800', marginBottom: 4 }, tipText: { color: color.navy, fontSize: 12, lineHeight: 19 }, footnote: { color: color.muted, fontSize: 10, lineHeight: 15 },
});
