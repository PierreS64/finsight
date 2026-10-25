import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color } from '../theme';

const tabs = [
  { href: '/budgets' as const, label: 'Ngân sách' },
  { href: '/goals' as const, label: 'Mục tiêu' },
  { href: '/recurring' as const, label: 'Định kỳ' },
  { href: '/upcoming' as const, label: 'Sắp tới' },
];

export default function PlanningTabs({ variant = 'underline' }: { variant?: 'pill' | 'underline' }) {
  const path = usePathname();
  return <View style={[styles.row, variant === 'pill' ? styles.pillRow : styles.underlineRow]}>{tabs.map((tab) => {
    const active = path === tab.href;
    return <Pressable key={tab.href} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => router.replace(tab.href)} style={[styles.tab, variant === 'pill' ? styles.pillTab : styles.underlineTab, active && (variant === 'pill' ? styles.pillActive : styles.underlineActive)]}><Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text></Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 18 }, pillRow: { backgroundColor: '#edf4ff', borderRadius: 13, padding: 4 }, underlineRow: { backgroundColor: color.white, marginHorizontal: -20 }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center' }, pillTab: { borderRadius: 10, paddingVertical: 10 }, underlineTab: { minHeight: 45, borderBottomWidth: 2, borderColor: 'transparent' }, pillActive: { backgroundColor: color.white }, underlineActive: { borderColor: color.greenDark }, label: { color: color.navy, fontSize: 12, fontWeight: '700' }, activeLabel: { color: color.greenDark },
});
