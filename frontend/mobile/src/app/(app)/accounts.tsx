import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAccounts, getDashboard, type Account, type AccountType, type DashboardSummary } from '../../api';
import { useSession } from '../../session';
import { formatVnd, sumBalances } from '../../money';
import { reportMonth } from '../../reportDate';
import { Card, Page, PrimaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

const types: { value: AccountType | ''; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: '', label: 'Tất cả', icon: 'apps-outline' }, { value: 'BANK', label: 'Ngân hàng', icon: 'business-outline' }, { value: 'E_WALLET', label: 'Ví điện tử', icon: 'wallet-outline' }, { value: 'CASH', label: 'Tiền mặt', icon: 'cash-outline' }, { value: 'OTHER', label: 'Khác', icon: 'card-outline' },
];

export default function Accounts() {
  const { session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [type, setType] = useState<AccountType | ''>('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setLoaded(false); setError('');
    Promise.all([getAccounts(session, controller.signal), getDashboard(session, reportMonth(), controller.signal)])
      .then(([items, dashboard]) => { setAccounts(items); setSummary(dashboard); setLoaded(true); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được tài khoản.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session]));
  const visible = accounts.filter((item) => !type || item.accountType === type);
  return <Page style={styles.page}><View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={color.navy} /></Pressable><Text style={styles.title}>Tài khoản của tôi</Text><Pressable accessibilityRole="button" accessibilityLabel="Thêm tài khoản" onPress={() => router.push('/account-form')} style={styles.add}><Ionicons name="add" size={24} color={color.greenDark} /></Pressable></View>
    <View style={styles.balance}><Text style={styles.balanceLabel}>Tổng số dư khả dụng</Text><Text style={styles.balanceValue}>{loaded ? formatVnd(sumBalances(accounts.map((item) => item.currentBalance))) : '—'}</Text><View style={styles.balanceLine} /><View style={styles.totals}><View style={styles.total}><Text style={styles.totalLabel}>↓  Thu tháng này</Text><Text style={styles.totalValue}>+{summary ? formatVnd(summary.income) : '—'}</Text></View><View style={styles.total}><Text style={styles.totalLabel}>↑  Chi tháng này</Text><Text style={styles.totalValue}>−{summary ? formatVnd(summary.expense) : '—'}</Text></View></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chips}>{types.map((item) => <Pressable key={item.value} onPress={() => setType(item.value)} style={[styles.chip, type === item.value && styles.chipActive]}><Text style={[styles.chipText, type === item.value && styles.chipTextActive]}>{item.label}{item.value === '' ? `  ${accounts.length}` : ''}</Text></Pressable>)}</ScrollView>
    <View style={styles.sectionHead}><Text style={styles.section}>Danh sách tài khoản</Text><Text style={common.helper}>{visible.length} nguồn tiền</Text></View>{!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {visible.length ? visible.map((account) => <Pressable accessibilityRole="button" key={account.id} onPress={() => router.push({ pathname: '/account-detail', params: { id: account.id } })}><Card style={styles.account}><View style={styles.accountTop}><View style={styles.accountIcon}><Ionicons name={types.find((item) => item.value === account.accountType)?.icon || 'wallet-outline'} size={25} color={color.greenDark} /></View><View style={{ flex: 1 }}><Text style={styles.accountName}>{account.name}</Text><Text style={common.helper}>{types.find((item) => item.value === account.accountType)?.label}</Text></View></View><View style={styles.accountBottom}><Text style={common.helper}>Dữ liệu do bạn nhập</Text><Text style={styles.amount}>{formatVnd(account.currentBalance)}</Text></View></Card></Pressable>) : <Card style={styles.empty}><Text style={styles.accountName}>{loaded ? 'Chưa có tài khoản' : 'Đang tải tài khoản...'}</Text><Text style={common.helper}>Tạo tài khoản đầu tiên để theo dõi số dư.</Text><PrimaryButton onPress={() => router.push('/account-form')}>Thêm tài khoản</PrimaryButton></Card>}
    <Text style={styles.section}>Tiện ích tài khoản</Text><View style={styles.utilities}><Pressable onPress={() => router.push('/transfers')} style={styles.utility}><Ionicons name="swap-horizontal-outline" size={26} color={color.greenDark} /><Text style={styles.utilityTitle}>Chuyển nội bộ</Text><Text style={common.helper}>Giữa các tài khoản</Text></Pressable><Pressable onPress={() => router.push('/reconcile')} style={styles.utility}><Ionicons name="reader-outline" size={26} color={color.blue} /><Text style={styles.utilityTitle}>Đối soát số dư</Text><Text style={common.helper}>Khớp sổ thực tế</Text></Pressable></View>
    <Text style={styles.notice}>FinSight không kết nối ngân hàng hoặc lưu mật khẩu ngân hàng.</Text>
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 7 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, title: { color: color.navy, fontSize: 20, fontWeight: '800' }, add: { width: 37, height: 37, borderRadius: 19, backgroundColor: '#e4effd', alignItems: 'center', justifyContent: 'center' }, balance: { backgroundColor: '#006948', borderRadius: 18, padding: 20, marginBottom: 18 }, balanceLabel: { color: color.white, fontSize: 13, fontWeight: '700' }, balanceValue: { color: color.white, fontSize: 29, fontWeight: '800', marginTop: 9 }, balanceLine: { height: 1, backgroundColor: '#ffffff55', marginVertical: 17 }, totals: { flexDirection: 'row', gap: 8 }, total: { flex: 1, borderWidth: 1, borderColor: '#ffffff55', borderRadius: 13, padding: 10 }, totalLabel: { color: '#d1fae5', fontSize: 11 }, totalValue: { color: color.white, fontSize: 12, fontWeight: '800', marginTop: 5 }, chipScroller: { height: 47, flexGrow: 0, marginBottom: 21 }, chips: { alignItems: 'center', flexDirection: 'row', gap: 8 }, chip: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: color.border, borderRadius: 21, backgroundColor: color.white }, chipActive: { backgroundColor: color.greenDark, borderColor: color.greenDark }, chipText: { color: color.navy, fontWeight: '700', fontSize: 12 }, chipTextActive: { color: color.white }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }, section: { color: color.navy, fontSize: 19, fontWeight: '800', marginTop: 8, marginBottom: 13 }, account: { marginBottom: 11 }, accountTop: { flexDirection: 'row', alignItems: 'center', gap: 14 }, accountIcon: { width: 48, height: 48, borderRadius: 13, backgroundColor: '#e4effd', alignItems: 'center', justifyContent: 'center' }, accountName: { color: color.navy, fontSize: 18, fontWeight: '800' }, accountBottom: { borderTopWidth: 1, borderColor: color.border, marginTop: 15, paddingTop: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, amount: { color: color.navy, fontSize: 17, fontWeight: '800' }, empty: { gap: 10, marginBottom: 12 }, utilities: { flexDirection: 'row', gap: 10 }, utility: { flex: 1, backgroundColor: color.white, borderWidth: 1, borderColor: color.border, borderRadius: 14, padding: 15, gap: 8 }, utilityTitle: { color: color.navy, fontWeight: '800', fontSize: 13 }, notice: { color: color.muted, fontSize: 11, textAlign: 'center', marginTop: 22, marginBottom: 15 } });
