import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createAccount, type AccountType } from '../../api';
import { useSession } from '../../session';
import { Card, Page, PrimaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

const types: { value: AccountType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'BANK', label: 'Ngân hàng', icon: 'business-outline' }, { value: 'E_WALLET', label: 'Ví điện tử', icon: 'wallet-outline' }, { value: 'CASH', label: 'Tiền mặt', icon: 'cash-outline' }, { value: 'OTHER', label: 'Khác', icon: 'card-outline' },
];

export default function AccountForm() {
  const { session } = useSession();
  const [type, setType] = useState<AccountType>('BANK');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (!session || busy || !name.trim()) return;
    const value = balance.trim().replace(',', '.');
    if (!/^-?\d{1,17}(?:\.\d{1,2})?$/.test(value)) { setError('Số dư đầu kỳ phải có tối đa hai chữ số thập phân.'); return; }
    setBusy(true); setError('');
    try { await createAccount(session, { name: name.trim(), accountType: type, openingBalance: value }); router.back(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được tài khoản.'); }
    finally { setBusy(false); }
  }
  return <Page style={styles.page}><View style={styles.header}><Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={color.navy} /></Pressable><Text style={styles.title}>Thêm tài khoản mới</Text><View style={{ width: 25 }} /></View>
    <Text style={styles.sectionLabel}>LOẠI TÀI KHOẢN</Text><View style={styles.types}>{types.map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: item.value === type }} key={item.value} onPress={() => setType(item.value)} style={[styles.type, item.value === type && styles.typeActive]}><Ionicons name={item.icon} size={25} color={item.value === type ? color.white : color.greenDark} style={[styles.typeIcon, item.value === type && styles.typeIconActive]} /><Text style={[styles.typeText, item.value === type && styles.typeTextActive]}>{item.label}</Text></Pressable>)}</View>
    <Card style={styles.details}><Text style={styles.sectionTitle}>Thông tin chi tiết</Text><Text style={common.label}>Tên tài khoản / Tên gợi nhớ *</Text><TextInput style={common.input} value={name} onChangeText={setName} maxLength={80} placeholder="Ví dụ: Tiền mặt trong ví" placeholderTextColor={color.muted} /><Text style={[common.label, styles.gap]}>Số dư đầu kỳ (VND) *</Text><TextInput style={common.input} value={balance} onChangeText={setBalance} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={color.muted} /><Text style={styles.hint}>Đây là số dư bạn tự khai báo. FinSight không tự đồng bộ ngân hàng.</Text></Card>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}<View style={styles.action}><PrimaryButton onPress={save} disabled={busy || !name.trim()}>{busy ? 'Đang lưu...' : 'Lưu tài khoản'}</PrimaryButton></View>
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 7 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 }, title: { color: color.navy, fontSize: 20, fontWeight: '800' }, sectionLabel: { color: color.muted, fontSize: 12, fontWeight: '800', marginBottom: 10 }, types: { flexDirection: 'row', gap: 8, marginBottom: 20 }, type: { flex: 1, borderWidth: 1, borderColor: color.border, borderRadius: 13, minHeight: 104, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: color.white }, typeActive: { borderColor: color.greenDark, backgroundColor: '#e6f8f0' }, typeIcon: { padding: 8, borderRadius: 20, backgroundColor: '#e4effd' }, typeIconActive: { backgroundColor: color.greenDark }, typeText: { color: color.navy, fontSize: 10, textAlign: 'center' }, typeTextActive: { color: color.greenDark, fontWeight: '800' }, details: { gap: 8 }, sectionTitle: { color: color.navy, fontSize: 20, fontWeight: '800', marginBottom: 12 }, gap: { marginTop: 14 }, hint: { color: color.muted, fontSize: 12, lineHeight: 18, marginTop: 11 }, action: { marginTop: 22, marginBottom: 15 } });
