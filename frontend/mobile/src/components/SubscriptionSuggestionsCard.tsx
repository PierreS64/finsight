import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { getSubscriptionSuggestions, type SubscriptionSuggestions } from '../api';
import { formatVnd } from '../money';
import { useSession } from '../session';
import { color } from '../theme';
import { Card, Kicker, common } from './Ui';

export default function SubscriptionSuggestionsCard() {
  const { session } = useSession();
  const [data, setData] = useState<SubscriptionSuggestions | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController();
    getSubscriptionSuggestions(session, controller.signal).then((result) => { setData(result); setError(''); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được gợi ý đăng ký.'); });
    return () => controller.abort();
  }, [session]));
  return <Card style={styles.card}><Kicker>TỪ LỊCH SỬ CHI TIÊU</Kicker><Text style={styles.title}>Gợi ý đăng ký hàng tháng</Text>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {!data && !error && <Text style={common.helper}>Đang kiểm tra lịch sử...</Text>}
    {data && (data.items.length ? data.items.map((item) => <View key={`${item.accountId}-${item.categoryId}-${item.merchantId ?? item.label}`} style={styles.item}><View style={styles.row}><Text style={styles.name}>{item.label}</Text><Text style={styles.amount}>{formatVnd(item.estimatedAmount)}</Text></View><Text style={common.helper}>{item.observedPayments} khoản chi gần nhất · dự kiến {item.nextExpectedOn}</Text></View>) : <Text style={common.helper}>Chưa có ba khoản chi hàng tháng đủ đều để gợi ý. Bạn vẫn có thể tạo lịch thủ công bên dưới.</Text>)}
    <Text style={common.helper}>Đây chỉ là gợi ý từ lịch sử. Hãy kiểm tra trước khi tự tạo lịch; FinSight không tự ghi khoản chi mới.</Text>
  </Card>;
}

const styles = StyleSheet.create({ card: { gap: 11, marginTop: 16 }, title: { color: color.navy, fontSize: 17, fontWeight: '800' }, item: { borderWidth: 1, borderColor: color.border, borderRadius: 12, padding: 12, gap: 5 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, name: { color: color.navy, fontWeight: '800', flex: 1 }, amount: { color: color.greenDark, fontWeight: '800' } });
