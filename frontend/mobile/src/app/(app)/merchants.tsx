import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { deleteMerchant, getMerchants, saveMerchant, type Merchant } from '../../api';
import { useSession } from '../../session';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

export default function Merchants() {
  const { session } = useSession();
  const [items, setItems] = useState<Merchant[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    getMerchants(session, controller.signal).then((found) => { setItems(found); setLoading(false); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setMessage(reason instanceof Error ? reason.message : 'Không tải được nơi giao dịch.'); setLoading(false); } });
    return () => controller.abort();
  }, [session]);

  function reset() { setName(''); setEditingId(null); setDeletingId(null); }
  async function save() {
    if (!session || busy || !name.trim()) return;
    setBusy(true); setMessage('');
    try {
      const saved = await saveMerchant(session, name.trim(), editingId ?? undefined);
      setItems((current) => editingId ? current.map((item) => item.id === editingId ? saved : item) : [...current, saved]);
      reset(); setMessage('Đã lưu nơi giao dịch.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không lưu được nơi giao dịch.'); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!session || busy) return;
    setBusy(true); setMessage('');
    try {
      await deleteMerchant(session, id);
      setItems((current) => current.filter((item) => item.id !== id));
      if (editingId === id) reset();
      setDeletingId(null); setMessage('Đã xóa nơi giao dịch.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không xóa được nơi giao dịch.'); }
    finally { setBusy(false); }
  }
  return <Page><View style={styles.header}><Brand subtitle="NƠI GIAO DỊCH" /><Pressable accessibilityRole="button" onPress={() => router.back()}><Ionicons name="close-outline" size={27} color={color.navy} /></Pressable></View>
    <Text style={common.title}>Nơi giao dịch</Text><Text style={[common.subtitle, styles.subtitle]}>Lưu cửa hàng hoặc đơn vị thường gặp để gắn vào giao dịch của bạn.</Text>
    <Card><Text style={common.sectionTitle}>Danh sách của bạn</Text>{loading ? <Text style={common.helper}>Đang tải...</Text> : items.length ? items.map((item, index) => <View key={item.id} style={[styles.row, index > 0 && styles.divider]}><View style={styles.icon}><Ionicons name="storefront-outline" size={22} color={color.greenDark} /></View><Text style={styles.name}>{item.name}</Text><Pressable accessibilityRole="button" onPress={() => { setName(item.name); setEditingId(item.id); setDeletingId(null); }}><Text style={styles.link}>Sửa</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeletingId(item.id)}><Text style={styles.delete}>Xóa</Text></Pressable>{deletingId === item.id && <View style={styles.confirm}><Text style={common.helper}>Xóa “{item.name}”?</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => remove(item.id)}><Text style={styles.delete}>Xác nhận</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeletingId(null)}><Text style={styles.link}>Hủy</Text></Pressable></View>}</View>) : <Text style={common.helper}>Chưa có nơi giao dịch nào.</Text>}</Card>
    <Text style={[common.sectionTitle, styles.sectionTitle]}>{editingId ? 'Sửa nơi giao dịch' : 'Thêm nơi giao dịch'}</Text><Card><Text style={common.label}>Tên cửa hàng hoặc đơn vị</Text><TextInput style={common.input} value={name} onChangeText={setName} maxLength={100} placeholder="Ví dụ: Siêu thị An" placeholderTextColor="#94a3b8" /><PrimaryButton onPress={save} disabled={busy || !name.trim()}>{busy ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm mới'}</PrimaryButton>{editingId && <SecondaryButton onPress={reset}>Hủy chỉnh sửa</SecondaryButton>}</Card>
    {!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}
    <Text style={styles.rule}>Nơi giao dịch chỉ thuộc tài khoản của bạn. Hãy đổi giao dịch liên quan trước khi xóa.</Text>
  </Page>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 29 },
  subtitle: { marginTop: 7, marginBottom: 23 }, sectionTitle: { marginTop: 28, marginBottom: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingVertical: 11 }, divider: { borderTopWidth: 1, borderColor: color.border },
  icon: { width: 42, height: 42, backgroundColor: color.greenLight, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, color: color.navy, fontWeight: '700' }, link: { color: color.greenDark, fontSize: 12, fontWeight: '800' },
  delete: { color: '#b91c1c', fontSize: 12, fontWeight: '800' }, confirm: { width: '100%', backgroundColor: '#fff7f7', borderRadius: 9, padding: 11, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  rule: { color: color.muted, fontSize: 11, lineHeight: 18, marginTop: 19, marginBottom: 14 },
});
