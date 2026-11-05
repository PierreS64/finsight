import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAccounts, getReconciliations, type Account, type AccountReconciliation } from '../../api';
import { Card, Page, PrimaryButton, common } from '../../components/Ui';
import { formatVnd, sumBalances } from '../../money';
import { reportMonth } from '../../reportDate';
import { useSession } from '../../session';
import { color } from '../../theme';

type Filter = 'ALL' | 'BALANCED' | 'DIFFERENT';
function localDate(value: string) { return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }); }

export default function ReconcileHistory() {
  const { session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [records, setRecords] = useState<AccountReconciliation[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [accountId, setAccountId] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setLoaded(false); setError('');
    getAccounts(session, controller.signal).then(async (items) => {
      const groups = await Promise.all(items.map((account) => getReconciliations(session, account.id, controller.signal)));
      if (!controller.signal.aborted) { setAccounts(items); setRecords(groups.flat().sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))); setLoaded(true); }
    }).catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được lịch sử đối soát.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session]));
  const scoped = records.filter((item) => !accountId || item.accountId === accountId);
  const matched = scoped.filter((item) => item.status === 'BALANCED').length;
  const visible = scoped.filter((item) => filter === 'ALL' || (filter === 'BALANCED' ? item.status === 'BALANCED' : item.status !== 'BALANCED'));
  const latest = scoped[0];
  const dates = [...new Set(visible.map((item) => localDate(item.recordedAt)))];
  return <Page style={styles.page}>
    <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={color.navy} /></Pressable><View style={styles.heading}><Text style={styles.title}>Lịch sử đối soát</Text><Text style={styles.subtitle}>Nhật ký số dư của bạn</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Lọc tài khoản" onPress={() => setFilterOpen(!filterOpen)}><Ionicons name="options-outline" size={23} color={color.greenDark} /></Pressable></View>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!loaded && <Text style={common.helper}>Đang tải lịch sử...</Text>}
    {filterOpen && <Card style={styles.accountFilter}><Text style={styles.filterTitle}>Lọc theo tài khoản</Text><Pressable onPress={() => { setAccountId(''); setFilterOpen(false); }} style={styles.accountOption}><Text style={styles.optionText}>Tất cả tài khoản</Text></Pressable>{accounts.map((account) => <Pressable key={account.id} onPress={() => { setAccountId(account.id); setFilterOpen(false); }} style={styles.accountOption}><Text style={styles.optionText}>{account.name}</Text></Pressable>)}</Card>}
    {loaded && !error && <><Card style={styles.summary}><Text style={styles.summaryLabel}>Đối soát tháng này</Text><Text style={styles.summaryValue}>{scoped.filter((item) => item.recordedAt.slice(0, 7) === reportMonth()).length} phiên hoàn tất</Text><View style={styles.summaryStats}><View style={styles.stat}><Text style={styles.statLabel}>Tổng chênh lệch ghi nhận</Text><Text style={styles.statValue}>{formatVnd(sumBalances(scoped.map((item) => item.differenceAmount)))}</Text></View><View style={styles.stat}><Text style={styles.statLabel}>Lần đối soát gần nhất</Text><Text style={styles.statValue}>{latest ? new Date(latest.recordedAt).toLocaleDateString('vi-VN') : '—'}</Text></View></View></Card>
      <View style={styles.filterHeading}><Text style={styles.filterTitle}>LỌC THEO TRẠNG THÁI & VÍ</Text><Pressable onPress={() => { setFilter('ALL'); setAccountId(''); }}><Text style={styles.reset}>Đặt lại</Text></Pressable></View><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chips}>{([['ALL', `Tất cả (${scoped.length})`], ['BALANCED', `Khớp 100% (${matched})`], ['DIFFERENT', `Có chênh lệch (${scoped.length - matched})`]] as const).map(([key, label]) => <Pressable accessibilityRole="button" key={key} onPress={() => setFilter(key)} style={[styles.chip, filter === key && styles.chipActive]}><Text style={[styles.chipText, filter === key && styles.chipTextActive]}>{label}</Text></Pressable>)}</ScrollView>
      {dates.length ? dates.map((date) => <View key={date}><View style={styles.dateHeading}><Text style={styles.dateText}>●  {date}</Text><Text style={styles.count}>{visible.filter((item) => localDate(item.recordedAt) === date).length} phiên</Text></View>{visible.filter((item) => localDate(item.recordedAt) === date).map((item) => <Card key={item.id} style={styles.record}><View style={styles.recordHead}><View style={styles.recordIcon}><Ionicons name={accounts.find((account) => account.id === item.accountId)?.accountType === 'BANK' ? 'business-outline' : 'wallet-outline'} size={23} color={color.greenDark} /></View><View style={{ flex: 1 }}><Text style={styles.recordName}>{accounts.find((account) => account.id === item.accountId)?.name ?? 'Tài khoản đã thay đổi'}</Text><Text style={styles.recordDate}>{new Date(item.recordedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · Mã phiên #{item.id.slice(0, 5)}</Text></View><Text style={[styles.status, item.status === 'SHORTFALL' && styles.shortfall]}>{item.status === 'BALANCED' ? 'Khớp hoàn toàn' : item.status === 'SURPLUS' ? 'Thừa' : 'Thiếu'}</Text></View><View style={styles.amounts}><View style={styles.amountColumn}><Text style={styles.statLabel}>Sổ app FinSight</Text><Text style={styles.recordAmount}>{formatVnd(item.expectedBalance)}</Text></View><View style={styles.amountColumn}><Text style={styles.statLabel}>Thực tế kiểm đếm</Text><Text style={styles.recordAmount}>{formatVnd(item.observedBalance)}</Text></View></View><Text style={[styles.recordDifference, item.status === 'SHORTFALL' && styles.shortfall]}>Chênh lệch: {formatVnd(item.differenceAmount)}</Text>{!!item.note && <Text style={styles.recordDate}>{item.note}</Text>}</Card>)}</View>) : <Card><Text style={common.helper}>Chưa có lần đối soát phù hợp.</Text></Card>}
      <View style={styles.tip}><Ionicons name="bulb-outline" size={23} color={color.greenDark} /><Text style={styles.tipText}><Text style={{ fontWeight: '800' }}>Mẹo quản lý dòng tiền{'\n'}</Text>Thực hiện đối soát số dư vào cuối mỗi tuần hoặc sau các kỳ thanh toán lớn để kiểm tra dữ liệu.</Text></View><View style={styles.action}><PrimaryButton onPress={() => router.push('/reconcile')} icon="add-circle-outline">Đối soát số dư mới ngay</PrimaryButton></View>
    </>}
  </Page>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 5 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }, heading: { alignItems: 'center' }, title: { color: color.navy, fontSize: 20, fontWeight: '800' }, subtitle: { color: color.muted, fontSize: 11 }, summary: { backgroundColor: '#fafffd', marginBottom: 18, gap: 5 }, summaryLabel: { color: color.muted, fontSize: 12 }, summaryValue: { color: color.navy, fontSize: 22, fontWeight: '800' }, summaryStats: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderColor: color.border, paddingTop: 12, marginTop: 7 }, stat: { flex: 1, backgroundColor: '#f1f6ff', borderRadius: 11, padding: 9, gap: 5 }, statLabel: { color: color.muted, fontSize: 11 }, statValue: { color: color.greenDark, fontSize: 13, fontWeight: '800' }, filterHeading: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }, filterTitle: { color: color.muted, fontSize: 11, fontWeight: '800' }, reset: { color: color.greenDark, fontSize: 11, fontWeight: '700' }, accountFilter: { gap: 5, marginBottom: 15 }, accountOption: { paddingVertical: 9, borderBottomWidth: 1, borderColor: color.border }, optionText: { color: color.navy, fontSize: 14 }, chipScroller: { height: 42, flexGrow: 0, marginBottom: 17 }, chips: { flexDirection: 'row', gap: 7, alignItems: 'center' }, chip: { backgroundColor: color.white, borderColor: color.border, borderWidth: 1, borderRadius: 22, paddingHorizontal: 13, paddingVertical: 7 }, chipActive: { backgroundColor: '#006948', borderColor: '#006948' }, chipText: { color: color.navy, fontSize: 11, fontWeight: '700' }, chipTextActive: { color: color.white }, dateHeading: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 13 }, dateText: { color: color.navy, fontSize: 13, fontWeight: '800' }, count: { color: color.muted, fontSize: 11 }, record: { marginBottom: 12, gap: 12 }, recordHead: { flexDirection: 'row', alignItems: 'center', gap: 9 }, recordIcon: { width: 38, height: 38, backgroundColor: '#e8f8ef', borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, recordName: { color: color.navy, fontSize: 13, fontWeight: '800' }, recordDate: { color: color.muted, fontSize: 11 }, status: { color: color.greenDark, fontSize: 10, fontWeight: '800' }, shortfall: { color: '#b45309' }, amounts: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderColor: color.border, paddingTop: 10 }, amountColumn: { flex: 1, backgroundColor: '#f7f9ff', borderRadius: 9, padding: 10, gap: 5 }, recordAmount: { color: color.navy, fontSize: 13, fontWeight: '800' }, recordDifference: { color: color.greenDark, fontSize: 11, fontWeight: '700' }, tip: { backgroundColor: '#e9f1ff', borderRadius: 13, padding: 15, flexDirection: 'row', gap: 9, marginTop: 10 }, tipText: { color: color.navy, fontSize: 12, lineHeight: 18, flex: 1 }, action: { marginTop: 22, marginBottom: 20 },
});
