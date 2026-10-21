import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { getSafeToSpend, type SafeToSpend } from '../api';
import { formatVnd } from '../money';
import { useSession } from '../session';
import { color } from '../theme';
import { Card, Kicker, common } from './Ui';

export default function SafeToSpendCard() {
  const { session } = useSession();
  const [result, setResult] = useState<SafeToSpend | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setResult(null); setError('');
    getSafeToSpend(session, controller.signal).then(setResult)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu.'); });
    return () => controller.abort();
  }, [session]));
  return <View style={styles.wrapper}><Text style={common.sectionTitle}>Mức chi an toàn</Text><Card style={styles.card}>
    <Kicker>NGÂN SÁCH MỖI NGÀY · {result?.month ?? 'THÁNG NÀY'}</Kicker>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {!result && !error && <Text style={common.helper}>Đang tính mức chi...</Text>}
    {result && (result.status === 'NO_BUDGET' ? <Text style={common.helper}>Chưa đặt ngân sách tổng tháng. Hãy đặt hạn mức để tính mức chi mỗi ngày.</Text>
      : <><Text style={styles.amount}>{formatVnd(result.safePerDay ?? '0')}<Text style={styles.perDay}> / ngày</Text></Text>
        <Text style={common.helper}>{result.status === 'BUDGET_EXHAUSTED' ? 'Ngân sách đã cạn hoặc vượt hạn mức.' : result.status === 'UPCOMING_EXCEEDS_BUDGET' ? 'Khoản chi đến hạn đã dùng hết ngân sách còn lại.' : `Còn ${result.remainingDays} ngày tính cả hôm nay.`}</Text>
        <View style={styles.details}><Text style={styles.detail}>Ngân sách còn: {formatVnd(result.budgetRemaining ?? '0')}</Text><Text style={styles.detail}>Khoản định kỳ chưa ghi: {formatVnd(result.upcomingExpense)}</Text><Text style={styles.detail}>Còn để phân bổ: {formatVnd(result.availableAfterReservations ?? '0')}</Text></View>
        <Text style={common.helper}>Lấy phần còn để phân bổ, tối thiểu 0, chia cho {result.remainingDays} ngày. Kỳ đã ghi nhận không bị trừ thêm lần nữa.</Text></>)}
  </Card></View>;
}

const styles = StyleSheet.create({ wrapper: { gap: 12, marginBottom: 17 }, card: { gap: 11 }, amount: { color: color.greenDark, fontSize: 26, fontWeight: '800' }, perDay: { color: color.muted, fontSize: 13 }, details: { backgroundColor: color.greenLight, borderRadius: 12, padding: 13, gap: 6 }, detail: { color: color.navy, fontSize: 12, fontWeight: '700' } });
