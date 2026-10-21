import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { simulateWhatIf, type WhatIfScenario } from '../api';
import { formatVnd } from '../money';
import { useSession } from '../session';
import { color } from '../theme';
import { Card, Kicker, common } from './Ui';

const moneyPattern = /^-?\d+(?:[.,]\d{1,2})?$/;
const alertLabels = { NEGATIVE_BALANCE: 'Số dư dự kiến âm', OVER_BUDGET: 'Vượt ngân sách', NEAR_BUDGET: 'Đã dùng ít nhất 80% ngân sách' };

export default function WhatIfCard({ month }: { month: string }) {
  const { session } = useSession();
  const [adjustment, setAdjustment] = useState('0');
  const [budget, setBudget] = useState('');
  const [snapshot, setSnapshot] = useState<{ key: string; value: WhatIfScenario } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const key = `${session?.access_token ?? ''}/${month}`;
  const scenario = snapshot?.key === key ? snapshot.value : null;

  async function calculate() {
    setError(''); setSnapshot(null);
    if (!session) return;
    if (!moneyPattern.test(adjustment.trim()) || (budget.trim() && (!moneyPattern.test(budget.trim()) || budget.trim().startsWith('-')))) {
      setError('Nhập số tiền hợp lệ, tối đa 2 chữ số thập phân. Hạn mức giả định phải dương.'); return;
    }
    setBusy(true);
    try {
      const value = await simulateWhatIf(session, month, adjustment.trim().replace(',', '.'),
        budget.trim() ? budget.trim().replace(',', '.') : null);
      setSnapshot({ key, value });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tính được kịch bản.'); }
    finally { setBusy(false); }
  }

  return <View style={styles.wrapper}><Text style={common.sectionTitle}>Nếu tôi thay đổi chi tiêu?</Text>
    <Card style={styles.card}><Kicker>MÔ PHỎNG TẠM THỜI · {month}</Kicker>
      <Text style={common.helper}>Nhập mức tăng hoặc giảm chi tiêu. Bỏ trống hạn mức để dùng ngân sách đã lưu. Khởi động lại ứng dụng sẽ xóa kịch bản.</Text>
      <Text style={common.label}>Điều chỉnh chi tiêu (VND)</Text>
      <TextInput style={common.input} value={adjustment} onChangeText={(value) => { setAdjustment(value); setSnapshot(null); }} placeholder="500000 hoặc -100000" placeholderTextColor={color.muted} />
      <Text style={common.label}>Hạn mức giả định (không bắt buộc)</Text>
      <TextInput style={common.input} value={budget} onChangeText={(value) => { setBudget(value); setSnapshot(null); }} keyboardType="decimal-pad" placeholder="Dùng hạn mức đã lưu" placeholderTextColor={color.muted} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={calculate} style={styles.button}><Text style={styles.buttonText}>{busy ? 'Đang tính...' : 'Xem kịch bản'}</Text></Pressable>
      {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
      {scenario && <><View style={styles.metric}><Text style={styles.label}>CHI TIÊU DỰ KIẾN</Text><Text style={styles.value}>{formatVnd(scenario.projectedExpense)}</Text><Text style={common.helper}>Đã ghi {formatVnd(scenario.actualExpense)} · điều chỉnh {formatVnd(scenario.expenseAdjustment)}</Text></View>
        <View style={styles.metric}><Text style={styles.label}>SỐ DƯ DỰ KIẾN</Text><Text style={styles.value}>{formatVnd(scenario.projectedBalance)}</Text><Text style={common.helper}>Hiện tại {formatVnd(scenario.actualBalance)}</Text></View>
        <View style={styles.metric}><Text style={styles.label}>NGÂN SÁCH CÒN LẠI</Text><Text style={styles.value}>{scenario.projectedBudgetRemaining === null ? '—' : formatVnd(scenario.projectedBudgetRemaining)}</Text><Text style={common.helper}>{scenario.assumedBudgetLimit === null ? 'Chưa có hạn mức' : `Hạn mức ${formatVnd(scenario.assumedBudgetLimit)} · dùng ${scenario.usedPercent}%`}</Text></View>
        <Text style={scenario.alerts.length ? styles.alert : styles.ok}>{scenario.alerts.length ? scenario.alerts.map((item) => alertLabels[item]).join(' · ') : 'Kịch bản chưa phát sinh cảnh báo.'}</Text>
        <Text style={common.helper}>Đây chỉ là phép tính. Không có giao dịch hoặc ngân sách nào được lưu.</Text></>}
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 12, marginBottom: 17 }, card: { gap: 11 },
  button: { backgroundColor: color.green, borderRadius: 12, padding: 13, alignItems: 'center' },
  buttonText: { color: color.white, fontWeight: '800' },
  metric: { backgroundColor: color.canvas, borderColor: color.border, borderWidth: 1, borderRadius: 12, padding: 13, gap: 5 },
  label: { color: color.muted, fontSize: 10, fontWeight: '800' }, value: { color: color.navy, fontSize: 19, fontWeight: '800' },
  alert: { backgroundColor: '#fef2f2', color: '#b91c1c', padding: 10, borderRadius: 9, fontWeight: '700' },
  ok: { backgroundColor: '#ecfdf5', color: color.greenDark, padding: 10, borderRadius: 9, fontWeight: '700' },
});
