import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { deleteGoal, getGoals, saveGoal, type FinancialGoal } from '../../api';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../../components/Ui';
import { formatVnd } from '../../money';
import { useSession } from '../../session';
import { color } from '../../theme';

const validMoney = (value: string, positive: boolean) => /^\d{1,17}(?:[.,]\d{1,2})?$/.test(value.trim()) && (!positive || /[1-9]/.test(value));
const barWidth = (value: string): `${number}%` => `${Math.min(100, Math.max(0, Number.parseFloat(value) || 0))}%` as `${number}%`;

export default function Goals() {
  const { session } = useSession();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [note, setNote] = useState('');

  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController();
    getGoals(session, controller.signal).then((result) => { setGoals(result); setLoaded(true); setError(''); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được mục tiêu.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session]));

  function reset() { setEditingId(null); setName(''); setTargetAmount(''); setSavedAmount('0'); setTargetDate(''); setNote(''); }
  function edit(goal: FinancialGoal) { setEditingId(goal.id); setName(goal.name); setTargetAmount(goal.targetAmount); setSavedAmount(goal.savedAmount); setTargetDate(goal.targetDate ?? ''); setNote(goal.note ?? ''); setMessage('Đang sửa mục tiêu bên dưới.'); }

  async function save() {
    if (!session || busy) return;
    if (!name.trim() || !validMoney(targetAmount, true) || !validMoney(savedAmount, false)
      || (targetDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate))) {
      setMessage('Nhập tên, số tiền hợp lệ và ngày dạng YYYY-MM-DD.'); return;
    }
    setBusy(true); setMessage('');
    try {
      const goal = await saveGoal(session, { name: name.trim(), targetAmount: targetAmount.replace(',', '.'), savedAmount: savedAmount.replace(',', '.'), targetDate: targetDate || null, note: note.trim() || null }, editingId ?? undefined);
      setGoals((current) => editingId ? current.map((item) => item.id === editingId ? goal : item) : [goal, ...current]);
      reset(); setMessage('Đã lưu mục tiêu tiết kiệm.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không lưu được mục tiêu.'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!session || busy) return;
    setBusy(true); setMessage('');
    try { await deleteGoal(session, id); setGoals((current) => current.filter((item) => item.id !== id)); if (editingId === id) reset(); setDeletingId(null); setMessage('Đã xóa mục tiêu.'); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không xóa được mục tiêu.'); }
    finally { setBusy(false); }
  }

  return <Page><Brand subtitle="KẾ HOẠCH TÀI CHÍNH" /><Text style={[common.title, styles.title]}>Mục tiêu tiết kiệm</Text><Text style={common.subtitle}>Số tiền đã dành là giá trị bạn tự theo dõi, không tự thay đổi số dư tài khoản.</Text>
    {error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!loaded && <Text style={common.helper}>Đang tải mục tiêu...</Text>}
    {loaded && goals.length === 0 && !error && <Card style={styles.empty}><Text style={common.sectionTitle}>Chưa có mục tiêu</Text><Text style={common.helper}>Thêm mục tiêu đầu tiên để theo dõi kế hoạch tiết kiệm.</Text></Card>}
    {goals.map((goal) => <Card key={goal.id} style={styles.goalCard}><View style={styles.row}><Text style={styles.goalName}>{goal.name}</Text><Text style={styles.percent}>{goal.progressPercent}%</Text></View><Text style={common.helper}>{formatVnd(goal.savedAmount)} / {formatVnd(goal.targetAmount)}</Text><View style={styles.track}><View style={[styles.fill, { width: barWidth(goal.progressPercent) }]} /></View><View style={styles.row}><Text style={styles.detail}>{goal.achieved ? 'Đã đạt mục tiêu' : goal.overdue ? 'Đã qua hạn' : `Còn ${formatVnd(goal.remainingAmount)}`}</Text><Text style={styles.detail}>{goal.targetDate ? `Hạn ${goal.targetDate.split('-').reverse().join('/')}` : 'Không đặt hạn'}</Text></View>{!!goal.note && <Text style={common.helper}>{goal.note}</Text>}<View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => edit(goal)}><Text style={styles.link}>Sửa</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeletingId(goal.id)}><Text style={styles.delete}>Xóa</Text></Pressable></View>{deletingId === goal.id && <View style={styles.confirm}><Text style={common.helper}>Xóa mục tiêu này?</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => remove(goal.id)}><Text style={styles.delete}>Xác nhận xóa</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeletingId(null)}><Text style={styles.link}>Hủy</Text></Pressable></View>}</Card>)}
    <Text style={styles.formTitle}>{editingId ? 'Sửa mục tiêu' : 'Tạo mục tiêu'}</Text><Card style={styles.form}><Text style={common.label}>Tên mục tiêu</Text><TextInput style={common.input} value={name} onChangeText={setName} maxLength={100} placeholder="Ví dụ: Quỹ học tập" placeholderTextColor={color.muted} /><Text style={common.label}>Số tiền đích (VND)</Text><TextInput style={common.input} value={targetAmount} onChangeText={setTargetAmount} keyboardType="decimal-pad" placeholder="Ví dụ: 10000000" placeholderTextColor={color.muted} /><Text style={common.label}>Đã dành (VND)</Text><TextInput style={common.input} value={savedAmount} onChangeText={setSavedAmount} keyboardType="decimal-pad" /><Text style={common.label}>Ngày muốn đạt (YYYY-MM-DD, tùy chọn)</Text><TextInput style={common.input} value={targetDate} onChangeText={setTargetDate} keyboardType="numbers-and-punctuation" placeholder="2027-12-31" placeholderTextColor={color.muted} /><Text style={common.label}>Ghi chú (tùy chọn)</Text><TextInput style={[common.input, styles.note]} value={note} onChangeText={setNote} multiline maxLength={500} /><PrimaryButton onPress={save} disabled={busy || !name.trim() || !targetAmount.trim()}>{busy ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm mục tiêu'}</PrimaryButton>{editingId && <SecondaryButton onPress={reset}>Hủy chỉnh sửa</SecondaryButton>}</Card>
    {!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}
  </Page>;
}

const styles = StyleSheet.create({ title: { marginTop: 28 }, empty: { marginTop: 18, gap: 8 }, goalCard: { marginTop: 13, gap: 12 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, goalName: { color: color.navy, fontSize: 16, fontWeight: '800', flex: 1 }, percent: { color: color.greenDark, fontWeight: '800' }, detail: { color: color.muted, fontSize: 11 }, track: { height: 8, backgroundColor: color.border, borderRadius: 8, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: color.greenDark, borderRadius: 8 }, actions: { flexDirection: 'row', gap: 18 }, link: { color: color.greenDark, fontWeight: '800' }, delete: { color: '#b91c1c', fontWeight: '800' }, confirm: { padding: 11, borderRadius: 9, backgroundColor: '#fff7f7', gap: 8 }, formTitle: { color: color.navy, fontSize: 18, fontWeight: '800', marginTop: 29, marginBottom: 12 }, form: { gap: 11 }, note: { minHeight: 70, textAlignVertical: 'top' } });
