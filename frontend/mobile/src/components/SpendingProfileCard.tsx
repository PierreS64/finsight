import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getSpendingProfile, type SpendingProfile } from '../api';
import { formatVnd } from '../money';
import { useSession } from '../session';
import { color } from '../theme';
import { Card, Kicker, common } from './Ui';

const trendLabels = { INCREASE: 'Tăng', DECREASE: 'Giảm', STABLE: 'Ổn định', INSUFFICIENT_DATA: 'Chưa đủ dữ liệu' };

export default function SpendingProfileCard({ month }: { month: string }) {
  const { session } = useSession();
  const [snapshot, setSnapshot] = useState<{ key: string; value: SpendingProfile } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const key = `${session?.access_token ?? ''}/${month}`;
  const profile = snapshot?.key === key ? snapshot.value : null;
  const error = failure?.key === key ? failure.message : '';

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    getSpendingProfile(session, month, controller.signal)
      .then((value) => setSnapshot({ key, value }))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setFailure({ key, message: reason instanceof Error ? reason.message : 'Không tải được hồ sơ chi tiêu.' });
      });
    return () => controller.abort();
  }, [session, month, key]);

  return <View style={styles.wrapper}><Text style={common.sectionTitle}>Nhịp chi tiêu của bạn</Text>
    <Card style={styles.card}><Kicker>HỒ SƠ HÀNH VI · {month}</Kicker>
      {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
      {!profile && !error && <Text style={common.helper}>Đang tính các chỉ số...</Text>}
      {profile && <><Text style={common.helper}>Dựa trên {profile.elapsedDays} ngày đã trôi qua trong tháng. Chỉ số thiếu dữ liệu sẽ để trống.</Text>
        <View style={styles.grid}>
          <View style={styles.metric}><Text style={styles.label}>TỶ LỆ TIẾT KIỆM</Text><Text style={styles.value}>{profile.savingsRatePercent === null ? '—' : `${profile.savingsRatePercent}%`}</Text><Text style={styles.help}>{profile.savingsRatePercent === null ? 'Cần có thu nhập' : '(Thu − chi) / thu'}</Text></View>
          <View style={styles.metric}><Text style={styles.label}>CHI NHIỀU NHẤT</Text><Text style={styles.value}>{profile.topExpenseCategory?.categoryName ?? '—'}</Text><Text style={styles.help}>{profile.topExpenseCategory ? formatVnd(profile.topExpenseCategory.amount) : 'Chưa có chi tiêu'}</Text></View>
          <View style={styles.metric}><Text style={styles.label}>TRUNG BÌNH / NGÀY</Text><Text style={styles.value}>{profile.averageDailyExpense === null ? '—' : formatVnd(profile.averageDailyExpense)}</Text><Text style={styles.help}>{profile.elapsedDays} ngày trong kỳ tính</Text></View>
          <View style={styles.metric}><Text style={styles.label}>ĐỘ ỔN ĐỊNH</Text><Text style={styles.value}>{profile.stabilityScore === null ? '—' : `${profile.stabilityScore}/100`}</Text><Text style={styles.help}>{profile.stabilityScore === null ? 'Cần từ 7 ngày và có chi tiêu' : 'Cao hơn khi các ngày ít dao động'}</Text></View>
          <View style={styles.metric}><Text style={styles.label}>XU HƯỚNG SO VỚI {profile.previousMonth}</Text><Text style={styles.value}>{trendLabels[profile.trend]}</Text><Text style={styles.help}>{profile.trendPercent === null ? 'Thiếu mức chi tháng trước' : `${profile.trendPercent}% theo trung bình/ngày`}</Text></View>
        </View><Text style={styles.note}>Khoản thu, hoàn tiền ghi là thu nhập và chuyển khoản không tính vào chi tiêu. Tháng hiện tại chỉ tính đến hôm nay.</Text>
      </>}
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 12, marginBottom: 17 }, card: { gap: 12 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  metric: { width: '47%', minWidth: 135, flexGrow: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: color.border, backgroundColor: color.canvas, gap: 6 },
  label: { color: color.muted, fontSize: 10, fontWeight: '800' }, value: { color: color.navy, fontSize: 17, fontWeight: '800' },
  help: { color: color.muted, fontSize: 11, lineHeight: 15 }, note: { color: color.muted, fontSize: 11, lineHeight: 16 },
});
