import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createAccount, getAccounts, type Account, type AccountType } from '../../api';
import { formatVnd, sumBalances } from '../../money';
import { useSession } from '../../session';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

const types: { value: AccountType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'CASH', label: 'Tiền mặt', icon: 'cash-outline' }, { value: 'BANK', label: 'Ngân hàng', icon: 'business-outline' },
  { value: 'E_WALLET', label: 'Ví điện tử', icon: 'wallet-outline' }, { value: 'OTHER', label: 'Khác', icon: 'apps-outline' },
];

export default function Accounts() {
  const { session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CASH');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController();
    getAccounts(session, controller.signal).then((found) => { setAccounts(found); setLoaded(true); }).catch((reason: unknown) => { if (!controller.signal.aborted) { setMessage(reason instanceof Error ? reason.message : 'Không thể tải tài khoản.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session]));

  async function submit() {
    if (!session || busy || !name.trim()) return;
    const amount = openingBalance.trim().replace(',', '.');
    if (!/^-?\d{1,17}(?:\.\d{1,2})?$/.test(amount)) { setMessage('Số dư đầu kỳ phải có tối đa hai chữ số thập phân.'); return; }
    setBusy(true); setMessage('');
    try { const created = await createAccount(session, { name: name.trim(), accountType: type, openingBalance: amount }); setAccounts((current) => [...current, created]); setName(''); setOpeningBalance('0'); setMessage('Đã thêm tài khoản.'); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không thể tạo tài khoản.'); }
    finally { setBusy(false); }
  }

  return <Page><Brand subtitle="TÀI KHOẢN" /><Text style={[common.title, styles.title]}>Tài khoản của bạn</Text><Text style={[common.subtitle, styles.subtitle]}>Bạn tự tạo và cập nhật dữ liệu. FinSight không kết nối ngân hàng.</Text><SecondaryButton onPress={() => router.push('/net-worth')}>Xem tài sản ròng →</SecondaryButton><SecondaryButton onPress={() => router.push('/reconcile')}>Đối soát số dư →</SecondaryButton>
    <View style={styles.summary}><Text style={styles.summaryLabel}>TỔNG SỐ DƯ HIỆN TẠI</Text><Text style={styles.summaryValue}>{loaded ? formatVnd(sumBalances(accounts.map((item) => item.currentBalance))) : '—'}</Text><Text style={styles.summaryFoot}>{accounts.length} tài khoản do bạn quản lý</Text></View>
    <Text style={[common.sectionTitle, styles.sectionTitle]}>Danh sách tài khoản</Text><Card>{accounts.length ? accounts.map((account, index) => <View key={account.id} style={[styles.row, index > 0 && styles.divider]}><View style={styles.icon}><Ionicons name={types.find((item) => item.value === account.accountType)?.icon ?? 'wallet-outline'} size={22} color={color.greenDark} /></View><View style={styles.rowMain}><Text style={styles.rowName}>{account.name}</Text><Text style={styles.rowType}>{types.find((item) => item.value === account.accountType)?.label}</Text></View><Text style={styles.amount}>{formatVnd(account.currentBalance)}</Text></View>) : <View style={styles.empty}><Ionicons name="wallet-outline" size={29} color={color.greenDark} /><Text style={styles.emptyTitle}>Chưa có tài khoản</Text><Text style={common.helper}>Dùng biểu mẫu bên dưới để thêm tài khoản đầu tiên.</Text></View>}</Card>
    <Text style={[common.sectionTitle, styles.sectionTitle]}>Thêm tài khoản</Text><Card><Text style={common.label}>Tên tài khoản</Text><TextInput style={common.input} value={name} onChangeText={setName} maxLength={80} placeholder="Ví dụ: Tiền mặt" placeholderTextColor="#94a3b8" /><Text style={[common.label, styles.labelGap]}>Loại tài khoản</Text><View style={styles.types}>{types.map((item) => <Pressable accessibilityRole="button" key={item.value} onPress={() => setType(item.value)} style={[styles.type, type === item.value && styles.typeActive]}><Text style={[styles.typeText, type === item.value && styles.typeTextActive]}>{item.label}</Text></Pressable>)}</View><Text style={[common.label, styles.labelGap]}>Số dư đầu kỳ (VND)</Text><TextInput style={common.input} value={openingBalance} onChangeText={setOpeningBalance} keyboardType="decimal-pad" /><Text style={styles.formHint}>Đây là số dư bạn tự khai báo, không đồng bộ tự động.</Text><PrimaryButton onPress={submit} disabled={busy || !name.trim()}>{busy ? 'Đang lưu...' : 'Thêm tài khoản'}</PrimaryButton>{!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}</Card>
  </Page>;
}

const styles = StyleSheet.create({ title: { marginTop: 30 }, subtitle: { marginTop: 7, marginBottom: 22 }, summary: { backgroundColor: color.darkCard, borderRadius: 17, padding: 21 }, summaryLabel: { color: '#bad4df', fontSize: 11, fontWeight: '800', letterSpacing: 1 }, summaryValue: { color: '#6ee7b7', fontSize: 30, fontWeight: '800', marginTop: 14, fontVariant: ['tabular-nums'] }, summaryFoot: { color: '#bad4df', fontSize: 12, marginTop: 5 }, sectionTitle: { marginTop: 27, marginBottom: 12 }, row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }, divider: { borderTopWidth: 1, borderColor: color.border }, icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: color.greenLight }, rowMain: { flex: 1 }, rowName: { color: color.navy, fontSize: 14, fontWeight: '700' }, rowType: { color: color.muted, fontSize: 11, marginTop: 3 }, amount: { color: color.navy, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] }, empty: { alignItems: 'center', paddingVertical: 17, gap: 8 }, emptyTitle: { color: color.navy, fontSize: 15, fontWeight: '800' }, labelGap: { marginTop: 18 }, types: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, type: { borderRadius: 19, borderWidth: 1, borderColor: color.border, paddingHorizontal: 11, paddingVertical: 8 }, typeActive: { backgroundColor: color.greenLight, borderColor: '#6ee7b7' }, typeText: { color: color.muted, fontSize: 11, fontWeight: '700' }, typeTextActive: { color: color.greenDark }, formHint: { color: color.muted, fontSize: 11, marginTop: 10, marginBottom: 12 } });
