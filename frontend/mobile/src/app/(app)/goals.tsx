import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getGoals, type FinancialGoal } from '../../api';
import { Brand, Card, Page, common } from '../../components/Ui';
import PlanningTabs from '../../components/PlanningTabs';
import { formatVnd, sumBalances } from '../../money';
import { useSession } from '../../session';
import { color } from '../../theme';

const green = '#006948';
const width = (value: string): `${number}%` => `${Math.min(100, Math.max(0, Number.parseFloat(value) || 0))}%` as `${number}%`;
function minor(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  return match ? BigInt(match[1]) * 100n + BigInt((match[2] || '').padEnd(2, '0') || '0') : 0n;
}
type Filter = 'all' | 'active' | 'completed';

export default function Goals() {
  const { session } = useSession();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [showFilters, setShowFilters] = useState(false);
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setLoaded(false); setError('');
    getGoals(session, controller.signal).then((items) => { if (!controller.signal.aborted) { setGoals(items); setLoaded(true); } })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được mục tiêu.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session]));
  const visible = goals.filter((goal) => filter === 'all' || (filter === 'completed' ? goal.achieved : !goal.achieved));
  const saved = sumBalances(goals.map((goal) => goal.savedAmount));
  const target = sumBalances(goals.map((goal) => goal.targetAmount));
  const overall = minor(target) ? Math.min(100, Number(minor(saved) * 100n / minor(target))) : 0;
  return <Page style={styles.page}><View style={styles.header}><Brand /><Pressable accessibilityRole="button" accessibilityLabel="Hồ sơ" onPress={() => router.push('/profile')} style={styles.avatar}><Ionicons name="person-outline" size={20} color={green} /></Pressable></View><PlanningTabs />
    <View style={styles.hero}><View style={styles.heroRow}><Ionicons name="wallet-outline" size={20} color="#d1fae5" /><Text style={styles.heroLabel}>Tổng tích lũy hiện tại</Text><Text style={styles.heroBadge}>{overall}% Hoàn thành</Text></View><View style={styles.heroAmounts}><Text style={styles.heroValue}>{formatVnd(saved)}</Text><Text style={styles.heroTarget}>Mục tiêu: {formatVnd(target)}</Text></View><View style={styles.heroTrack}><View style={[styles.heroFill, { width: width(String(overall)) }]} /></View><Text style={styles.heroFoot}>Theo dõi tiến độ {goals.length} mục tiêu tiết kiệm</Text></View>
    <Pressable accessibilityRole="button" onPress={() => router.push('/goal-form')} style={styles.add}><Ionicons name="add-circle-outline" size={22} color={color.white} /><Text style={styles.addText}>Tạo mục tiêu mới</Text></Pressable>
    <View style={styles.sectionHead}><Text style={styles.section}>Mục tiêu đang thực hiện <Text style={styles.count}>{visible.length}</Text></Text><Pressable accessibilityRole="button" onPress={() => setShowFilters((current) => !current)} style={styles.filter}><Ionicons name="options-outline" size={19} color="#3d4a42" /><Text style={styles.filterText}>Lọc</Text></Pressable></View>
    {showFilters && <View style={styles.filters}>{([{ key: 'all', label: 'Tất cả' }, { key: 'active', label: 'Đang thực hiện' }, { key: 'completed', label: 'Đã hoàn thành' }] as const).map((item) => <Pressable key={item.key} onPress={() => { setFilter(item.key); setShowFilters(false); }} style={[styles.filterChip, filter === item.key && styles.filterSelected]}><Text style={[styles.filterChipText, filter === item.key && { color: color.white }]}>{item.label}</Text></Pressable>)}</View>}
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!loaded && <Text style={common.helper}>Đang tải mục tiêu...</Text>}
    {loaded && !error && !visible.length && <Card><Text style={styles.goalTitle}>Chưa có mục tiêu</Text><Text style={common.helper}>Tạo mục tiêu đầu tiên để theo dõi khoản tích lũy.</Text></Card>}
    {!error && visible.map((goal) => <Pressable accessibilityRole="button" key={goal.id} onPress={() => router.push({ pathname: '/goal-detail', params: { id: goal.id } })}><Card style={styles.goal}><View style={styles.goalTop}><View style={styles.goalIcon}><Ionicons name="shield-outline" size={23} color={green} /></View><View style={styles.goalHeading}><Text style={styles.goalTitle}>{goal.name}</Text><Text style={styles.goalDate}>{goal.targetDate ? `Hạn chót: ${goal.targetDate.slice(5, 7)}/${goal.targetDate.slice(0, 4)}` : 'Không đặt hạn'}</Text></View><Text style={[styles.status, goal.overdue && styles.statusOverdue]}>{goal.achieved ? 'Đã hoàn thành' : goal.overdue ? 'Đã qua hạn' : 'Đang thực hiện'}</Text></View><View style={styles.goalAmounts}><Text style={styles.goalSaved}>{formatVnd(goal.savedAmount)} <Text style={styles.goalTarget}>/ {formatVnd(goal.targetAmount)}</Text></Text><Text style={styles.goalPercent}>{goal.progressPercent}%</Text></View><View style={styles.track}><View style={[styles.fill, { width: width(goal.progressPercent) }]} /></View><View style={styles.goalBottom}><Text style={styles.goalRemaining}>Còn thiếu: <Text style={styles.strong}>{formatVnd(goal.remainingAmount)}</Text></Text><View style={styles.deposit}><Ionicons name="add" size={17} color={green} /><Text style={styles.depositText}>Nạp tiền</Text></View></View></Card></Pressable>)}
  </Page>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 7, paddingHorizontal: 16 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17 }, avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e4effd', alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: '#006948', borderRadius: 16, padding: 19, marginBottom: 18 }, heroRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, heroLabel: { color: '#d1fae5', fontSize: 12, fontWeight: '700', flex: 1 }, heroBadge: { color: color.white, backgroundColor: '#ffffff33', padding: 5, borderRadius: 13, fontSize: 10, fontWeight: '700', maxWidth: 105 }, heroAmounts: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 7, marginVertical: 16 }, heroValue: { color: color.white, fontSize: 27, fontWeight: '800', flex: 1 }, heroTarget: { color: '#d1fae5', fontSize: 11, maxWidth: 105 }, heroTrack: { height: 10, backgroundColor: '#00472f', borderRadius: 6, overflow: 'hidden' }, heroFill: { height: 10, backgroundColor: '#68dba9', borderRadius: 6 }, heroFoot: { color: '#d1fae5', fontSize: 11, marginTop: 13, fontWeight: '700' },
  add: { backgroundColor: green, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 13, padding: 14, marginBottom: 25 }, addText: { color: color.white, fontSize: 14, fontWeight: '800' }, sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }, section: { color: '#121c26', fontSize: 18, fontWeight: '800', flex: 1 }, count: { fontSize: 13, color: green }, filter: { flexDirection: 'row', alignItems: 'center', gap: 3 }, filterText: { color: '#3d4a42', fontSize: 12 }, filters: { flexDirection: 'row', gap: 7, marginBottom: 13 }, filterChip: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#e4effd', borderRadius: 16 }, filterSelected: { backgroundColor: green }, filterChipText: { color: '#3d4a42', fontSize: 11, fontWeight: '700' },
  goal: { marginBottom: 13, padding: 15 }, goalTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, goalIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#e7fbf2', alignItems: 'center', justifyContent: 'center' }, goalHeading: { flex: 1 }, goalTitle: { color: '#121c26', fontSize: 15, fontWeight: '700' }, goalDate: { color: '#6d7a72', fontSize: 11, marginTop: 4 }, status: { color: green, backgroundColor: '#e7fbf2', borderRadius: 14, fontSize: 10, paddingHorizontal: 7, paddingVertical: 5, maxWidth: 95, textAlign: 'center' }, statusOverdue: { color: '#9a3412', backgroundColor: '#fff7ed' }, goalAmounts: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18, marginBottom: 10 }, goalSaved: { color: green, fontSize: 17, fontWeight: '800', flex: 1 }, goalTarget: { color: '#3d4a42', fontSize: 11, fontWeight: '400' }, goalPercent: { color: green, fontSize: 18, fontWeight: '800' }, track: { height: 8, backgroundColor: '#e4effd', borderRadius: 5, overflow: 'hidden' }, fill: { height: 8, borderRadius: 5, backgroundColor: green }, goalBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }, goalRemaining: { color: '#3d4a42', fontSize: 11, flex: 1 }, strong: { fontWeight: '800' }, deposit: { backgroundColor: '#edf4ff', flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }, depositText: { color: green, fontSize: 11, fontWeight: '800' },
});
