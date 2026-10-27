import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getSpendingTrends, type SpendingTrends, type TrendComparison } from '../api';
import { formatVnd } from '../money';
import { useSession } from '../session';
import { color } from '../theme';
import { Card, Kicker, common } from './Ui';

const labels = { INCREASE: 'Tăng', DECREASE: 'Giảm', STABLE: 'Ổn định', INSUFFICIENT_DATA: 'Chưa đủ dữ liệu' };

export default function SpendingTrendsCard({ month }: { month: string }) {
  const { session } = useSession();
  const [snapshot, setSnapshot] = useState<{ key: string; value: SpendingTrends } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const key = `${session?.access_token ?? ''}/${month}`;
  const trends = snapshot?.key === key ? snapshot.value : null;
  const error = failure?.key === key ? failure.message : '';
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    getSpendingTrends(session, month, controller.signal)
      .then((value) => setSnapshot({ key, value }))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setFailure({ key, message: reason instanceof Error ? reason.message : 'Không tải được xu hướng.' });
      });
    return () => controller.abort();
  }, [session, month, key]);

  function comparison(title: string, item: TrendComparison) {
    return <View style={styles.metric}><Text style={styles.label}>{title}</Text><Text style={styles.value}>{labels[item.direction]}</Text>
      <Text style={styles.change}>{formatVnd(item.changeAmount)}{item.changePercent === null ? ' · thiếu mức chi kỳ trước' : ` · ${item.changePercent}%`}</Text>
      <Text style={common.helper}>Kỳ này {item.from} – {item.to}: {formatVnd(item.expense)}</Text>
      <Text style={common.helper}>Kỳ trước {item.previousFrom} – {item.previousTo}: {formatVnd(item.previousExpense)}</Text></View>;
  }
  return <View style={styles.wrapper}><Text style={common.sectionTitle}>Xu hướng chi tiêu</Text><Card style={styles.card}>
    <Kicker>SO SÁNH KỲ · {month}</Kicker>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {!trends && !error && <Text style={common.helper}>Đang so sánh các kỳ...</Text>}
    {trends && <>{comparison('SO VỚI TUẦN TRƯỚC', trends.week)}{comparison('SO VỚI THÁNG TRƯỚC', trends.monthComparison)}
      <Text style={common.helper}>Tăng hoặc giảm từ 10%; kỳ hiện tại chưa kết thúc được so với phần tương ứng của kỳ trước. Không tính khoản thu và chuyển khoản.</Text></>}
  </Card></View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 12, marginBottom: 17 }, card: { gap: 11 },
  metric: { padding: 13, backgroundColor: color.canvas, borderColor: color.border, borderWidth: 1, borderRadius: 12, gap: 5 },
  label: { color: color.muted, fontSize: 10, fontWeight: '800' }, value: { color: color.navy, fontSize: 20, fontWeight: '800' },
  change: { color: color.greenDark, fontSize: 13, fontWeight: '700' },
});
