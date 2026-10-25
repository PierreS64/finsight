import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color } from '../theme';

const tabs = [
  { href: '/budgets' as const, label: 'Ngân sách' },
  { href: '/goals' as const, label: 'Mục tiêu' },
  { href: '/recurring' as const, label: 'Định kỳ' },
  { href: '/upcoming' as const, label: 'Sắp tới' },
];

export default function PlanningTabs() {
  const path = usePathname();
  return <View style={styles.row}>{tabs.map((tab) => <Pressable key={tab.href} accessibilityRole="tab" accessibilityState={{ selected: path === tab.href }} onPress={() => router.replace(tab.href)} style={[styles.tab, path === tab.href && styles.active]}><Text style={[styles.label, path === tab.href && styles.activeLabel]}>{tab.label}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', backgroundColor: '#edf4ff', borderRadius: 13, padding: 4, marginBottom: 18 }, tab: { flex: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 10 }, active: { backgroundColor: color.white }, label: { color: color.navy, fontSize: 12, fontWeight: '700' }, activeLabel: { color: color.greenDark } });
