import { usePathname, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '../theme';

const items = [
  { href: '/dashboard' as const, label: 'Tổng quan', icon: 'grid-outline' as const },
  { href: '/transactions' as const, label: 'Giao dịch', icon: 'receipt-outline' as const },
  { href: '/camera' as const, label: 'Camera', icon: 'camera-outline' as const },
  { href: '/budgets' as const, label: 'Kế hoạch', icon: 'wallet-outline' as const },
  { href: '/analytics' as const, label: 'Phân tích', icon: 'bar-chart-outline' as const },
];

export default function BottomNav() {
  const path = usePathname();
  const currentPath = path === '/' ? '/camera' : path;
  if (!items.some((item) => currentPath === item.href) && !['/goals', '/recurring', '/upcoming'].includes(currentPath)) return null;
  return <SafeAreaView edges={['bottom']} style={styles.safe}><View style={styles.row}>{items.map((item) => {
    const selected = currentPath === item.href || (item.href === '/budgets' && ['/goals', '/recurring', '/upcoming'].includes(currentPath));
    return <Pressable accessibilityRole="button" accessibilityState={{ selected }} key={item.href} onPress={() => router.replace(item.href)} style={[styles.item, item.href === '/camera' && styles.cameraItem]}><View style={[item.href === '/camera' && styles.cameraCircle, selected && item.href === '/camera' && styles.cameraSelected]}><Ionicons name={item.icon} size={item.href === '/camera' ? 29 : 23} color={item.href === '/camera' ? color.white : selected ? color.greenDark : '#667085'} /></View><Text style={[styles.label, selected && styles.selected]}>{item.label}</Text></Pressable>;
  })}</View></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { backgroundColor: color.white, borderTopWidth: 1, borderTopColor: color.border }, row: { flexDirection: 'row', paddingTop: 8 }, item: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 }, cameraItem: { marginTop: -22 }, cameraCircle: { width: 61, height: 61, borderRadius: 31, backgroundColor: '#006948', borderWidth: 4, borderColor: color.white, alignItems: 'center', justifyContent: 'center', elevation: 4 }, cameraSelected: { backgroundColor: '#00855d' }, label: { fontSize: 10, color: '#667085', fontWeight: '700' }, selected: { color: color.greenDark } });
