import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { getAccounts, getRecurringRules, getUpcomingExpenses, processRecurringRule, saveRecurringRule, type Account, type RecurringRule, type UpcomingExpenses } from '../../api';
import { Brand, Card, Page, PrimaryButton, common } from '../../components/Ui';
import PlanningTabs from '../../components/PlanningTabs';
import SubscriptionSuggestionsCard from '../../components/SubscriptionSuggestionsCard';
import { formatVnd } from '../../money';
import { reportDate, reportMonth } from '../../reportDate';
import { useSession } from '../../session';
import { color } from '../../theme';

const green = '#006948';
const today = () => reportDate();
const monthRange = () => {
  const month = reportMonth();
  const [year, number] = month.split('-').map(Number);
  return [`${month}-01`, `${month}-${String(new Date(Date.UTC(year, number, 0)).getUTCDate()).padStart(2, '0')}`] as const;
};
type Filter = 'all' | 'active' | 'paused';

export default function Recurring() {
  const { session } = useSession();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingExpenses | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<{ kind: 'pause' | 'resume' | 'process'; rule: RecurringRule } | null>(null);
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setLoaded(false); setLoadFailed(false); setError('');
    const [from, to] = monthRange();
    Promise.all([getRecurringRules(session, controller.signal), getAccounts(session, controller.signal), getUpcomingExpenses(session, from, to, controller.signal)])
      .then(([items, sources, due]) => { if (!controller.signal.aborted) { setRules(items); setAccounts(sources); setUpcoming(due); setLoaded(true); } })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được lịch định kỳ.'); setLoadFailed(true); setLoaded(true); } });
    return () => controller.abort();
  }, [session]));
  async function confirmAction() {
    if (!session || !confirm || busy) return;
    setBusy(true); setError('');
    try {
      const { rule, kind } = confirm;
      if (kind === 'process') {
        const result = await processRecurringRule(session, rule.id);
        setRules((current) => current.map((item) => item.id === rule.id ? { ...item, nextDueOn: result.nextDueOn } : item));
        const [from, to] = monthRange();
        setConfirm(null);
        try { setUpcoming(await getUpcomingExpenses(session, from, to)); }
        catch { setError('Đã ghi nhận kỳ đến hạn; chưa tải lại được tổng quan.'); }
      } else {
        const saved = await saveRecurringRule(session, { accountId: rule.accountId, categoryId: rule.categoryId, name: rule.name, kind: rule.kind, amount: rule.amount, cadence: rule.cadence, nextDueOn: rule.nextDueOn, active: kind === 'resume', note: rule.note }, rule.id);
        setRules((current) => current.map((item) => item.id === saved.id ? saved : item));
      }
      setConfirm(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không cập nhật được lịch định kỳ.'); }
    finally { setBusy(false); }
  }
  const visible = rules.filter((rule) => filter === 'all' || rule.active === (filter === 'active'));
  const activeCount = rules.filter((rule) => rule.active).length;
  const pausedCount = rules.length - activeCount;
  const dueCount = rules.filter((rule) => rule.active && rule.nextDueOn <= today()).length;
  return <Page style={styles.page}><View style={styles.header}><Brand /><Pressable accessibilityRole="button" accessibilityLabel="Hồ sơ" onPress={() => router.push('/profile')} style={styles.avatar}><Ionicons name="person-outline" size={21} color={green} /></Pressable></View><PlanningTabs />
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!loaded && <Text style={common.helper}>Đang tải lịch định kỳ...</Text>}
    {loaded && !loadFailed && <><View style={styles.hero}><View style={styles.heroHead}><Ionicons name="calendar-outline" size={20} color="#d1fae5" /><Text style={styles.heroLabel}>Khoản sắp đến hạn trong tháng</Text><Text style={styles.month}>Tháng {reportMonth().slice(5)}/{reportMonth().slice(0, 4)}</Text></View><Text style={styles.heroAmount}>{formatVnd(upcoming?.total || '0')}</Text><View style={styles.heroDivider} /><View style={styles.heroStats}><Text style={styles.heroSmall}>{upcoming?.count || 0} kỳ sắp đến hạn</Text><Text style={styles.heroSmall}>{dueCount} kỳ đã đến hạn cần ghi nhận</Text></View></View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/recurring-form')} style={styles.add}><Ionicons name="add-circle-outline" size={21} color={color.white} /><Text style={styles.addText}>Thêm khoản định kỳ mới</Text></Pressable>
      <View style={styles.filters}>{([{ key: 'all', label: `Tất cả (${rules.length})` }, { key: 'active', label: `Đang hoạt động (${activeCount})` }, { key: 'paused', label: `Tạm dừng (${pausedCount})` }] as const).map((item) => <Pressable key={item.key} accessibilityRole="button" onPress={() => setFilter(item.key)} style={[styles.filter, filter === item.key && styles.filterActive]}><Text style={[styles.filterText, filter === item.key && { color: color.white }]}>{item.label}</Text></Pressable>)}</View>
      <View style={styles.sectionHead}><Text style={styles.section}>Lịch trình chi tiêu</Text><Text style={styles.sort}>Theo ngày đến hạn</Text></View>
      {!visible.length && <Card><Text style={styles.ruleName}>Chưa có khoản định kỳ</Text><Text style={common.helper}>Thêm một khoản để theo dõi lịch thu chi.</Text></Card>}
      {[...visible].sort((a, b) => a.nextDueOn.localeCompare(b.nextDueOn)).map((rule) => <Card key={rule.id} style={[styles.rule, !rule.active && { opacity: 0.62 }]}><View style={styles.ruleHead}><View style={styles.ruleIcon}><Ionicons name={rule.kind === 'EXPENSE' ? 'calendar-outline' : 'trending-up-outline'} size={21} color={green} /></View><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/recurring-form', params: { id: rule.id } })} style={styles.ruleTitle}><Text style={styles.ruleName}>{rule.name}</Text><Text style={styles.ruleMeta}>{accounts.find((account) => account.id === rule.accountId)?.name || 'Tài khoản'} · {rule.cadence === 'WEEKLY' ? 'Hàng tuần' : 'Hàng tháng'} · {rule.nextDueOn}</Text></Pressable><Pressable accessibilityRole="switch" accessibilityState={{ checked: rule.active }} onPress={() => setConfirm({ kind: rule.active ? 'pause' : 'resume', rule })} style={[styles.switch, rule.active && styles.switchOn]}><View style={[styles.knob, rule.active && styles.knobOn]} /></Pressable></View><View style={styles.ruleBottom}><Text style={[styles.ruleStatus, rule.active && rule.nextDueOn <= today() ? styles.due : null]}>{rule.active ? rule.nextDueOn <= today() ? 'Đã đến hạn' : 'Chưa tới kỳ' : 'Tạm dừng'}</Text><Text style={styles.ruleAmount}>{rule.kind === 'EXPENSE' ? '−' : '+'}{formatVnd(rule.amount)}</Text></View>{rule.active && rule.nextDueOn <= today() && <Pressable accessibilityRole="button" onPress={() => setConfirm({ kind: 'process', rule })} style={styles.process}><Text style={styles.processText}>Ghi nhận đến hạn</Text></Pressable>}</Card>)}
      <SubscriptionSuggestionsCard />
    </>}
    <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}><View style={styles.overlay}><Pressable style={styles.scrim} onPress={() => setConfirm(null)} /><View style={styles.dialog}><Text style={styles.dialogTitle}>{confirm?.kind === 'process' ? 'Xác nhận kỳ định kỳ' : confirm?.kind === 'pause' ? 'Tạm dừng quy tắc' : 'Tiếp tục quy tắc'}</Text><Text style={common.helper}>{confirm?.kind === 'process' ? `Ghi nhận giao dịch đến hạn cho ${confirm.rule.name}?` : `${confirm?.kind === 'pause' ? 'Tạm dừng' : 'Tiếp tục'} ${confirm?.rule.name}?`}</Text><PrimaryButton onPress={confirmAction} disabled={busy}>Xác nhận</PrimaryButton><Pressable accessibilityRole="button" onPress={() => setConfirm(null)} style={styles.cancel}><Text style={styles.cancelText}>Hủy</Text></Pressable>{!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}</View></View></Modal>
  </Page>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 7, paddingHorizontal: 16 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 17 }, avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e4effd', alignItems: 'center', justifyContent: 'center' }, hero: { backgroundColor: green, borderRadius: 16, padding: 19, marginBottom: 16 }, heroHead: { flexDirection: 'row', alignItems: 'center', gap: 7 }, heroLabel: { color: '#d1fae5', fontSize: 12, fontWeight: '700', flex: 1 }, month: { color: color.white, backgroundColor: '#ffffff33', borderRadius: 12, padding: 5, fontSize: 10 }, heroAmount: { color: color.white, fontSize: 27, fontWeight: '800', marginTop: 13 }, heroDivider: { height: 1, backgroundColor: '#ffffff33', marginTop: 15, marginBottom: 11 }, heroStats: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, heroSmall: { color: '#d1fae5', fontSize: 11, flex: 1 }, add: { backgroundColor: green, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 17 }, addText: { color: color.white, fontWeight: '800', fontSize: 13 }, filters: { flexDirection: 'row', gap: 7, marginBottom: 18 }, filter: { flex: 1, borderRadius: 19, paddingHorizontal: 7, paddingVertical: 9, borderWidth: 1, borderColor: '#dfe9f7', backgroundColor: color.white, alignItems: 'center' }, filterActive: { backgroundColor: green, borderColor: green }, filterText: { color: '#3d4a42', fontSize: 10, fontWeight: '700', textAlign: 'center' }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }, section: { color: '#121c26', fontSize: 18, fontWeight: '800' }, sort: { color: '#6d7a72', fontSize: 11 },
  rule: { marginBottom: 11, padding: 14 }, ruleHead: { flexDirection: 'row', alignItems: 'center', gap: 10 }, ruleIcon: { width: 39, height: 39, borderRadius: 20, backgroundColor: '#e5f9ee', alignItems: 'center', justifyContent: 'center' }, ruleTitle: { flex: 1 }, ruleName: { color: '#121c26', fontSize: 13, fontWeight: '800' }, ruleMeta: { color: '#6d7a72', fontSize: 10, marginTop: 4 }, switch: { width: 42, height: 24, borderRadius: 13, backgroundColor: '#d9e3f1', padding: 3 }, switchOn: { backgroundColor: green }, knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: color.white }, knobOn: { alignSelf: 'flex-end' }, ruleBottom: { borderTopWidth: 1, borderColor: '#edf4ff', marginTop: 14, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, ruleStatus: { color: '#0058be', backgroundColor: '#e4effd', borderRadius: 12, overflow: 'hidden', fontSize: 10, paddingHorizontal: 8, paddingVertical: 4 }, due: { color: '#9a3412', backgroundColor: '#fff1cf' }, ruleAmount: { color: '#121c26', fontSize: 14, fontWeight: '800' }, process: { alignSelf: 'flex-end', marginTop: 10 }, processText: { color: green, fontSize: 11, fontWeight: '800' },
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 23 }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0008' }, dialog: { backgroundColor: color.white, borderRadius: 17, padding: 21, gap: 12 }, dialogTitle: { color: '#121c26', fontSize: 18, fontWeight: '800' }, cancel: { alignItems: 'center', padding: 9 }, cancelText: { color: '#3d4a42', fontWeight: '700' },
});
