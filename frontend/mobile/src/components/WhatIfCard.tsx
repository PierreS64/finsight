import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getCharts, getDashboard, getProfile, simulateWhatIf, type Charts, type DashboardSummary, type Profile, type WhatIfScenario } from '../api';
import { formatVnd } from '../money';
import { useSession } from '../session';
import { color } from '../theme';
import { Card, common } from './Ui';

const minor = (value: string) => { const [whole, cents = ''] = value.split('.'); return BigInt(whole) * 100n + BigInt(cents.padEnd(2, '0') || '0'); };
const money = (value: bigint) => `${value < 0n ? '-' : ''}${(value < 0n ? -value : value) / 100n}.${String((value < 0n ? -value : value) % 100n).padStart(2, '0')}`;
const percent = (part: bigint, whole: bigint) => whole > 0n ? `${Number(part * 1000n / whole) / 10}%` : '—';

export default function WhatIfCard({ month }: { month: string }) {
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [scenario, setScenario] = useState<WhatIfScenario | null>(null);
  const [error, setError] = useState('');
  const [widths, setWidths] = useState<Record<string, number>>({});
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setError(''); setScenario(null); setRates({}); setDashboard(null); setCharts(null);
    Promise.all([getProfile(session, controller.signal), getDashboard(session, month, controller.signal), getCharts(session, month, 'week', controller.signal)])
      .then(([foundProfile, foundDashboard, foundCharts]) => { setProfile(foundProfile); setDashboard(foundDashboard); setCharts(foundCharts); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được kịch bản.'); });
    return () => controller.abort();
  }, [session, month]));
  const categories = charts?.categories.slice(0, 3) ?? [];
  const saved = categories.reduce((sum, category) => sum + minor(category.amount) * BigInt(rates[category.categoryId] ?? 0) / 100n, 0n);
  const adjustment = saved === 0n ? '0.00' : money(-saved);
  useEffect(() => {
    if (!session || !dashboard || !charts) return;
    let active = true;
    setError('');
    simulateWhatIf(session, month, adjustment, null)
      .then((value) => { if (active) setScenario(value); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Không tính được kịch bản.'); });
    return () => { active = false; };
  }, [session, month, adjustment, dashboard, charts]);
  const displayName = profile?.displayName?.trim() || 'Tài khoản của bạn';
  const initials = displayName.split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase()).join('');
  const income = minor(dashboard?.income ?? '0');
  const actualNet = dashboard ? income - minor(dashboard.expense) : null;
  const projectedNet = scenario ? income - minor(scenario.projectedExpense) : null;
  return <View style={styles.wrapper}>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {!dashboard && !error && <Text style={common.helper}>Đang tải dữ liệu mô phỏng...</Text>}
    {dashboard && charts && <>
      <Card style={styles.identity}><View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View><View style={{ flex: 1 }}><Text style={styles.name}>{displayName}</Text><Text style={styles.subtitle}>Thu: {formatVnd(dashboard.income)} | Chi: {formatVnd(dashboard.expense)}</Text></View><Text style={styles.openBadge}>Kịch bản mở</Text></Card>
      <View style={styles.hero}><View style={styles.heroTop}><Text style={styles.heroLabel}>DỰ KIẾN TIẾT KIỆM THÊM</Text><Text style={styles.heroBadge}>Mô phỏng</Text></View><Text style={styles.heroAmount}>+{formatVnd(money(saved))}<Text style={styles.heroUnit}> / tháng</Text></Text><View style={styles.heroLine} /><Text style={styles.heroComparison}>Số dư hiện tại: {scenario ? formatVnd(scenario.actualBalance) : '—'}   →   Sau mô phỏng: {scenario ? formatVnd(scenario.projectedBalance) : '—'}</Text><View style={styles.heroTip}><Ionicons name="sparkles-outline" size={20} color="#68dba9" /><Text style={styles.heroTipText}>Thử điều chỉnh các danh mục đã ghi bên dưới để xem số dư giả định. Dữ liệu thật không thay đổi.</Text></View></View>
      <Text style={styles.section}>Bảng điều khiển giả lập</Text>
      {categories.length ? categories.map((category) => { const rate = rates[category.categoryId] ?? 0; const reduction = minor(category.amount) * BigInt(rate) / 100n; return <Card key={category.categoryId} style={styles.control}><View style={styles.controlHead}><View style={styles.controlIcon}><Ionicons name="pricetag-outline" size={21} color={color.greenDark} /></View><View style={{ flex: 1 }}><Text style={styles.controlName}>Giảm chi {category.categoryName}</Text><Text style={styles.subtitle}>Chi đã ghi: {formatVnd(category.amount)}</Text></View><Text style={styles.rateBadge}>-{rate}%</Text></View><View style={styles.controlValues}><Text style={styles.subtitle}>Mức giảm: {rate}%</Text><Text style={styles.reduction}>Tiết kiệm: +{formatVnd(money(reduction))}</Text></View><Pressable accessibilityRole="adjustable" accessibilityLabel={`Giảm chi ${category.categoryName}`} accessibilityValue={{ min: 0, max: 50, now: rate }} onLayout={(event) => setWidths((current) => ({ ...current, [category.categoryId]: event.nativeEvent.layout.width }))} onPress={(event) => { const width = widths[category.categoryId] ?? 1; const next = Math.min(50, Math.max(0, Math.round(event.nativeEvent.locationX / width * 10) * 5)); setRates((current) => ({ ...current, [category.categoryId]: next })); }} style={styles.slider}><View style={[styles.sliderFill, { width: `${rate * 2}%` }]} /><View style={[styles.thumb, { left: `${rate * 2}%` }]} /></Pressable><View style={styles.sliderLabels}><Text style={styles.subtitle}>0%</Text><Text style={styles.subtitle}>25%</Text><Text style={styles.subtitle}>50%</Text></View></Card>; }) : <Card><Text style={common.helper}>Chưa có khoản chi theo danh mục để tạo kịch bản giảm chi.</Text></Card>}
      <Card style={styles.compare}><View style={styles.compareHead}><Ionicons name="swap-horizontal-outline" size={22} color={color.greenDark} /><Text style={styles.compareTitle}>So sánh đối chiếu</Text>{saved > 0n && <Text style={styles.improvement}>+{formatVnd(money(saved))}</Text>}</View><View style={styles.compareCards}><View style={styles.before}><Text style={styles.subtitle}>Hiện tại (Thực tế)</Text><Text style={styles.compareAmount}>{actualNet === null ? '—' : formatVnd(money(actualNet))}</Text><Text style={styles.subtitle}>Thu trừ chi trong tháng</Text></View><View style={styles.after}><Text style={styles.afterLabel}>Sau mô phỏng</Text><Text style={styles.afterAmount}>{projectedNet === null ? '—' : formatVnd(money(projectedNet))}</Text><Text style={styles.afterLabel}>+{formatVnd(money(saved))} giả định</Text></View></View>{income > 0n && scenario && <View style={styles.rateRow}><Text style={styles.subtitle}>Tỷ lệ tích lũy thu nhập</Text><Text style={styles.rateText}>{percent(actualNet!, income)}  →  {percent(projectedNet!, income)}</Text></View>}</Card>
      <Text style={styles.footnote}>Mô phỏng giảm chi đã ghi theo danh mục, tối đa 50%. Không chỉnh sửa giao dịch hay khoản định kỳ và không dự đoán riêng chi tiêu tương lai.</Text>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { gap: 18, paddingBottom: 20 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 39, height: 39, borderRadius: 20, backgroundColor: '#85f8c4', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#003d2a', fontSize: 13, fontWeight: '800' }, name: { color: color.navy, fontSize: 14, fontWeight: '800' }, subtitle: { color: color.muted, fontSize: 11, lineHeight: 17 }, openBadge: { color: color.greenDark, backgroundColor: '#d1fae5', paddingHorizontal: 9, paddingVertical: 8, borderRadius: 15, fontSize: 10, fontWeight: '700' }, hero: { backgroundColor: '#063d32', borderRadius: 24, padding: 22, gap: 15 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between' }, heroLabel: { color: '#b0e5c8', fontSize: 11, fontWeight: '700' }, heroBadge: { color: '#83e9b7', fontSize: 10, backgroundColor: '#07543d', borderRadius: 13, paddingHorizontal: 8, paddingVertical: 4 }, heroAmount: { color: color.white, fontSize: 31, fontWeight: '800' }, heroUnit: { color: '#72c99f', fontSize: 14 }, heroLine: { height: 1, backgroundColor: '#ffffff20' }, heroComparison: { color: '#b9e8d0', fontSize: 12, lineHeight: 19 }, heroTip: { flexDirection: 'row', gap: 10, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff24', backgroundColor: '#ffffff10' }, heroTipText: { flex: 1, color: '#dcf9e9', fontSize: 11, lineHeight: 18 }, section: { color: color.navy, fontSize: 17, fontWeight: '800', marginTop: 4 }, control: { gap: 13 }, controlHead: { flexDirection: 'row', alignItems: 'center', gap: 10 }, controlIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: '#eafaf2', alignItems: 'center', justifyContent: 'center' }, controlName: { color: color.navy, fontSize: 13, fontWeight: '800' }, rateBadge: { color: color.greenDark, backgroundColor: '#e5edff', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, fontWeight: '800' }, controlValues: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, reduction: { color: color.greenDark, fontSize: 11, fontWeight: '800' }, slider: { height: 8, backgroundColor: '#dfe9f7', borderRadius: 5, justifyContent: 'center' }, sliderFill: { height: 8, backgroundColor: color.greenDark, borderRadius: 5 }, thumb: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: color.greenDark, borderWidth: 3, borderColor: color.white, marginLeft: -11, elevation: 2 }, sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' }, compare: { gap: 13 }, compareHead: { flexDirection: 'row', alignItems: 'center', gap: 8 }, compareTitle: { color: color.navy, fontSize: 15, fontWeight: '800', flex: 1 }, improvement: { color: color.greenDark, fontSize: 10, backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12 }, compareCards: { flexDirection: 'row', gap: 10 }, before: { flex: 1, backgroundColor: '#edf4ff', borderRadius: 14, padding: 12, gap: 6 }, after: { flex: 1, backgroundColor: '#d9fae9', borderRadius: 14, padding: 12, gap: 6 }, compareAmount: { color: color.navy, fontSize: 16, fontWeight: '800' }, afterAmount: { color: color.greenDark, fontSize: 16, fontWeight: '800' }, afterLabel: { color: color.greenDark, fontSize: 11 }, rateRow: { backgroundColor: '#f4f7fc', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between' }, rateText: { color: color.greenDark, fontSize: 11, fontWeight: '800' }, footnote: { color: color.muted, fontSize: 10, lineHeight: 15 },
});
