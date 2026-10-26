import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { getAccounts, getMerchants, getSpendingProfile, getTransactionHistory, type Account, type Merchant, type SpendingProfile, type Transaction, type TransactionHistoryFilters } from '../api';
import { formatVnd } from '../money';
import { useSession } from '../session';
import { color } from '../theme';
import { Card, common } from './Ui';

const minor = (value: string) => { const [whole, cents = ''] = value.split('.'); return BigInt(whole) * 100n + BigInt(cents.padEnd(2, '0') || '0'); };
const percent = (part: bigint, whole: bigint) => whole > 0n ? Number(part * 1000n / whole) / 10 : 0;
const accountLabels = { CASH: 'Tiền mặt', BANK: 'Ngân hàng', E_WALLET: 'Ví điện tử', OTHER: 'Khác' };
const filters: TransactionHistoryFilters = { search: '', from: '', to: '', month: '', kind: 'EXPENSE', categoryId: '', sort: 'desc' };

async function monthExpenses(session: Parameters<typeof getTransactionHistory>[0], month: string, signal: AbortSignal): Promise<Transaction[]> {
  const query = { ...filters, month };
  const first = await getTransactionHistory(session, query, 0, signal);
  const items = [...first.items];
  for (let page = 1; page < first.totalPages; page += 1) {
    const next = await getTransactionHistory(session, query, page, signal);
    items.push(...next.items);
  }
  return items;
}

export default function SpendingProfileCard({ month }: { month: string }) {
  const { session } = useSession();
  const [profile, setProfile] = useState<SpendingProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setProfile(null); setError('');
    Promise.all([getSpendingProfile(session, month, controller.signal), monthExpenses(session, month, controller.signal), getAccounts(session, controller.signal), getMerchants(session, controller.signal)])
      .then(([foundProfile, foundTransactions, foundAccounts, foundMerchants]) => { setProfile(foundProfile); setTransactions(foundTransactions); setAccounts(foundAccounts); setMerchants(foundMerchants); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được hồ sơ hành vi.'); });
    return () => controller.abort();
  }, [session, month]));
  const savings = profile?.savingsRatePercent;
  const savingsProgress = savings === null || savings === undefined ? 0 : Math.max(0, Math.min(100, Number(savings)));
  const merchantTotals = new Map<string, bigint>();
  const accountTotals = new Map<string, bigint>();
  for (const transaction of transactions) {
    if (transaction.merchantId) merchantTotals.set(transaction.merchantId, (merchantTotals.get(transaction.merchantId) ?? 0n) + minor(transaction.amount));
    const type = accounts.find((account) => account.id === transaction.accountId)?.accountType;
    if (type) accountTotals.set(type, (accountTotals.get(type) ?? 0n) + minor(transaction.amount));
  }
  const namedMerchants = [...merchantTotals.entries()].sort((a, b) => a[1] === b[1] ? 0 : a[1] > b[1] ? -1 : 1).slice(0, 3).map(([id, amount]) => ({ id, name: merchants.find((item) => item.id === id)?.name ?? 'Nơi giao dịch', amount }));
  const merchantTotal = [...merchantTotals.values()].reduce((sum, value) => sum + value, 0n);
  const paymentTotal = [...accountTotals.values()].reduce((sum, value) => sum + value, 0n);
  const payment = [...accountTotals.entries()].sort((a, b) => a[1] === b[1] ? 0 : a[1] > b[1] ? -1 : 1);
  return <View style={styles.wrapper}>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {!profile && !error && <Text style={common.helper}>Đang tính hồ sơ chi tiêu...</Text>}
    {profile && <>
      <View style={styles.hero}><Text style={styles.heroBadge}>Hồ sơ hành vi từ dữ liệu đã ghi · Tháng {month.slice(5)}</Text><View style={styles.heroHead}><Text style={styles.heroLabel}>Tỷ lệ tiết kiệm thu nhập</Text><Text style={styles.heroStatus}>{savings === null ? 'Thiếu thu nhập' : profile.trend === 'INSUFFICIENT_DATA' ? 'Chưa có xu hướng' : profile.trend === 'DECREASE' ? 'Chi giảm' : profile.trend === 'INCREASE' ? 'Chi tăng' : 'Ổn định'}</Text></View><Text style={styles.heroAmount}>{savings === null ? '—' : `${savings}%`}</Text><View style={styles.heroTrack}><View style={[styles.heroFill, { width: `${savingsProgress}%` }]} /></View><Text style={styles.heroNote}>{savings === null ? 'Cần có thu nhập trong tháng để tính tỷ lệ.' : 'Tỷ lệ = (thu nhập đã ghi − chi tiêu đã ghi) / thu nhập đã ghi.'}</Text></View>
      <Card style={styles.aspectCard}><View style={styles.cardHead}><View style={styles.headIcon}><Ionicons name="analytics-outline" size={19} color={color.greenDark} /></View><Text style={styles.cardTitle}>Khía cạnh thói quen</Text></View><View style={styles.radar}><Svg width="100%" height={175} viewBox="0 0 240 175"><Polygon points="120,10 220,60 185,163 55,163 20,60" fill="none" stroke="#d9e3f1" strokeWidth={1} /><Polygon points="120,39 191,74 166,144 74,144 49,74" fill="none" stroke="#d9e3f1" strokeWidth={1} /><Polygon points="120,68 162,89 147,125 93,125 78,89" fill="none" stroke="#d9e3f1" strokeWidth={1} /></Svg><Text style={styles.radarText}>Chưa có dữ liệu cho đủ 5 tiêu chí radar của bản thiết kế.</Text></View><View style={styles.metricGrid}><View style={styles.metric}><Text style={styles.metricLabel}>Tỷ lệ tiết kiệm</Text><Text style={styles.metricValue}>{savings === null ? '—' : `${savings}%`}</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>Độ ổn định chi tiêu</Text><Text style={styles.metricValue}>{profile.stabilityScore === null ? '—' : `${profile.stabilityScore}/100`}</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>Trung bình mỗi ngày</Text><Text style={styles.metricValue}>{profile.averageDailyExpense === null ? '—' : formatVnd(profile.averageDailyExpense)}</Text></View><View style={styles.metric}><Text style={styles.metricLabel}>Xu hướng so tháng trước</Text><Text style={styles.metricValue}>{profile.trend === 'INSUFFICIENT_DATA' ? '—' : profile.trendPercent === null ? '—' : `${profile.trendPercent}%`}</Text></View></View></Card>
      <Text style={styles.section}>Đặc trưng hành vi quan trọng</Text>
      <Card style={styles.behaviorCard}><View style={styles.cardHead}><View style={[styles.headIcon, { backgroundColor: '#edf4ff' }]}><Ionicons name="storefront-outline" size={19} color="#2170e4" /></View><View style={{ flex: 1 }}><Text style={styles.behaviorTitle}>Địa điểm quen thuộc</Text><Text style={styles.behaviorHint}>Top 3 nơi chi nhiều nhất</Text></View></View>{namedMerchants.length ? namedMerchants.map((item) => <View key={item.id} style={styles.merchant}><View style={styles.merchantRow}><Text style={styles.merchantName}>• {item.name}</Text><Text style={styles.merchantPercent}>{percent(item.amount, merchantTotal)}%</Text></View><View style={styles.merchantTrack}><View style={[styles.merchantFill, { width: `${percent(item.amount, merchantTotal)}%` }]} /></View></View>) : <Text style={common.helper}>Chưa có nơi giao dịch gắn với khoản chi trong tháng.</Text>}</Card>
      <Card style={styles.behaviorCard}><View style={styles.cardHead}><View style={styles.headIcon}><Ionicons name="wallet-outline" size={19} color={color.greenDark} /></View><View style={{ flex: 1 }}><Text style={styles.behaviorTitle}>Phương thức thanh toán chủ đạo</Text><Text style={styles.behaviorHint}>Theo loại tài khoản đã dùng để ghi chi tiêu</Text></View></View>{payment.length ? <><View style={styles.paymentBar}>{payment.map(([type, amount], index) => <View key={type} style={{ width: `${percent(amount, paymentTotal)}%`, backgroundColor: ['#006948', '#2170e4', '#94a3a0', '#a36700'][index], height: 9 }} />)}</View><Text style={styles.paymentText}>{payment.map(([type, amount]) => `${accountLabels[type as keyof typeof accountLabels] ?? 'Khác'} ${percent(amount, paymentTotal)}%`).join(' · ')}</Text></> : <Text style={common.helper}>Chưa có khoản chi để xác định phương thức.</Text>}</Card>
      <Text style={styles.footnote}>Giao dịch chỉ lưu ngày, không lưu giờ chi tiêu. Các tiêu chí kỷ luật, săn ưu đãi và khung giờ chi tiêu trong bản mẫu chưa thể tính từ dữ liệu hiện có.</Text>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 16, paddingBottom: 22 }, hero: { backgroundColor: '#063d32', borderRadius: 18, padding: 20, gap: 13 }, heroBadge: { color: '#a9e9ca', borderColor: '#1c7657', borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, fontSize: 10, alignSelf: 'flex-start' }, heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, heroLabel: { color: '#bdebd1', fontSize: 12, fontWeight: '700' }, heroStatus: { color: '#bdebd1', backgroundColor: '#07543d', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, fontSize: 10 }, heroAmount: { color: color.white, fontSize: 30, fontWeight: '800' }, heroTrack: { backgroundColor: '#185d46', height: 6, borderRadius: 4 }, heroFill: { backgroundColor: '#68dba9', height: 6, borderRadius: 4 }, heroNote: { color: '#d4f5e2', fontSize: 11, lineHeight: 18 }, aspectCard: { gap: 14 }, cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 }, headIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#e7f8ef', alignItems: 'center', justifyContent: 'center' }, cardTitle: { color: color.navy, fontSize: 17, fontWeight: '800' }, radar: { alignItems: 'center', marginTop: 2 }, radarText: { color: color.muted, fontSize: 11, textAlign: 'center', marginTop: -11, lineHeight: 16 }, metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, borderTopWidth: 1, borderColor: '#e5ecf4', paddingTop: 12 }, metric: { width: '47%', flexGrow: 1, backgroundColor: '#edf4ff', borderRadius: 9, padding: 9, gap: 6 }, metricLabel: { color: color.navy, fontSize: 10 }, metricValue: { color: color.greenDark, fontSize: 12, fontWeight: '800' }, section: { color: color.navy, fontSize: 17, fontWeight: '800', marginTop: 2 }, behaviorCard: { gap: 13 }, behaviorTitle: { color: color.navy, fontSize: 13, fontWeight: '800' }, behaviorHint: { color: color.muted, fontSize: 10 }, merchant: { gap: 5 }, merchantRow: { flexDirection: 'row', justifyContent: 'space-between' }, merchantName: { color: color.navy, fontSize: 11 }, merchantPercent: { color: color.navy, fontSize: 11 }, merchantTrack: { backgroundColor: '#dfe9f7', height: 5, borderRadius: 5 }, merchantFill: { backgroundColor: color.greenDark, height: 5, borderRadius: 5 }, paymentBar: { height: 9, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', backgroundColor: '#dfe9f7' }, paymentText: { color: color.navy, fontSize: 11, lineHeight: 17 }, footnote: { color: color.muted, fontSize: 10, lineHeight: 16 },
});
