import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getProfile, saveProfile } from '../../api';
import { useSession } from '../../session';
import { Card, Page, PrimaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

export default function ProfileEdit() {
  const { session } = useSession();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    getProfile(session, controller.signal).then((value) => setName(value?.displayName || ''))
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được hồ sơ.'); });
    return () => controller.abort();
  }, [session]);
  async function save() {
    if (!session || busy || !name.trim()) return;
    setBusy(true); setError('');
    try { await saveProfile(session, name.trim()); router.back(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không lưu được hồ sơ.'); }
    finally { setBusy(false); }
  }
  return <Page style={styles.page}><View style={styles.header}><Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={color.navy} /></Pressable><Text style={styles.title}>Chỉnh sửa hồ sơ</Text><View style={{ width: 25 }} /></View>
    <View style={styles.avatar}><Text style={styles.initial}>{name.trim().slice(0, 2).toUpperCase() || 'FS'}</Text></View>
    <Text style={common.label}>Họ và tên</Text><TextInput style={styles.input} value={name} onChangeText={setName} maxLength={80} autoComplete="name" placeholder="Tên hiển thị của bạn" placeholderTextColor={color.muted} />
    <Text style={[common.label, styles.gap]}>Email liên hệ</Text><Card><Text style={styles.email}>{session?.user.email}</Text><Text style={common.helper}>Email được quản lý qua tài khoản đăng nhập Supabase.</Text></Card>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    <View style={styles.actions}><PrimaryButton onPress={save} disabled={busy || !name.trim()}>{busy ? 'Đang lưu...' : 'Lưu thay đổi'}</PrimaryButton><Pressable onPress={() => router.back()} style={styles.cancel}><Text style={styles.cancelText}>Hủy bỏ</Text></Pressable></View>
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 8 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }, title: { color: color.navy, fontSize: 20, fontWeight: '800' }, avatar: { width: 105, height: 105, borderRadius: 53, alignSelf: 'center', backgroundColor: '#e4effd', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }, initial: { color: color.greenDark, fontSize: 30, fontWeight: '800' }, input: { height: 56, backgroundColor: color.white, borderWidth: 1, borderColor: color.border, borderRadius: 13, paddingHorizontal: 17, color: color.navy, fontSize: 16 }, gap: { marginTop: 24 }, email: { color: color.navy, fontSize: 16, fontWeight: '700', marginBottom: 9 }, actions: { marginTop: 35 }, cancel: { padding: 17, alignItems: 'center' }, cancelText: { color: color.navy, fontWeight: '700' } });
