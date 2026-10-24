import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAccounts, getDashboard, getInsights, getProfile, getSpendingExplanation, type Account, type DashboardSummary, type Insights, type SpendingExplanation } from '../../api';
import { Brand, Card, Page, PrimaryButton, Kicker, common } from '../../components/Ui';
import SpendingProfileCard from '../../components/SpendingProfileCard';
import WhatIfCard from '../../components/WhatIfCard';
import ChartsCard from '../../components/ChartsCard';
import SpendingTrendsCard from '../../components/SpendingTrendsCard';
import ExpenseForecastCard from '../../components/ExpenseForecastCard';
import UpcomingExpensesCard from '../../components/UpcomingExpensesCard';
import SafeToSpendCard from '../../components/SafeToSpendCard';
import FinancialHealthCard from '../../components/FinancialHealthCard';
import { formatVnd } from '../../money';
import { useSession } from '../../session';
import { color } from '../../theme';

const currentMonth = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };

export default function Dashboard() {
  const { session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightError, setInsightError] = useState('');
  const [explanation, setExplanation] = useState<SpendingExplanation | null>(null);
  const [explanationError, setExplanationError] = useState('');
  const [month, setMonth] = useState(currentMonth);
  const [monthInput, setMonthInput] = useState(currentMonth);
  const [name, setName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController();
    setLoaded(false); setError(''); setInsights(null); setInsightError(''); setExplanation(null); setExplanationError('');
    Promise.all([getAccounts(session, controller.signal), getProfile(session, controller.signal), getDashboard(session, month, controller.signal)])
      .then(([foundAccounts, profile, summary]) => { setAccounts(foundAccounts); setDashboard(summary); setName(profile?.displayName || String(session.user.user_metadata?.display_name || '')); setLoaded(true); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu.'); setLoaded(true); } });
    getInsights(session, month, controller.signal)
      .then(setInsights)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setInsightError(reason instanceof Error ? reason.message : 'Không tải được insight.'); });
    getSpendingExplanation(session, month, controller.signal)
      .then(setExplanation)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setExplanationError(reason instanceof Error ? reason.message : 'Không tải được giải thích chi tiêu.'); });
    return () => controller.abort();
  }, [session, month]));
  function viewMonth() {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthInput)) { setError('Tháng phải có dạng YYYY-MM.'); return; }
    setMonth(monthInput); setDashboard(null); setError('');
  }
  return <Page><View style={styles.header}><Brand subtitle="TỔNG QUAN" /><Pressable accessibilityRole="button" onPress={() => router.replace('/profile')} style={styles.avatar}><Ionicons name="person-outline" size={23} color={color.navy} /></Pressable></View>
    <Text style={styles.hello}>Chào {name || 'bạn'} 👋</Text><Text style={styles.intro}>Dữ liệu tài chính bạn đã lưu trong FinSight.</Text>
    <Card style={styles.monthCard}><Text style={common.label}>Tháng xem báo cáo (YYYY-MM)</Text><View style={styles.monthRow}><TextInput style={[common.input, styles.monthInput]} value={monthInput} onChangeText={setMonthInput} placeholder="2026-10" placeholderTextColor="#94a3b8" /><Pressable accessibilityRole="button" onPress={viewMonth} style={styles.monthButton}><Text style={styles.monthButtonText}>Xem</Text></Pressable></View></Card>
    <View style={styles.balanceCard}><View style={styles.balanceHead}><Text style={styles.balanceLabel}>TỔNG SỐ DƯ HIỆN TẠI</Text><Ionicons name="wallet-outline" size={22} color="#b8e7dc" /></View><Text style={styles.balanceValue}>{loaded && dashboard && !error ? formatVnd(dashboard.totalBalance) : '—'}</Text><Text style={styles.balanceFoot}>Số dư đầu kỳ cộng thu, trừ chi đã ghi nhận · không đồng bộ ngân hàng</Text><View style={styles.balanceDivider} /><View style={styles.balanceDetails}><View><Text style={styles.balanceSmall}>Tài khoản</Text><Text style={styles.balanceSmallValue}>{loaded && dashboard && !error ? dashboard.accountCount : '—'}</Text></View><View><Text style={styles.balanceSmall}>Giao dịch tháng</Text><Text style={styles.balanceSmallValue}>{loaded && dashboard && !error ? dashboard.transactionCount : '—'}</Text></View></View></View>
    {!loaded && <Text style={common.helper}>Đang tải tổng quan...</Text>}{!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    <View style={styles.metrics}><Card style={styles.metric}><Text style={styles.metricLabel}>THU NHẬP THÁNG</Text><Text style={[styles.metricValue, styles.income]}>{dashboard && !error ? formatVnd(dashboard.income) : '—'}</Text></Card><Card style={styles.metric}><Text style={styles.metricLabel}>CHI TIÊU THÁNG</Text><Text style={[styles.metricValue, styles.expense]}>{dashboard && !error ? formatVnd(dashboard.expense) : '—'}</Text></Card></View>
    <Card style={styles.budgetCard}><Text style={styles.metricLabel}>NGÂN SÁCH CÒN LẠI</Text><Text style={[styles.metricValue, dashboard?.budget?.remaining.startsWith('-') && styles.over]}>{dashboard?.budget ? formatVnd(dashboard.budget.remaining) : '—'}</Text><Text style={common.helper}>{dashboard?.budget ? `Hạn mức ${formatVnd(dashboard.budget.limitAmount)} · đã dùng ${dashboard.budget.usedPercent}%` : 'Chưa đặt ngân sách tổng cho tháng này'}</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/budgets')}><Text style={styles.seeAll}>Xem ngân sách ›</Text></Pressable></Card>
    <Pressable accessibilityRole="button" onPress={() => router.push('/assistant')} style={styles.aiLink}><Text style={styles.seeAll}>✦ Hỏi trợ lý FinSight về các chỉ số của bạn ›</Text></Pressable>
    <Text style={[common.sectionTitle, styles.section]}>Insight trong {month}</Text>
    {!!insightError && <Text accessibilityRole="alert" style={common.error}>{insightError}</Text>}
    {!insights && !insightError && <Text style={common.helper}>Đang tính insight...</Text>}
    {insights && (insights.cards.length ? insights.cards.map((card, index) => <Card key={`${card.type}-${index}`} style={[styles.insightCard, card.severity === 'CRITICAL' && styles.criticalCard]}><Kicker>{card.severity === 'CRITICAL' ? 'CẦN CHÚ Ý' : 'CẢNH BÁO'}</Kicker><Text style={styles.insightTitle}>{card.title}</Text><Text style={styles.insightText}>{card.content}</Text><Text style={common.helper}>Kỳ {card.period} · Ngưỡng {card.thresholdPercent}%</Text></Card>) : <Card style={styles.noInsights}><Text style={styles.emptyTitle}>Chưa có insight cho tháng này</Text><Text style={common.helper}>Thẻ sẽ xuất hiện khi chi tiêu tăng rõ rệt hoặc ngân sách tiến gần hạn mức.</Text></Card>)}
    <Text style={[common.sectionTitle, styles.section]}>Vì sao chi tiêu thay đổi?</Text>
    {!!explanationError && <Text accessibilityRole="alert" style={common.error}>{explanationError}</Text>}
    {!explanation && !explanationError && <Text style={common.helper}>Đang so sánh hai tháng...</Text>}
    {explanation && <Card style={styles.explanationCard}><Text style={common.helper}>So sánh toàn bộ tháng {explanation.month} với {explanation.previousMonth}. Khoản thu/hoàn tiền ghi là thu nhập và chuyển khoản không tính vào chi tiêu.</Text><View style={styles.explanationTotals}><View><Text style={styles.explanationLabel}>THÁNG TRƯỚC</Text><Text style={styles.explanationAmount}>{formatVnd(explanation.previousTotal)}</Text></View><View><Text style={styles.explanationLabel}>THÁNG ĐANG XEM</Text><Text style={styles.explanationAmount}>{formatVnd(explanation.currentTotal)}</Text></View></View><Text style={styles.explanationChange}>Chênh lệch: {formatVnd(explanation.changeAmount)}</Text>{explanation.categories.length ? explanation.categories.map((item) => <View key={item.categoryId} style={styles.explanationRow}><View style={{ flex: 1 }}><Text style={styles.explanationName}>{item.categoryName}</Text><Text style={common.helper}>{formatVnd(item.previousAmount)} → {formatVnd(item.currentAmount)}</Text></View><View style={styles.explanationRight}><Text style={styles.explanationName}>{formatVnd(item.changeAmount)}</Text><Text style={common.helper}>{item.contributionPercent === null ? 'Hai chiều bù trừ' : `${item.contributionPercent}% ròng`}</Text></View></View>) : <Text style={common.helper}>Chưa có thay đổi chi tiêu theo danh mục.</Text>}<Text style={styles.explanationFoot}>Tổng chênh lệch các danh mục bằng chênh lệch hai tháng. Tỷ lệ có thể vượt 100% khi các danh mục bù trừ nhau.</Text></Card>}
    <SpendingProfileCard month={month} />
    {month === currentMonth() && <FinancialHealthCard />}
    <ChartsCard month={month} />
    <SpendingTrendsCard month={month} />
    {month === currentMonth() && <ExpenseForecastCard />}
    <UpcomingExpensesCard />
    <SafeToSpendCard />
    <WhatIfCard month={month} />
    {dashboard && dashboard.accountCount === 0 && dashboard.transactionCount === 0 && <Card style={styles.emptySummary}><Text style={styles.emptyTitle}>Chưa có dữ liệu tài chính</Text><Text style={common.helper}>Thêm tài khoản và giao dịch đầu tiên để xem tổng quan tháng.</Text></Card>}
    <Text style={[common.sectionTitle, styles.section]}>Bắt đầu từ đây</Text><View style={styles.quickRow}><Pressable accessibilityRole="button" onPress={() => router.replace('/accounts')} style={styles.quick}><View style={styles.quickIcon}><Ionicons name="wallet-outline" size={23} color={color.greenDark} /></View><Text style={styles.quickLabel}>Tài khoản</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.replace('/transactions')} style={styles.quick}><View style={[styles.quickIcon, { backgroundColor: color.blueLight }]}><Ionicons name="receipt-outline" size={23} color={color.blue} /></View><Text style={styles.quickLabel}>Giao dịch</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.replace('/budgets')} style={styles.quick}><View style={[styles.quickIcon, { backgroundColor: '#f1f5f9' }]}><Ionicons name="pie-chart-outline" size={23} color={color.navy} /></View><Text style={styles.quickLabel}>Ngân sách</Text></Pressable></View>
    <Card style={styles.notice}><View style={styles.noticeIcon}><Ionicons name="information-circle-outline" size={23} color={color.greenDark} /></View><View style={{ flex: 1 }}><Kicker>DỮ LIỆU MINH BẠCH</Kicker><Text style={styles.noticeText}>Chỉ số tháng tính từ giao dịch bạn đã nhập. Số dư hiện tại tính từ mọi giao dịch đã lưu.</Text></View></Card>
    <View style={styles.sectionHead}><Text style={common.sectionTitle}>Tài khoản gần đây</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/accounts')}><Text style={styles.seeAll}>Xem tất cả ›</Text></Pressable></View>
    <Card>{accounts.length ? accounts.slice(0, 4).map((account, index) => <View key={account.id} style={[styles.accountRow, index > 0 && styles.rowDivider]}><View style={styles.accountIcon}><Ionicons name={account.accountType === 'CASH' ? 'cash-outline' : 'wallet-outline'} size={21} color={color.greenDark} /></View><View style={{ flex: 1 }}><Text style={styles.accountName}>{account.name}</Text><Text style={styles.accountCaption}>Số dư hiện tại</Text></View><Text style={styles.accountAmount}>{formatVnd(account.currentBalance)}</Text></View>) : <View style={styles.empty}><Text style={styles.emptyTitle}>Chưa có tài khoản</Text><Text style={common.helper}>Thêm tài khoản đầu tiên để xem dữ liệu của bạn ở đây.</Text><PrimaryButton onPress={() => router.replace('/accounts')}>Thêm tài khoản</PrimaryButton></View>}</Card>
  </Page>;
}

const styles = StyleSheet.create({
  aiLink: { marginTop: 18, padding: 12, borderWidth: 1, borderColor: color.border, borderRadius: 12, backgroundColor: color.white },
  monthCard: { marginBottom: 16 }, monthRow: { flexDirection: 'row', gap: 10 }, monthInput: { flex: 1 }, monthButton: { minWidth: 70, backgroundColor: color.green, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, monthButtonText: { color: color.white, fontWeight: '800' },
  metrics: { flexDirection: 'row', gap: 10, marginBottom: 10 }, metric: { flex: 1 }, metricLabel: { color: color.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, metricValue: { color: color.navy, fontSize: 20, fontWeight: '800', marginTop: 12 }, income: { color: color.greenDark }, expense: { color: '#b45309' }, over: { color: '#b91c1c' }, budgetCard: { gap: 9, marginBottom: 13 }, emptySummary: { gap: 8, marginBottom: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }, avatar: { width: 39, height: 39, borderRadius: 20, backgroundColor: color.blueLight, alignItems: 'center', justifyContent: 'center' },
  hello: { color: color.navy, fontSize: 27, fontWeight: '800', letterSpacing: -0.8 }, intro: { color: color.muted, fontSize: 13, marginTop: 4, marginBottom: 22 },
  balanceCard: { backgroundColor: color.darkCard, borderRadius: 19, padding: 22, marginBottom: 24 }, balanceHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, balanceLabel: { color: '#bad4df', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 }, balanceValue: { color: color.white, fontSize: 33, fontWeight: '800', marginTop: 18, fontVariant: ['tabular-nums'] }, balanceFoot: { color: '#c2d3d9', fontSize: 11, lineHeight: 17, marginTop: 8 }, balanceDivider: { height: 1, backgroundColor: '#ffffff30', marginVertical: 19 }, balanceDetails: { flexDirection: 'row', justifyContent: 'space-between' }, balanceSmall: { color: '#bad4df', fontSize: 11, marginBottom: 5 }, balanceSmallValue: { color: '#6ee7b7', fontSize: 16, fontWeight: '800' },
  section: { marginBottom: 12 }, quickRow: { flexDirection: 'row', gap: 9, marginBottom: 18 }, quick: { flex: 1, minHeight: 94, backgroundColor: color.white, borderColor: color.border, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center', gap: 9 }, quickIcon: { width: 40, height: 40, backgroundColor: color.greenLight, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, quickLabel: { color: color.navy, fontSize: 11, fontWeight: '700' },
  notice: { backgroundColor: '#e4f6f2', flexDirection: 'row', gap: 12, marginBottom: 24 }, noticeIcon: { width: 38, height: 38, backgroundColor: '#c8ede2', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, noticeText: { color: color.navy, fontSize: 12, lineHeight: 18, marginTop: 5 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, seeAll: { color: color.greenDark, fontWeight: '700', fontSize: 12 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }, rowDivider: { borderTopWidth: 1, borderColor: color.border }, accountIcon: { width: 40, height: 40, backgroundColor: color.greenLight, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, accountName: { fontSize: 13, fontWeight: '700', color: color.navy }, accountCaption: { fontSize: 10, color: color.muted, marginTop: 3 }, accountAmount: { fontSize: 12, color: color.navy, fontWeight: '800', fontVariant: ['tabular-nums'] }, empty: { alignItems: 'center', paddingVertical: 17, gap: 9 }, emptyTitle: { color: color.navy, fontSize: 16, fontWeight: '800' },
  insightCard: { backgroundColor: '#f0fdf4', borderColor: '#a7f3d0', gap: 8, marginBottom: 10 }, criticalCard: { backgroundColor: '#fef2f2', borderColor: '#fecaca' }, insightTitle: { color: color.navy, fontSize: 16, fontWeight: '800' }, insightText: { color: color.navy, fontSize: 12, lineHeight: 19 }, noInsights: { gap: 8, marginBottom: 12 },
  explanationCard: { gap: 12, marginBottom: 15 }, explanationTotals: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, explanationLabel: { color: color.muted, fontSize: 10, fontWeight: '800' }, explanationAmount: { color: color.navy, fontSize: 15, fontWeight: '800', marginTop: 5 }, explanationChange: { color: color.greenDark, fontSize: 15, fontWeight: '800' }, explanationRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, borderColor: color.border, paddingTop: 10 }, explanationName: { color: color.navy, fontSize: 12, fontWeight: '800' }, explanationRight: { alignItems: 'flex-end' }, explanationFoot: { color: color.muted, fontSize: 11, lineHeight: 16 },
});
