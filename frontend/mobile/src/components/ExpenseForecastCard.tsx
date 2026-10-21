import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getExpenseForecast, type ExpenseForecast } from '../api';
import { formatVnd } from '../money';
import { useSession } from '../session';
import { color } from '../theme';
import { Card, Kicker, common } from './Ui';

const confidenceLabels = { HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp', INSUFFICIENT_DATA: 'Chưa đủ dữ liệu' };

export default function ExpenseForecastCard() {
  const { session } = useSession();
  const [forecast, setForecast] = useState<ExpenseForecast | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    getExpenseForecast(session, controller.signal)
      .then(setForecast)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được dự báo.');
      });
    return () => controller.abort();
  }, [session]);
  return <View style={styles.wrapper}><Text style={common.sectionTitle}>Dự báo cuối tháng</Text><Card style={styles.card}>
    <Kicker>ƯỚC TÍNH TỪ GIAO DỊCH · {forecast?.month ?? 'THÁNG HIỆN TẠI'}</Kicker>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {!forecast && !error && <Text style={common.helper}>Đang tính dự báo...</Text>}
    {forecast && (forecast.projectedMonthEnd === null
      ? <Text style={common.helper}>Chưa đủ dữ liệu: cần ít nhất 3 ngày trong tháng và 2 ngày có chi tiêu. Đã ghi {formatVnd(forecast.spent)}.</Text>
      : <><View style={styles.metric}><Text style={styles.label}>CHI ĐÃ GHI</Text><Text style={styles.value}>{formatVnd(forecast.spent)}</Text></View>
        <View style={styles.metric}><Text style={styles.label}>DỰ KIẾN CUỐI THÁNG</Text><Text style={styles.value}>{formatVnd(forecast.projectedMonthEnd)}</Text></View>
        <View style={styles.metric}><Text style={styles.label}>CHI DỰ KIẾN PHẦN CÒN LẠI</Text><Text style={styles.value}>{formatVnd(forecast.expectedAdditional ?? '0')}</Text></View>
        <Text style={common.helper}>Trung bình {formatVnd(forecast.averageDaily ?? '0')}/ngày trên {forecast.elapsedDays} ngày, còn {forecast.remainingDays} ngày. Độ tin cậy: {confidenceLabels[forecast.confidence]}. Đây không phải số tiền an toàn để chi.</Text></>)}
  </Card></View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 12, marginBottom: 17 }, card: { gap: 11 },
  metric: { padding: 13, backgroundColor: color.canvas, borderColor: color.border, borderWidth: 1, borderRadius: 12, gap: 5 },
  label: { color: color.muted, fontSize: 10, fontWeight: '800' }, value: { color: color.navy, fontSize: 20, fontWeight: '800' },
});
