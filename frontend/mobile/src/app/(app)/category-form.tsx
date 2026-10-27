import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { deleteCategory, getCategories, saveCategory, type Category, type CategoryIcon, type CategoryType } from '../../api';
import { Card, Page, PrimaryButton, common } from '../../components/Ui';
import { useSession } from '../../session';
import { color } from '../../theme';

const green = '#006948';
const choices: { value: CategoryIcon; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'food', icon: 'restaurant-outline' }, { value: 'shopping', icon: 'bag-outline' }, { value: 'home', icon: 'home-outline' }, { value: 'transport', icon: 'car-outline' }, { value: 'health', icon: 'medkit-outline' }, { value: 'education', icon: 'school-outline' }, { value: 'wallet', icon: 'wallet-outline' }, { value: 'gift', icon: 'gift-outline' }, { value: 'other', icon: 'ellipsis-horizontal' },
];

export default function CategoryForm() {
  const { id, type } = useLocalSearchParams<{ id?: string; type?: CategoryType }>();
  const { session } = useSession();
  const [original, setOriginal] = useState<Category | null>(null);
  const [kind, setKind] = useState<CategoryType>(type === 'INCOME' ? 'INCOME' : 'EXPENSE');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<CategoryIcon>('food');
  const [loaded, setLoaded] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  useFocusEffect(useCallback(() => {
    if (!session || !id) return;
    const controller = new AbortController(); setLoaded(false); setError('');
    getCategories(session, controller.signal).then((items) => {
      if (controller.signal.aborted) return;
      const item = items.find((entry) => entry.id === id);
      if (!item) { setError('Không tìm thấy danh mục.'); return; }
      setOriginal(item); setKind(item.categoryType); setName(item.name); setIcon(item.icon); setLoaded(true);
    }).catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được danh mục.'); });
    return () => controller.abort();
  }, [session, id]));
  async function save() {
    if (!session || busy || original?.isDefault || !name.trim()) return;
    setBusy(true); setError('');
    try { await saveCategory(session, { name: name.trim(), categoryType: kind, icon }, id); router.back(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được danh mục.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!session || !id || original?.isDefault || busy) return;
    setBusy(true); setError('');
    try { await deleteCategory(session, id); setConfirm(false); router.back(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không xóa được danh mục.'); setConfirm(false); }
    finally { setBusy(false); }
  }
  return <Page style={styles.page}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#121c26" /></Pressable><Text style={styles.heading}>{id ? 'Chi tiết danh mục' : 'Thêm danh mục mới'}</Text><Pressable accessibilityRole="button" disabled={busy || original?.isDefault} onPress={save}><Text style={[styles.save, original?.isDefault && { opacity: 0.35 }]}>Lưu</Text></Pressable></View>
    <View style={styles.types}>{([{ key: 'EXPENSE', label: 'Khoản chi' }, { key: 'INCOME', label: 'Khoản thu' }] as const).map((item) => <Pressable key={item.key} accessibilityRole="button" disabled={original?.isDefault} onPress={() => setKind(item.key)} style={[styles.type, kind === item.key && styles.typeSelected]}><Text style={[styles.typeText, kind === item.key && { color: green }]}>{item.label}</Text></Pressable>)}</View>
    <Card style={styles.preview}><View style={styles.previewIcon}><Ionicons name={choices.find((item) => item.value === icon)?.icon || 'ellipsis-horizontal'} size={30} color={green} /></View><Text style={styles.previewName}>{name.trim() || 'Tên danh mục'}</Text><Text style={styles.previewType}>{kind === 'EXPENSE' ? 'Khoản chi' : 'Khoản thu'}</Text></Card>
    <Card style={styles.iconsCard}><Text style={styles.label}>Chọn biểu tượng</Text><View style={styles.icons}>{choices.map((item) => <Pressable key={item.value} accessibilityRole="button" accessibilityLabel={item.value} accessibilityState={{ selected: icon === item.value }} disabled={original?.isDefault} onPress={() => setIcon(item.value)} style={[styles.iconButton, icon === item.value && styles.iconSelected]}><Ionicons name={item.icon} size={23} color={icon === item.value ? green : '#3d4a42'} /></Pressable>)}</View></Card>
    <Card style={styles.nameCard}><Text style={styles.label}>Tên danh mục *</Text><TextInput accessibilityLabel="Tên danh mục" value={name} onChangeText={setName} editable={!original?.isDefault} maxLength={80} placeholder="Tên danh mục" placeholderTextColor="#6d7a72" style={styles.input} /></Card>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!loaded && <Text style={common.helper}>Đang tải danh mục...</Text>}
    {!original?.isDefault && <PrimaryButton onPress={save} disabled={busy || !loaded || !name.trim()}>{id ? 'Lưu danh mục' : 'Tạo danh mục'}</PrimaryButton>}
    {id && !original?.isDefault && <Pressable accessibilityRole="button" onPress={() => setConfirm(true)} style={styles.delete}><Ionicons name="trash-outline" size={18} color="#ba1a1a" /><Text style={styles.deleteText}>Xóa danh mục này</Text></Pressable>}
    {original?.isDefault && <Text style={styles.note}>Danh mục mặc định dùng chung và không thể sửa hoặc xóa.</Text>}
    <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}><View style={styles.overlay}><Pressable style={styles.scrim} onPress={() => setConfirm(false)} /><View style={styles.dialog}><Text style={styles.dialogTitle}>Xóa danh mục?</Text><Text style={common.helper}>Xóa danh mục {name}? Nếu danh mục đang được sử dụng, FinSight sẽ giữ lại để bảo toàn giao dịch.</Text><Pressable accessibilityRole="button" disabled={busy} onPress={remove} style={styles.danger}><Text style={styles.dangerText}>Xác nhận xóa</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setConfirm(false)} style={styles.cancel}><Text style={styles.cancelText}>Hủy</Text></Pressable></View></View></Modal>
  </Page>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 6, paddingHorizontal: 16, gap: 15 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { color: '#121c26', fontSize: 18, fontWeight: '800' }, save: { color: green, fontSize: 15, fontWeight: '800' }, types: { flexDirection: 'row', backgroundColor: '#e4effd', borderRadius: 12, padding: 5 }, type: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 9 }, typeSelected: { backgroundColor: color.white }, typeText: { color: '#3d4a42', fontSize: 12, fontWeight: '700' }, preview: { alignItems: 'center', gap: 7, padding: 19 }, previewIcon: { width: 77, height: 77, borderRadius: 39, backgroundColor: '#e7fbf2', alignItems: 'center', justifyContent: 'center' }, previewName: { color: '#121c26', fontSize: 18, fontWeight: '800' }, previewType: { color: green, fontSize: 11 }, iconsCard: { gap: 15 }, label: { color: '#121c26', fontSize: 13, fontWeight: '800' }, icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, iconButton: { width: 50, height: 50, borderRadius: 11, backgroundColor: '#edf4ff', alignItems: 'center', justifyContent: 'center' }, iconSelected: { backgroundColor: '#e7fbf2', borderWidth: 2, borderColor: green }, nameCard: { gap: 12 }, input: { color: '#121c26', backgroundColor: color.white, borderWidth: 1, borderColor: '#d9e3f1', borderRadius: 10, minHeight: 50, paddingHorizontal: 13 }, delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#fff4f4', borderRadius: 11, padding: 14 }, deleteText: { color: '#ba1a1a', fontWeight: '800' }, note: { color: '#6d7a72', fontSize: 11, textAlign: 'center', marginTop: 9 }, overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 23 }, scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0008' }, dialog: { backgroundColor: color.white, borderRadius: 16, padding: 20, gap: 13 }, dialogTitle: { color: '#121c26', fontSize: 18, fontWeight: '800' }, danger: { backgroundColor: '#ba1a1a', padding: 12, borderRadius: 10, alignItems: 'center' }, dangerText: { color: color.white, fontWeight: '800' }, cancel: { alignItems: 'center', padding: 9 }, cancelText: { color: '#3d4a42', fontWeight: '700' },
});
