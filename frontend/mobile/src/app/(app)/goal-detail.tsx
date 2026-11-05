import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { deleteGoal, getGoals, saveGoal, type FinancialGoal } from '../../api';
import { Card, Page, PrimaryButton, common } from '../../components/Ui';
import { formatVnd, sumBalances } from '../../money';
import { reportDate } from '../../reportDate';
import { useSession } from '../../session';
import { color } from '../../theme';

const green = '#006948';
const money = (value: string): bigint => {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  return match ? BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0') : 0n;
};
const validPositive = (value: string) => /^\d{1,17}(?:[.,]\d{1,2})?$/.test(value.trim()) && money(value) > 0n;

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [goal, setGoal] = useState<FinancialGoal | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState<'amount' | 'delete' | null>(null);
  const [kind, setKind] = useState<'add' | 'withdraw'>('add');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setLoaded(false); setError('');
    getGoals(session, controller.signal).then((items) => { if (!controller.signal.aborted) { setGoal(items.find((item) => item.id === id) || null); setLoaded(true); } })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được mục tiêu.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session, id]));

  async function updateAmount() {
    if (!session || !goal || busy) return;
    if (!validPositive(amount)) { setError('Số tiền phải lớn hơn 0.'); return; }
    if (kind === 'withdraw' && money(amount) > money(goal.savedAmount)) { setError('Không thể rút nhiều hơn khoản đã tích lũy.'); return; }
    setBusy(true); setError('');
    try {
      const change = kind === 'withdraw' ? `-${amount.replace(',', '.')}` : amount.replace(',', '.');
      const updated = await saveGoal(session, { name: goal.name, targetAmount: goal.targetAmount, savedAmount: sumBalances([goal.savedAmount, change]), targetDate: goal.targetDate, note: goal.note }, goal.id);
      setGoal(updated); setAmount(''); setSheet(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được tích lũy.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!session || !goal || busy) return;
    setBusy(true); setError('');
    try { await deleteGoal(session, goal.id); setSheet(null); router.replace('/goals'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không xóa được mục tiêu.'); }
    finally { setBusy(false); }
  }

  const days = goal?.targetDate ? Math.ceil((Date.parse(`${goal.targetDate}T00:00:00Z`) - Date.parse(`${reportDate()}T00:00:00Z`)) / 86400000) : null;
  return <Page style={styles.page}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color="#121c26" /></Pressable><Text style={styles.title}>Chi tiết mục tiêu</Text><View style={styles.headerActions}><Pressable accessibilityRole="button" accessibilityLabel="Sửa mục tiêu" onPress={() => router.push({ pathname: '/goal-form', params: { id } })}><Ionicons name="create-outline" size={23} color="#3d4a42" /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Xóa mục tiêu" onPress={() => setSheet('delete')}><Ionicons name="ellipsis-vertical" size={23} color="#3d4a42" /></Pressable></View></View>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!loaded && <Text style={common.helper}>Đang tải mục tiêu...</Text>}{loaded && !goal && <Text style={common.error}>Không tìm thấy mục tiêu.</Text>}
    {goal && <><View style={styles.hero}><Text style={styles.goalName}>{goal.name}</Text><View style={styles.divider} /><View style={styles.progressRow}><View style={styles.ring}><Text style={styles.ringPercent}>{goal.progressPercent}%</Text><Text style={styles.ringText}>đạt được</Text></View><View style={styles.amounts}><Text style={styles.heroLabel}>Đã tích lũy</Text><Text style={styles.heroAmount}>{formatVnd(goal.savedAmount)}</Text><View style={styles.divider} /><Text style={styles.heroLabel}>Mục tiêu: {formatVnd(goal.targetAmount)}</Text></View></View><View style={styles.divider} /><View style={styles.timeline}><View style={styles.timelineItem}><Text style={styles.heroLabel}>Dự kiến hoàn thành</Text><Text style={styles.timelineValue}>{goal.targetDate ? goal.targetDate.split('-').reverse().join('/') : 'Không đặt hạn'}</Text></View><View style={styles.timelineItem}><Text style={styles.heroLabel}>Thời gian còn lại</Text><Text style={styles.timelineValue}>{days === null ? '—' : `${Math.max(0, days)} ngày`}</Text></View></View><View style={styles.tip}><Text style={styles.tipText}>{goal.achieved ? 'Đã đạt mục tiêu.' : `Còn ${formatVnd(goal.remainingAmount)} để đạt mục tiêu.`}</Text></View></View>
      <View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => { setKind('add'); setSheet('amount'); }} style={styles.add}><Ionicons name="add-circle-outline" size={22} color={color.white} /><Text style={styles.addText}>Nạp thêm tiền</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setKind('withdraw'); setSheet('amount'); }} style={styles.withdraw}><Ionicons name="swap-horizontal-outline" size={22} color="#3d4a42" /><Text style={styles.withdrawText}>Rút / Chuyển</Text></Pressable></View>
      {!!goal.note && <Card style={styles.noteCard}><Text style={styles.noteTitle}>Ghi chú</Text><Text style={common.helper}>{goal.note}</Text></Card>}
      <Text style={styles.disclosure}>Khoản tích lũy được bạn tự theo dõi và không thay đổi số dư tài khoản.</Text>
    </>}
    <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={() => setSheet(null)}><View style={styles.overlay}><Pressable style={styles.scrim} onPress={() => setSheet(null)} /><View style={styles.sheet}><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{sheet === 'delete' ? 'Xóa mục tiêu?' : 'Cập nhật tích lũy'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={() => setSheet(null)}><Ionicons name="close" size={22} color="#3d4a42" /></Pressable></View>{sheet === 'delete' ? <><Text style={common.helper}>Xóa mục tiêu {goal?.name}?</Text><Pressable accessibilityRole="button" disabled={busy} onPress={remove} style={styles.dangerButton}><Text style={styles.addText}>Xác nhận xóa</Text></Pressable></> : <><Text style={styles.sheetGoalName}>{goal?.name}</Text><View style={styles.kindRow}><Pressable accessibilityRole="button" onPress={() => setKind('add')} style={[styles.kind, kind === 'add' && styles.kindSelected]}><Text style={styles.kindText}>+ Nạp thêm tiền</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setKind('withdraw')} style={[styles.kind, kind === 'withdraw' && styles.kindSelected]}><Text style={styles.kindText}>− Rút tiền</Text></Pressable></View><Text style={common.label}>Số tiền muốn {kind === 'add' ? 'nạp' : 'rút'}</Text><TextInput accessibilityLabel="Số tiền cập nhật" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#6d7a72" style={styles.input} /><Text style={common.helper}>Đã tích lũy: {goal ? formatVnd(goal.savedAmount) : '—'}</Text><PrimaryButton onPress={updateAmount} disabled={busy || !validPositive(amount)}>Xác nhận {kind === 'add' ? 'nạp' : 'rút'} {validPositive(amount) ? formatVnd(amount.replace(',', '.')) : ''}</PrimaryButton></>}{!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}</View></View></Modal>
  </Page>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 7, paddingHorizontal: 16 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 23 }, title: { color: '#121c26', fontSize: 19, fontWeight: '800' }, headerActions: { flexDirection: 'row', gap: 18 },
  hero: { backgroundColor: green, borderRadius: 16, padding: 20, gap: 16 }, goalName: { color: color.white, fontSize: 21, fontWeight: '800' }, divider: { height: 1, backgroundColor: '#ffffff33' }, progressRow: { flexDirection: 'row', alignItems: 'center', gap: 18 }, ring: { borderWidth: 9, borderColor: '#68dba9', width: 113, height: 113, borderRadius: 57, alignItems: 'center', justifyContent: 'center' }, ringPercent: { color: color.white, fontSize: 25, fontWeight: '800' }, ringText: { color: color.white, fontSize: 11 }, amounts: { flex: 1, gap: 6 }, heroLabel: { color: '#d1fae5', fontSize: 11 }, heroAmount: { color: color.white, fontSize: 22, fontWeight: '800' }, timeline: { flexDirection: 'row', backgroundColor: '#004c36', borderRadius: 12, padding: 12 }, timelineItem: { flex: 1, alignItems: 'center', gap: 5 }, timelineValue: { color: color.white, fontSize: 13, fontWeight: '800' }, tip: { backgroundColor: '#ffffff22', borderWidth: 1, borderColor: '#e2b762', borderRadius: 11, padding: 12 }, tipText: { color: color.white, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 17 }, add: { flex: 1, backgroundColor: green, borderRadius: 12, minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, addText: { color: color.white, fontSize: 14, fontWeight: '800' }, withdraw: { flex: 1, backgroundColor: color.white, borderWidth: 1, borderColor: '#bccac0', borderRadius: 12, minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, withdrawText: { color: '#3d4a42', fontSize: 14, fontWeight: '800' }, noteCard: { marginTop: 18, gap: 8 }, noteTitle: { color: '#121c26', fontSize: 16, fontWeight: '800' }, disclosure: { color: '#6d7a72', fontSize: 11, textAlign: 'center', marginTop: 18 },
  overlay: { flex: 1, justifyContent: 'flex-end' }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0008' }, sheet: { backgroundColor: color.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 13, paddingBottom: 35 }, sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sheetTitle: { color: '#121c26', fontSize: 19, fontWeight: '800' }, sheetGoalName: { color: '#121c26', fontSize: 16, fontWeight: '700' }, kindRow: { flexDirection: 'row', backgroundColor: '#e4effd', borderRadius: 11, padding: 4 }, kind: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 9 }, kindSelected: { backgroundColor: color.white }, kindText: { color: green, fontSize: 12, fontWeight: '700' }, input: { color: '#121c26', fontSize: 25, fontWeight: '800', backgroundColor: '#edf4ff', borderRadius: 11, padding: 13 }, dangerButton: { backgroundColor: '#b42318', borderRadius: 11, padding: 14, alignItems: 'center' },
});
