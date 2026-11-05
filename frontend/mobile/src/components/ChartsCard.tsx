import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getCharts, type Charts } from '../api';
import { formatVnd } from '../money';
import { useSession } from '../session';
import { color } from '../theme';
import { Card, Kicker, common } from './Ui';

function minor(value: string): bigint { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0') || '0'); }
function width(value: string, maximum: bigint): `${number}%` { return `${maximum === 0n ? 0n : minor(value) * 100n / maximum}%` as `${number}%`; }

export default function ChartsCard({ month }: { month: string }) {
  const { session } = useSession();
  const [granularity, setGranularity] = useState<'week' | 'month'>('week');
  const [snapshot, setSnapshot] = useState<{ key: string; value: Charts } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const key = `${session?.access_token ?? ''}/${month}/${granularity}`;
  const charts = snapshot?.key === key ? snapshot.value : null;
  const error = failure?.key === key ? failure.message : '';
  const maximum = charts?.buckets.reduce((max, item) => {
    const value = minor(item.income) > minor(item.expense) ? minor(item.income) : minor(item.expense);
    return value > max ? value : max;
  }, 0n) ?? 0n;

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    getCharts(session, month, granularity, controller.signal)
      .then((value) => setSnapshot({ key, value }))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setFailure({ key, message: reason instanceof Error ? reason.message : 'Không tải được biểu đồ.' });
      });
    return () => controller.abort();
  }, [session, month, granularity, key]);

  return <View style={styles.wrapper}><Text style={common.sectionTitle}>Cơ cấu và dòng tiền</Text>
    <Card style={styles.card}><Kicker>TRỰC QUAN HÓA · {month}</Kicker><View style={styles.switchRow}>
      <Pressable accessibilityRole="button" onPress={() => setGranularity('week')} style={[styles.switch, granularity === 'week' && styles.active]}><Text style={[styles.switchText, granularity === 'week' && styles.activeText]}>Theo tuần</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setGranularity('month')} style={[styles.switch, granularity === 'month' && styles.active]}><Text style={[styles.switchText, granularity === 'month' && styles.activeText]}>Theo tháng</Text></Pressable></View>
      {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
      {!charts && !error && <Text style={common.helper}>Đang tải biểu đồ...</Text>}
      {charts && <><Text style={styles.heading}>Chi tiêu theo danh mục</Text>
        {charts.categories.length ? charts.categories.map((item) => <View key={item.categoryId} style={styles.row}><View style={styles.line}><Text style={styles.name}>{item.categoryName}</Text><Text style={styles.amount}>{formatVnd(item.amount)} · {item.percent}%</Text></View><View style={styles.track}><View style={[styles.fill, { width: `${item.percent}%` as `${number}%` }]} /></View></View>) : <Text style={common.helper}>Chưa có chi tiêu trong tháng này.</Text>}
        <Text style={styles.heading}>Thu và chi {granularity === 'week' ? 'theo tuần trong tháng' : 'trong 6 tháng'}</Text>
        {maximum === 0n ? <Text style={common.helper}>Chưa có giao dịch trong các kỳ hiển thị.</Text> : charts.buckets.map((item) => <View key={item.from} style={styles.row}><Text style={styles.name}>{granularity === 'week' ? `${item.from.slice(8)}/${item.from.slice(5, 7)}–${item.to.slice(8)}/${item.to.slice(5, 7)}` : item.from.slice(0, 7)}</Text>
          <View style={styles.line}><Text style={styles.amount}>Thu {formatVnd(item.income)}</Text><Text style={styles.amount}>Chi {formatVnd(item.expense)}</Text></View>
          <View style={styles.track}><View style={[styles.fill, { width: width(item.income, maximum) }]} /></View>
          <View style={styles.track}><View style={[styles.expenseFill, { width: width(item.expense, maximum) }]} /></View></View>)}
        <Text style={common.helper}>Thu/chi từ giao dịch đã ghi; chuyển khoản không tính vào biểu đồ.</Text></>}
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 12, marginBottom: 17 }, card: { gap: 12 },
  switchRow: { flexDirection: 'row', backgroundColor: color.canvas, borderRadius: 10, padding: 3, alignSelf: 'flex-start' },
  switch: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }, active: { backgroundColor: color.navy },
  switchText: { color: color.muted, fontSize: 12, fontWeight: '700' }, activeText: { color: color.white },
  heading: { color: color.navy, fontSize: 14, fontWeight: '800', marginTop: 7 }, row: { gap: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, name: { color: color.navy, fontSize: 12, fontWeight: '700' },
  amount: { color: color.muted, fontSize: 11 }, track: { height: 8, backgroundColor: color.border, borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.green, borderRadius: 99 }, expenseFill: { height: '100%', backgroundColor: '#d8913b', borderRadius: 99 },
});
