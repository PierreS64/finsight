import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCategories, type Category, type CategoryIcon, type CategoryType } from '../../api';
import { Card, Page, common } from '../../components/Ui';
import { useSession } from '../../session';
import { color } from '../../theme';

const green = '#006948';
const icons: Record<CategoryIcon, React.ComponentProps<typeof Ionicons>['name']> = { wallet: 'wallet-outline', gift: 'gift-outline', other: 'ellipsis-horizontal', food: 'restaurant-outline', transport: 'car-outline', home: 'home-outline', shopping: 'bag-outline', health: 'medkit-outline', education: 'school-outline' };
function tint(icon: CategoryIcon) {
  if (icon === 'food') return { foreground: '#a34f00', background: '#fff8e8' };
  if (icon === 'home') return { foreground: '#0058be', background: '#eef5ff' };
  if (icon === 'transport') return { foreground: '#008c9c', background: '#e8fcff' };
  if (icon === 'shopping') return { foreground: '#9333ea', background: '#faf0ff' };
  return { foreground: green, background: '#e7fbf2' };
}

export default function Categories() {
  const { session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController(); setLoaded(false); setError('');
    getCategories(session, controller.signal).then((items) => { if (!controller.signal.aborted) { setCategories(items); setLoaded(true); } })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : 'Không tải được danh mục.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session]));
  const visible = categories.filter((item) => item.categoryType === type && item.name.toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN')));
  return <Page style={styles.page}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#121c26" /></Pressable><Text style={styles.heading}>Quản lý danh mục</Text><Pressable accessibilityRole="button" accessibilityLabel="Tìm kiếm danh mục" onPress={() => setSearchOpen((current) => !current)}><Ionicons name="search-outline" size={23} color="#3d4a42" /></Pressable></View>
    <View style={styles.tabs}>{([{ key: 'EXPENSE', label: 'Chi tiêu' }, { key: 'INCOME', label: 'Thu nhập' }] as const).map((item) => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: type === item.key }} onPress={() => setType(item.key)} style={[styles.tab, type === item.key && styles.tabSelected]}><Text style={[styles.tabText, type === item.key && { color: green }]}>{item.label}  {categories.filter((entry) => entry.categoryType === item.key).length}</Text></Pressable>)}</View>
    {searchOpen && <TextInput accessibilityLabel="Tìm danh mục" value={search} onChangeText={setSearch} placeholder="Tìm danh mục" placeholderTextColor="#6d7a72" style={styles.search} />}
    <Card style={styles.intro}><View style={styles.introIcon}><Ionicons name="bulb-outline" size={22} color={green} /></View><Text style={styles.introText}>Quản lý và tùy biến phân loại giao dịch để theo dõi báo cáo thu chi chính xác nhất.</Text></Card>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!loaded && <Text style={common.helper}>Đang tải danh mục...</Text>}
    {loaded && !error && <><View style={styles.sectionHead}><Text style={styles.section}>{type === 'EXPENSE' ? 'Danh mục chi tiêu' : 'Danh mục thu nhập'}</Text><Text style={styles.count}>{visible.length} danh mục</Text></View><Card style={styles.list}>{visible.length ? visible.map((item, index) => {
      const palette = tint(item.icon);
      return <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/category-form', params: { id: item.id } })} style={[styles.row, index > 0 && styles.divider]}><View style={[styles.icon, { backgroundColor: palette.background }]}><Ionicons name={icons[item.icon]} size={23} color={palette.foreground} /></View><View style={styles.rowText}><Text style={styles.rowName}>{item.name}</Text><Text style={styles.rowSub}>{item.isDefault ? 'Danh mục mặc định' : 'Danh mục của bạn'}</Text></View><Ionicons name="chevron-forward" size={20} color="#bccac0" /></Pressable>;
    }) : <Text style={common.helper}>Chưa có danh mục trong loại này.</Text>}</Card><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/category-form', params: { type } })} style={styles.add}><Ionicons name="add" size={21} color={color.white} /><Text style={styles.addText}>Tạo danh mục mới</Text></Pressable></>}
  </Page>;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingTop: 5 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 23 }, heading: { color: '#121c26', fontSize: 18, fontWeight: '800' }, tabs: { flexDirection: 'row', backgroundColor: '#e4effd', padding: 5, borderRadius: 12, marginBottom: 17 }, tab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 9 }, tabSelected: { backgroundColor: color.white }, tabText: { color: '#3d4a42', fontSize: 13, fontWeight: '700' }, search: { backgroundColor: color.white, borderWidth: 1, borderColor: '#d9e3f1', borderRadius: 11, paddingHorizontal: 13, minHeight: 46, marginBottom: 13, color: '#121c26' }, intro: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }, introIcon: { width: 40, height: 40, borderRadius: 11, backgroundColor: '#e7fbf2', alignItems: 'center', justifyContent: 'center' }, introText: { color: '#3d4a42', fontSize: 12, lineHeight: 19, flex: 1 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, section: { color: '#121c26', fontSize: 17, fontWeight: '800' }, count: { color: '#6d7a72', fontSize: 11 }, list: { padding: 0, overflow: 'hidden' }, row: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 }, divider: { borderTopWidth: 1, borderColor: '#edf4ff' }, icon: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, rowText: { flex: 1 }, rowName: { color: '#121c26', fontSize: 14, fontWeight: '800' }, rowSub: { color: '#6d7a72', fontSize: 11, marginTop: 4 }, add: { backgroundColor: green, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 20, minHeight: 52 }, addText: { color: color.white, fontSize: 14, fontWeight: '800' },
});
