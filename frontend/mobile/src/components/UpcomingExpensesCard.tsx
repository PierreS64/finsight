import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getUpcomingExpenses, type UpcomingExpenses } from '../api';
import { formatVnd } from '../money';
import { reportDatePlusDays } from '../reportDate';
import { useSession } from '../session';
import { color } from '../theme';
import { Card, Kicker, common } from './Ui';

export default function UpcomingExpensesCard() {
  const { session } = useSession();
  const [from, setFrom] = useState(() => reportDatePlusDays(-30));
  const [to, setTo] = useState(() => reportDatePlusDays(30));
  const [range, setRange] = useState({ from, to });
  const [summary, setSummary] = useState<UpcomingExpenses | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController();
    setError(''); setSummary(null);
    getUpcomingExpenses(session, range.from, range.to, controller.signal).then(setSummary)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được khoản đến hạn.'); });
    return () => controller.abort();
  }, [session, range]));
  function apply() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to
      || (new Date(to).getTime() - new Date(from).getTime()) > 366 * 86400000) {
      setError('Chọn khoảng ngày hợp lệ, tối đa 366 ngày.'); return;
    }
    setRange({ from, to }); setError('');
  }
  return <View style={styles.wrapper}><Text style={common.sectionTitle}>Khoản chi đến hạn</Text><Card style={styles.card}>
    <Kicker>KẾ HOẠCH SẮP TỚI</Kicker><Text style={styles.total}>{summary ? formatVnd(summary.total) : '—'}</Text>
    <View style={styles.range}><View style={styles.date}><Text style={common.label}>Từ ngày</Text><TextInput style={common.input} value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" placeholderTextColor={color.muted} /></View><View style={styles.date}><Text style={common.label}>Đến ngày</Text><TextInput style={common.input} value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" placeholderTextColor={color.muted} /></View></View>
    <Pressable accessibilityRole="button" onPress={apply} style={styles.button}><Text style={styles.buttonText}>Xem khoảng</Text></Pressable>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {!summary && !error && <Text style={common.helper}>Đang tải lịch chi...</Text>}
    {summary && (summary.items.length ? summary.items.map((item) => <View key={`${item.ruleId}-${item.dueOn}`} style={styles.row}><View style={styles.detail}><Text style={styles.name}>{item.name}</Text><Text style={common.helper}>{item.dueOn}{item.overdue ? ' · Quá hạn' : ''}</Text></View><Text style={styles.amount}>{formatVnd(item.amount)}</Text></View>) : <Text style={common.helper}>Không có khoản chi đến hạn trong khoảng đã chọn.</Text>)}
    <Text style={common.helper}>Chỉ tính lịch đang hoạt động và kỳ chưa ghi nhận. Khoản dự kiến chưa trừ số dư.</Text>
  </Card></View>;
}

const styles = StyleSheet.create({ wrapper: { gap: 12, marginBottom: 17 }, card: { gap: 11 }, total: { color: color.greenDark, fontSize: 22, fontWeight: '800' }, range: { flexDirection: 'row', gap: 9 }, date: { flex: 1, gap: 5 }, button: { alignSelf: 'flex-start', backgroundColor: color.greenLight, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 }, buttonText: { color: color.greenDark, fontWeight: '800' }, row: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderColor: color.border, paddingTop: 10 }, detail: { flex: 1, gap: 3 }, name: { color: color.navy, fontWeight: '800' }, amount: { color: color.navy, fontWeight: '800' } });
