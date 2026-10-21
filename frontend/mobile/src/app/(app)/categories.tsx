import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { deleteCategory, getCategories, saveCategory, type Category, type CategoryIcon, type CategoryType } from '../../api';
import { useSession } from '../../session';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

const icons: { value: CategoryIcon; label: string; name: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'wallet', label: 'Ví', name: 'wallet-outline' }, { value: 'gift', label: 'Quà', name: 'gift-outline' },
  { value: 'food', label: 'Ăn uống', name: 'restaurant-outline' }, { value: 'transport', label: 'Di chuyển', name: 'car-outline' },
  { value: 'home', label: 'Nhà', name: 'home-outline' }, { value: 'shopping', label: 'Mua sắm', name: 'bag-outline' },
  { value: 'health', label: 'Sức khỏe', name: 'medkit-outline' }, { value: 'education', label: 'Học tập', name: 'school-outline' },
  { value: 'other', label: 'Khác', name: 'apps-outline' },
];

export default function Categories() {
  const { session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<CategoryIcon>('other');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    getCategories(session, controller.signal).then((found) => { setCategories(found); setLoading(false); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setMessage(reason instanceof Error ? reason.message : 'Không tải được danh mục.'); setLoading(false); } });
    return () => controller.abort();
  }, [session]);

  function reset() { setName(''); setIcon('other'); setEditingId(null); setDeletingId(null); }
  function edit(category: Category) { setType(category.categoryType); setName(category.name); setIcon(category.icon); setEditingId(category.id); setDeletingId(null); setMessage(''); }
  async function save() {
    if (!session || busy || !name.trim()) return;
    setBusy(true); setMessage('');
    try {
      const saved = await saveCategory(session, { name: name.trim(), categoryType: type, icon }, editingId ?? undefined);
      setCategories((current) => editingId ? current.map((item) => item.id === editingId ? saved : item) : [...current, saved]);
      reset(); setMessage('Đã lưu danh mục.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không lưu được danh mục.'); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!session || busy) return;
    setBusy(true); setMessage('');
    try {
      await deleteCategory(session, id);
      setCategories((current) => current.filter((item) => item.id !== id));
      if (editingId === id) reset();
      setDeletingId(null); setMessage('Đã xóa danh mục.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không xóa được danh mục.'); }
    finally { setBusy(false); }
  }
  const visible = categories.filter((category) => category.categoryType === type);
  return <Page><View style={styles.header}><Brand subtitle="DANH MỤC THU CHI" /><Pressable accessibilityRole="button" onPress={() => router.back()}><Ionicons name="close-outline" size={27} color={color.navy} /></Pressable></View>
    <Text style={common.title}>Danh mục của bạn</Text><Text style={[common.subtitle, styles.subtitle]}>Tổ chức các khoản thu nhập và chi tiêu theo cách bạn quen dùng.</Text>
    <View style={styles.tabs}><Pressable accessibilityRole="button" onPress={() => { setType('EXPENSE'); reset(); }} style={[styles.tab, type === 'EXPENSE' && styles.activeTab]}><Text style={[styles.tabText, type === 'EXPENSE' && styles.activeTabText]}>Chi tiêu</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { setType('INCOME'); reset(); }} style={[styles.tab, type === 'INCOME' && styles.activeTab]}><Text style={[styles.tabText, type === 'INCOME' && styles.activeTabText]}>Thu nhập</Text></Pressable></View>
    <Card><Text style={styles.cardTitle}>{type === 'EXPENSE' ? 'Danh mục chi tiêu' : 'Danh mục thu nhập'}</Text>{loading ? <Text style={common.helper}>Đang tải danh mục...</Text> : visible.map((category, index) => <View key={category.id} style={[styles.row, index > 0 && styles.divider]}><View style={styles.icon}><Ionicons name={icons.find((item) => item.value === category.icon)?.name ?? 'apps-outline'} size={22} color={color.greenDark} /></View><View style={styles.rowMain}><Text style={styles.rowName}>{category.name}</Text><Text style={styles.rowDetail}>{category.isDefault ? 'Mặc định · chỉ xem' : 'Danh mục của bạn'}</Text></View>{!category.isDefault && <View style={styles.rowActions}><Pressable accessibilityRole="button" onPress={() => edit(category)}><Text style={styles.link}>Sửa</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeletingId(category.id)}><Text style={styles.delete}>Xóa</Text></Pressable></View>}{deletingId === category.id && <View style={styles.confirm}><Text style={common.helper}>Xóa danh mục “{category.name}”?</Text><Pressable accessibilityRole="button" onPress={() => remove(category.id)} disabled={busy}><Text style={styles.delete}>Xác nhận xóa</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeletingId(null)}><Text style={styles.link}>Hủy</Text></Pressable></View>}</View>)}{!loading && !visible.length && <Text style={common.helper}>Chưa có danh mục trong loại này.</Text>}</Card>
    <Text style={[common.sectionTitle, styles.sectionTitle]}>{editingId ? 'Sửa danh mục' : 'Thêm danh mục'}</Text><Card><Text style={common.label}>Tên danh mục</Text><TextInput style={common.input} value={name} onChangeText={setName} maxLength={80} placeholder="Ví dụ: Cà phê" placeholderTextColor="#94a3b8" /><Text style={[common.label, styles.labelGap]}>Biểu tượng</Text><View style={styles.iconPicker}>{icons.map((item) => <Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: icon === item.value }} key={item.value} onPress={() => setIcon(item.value)} style={[styles.iconChoice, icon === item.value && styles.iconChoiceActive]}><Ionicons name={item.name} size={22} color={icon === item.value ? color.greenDark : color.muted} /></Pressable>)}</View><PrimaryButton onPress={save} disabled={busy || !name.trim()}>{busy ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm danh mục'}</PrimaryButton>{editingId && <SecondaryButton onPress={reset}>Hủy chỉnh sửa</SecondaryButton>}</Card>
    {!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}
    <Text style={styles.rule}>Danh mục mặc định dùng chung và không thể sửa hoặc xóa. Danh mục riêng không thể xóa khi đã được giao dịch hoặc ngân sách sử dụng.</Text>
  </Page>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 29 }, subtitle: { marginTop: 7, marginBottom: 23 },
  tabs: { flexDirection: 'row', gap: 9, marginBottom: 17 }, tab: { borderWidth: 1, borderColor: color.border, borderRadius: 11, backgroundColor: color.white, paddingHorizontal: 20, paddingVertical: 12 }, activeTab: { backgroundColor: color.greenLight, borderColor: '#6ee7b7' }, tabText: { fontSize: 13, fontWeight: '700', color: color.muted }, activeTabText: { color: color.greenDark },
  cardTitle: { color: color.navy, fontSize: 18, fontWeight: '800', marginBottom: 11 }, row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingVertical: 10 }, divider: { borderTopWidth: 1, borderColor: color.border }, icon: { width: 42, height: 42, backgroundColor: color.greenLight, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, rowMain: { flex: 1 }, rowName: { color: color.navy, fontSize: 14, fontWeight: '700' }, rowDetail: { color: color.muted, fontSize: 11, marginTop: 3 }, rowActions: { flexDirection: 'row', gap: 12 }, link: { color: color.greenDark, fontSize: 12, fontWeight: '800' }, delete: { color: '#b91c1c', fontSize: 12, fontWeight: '800' }, confirm: { width: '100%', backgroundColor: '#fff7f7', borderRadius: 9, padding: 11, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sectionTitle: { marginTop: 28, marginBottom: 13 }, labelGap: { marginTop: 18 }, iconPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 18 }, iconChoice: { width: 44, height: 44, borderRadius: 11, borderWidth: 1, borderColor: color.border, backgroundColor: color.canvas, alignItems: 'center', justifyContent: 'center' }, iconChoiceActive: { backgroundColor: color.greenLight, borderColor: '#6ee7b7' }, rule: { color: color.muted, fontSize: 11, lineHeight: 18, marginTop: 19, marginBottom: 14 },
});
