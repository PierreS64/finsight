import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getAccounts, getProfile, type Account } from '../../api';
import { Brand, Card, Page, PrimaryButton, Kicker, common } from '../../components/Ui';
import { formatVnd, sumBalances } from '../../money';
import { useSession } from '../../session';
import { color } from '../../theme';

export default function Dashboard() {
  const { session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    Promise.all([getAccounts(session, controller.signal), getProfile(session, controller.signal)])
      .then(([foundAccounts, profile]) => { setAccounts(foundAccounts); setName(profile?.displayName || String(session.user.user_metadata?.display_name || '')); setLoaded(true); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session]);
  const total = sumBalances(accounts.map((account) => account.openingBalance));
  return <Page><View style={styles.header}><Brand subtitle="TỔNG QUAN" /><Pressable accessibilityRole="button" onPress={() => router.replace('/profile')} style={styles.avatar}><Ionicons name="person-outline" size={23} color={color.navy} /></Pressable></View>
    <Text style={styles.hello}>Chào {name || 'bạn'} 👋</Text><Text style={styles.intro}>Dữ liệu tài chính bạn đã lưu trong FinSight.</Text>
    <View style={styles.balanceCard}><View style={styles.balanceHead}><Text style={styles.balanceLabel}>TỔNG SỐ DƯ ĐẦU KỲ</Text><Ionicons name="wallet-outline" size={22} color="#b8e7dc" /></View><Text style={styles.balanceValue}>{loaded && !error ? formatVnd(total) : '—'}</Text><Text style={styles.balanceFoot}>Cộng từ tài khoản do bạn tự nhập · không phải số dư ngân hàng trực tiếp</Text><View style={styles.balanceDivider} /><View style={styles.balanceDetails}><View><Text style={styles.balanceSmall}>Tài khoản</Text><Text style={styles.balanceSmallValue}>{loaded && !error ? accounts.length : '—'}</Text></View><View><Text style={styles.balanceSmall}>Giao dịch</Text><Text style={styles.balanceSmallValue}>Sắp ra mắt</Text></View></View></View>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    <Text style={[common.sectionTitle, styles.section]}>Bắt đầu từ đây</Text><View style={styles.quickRow}><Pressable accessibilityRole="button" onPress={() => router.replace('/accounts')} style={styles.quick}><View style={styles.quickIcon}><Ionicons name="wallet-outline" size={23} color={color.greenDark} /></View><Text style={styles.quickLabel}>Tài khoản</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.replace('/transactions')} style={styles.quick}><View style={[styles.quickIcon, { backgroundColor: color.blueLight }]}><Ionicons name="receipt-outline" size={23} color={color.blue} /></View><Text style={styles.quickLabel}>Giao dịch</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.replace('/profile')} style={styles.quick}><View style={[styles.quickIcon, { backgroundColor: '#f1f5f9' }]}><Ionicons name="person-outline" size={23} color={color.navy} /></View><Text style={styles.quickLabel}>Hồ sơ</Text></Pressable></View>
    <Card style={styles.notice}><View style={styles.noticeIcon}><Ionicons name="information-circle-outline" size={23} color={color.greenDark} /></View><View style={{ flex: 1 }}><Kicker>DỮ LIỆU MINH BẠCH</Kicker><Text style={styles.noticeText}>FinSight chỉ tính từ thông tin bạn đã nhập. Thu chi và biểu đồ sẽ xuất hiện khi tính năng giao dịch hoàn thành.</Text></View></Card>
    <View style={styles.sectionHead}><Text style={common.sectionTitle}>Tài khoản gần đây</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/accounts')}><Text style={styles.seeAll}>Xem tất cả ›</Text></Pressable></View>
    <Card>{accounts.length ? accounts.slice(0, 4).map((account, index) => <View key={account.id} style={[styles.accountRow, index > 0 && styles.rowDivider]}><View style={styles.accountIcon}><Ionicons name={account.accountType === 'CASH' ? 'cash-outline' : 'wallet-outline'} size={21} color={color.greenDark} /></View><View style={{ flex: 1 }}><Text style={styles.accountName}>{account.name}</Text><Text style={styles.accountCaption}>Số dư đầu kỳ</Text></View><Text style={styles.accountAmount}>{formatVnd(account.openingBalance)}</Text></View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>Chưa có tài khoản</Text><Text style={common.helper}>Thêm tài khoản đầu tiên để xem dữ liệu của bạn ở đây.</Text><PrimaryButton onPress={() => router.replace('/accounts')}>Thêm tài khoản</PrimaryButton></View>}</Card>
  </Page>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }, avatar: { width: 39, height: 39, borderRadius: 20, backgroundColor: color.blueLight, alignItems: 'center', justifyContent: 'center' },
  hello: { color: color.navy, fontSize: 27, fontWeight: '800', letterSpacing: -0.8 }, intro: { color: color.muted, fontSize: 13, marginTop: 4, marginBottom: 22 },
  balanceCard: { backgroundColor: color.darkCard, borderRadius: 19, padding: 22, marginBottom: 24 }, balanceHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, balanceLabel: { color: '#bad4df', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, balanceValue: { color: color.white, fontSize: 33, fontWeight: '800', marginTop: 18, fontVariant: ['tabular-nums'] }, balanceFoot: { color: '#c2d3d9', fontSize: 11, lineHeight: 17, marginTop: 8 }, balanceDivider: { height: 1, backgroundColor: '#ffffff30', marginVertical: 19 }, balanceDetails: { flexDirection: 'row', justifyContent: 'space-between' }, balanceSmall: { color: '#bad4df', fontSize: 11, marginBottom: 5 }, balanceSmallValue: { color: '#6ee7b7', fontSize: 16, fontWeight: '800' },
  section: { marginBottom: 12 }, quickRow: { flexDirection: 'row', gap: 9, marginBottom: 18 }, quick: { flex: 1, minHeight: 94, backgroundColor: color.white, borderColor: color.border, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center', gap: 9 }, quickIcon: { width: 40, height: 40, backgroundColor: color.greenLight, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, quickLabel: { color: color.navy, fontSize: 11, fontWeight: '700' },
  notice: { backgroundColor: '#e4f6f2', flexDirection: 'row', gap: 12, marginBottom: 24 }, noticeIcon: { width: 38, height: 38, backgroundColor: '#c8ede2', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, noticeText: { color: color.navy, fontSize: 12, lineHeight: 18, marginTop: 5 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, seeAll: { color: color.greenDark, fontWeight: '700', fontSize: 12 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }, rowDivider: { borderTopWidth: 1, borderColor: color.border }, accountIcon: { width: 40, height: 40, backgroundColor: color.greenLight, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, accountName: { fontSize: 13, fontWeight: '700', color: color.navy }, accountCaption: { fontSize: 10, color: color.muted, marginTop: 3 }, accountAmount: { fontSize: 12, color: color.navy, fontWeight: '800', fontVariant: ['tabular-nums'] }, empty: { alignItems: 'center', paddingVertical: 17, gap: 9 }, emptyTitle: { color: color.navy, fontSize: 16, fontWeight: '800' },
});
