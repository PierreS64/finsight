import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getDashboard, getInsights, getSafeToSpend, type DashboardSummary, type Insights, type SafeToSpend } from '../../api';
import { useSession } from '../../session';
import { reportMonth } from '../../reportDate';
import { formatVnd } from '../../money';
import { Brand, Card, Page, common } from '../../components/Ui';
import { color } from '../../theme';

const tools = [
  { key: 'trends', title: 'Xu hướng thu chi', caption: 'Biến động theo chu kỳ', icon: 'trending-up-outline' as const },
  { key: 'health', title: 'Nhận xét tài chính', caption: 'Sức khỏe dòng tiền', icon: 'shield-checkmark-outline' as const },
  { key: 'explanation', title: 'Giải thích chi tiêu', caption: 'Nguyên nhân biến động', icon: 'analytics-outline' as const },
  { key: 'profile', title: 'Hồ sơ hành vi', caption: 'Thói quen tiêu dùng', icon: 'finger-print-outline' as const },
  { key: 'what-if', title: 'Mô phỏng What-If', caption: 'Kịch bản giả lập', icon: 'options-outline' as const },
  { key: 'forecast', title: 'Dự báo cuối tháng', caption: 'Ước tính chốt kỳ', icon: 'wallet-outline' as const },
  { key: 'safe', title: 'Chi tiêu an toàn', caption: 'Ngưỡng định mức cá nhân', icon: 'shield-outline' as const },
];

export default function Analytics() {
  const { session } = useSession();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [safe, setSafe] = useState<SafeToSpend | null>(null);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setError('');
    Promise.all([getDashboard(session, reportMonth(), controller.signal), getInsights(session, reportMonth(), controller.signal), getSafeToSpend(session, controller.signal)])
      .then(([summary, cards, amount]) => { setDashboard(summary); setInsights(cards); setSafe(amount); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được phân tích.'); });
    return () => controller.abort();
  }, [session]));
  return <Page style={styles.page}><View style={styles.header}><Brand /><Pressable accessibilityRole="button" onPress={() => router.push('/profile')} style={styles.avatar}><Ionicons name="person-outline" size={22} color={color.navy} /></Pressable></View>
    <View style={styles.period}><Text style={styles.periodText}>Tháng {reportMonth().slice(5)}/{reportMonth().slice(0, 4)}</Text></View>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {insights?.cards.length ? <Card style={styles.insight}><Ionicons name="trending-up-outline" size={22} color="#825100" /><View style={{ flex: 1 }}><Text style={styles.insightLabel}>TÓM LƯỢC TRỌNG YẾU</Text><Text style={styles.insightText}>{insights.cards[0].content}</Text></View></Card> : <Card style={styles.insight}><Text style={styles.insightText}>Chưa có nhận xét nổi bật từ dữ liệu tháng này.</Text></Card>}
    <Card style={styles.summary}><View style={styles.summaryTop}><View><Text style={common.helper}>Thặng dư khả dụng</Text><Text style={styles.net}>{dashboard ? formatVnd(dashboard.netFlow) : '—'}</Text></View></View><View style={styles.metricRow}><View style={styles.metric}><Text style={common.helper}>Tổng thu</Text><Text style={styles.income}>{dashboard ? formatVnd(dashboard.income) : '—'}</Text></View><View style={styles.metric}><Text style={common.helper}>Tổng chi</Text><Text style={styles.expense}>{dashboard ? formatVnd(dashboard.expense) : '—'}</Text></View></View></Card>
    <Pressable accessibilityRole="button" onPress={() => router.push('/analytics-tool/safe')} style={styles.safeCard}><Ionicons name="shield-checkmark-outline" size={25} color={color.greenDark} /><View style={{ flex: 1 }}><Text style={styles.safeLabel}>KHUYẾN NGHỊ ĐIỀU TIẾT</Text><Text style={styles.safeText}>{safe?.safePerDay ? `Mức chi an toàn: ${formatVnd(safe.safePerDay)}/ngày` : 'Xem mức chi an toàn theo ngân sách của bạn'}</Text></View></Pressable>
    <Text style={styles.section}>Công cụ phân tích sâu</Text><View style={styles.grid}>{tools.slice(0, 6).map((tool) => <Pressable key={tool.key} accessibilityRole="button" onPress={() => router.push({ pathname: '/analytics-tool/[tool]', params: { tool: tool.key } })} style={styles.tool}><Ionicons name={tool.icon} size={23} color={color.greenDark} /><Text style={styles.toolTitle}>{tool.title}</Text><Text style={common.helper}>{tool.caption}</Text></Pressable>)}</View><Pressable accessibilityRole="button" onPress={() => router.push('/analytics-tool/safe')} style={styles.safeTool}><Ionicons name={tools[6].icon} size={24} color={color.greenDark} /><View style={{ flex: 1 }}><Text style={styles.toolTitle}>{tools[6].title}</Text><Text style={common.helper}>{tools[6].caption}</Text></View><Ionicons name="arrow-forward" size={21} color={color.greenDark} /></Pressable>
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 8 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }, avatar: { width: 37, height: 37, borderRadius: 19, backgroundColor: '#e4effd', alignItems: 'center', justifyContent: 'center' }, period: { backgroundColor: '#edf4ff', padding: 13, borderRadius: 12, alignItems: 'center', marginBottom: 16 }, periodText: { color: color.greenDark, fontWeight: '700' }, insight: { flexDirection: 'row', gap: 12, backgroundColor: '#fffbf2', marginBottom: 15 }, insightLabel: { color: '#825100', fontSize: 11, fontWeight: '800' }, insightText: { color: color.navy, fontSize: 13, lineHeight: 19 }, summary: { marginBottom: 15 }, summaryTop: { marginBottom: 17 }, net: { color: color.greenDark, fontSize: 28, fontWeight: '800', marginTop: 6 }, metricRow: { flexDirection: 'row', gap: 10 }, metric: { flex: 1, backgroundColor: '#edf4ff', borderRadius: 12, padding: 12, gap: 5 }, income: { color: color.greenDark, fontWeight: '800', fontSize: 16 }, expense: { color: '#b91c1c', fontWeight: '800', fontSize: 16 }, safeCard: { flexDirection: 'row', gap: 12, padding: 16, borderWidth: 1, borderColor: '#b8dbd0', borderRadius: 16, backgroundColor: '#f2fbf6', marginBottom: 22 }, safeLabel: { color: color.greenDark, fontSize: 11, fontWeight: '800' }, safeText: { color: color.navy, fontSize: 13, marginTop: 4 }, section: { color: color.navy, fontSize: 20, fontWeight: '800', marginBottom: 12 }, grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }, tool: { width: '48%', backgroundColor: color.white, borderWidth: 1, borderColor: color.border, borderRadius: 15, padding: 15, minHeight: 112, gap: 5 }, toolTitle: { color: color.navy, fontSize: 14, fontWeight: '800', marginTop: 5 }, safeTool: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: color.white, borderWidth: 1, borderColor: color.border, borderRadius: 15, padding: 15, marginTop: 10, marginBottom: 20 } });
