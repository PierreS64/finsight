import { usePathname, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '../theme';

const items = [
  { href: '/dashboard' as const, label: 'Tổng quan', icon: 'grid-outline' as const },
  { href: '/transactions' as const, label: 'Giao dịch', icon: 'receipt-outline' as const },
  { href: '/accounts' as const, label: 'Tài khoản', icon: 'wallet-outline' as const },
  { href: '/budgets' as const, label: 'Ngân sách', icon: 'pie-chart-outline' as const },
  { href: '/profile' as const, label: 'Cá nhân', icon: 'person-outline' as const },
];

export default function BottomNav() {
  const path = usePathname();
  return <SafeAreaView edges={['bottom']} style={styles.safe}><View style={styles.row}>{items.map((item) => {
    const selected = path === item.href;
    return <Pressable accessibilityRole="button" accessibilityState={{ selected }} key={item.href} onPress={() => router.replace(item.href)} style={styles.item}><Ionicons name={item.icon} size={23} color={selected ? color.greenDark : color.muted} /><Text style={[styles.label, selected && styles.selected]}>{item.label}</Text></Pressable>;
  })}</View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { backgroundColor: color.white, borderTopWidth: 1, borderTopColor: color.border }, row: { flexDirection: 'row', paddingTop: 8 }, item: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 }, label: { fontSize: 10, color: color.muted, fontWeight: '700' }, selected: { color: color.greenDark } });
