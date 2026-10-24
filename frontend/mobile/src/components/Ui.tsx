import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { color } from '../theme';

export function Brand({ subtitle }: { subtitle?: string }) {
  return <View style={styles.brand}><View style={styles.mark}><Text style={styles.markText}>F<Text style={styles.markDot}>.</Text></Text></View><View><Text style={styles.brandName}>FinSight</Text>{subtitle ? <Text style={styles.brandSubtitle}>{subtitle}</Text> : null}</View></View>;
}

export function Page({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.pageContent, style]}>{children}</ScrollView></SafeAreaView>;
}

export function PrimaryButton({ children, onPress, disabled = false, icon }: { children: ReactNode; onPress: () => void; disabled?: boolean; icon?: React.ComponentProps<typeof Ionicons>['name'] }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.primaryButton, disabled && styles.disabled]}><Text style={styles.primaryButtonText}>{children}</Text>{icon && <Ionicons name={icon} size={20} color={color.white} />}</Pressable>;
}

export function SecondaryButton({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{children}</Text></Pressable>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[styles.card, style]}>{children}</View>; }

export function Kicker({ children }: { children: ReactNode }) { return <Text style={styles.kicker}>{children}</Text>; }

export const common = StyleSheet.create({
  title: { fontSize: 31, color: color.navy, fontWeight: '800', letterSpacing: -1, lineHeight: 39 },
  subtitle: { fontSize: 15, color: color.muted, lineHeight: 23 },
  sectionTitle: { fontSize: 21, color: color.navy, fontWeight: '800', letterSpacing: -0.5 },
  label: { fontSize: 14, color: color.navy, fontWeight: '700', marginBottom: 8 },
  input: { minHeight: 50, borderWidth: 1, borderColor: color.border, backgroundColor: '#f1f5fd', borderRadius: 12, paddingHorizontal: 15, color: color.navy, fontSize: 16 },
  helper: { color: color.muted, fontSize: 13, lineHeight: 20 },
  message: { color: color.greenDark, fontSize: 13, lineHeight: 20, marginTop: 13 },
  error: { color: '#b91c1c', fontSize: 13, lineHeight: 20, marginTop: 13 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.canvas },
  pageContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 34, flexGrow: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 39, height: 39, backgroundColor: color.navy, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  markText: { color: color.white, fontSize: 23, fontWeight: '800', letterSpacing: -3 },
  markDot: { color: '#34d399' },
  brandName: { color: color.navy, fontSize: 22, fontWeight: '800', letterSpacing: -1.1 },
  brandSubtitle: { color: color.muted, fontSize: 10, fontWeight: '600', marginTop: 1 },
  primaryButton: { backgroundColor: color.green, borderRadius: 14, minHeight: 52, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 8 },
  primaryButtonText: { color: color.white, fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  secondaryButton: { backgroundColor: color.white, borderColor: color.border, borderWidth: 1, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryButtonText: { color: color.navy, fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: color.white, borderRadius: 17, borderWidth: 1, borderColor: color.border, padding: 18, shadowColor: color.navy, shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  kicker: { color: color.greenDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
});
