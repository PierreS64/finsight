import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getBudget, getCategories, getSafeToSpend, type BudgetSummary, type Category, type SafeToSpend } from '../../api';
import { Brand, Card, Page, common } from '../../components/Ui';
import PlanningTabs from '../../components/PlanningTabs';
import { formatVnd } from '../../money';
import { reportMonth } from '../../reportDate';
import { useSession } from '../../session';
import { color } from '../../theme';

const green = '#006948';
const categoryIcons: Record<Category['icon'], React.ComponentProps<typeof Ionicons>['name']> = {
  wallet: 'wallet-outline', gift: 'gift-outline', other: 'ellipsis-horizontal', food: 'restaurant-outline', transport: 'car-outline', home: 'home-outline', shopping: 'bag-outline', health: 'medkit-outline', education: 'school-outline',
};
const barWidth = (value: string): `${number}%` => `${Math.min(100, Math.max(0, Number.parseFloat(value) || 0))}%` as `${number}%`;
const percentage = (value: string) => `${Number.parseFloat(value).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
function moveMonth(month: string, delta: number) {
  const [year, number] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, number - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
function tint(icon: Category['icon']) {
  if (icon === 'food') return { foreground: '#a34f00', background: '#fff8e8' };
  if (icon === 'home') return { foreground: '#b42318', background: '#fff0f0' };
  if (icon === 'transport') return { foreground: '#0058be', background: '#eef5ff' };
  if (icon === 'shopping') return { foreground: green, background: '#ddfbef' };
  return { foreground: '#9333ea', background: '#faf0ff' };
}

export default function Budgets() {
  const { session } = useSession();
  const [month, setMonth] = useState(reportMonth);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [safe, setSafe] = useState<SafeToSpend | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setLoaded(false); setError('');
    Promise.all([getBudget(session, month, controller.signal), getCategories(session, controller.signal), month === reportMonth() ? getSafeToSpend(session, controller.signal) : Promise.resolve(null)])
      .then(([budget, items, amount]) => { if (!controller.signal.aborted) { setSummary(budget); setCategories(items); setSafe(amount); setLoaded(true); } })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được ngân sách.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session, month]));

  const total = summary?.total;
  const use = Number.parseFloat(total?.usedPercent || '0');
  const openForm = (categoryId?: string) => router.push({ pathname: '/budget-form', params: { month, ...(categoryId ? { categoryId } : {}) } });
  return <Page style={styles.page}>
    <View style={styles.header}><Brand /><View style={styles.headerActions}><Pressable accessibilityRole="button" accessibilityLabel="Thêm ngân sách" onPress={() => openForm()} style={styles.headerButton}><Ionicons name="add" size={23} color={green} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Hồ sơ" onPress={() => router.push('/profile')} style={styles.headerButton}><Ionicons name="person-outline" size={21} color={green} /></Pressable></View></View>
    <PlanningTabs variant="pill" />
    <View style={styles.periodRow}><View style={styles.period}><Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" onPress={() => setMonth(moveMonth(month, -1))}><Ionicons name="chevron-back" size={18} color={green} /></Pressable><Ionicons name="calendar-outline" size={19} color={green} /><Text style={styles.periodText}>Tháng {month.slice(5)}/{month.slice(0, 4)}</Text><Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" onPress={() => setMonth(moveMonth(month, 1))}><Ionicons name="chevron-forward" size={18} color={green} /></Pressable></View>{safe && <Text style={styles.muted}>Còn {safe.remainingDays} ngày</Text>}</View>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {!loaded && <Text style={common.helper}>Đang tải ngân sách...</Text>}
    {loaded && !error && <><Card style={styles.hero}><View style={styles.heroTop}><Text style={styles.muted}>Số tiền còn lại</Text><Text style={[styles.badge, use >= 90 ? styles.warning : styles.good]}>{use >= 100 ? 'Đạt tối đa' : use >= 90 ? 'Gần hết' : 'Kiểm soát tốt'}</Text></View><View style={styles.heroAmount}><Text style={[styles.amount, use >= 100 && { color: '#b42318' }]}>{total ? formatVnd(total.remaining) : '—'}</Text>{total && <Text style={styles.available}>Còn {percentage(String(Math.max(0, 100 - use)))} khả dụng</Text>}</View><View style={styles.track}><View style={[styles.fill, { width: barWidth(total?.usedPercent || '0'), backgroundColor: use >= 100 ? '#b42318' : use >= 90 ? '#f59e0b' : green }]} /></View><View style={styles.heroStats}><Text style={styles.stat}>Đã chi: {formatVnd(summary?.totalSpent || '0')}{total ? ` (${percentage(total.usedPercent)})` : ''}</Text><Text style={styles.stat}>Hạn mức: {total ? formatVnd(total.limitAmount) : 'Chưa đặt'}</Text></View>{safe?.safePerDay && safe.status === 'AVAILABLE' && <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/analytics-tool/[tool]', params: { tool: 'safe' } })} style={styles.safeBox}><Ionicons name="bulb-outline" size={21} color={green} /><Text style={styles.safeText}>Bình quân an toàn: <Text style={styles.safeStrong}>{formatVnd(safe.safePerDay)}/ngày</Text> trong {safe.remainingDays} ngày còn lại.</Text></Pressable>}</Card>
      <View style={styles.sectionHead}><Text style={styles.section}>Phân bổ danh mục</Text><Text style={styles.muted}>{summary?.categories.length || 0} danh mục</Text></View>
      {summary?.categories.length ? summary.categories.map((item) => {
        const icon = categories.find((entry) => entry.id === item.categoryId)?.icon || 'other';
        const palette = tint(icon);
        const usage = Number.parseFloat(item.values.usedPercent);
        const state = usage >= 100 ? 'Đạt tối đa' : usage >= 90 ? 'Gần hết' : usage <= 50 ? 'An toàn' : null;
        return <Pressable key={item.categoryId} accessibilityRole="button" onPress={() => openForm(item.categoryId)}><Card style={styles.category}><View style={styles.categoryRow}><View style={[styles.categoryIcon, { backgroundColor: palette.background }]}><Ionicons name={categoryIcons[icon]} size={22} color={palette.foreground} /></View><View style={styles.categoryInfo}><Text style={styles.categoryName}>{item.categoryName}</Text><Text style={styles.categorySub}>Đã chi {formatVnd(item.values.spent)} / {formatVnd(item.values.limitAmount)}</Text></View><View style={styles.categoryRight}><Text style={[styles.categoryBadge, { color: palette.foreground, backgroundColor: palette.background }]}>{state ? `${state} (${percentage(item.values.usedPercent)})` : percentage(item.values.usedPercent)}</Text><Text style={[styles.remaining, { color: palette.foreground }]}>Còn {formatVnd(item.values.remaining)}</Text></View></View><View style={styles.track}><View style={[styles.fill, { width: barWidth(item.values.usedPercent), backgroundColor: usage >= 100 ? '#b42318' : usage >= 90 ? '#f59e0b' : palette.foreground }]} /></View></Card></Pressable>;
      }) : <Card><Text style={styles.categoryName}>Chưa có ngân sách danh mục</Text><Text style={common.helper}>Thiết lập hạn mức cho các danh mục chi tiêu.</Text></Card>}
      {!total && <Pressable accessibilityRole="button" onPress={() => openForm()} style={styles.setup}><Ionicons name="add-circle-outline" size={21} color={green} /><Text style={styles.setupText}>Thêm ngân sách</Text></Pressable>}
    </>}
  </Page>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 6, paddingHorizontal: 16 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, headerActions: { flexDirection: 'row', gap: 9 }, headerButton: { backgroundColor: '#edf4ff', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  periodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, gap: 7 }, period: { flexDirection: 'row', gap: 9, alignItems: 'center', backgroundColor: color.white, borderWidth: 1, borderColor: '#d9e3f1', borderRadius: 23, paddingHorizontal: 11, paddingVertical: 9 }, periodText: { color: '#121c26', fontSize: 14, fontWeight: '700' }, muted: { color: '#6d7a72', fontSize: 12 },
  hero: { gap: 11, marginBottom: 19, padding: 18 }, heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, badge: { borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '700' }, good: { color: green, backgroundColor: '#d7f8e9' }, warning: { color: '#b42318', backgroundColor: '#ffe1dd' }, heroAmount: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 5 }, amount: { color: green, fontSize: 27, fontWeight: '800' }, available: { color: green, backgroundColor: '#edf4ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, fontSize: 11, fontWeight: '700' }, track: { backgroundColor: '#e4effd', borderRadius: 8, height: 9, overflow: 'hidden' }, fill: { height: 9, borderRadius: 8 }, heroStats: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, stat: { color: '#6d7a72', fontSize: 11, flex: 1 }, safeBox: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11, borderRadius: 10, borderWidth: 1, borderColor: '#dfe9f7', backgroundColor: '#edf4ff' }, safeText: { flex: 1, color: '#3d4a42', fontSize: 12, lineHeight: 18 }, safeStrong: { color: green, fontWeight: '800' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, section: { color: '#121c26', fontSize: 19, fontWeight: '800' }, category: { marginBottom: 11, gap: 16, padding: 15 }, categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, categoryIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, categoryInfo: { flex: 1 }, categoryName: { color: '#121c26', fontSize: 15, fontWeight: '800' }, categorySub: { color: '#6d7a72', fontSize: 11, lineHeight: 17, marginTop: 3 }, categoryRight: { alignItems: 'flex-end', maxWidth: 105 }, categoryBadge: { borderRadius: 15, paddingHorizontal: 7, paddingVertical: 4, fontSize: 10, fontWeight: '700', textAlign: 'center' }, remaining: { fontSize: 11, fontWeight: '700', marginTop: 5, textAlign: 'right' }, setup: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginVertical: 17 }, setupText: { color: green, fontWeight: '800' },
});
