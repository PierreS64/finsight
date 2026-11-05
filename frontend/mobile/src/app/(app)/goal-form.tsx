import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getGoals, saveGoal } from '../../api';
import { Card, Page, PrimaryButton, common } from '../../components/Ui';
import { formatVnd, sumBalances } from '../../money';
import { useSession } from '../../session';
import { color } from '../../theme';

const green = '#006948';
const validMoney = (value: string, positive: boolean) => /^\d{1,17}(?:[.,]\d{1,2})?$/.test(value.trim()) && (!positive || /[1-9]/.test(value));
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

export default function GoalForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useSession();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('0');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session || !id) return;
    const controller = new AbortController();
    getGoals(session, controller.signal).then((items) => {
      if (controller.signal.aborted) return;
      const goal = items.find((item) => item.id === id);
      if (!goal) { setError('Không tìm thấy mục tiêu.'); return; }
      setName(goal.name); setTarget(goal.targetAmount); setSaved(goal.savedAmount); setDate(goal.targetDate || ''); setNote(goal.note || ''); setLoaded(true);
    }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được mục tiêu.'); });
    return () => controller.abort();
  }, [session, id]));

  async function save() {
    if (!session || busy) return;
    if (!name.trim() || !validMoney(target, true) || !validMoney(saved, false) || (date && !validDate(date))) { setError('Nhập tên, số tiền hợp lệ và ngày dạng YYYY-MM-DD.'); return; }
    setBusy(true); setError('');
    try {
      const goal = await saveGoal(session, { name: name.trim(), targetAmount: target.replace(',', '.'), savedAmount: saved.replace(',', '.'), targetDate: date || null, note: note.trim() || null }, id);
      router.replace({ pathname: '/goal-detail', params: { id: goal.id } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được mục tiêu.'); }
    finally { setBusy(false); }
  }

  return <Page style={styles.page}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color="#121c26" /></Pressable><Text style={styles.heading}>{id ? 'Sửa mục tiêu tiết kiệm' : 'Tạo mục tiêu tiết kiệm'}</Text><Pressable accessibilityRole="button" disabled={busy} onPress={save}><Text style={styles.save}>Lưu</Text></Pressable></View>
    <View style={styles.hero}><Text style={styles.heroLabel}>Số tiền mục tiêu</Text><View style={styles.heroAmount}><TextInput accessibilityLabel="Số tiền mục tiêu" value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#a8d9c5" style={styles.targetInput} /><Text style={styles.currency}>₫</Text></View><View style={styles.presets}>{[['+10tr', '10000000'], ['20tr', '20000000'], ['+50tr', '50000000'], ['+100tr', '100000000']].map(([label, amount]) => <Pressable key={label} accessibilityRole="button" onPress={() => setTarget(label.startsWith('+') ? sumBalances([validMoney(target, false) ? target.replace(',', '.') : '0', amount]) : amount)} style={[styles.preset, target === amount && styles.presetSelected]}><Text style={[styles.presetText, target === amount && { color: green }]}>{label}</Text></Pressable>)}</View></View>
    <Card style={styles.card}><Text style={styles.label}>Tên mục tiêu</Text><TextInput value={name} onChangeText={setName} maxLength={100} placeholder="Tên mục tiêu" placeholderTextColor="#6d7a72" style={styles.input} /></Card>
    <Card style={styles.card}><Text style={styles.label}>Số tiền khởi tạo ban đầu</Text><TextInput value={saved} onChangeText={setSaved} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#6d7a72" style={styles.input} /><Text style={styles.helper}>Số dư hiện có sẵn cho mục tiêu này, do bạn tự theo dõi.</Text><Text style={styles.label}>Thời hạn mong muốn</Text><TextInput value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" placeholder="YYYY-MM-DD" placeholderTextColor="#6d7a72" style={styles.input} /><Text style={styles.helper}>Ngày hoàn thành mục tiêu, có thể để trống.</Text></Card>
    <Card style={styles.card}><Text style={styles.label}>Ghi chú</Text><TextInput value={note} onChangeText={setNote} multiline maxLength={500} placeholder="Ghi chú cho mục tiêu" placeholderTextColor="#6d7a72" style={[styles.input, styles.note]} /></Card>
    {!!target && validMoney(target, true) && <Text style={styles.preview}>Mục tiêu: {formatVnd(target.replace(',', '.'))}</Text>}
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!loaded && <Text style={common.helper}>Đang tải mục tiêu...</Text>}
    <PrimaryButton onPress={save} disabled={busy || !loaded}>{id ? 'Lưu thay đổi' : 'Bắt đầu tích lũy'}</PrimaryButton>
  </Page>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 7, paddingHorizontal: 16, gap: 15, paddingBottom: 40 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }, heading: { color: '#121c26', fontSize: 17, fontWeight: '800' }, save: { color: green, fontSize: 15, fontWeight: '800' },
  hero: { backgroundColor: green, borderRadius: 15, padding: 19 }, heroLabel: { color: color.white, fontSize: 15, fontWeight: '800' }, heroAmount: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderColor: '#68dba9', marginTop: 12 }, targetInput: { flex: 1, color: color.white, fontSize: 32, fontWeight: '800', paddingVertical: 7 }, currency: { color: '#68dba9', fontSize: 25, fontWeight: '800' }, presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 }, preset: { backgroundColor: '#ffffff35', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 19, borderWidth: 1, borderColor: '#ffffff55' }, presetSelected: { backgroundColor: color.white }, presetText: { color: color.white, fontSize: 11, fontWeight: '800' },
  card: { gap: 10, padding: 18 }, label: { color: '#3d4a42', fontSize: 13, fontWeight: '700' }, input: { minHeight: 52, borderWidth: 1, borderColor: '#bccac0', borderRadius: 11, paddingHorizontal: 13, color: '#121c26', backgroundColor: color.white, fontSize: 15 }, helper: { color: '#6d7a72', fontSize: 11, marginBottom: 9 }, note: { minHeight: 75, textAlignVertical: 'top', paddingTop: 11 }, preview: { color: green, fontWeight: '700', fontSize: 12 },
});
