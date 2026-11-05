import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getFinancialHealth, type FinancialHealth } from '../api';
import { useSession } from '../session';
import { color } from '../theme';
import { Card, Kicker, common } from './Ui';

export default function FinancialHealthCard() {
  const { session } = useSession();
  const [snapshot, setSnapshot] = useState<{ key: string; value: FinancialHealth } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const key = session?.access_token ?? '';
  const health = snapshot?.key === key ? snapshot.value : null;
  const error = failure?.key === key ? failure.message : '';

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    getFinancialHealth(session, controller.signal).then((value) => setSnapshot({ key, value }))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setFailure({ key, message: reason instanceof Error ? reason.message : 'Không tải được điểm sức khỏe tài chính.' });
      });
    return () => controller.abort();
  }, [session, key]);

  return <View style={styles.wrapper}><Text style={common.sectionTitle}>Sức khỏe tài chính</Text><Card style={styles.card}><Kicker>ĐIỂM THÁNG HIỆN TẠI</Kicker>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {!health && !error && <Text style={common.helper}>Đang tính điểm...</Text>}
    {health && <><Text style={styles.score}>{health.score === null ? '—' : `${health.score}/100`}</Text>
      <Text style={common.helper}>{health.status === 'COMPLETE' ? 'Đủ ba thành phần' : health.status === 'PARTIAL' ? `Tạm tính · có dữ liệu cho ${health.coveragePercent}% trọng số` : 'Chưa đủ dữ liệu để tính điểm'}</Text>
      {health.components.map((part) => <View key={part.key} style={styles.part}><View style={styles.row}><Text style={styles.name}>{part.label}</Text><Text style={styles.points}>{part.points === null ? '—' : `${part.points}/${part.weight}`}</Text></View><Text style={common.helper}>{part.explanation}</Text></View>)}
      <Text style={styles.note}>Điểm tham khảo từ dữ liệu bạn tự nhập, không phải đánh giá tín dụng. Khi thiếu thành phần, điểm chỉ là tạm tính.</Text></>}
  </Card></View>;
}

const styles = StyleSheet.create({ wrapper: { gap: 12, marginBottom: 17 }, card: { gap: 12 }, score: { color: color.greenDark, fontSize: 30, fontWeight: '800' }, part: { borderWidth: 1, borderColor: color.border, borderRadius: 12, padding: 12, gap: 6 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, name: { color: color.navy, fontWeight: '800' }, points: { color: color.greenDark, fontWeight: '800' }, note: { color: color.muted, fontSize: 11, lineHeight: 16 } });
