import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { getProfile, type Profile } from '../../api';
import { useSession } from '../../session';
import { supabase } from '../../../supabase';
import { Card, Page, PrimaryButton, SecondaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

export default function ProfileScreen() {
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController();
    getProfile(session, controller.signal).then(setProfile)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được hồ sơ.'); });
    return () => controller.abort();
  }, [session]));
  async function signOut() {
    if (!supabase || busy) return;
    setBusy(true); setError('');
    const { error: failure } = await supabase.auth.signOut();
    if (failure) setError(failure.message);
    else setConfirm(false);
    setBusy(false);
  }
  const name = profile?.displayName || String(session?.user.user_metadata?.display_name || 'Hồ sơ của bạn');
  return <Page style={styles.page}><View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={color.navy} /></Pressable><Text style={styles.title}>Cá nhân & Cài đặt</Text><View style={{ width: 25 }} /></View>
    <Card style={styles.profileCard}><View style={styles.identity}><View style={styles.avatar}><Text style={styles.initial}>{name.slice(0, 2).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.name}>{name}</Text><Text style={common.helper}>{session?.user.email}</Text></View></View><SecondaryButton onPress={() => router.push('/profile-edit')}>Chỉnh sửa hồ sơ</SecondaryButton></Card>
    <Text style={styles.section}>TÀI KHOẢN & BẢO MẬT</Text><Card style={styles.menu}><Pressable accessibilityRole="button" onPress={() => router.push('/profile-edit')} style={styles.row}><Ionicons name="person-outline" size={23} color={color.greenDark} /><Text style={styles.rowLabel}>Chỉnh sửa hồ sơ</Text><Ionicons name="chevron-forward" size={20} color={color.muted} /></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/change-password')} style={styles.row}><Ionicons name="lock-closed-outline" size={23} color={color.greenDark} /><Text style={styles.rowLabel}>Đổi mật khẩu</Text><Ionicons name="chevron-forward" size={20} color={color.muted} /></Pressable></Card>
    <Text style={styles.section}>THIẾT LẬP ỨNG DỤNG & DỮ LIỆU</Text><Card style={styles.menu}><View style={styles.row}><Ionicons name="cash-outline" size={23} color={color.greenDark} /><View style={{ flex: 1 }}><Text style={styles.rowLabel}>Đơn vị tiền tệ</Text><Text style={common.helper}>{profile?.currencyCode || 'VND'} (đ)</Text></View></View></Card>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    <Pressable accessibilityRole="button" style={styles.signOut} onPress={() => setConfirm(true)}><Ionicons name="log-out-outline" size={21} color="#b91c1c" /><Text style={styles.signOutText}>Đăng xuất</Text></Pressable>
    <Modal transparent visible={confirm} animationType="slide" onRequestClose={() => setConfirm(false)}><View style={styles.backdrop}><View style={styles.sheet}><View style={styles.handle} /><View style={styles.logoutIcon}><Ionicons name="log-out-outline" size={30} color="#b91c1c" /></View><Text style={styles.sheetTitle}>Đăng xuất tài khoản?</Text><Text style={styles.sheetText}>Bạn có chắc chắn muốn đăng xuất khỏi tài khoản FinSight trên thiết bị này không?</Text><Card style={styles.account}><Text style={styles.name}>{name}</Text><Text style={common.helper}>{session?.user.email}</Text></Card><PrimaryButton onPress={signOut} disabled={busy}>{busy ? 'Đang đăng xuất...' : 'Đăng xuất'}</PrimaryButton><SecondaryButton onPress={() => setConfirm(false)}>Ở lại ứng dụng</SecondaryButton></View></View></Modal>
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 7 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, title: { color: color.navy, fontSize: 20, fontWeight: '800' }, profileCard: { marginBottom: 22 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 13 }, avatar: { width: 55, height: 55, borderRadius: 28, backgroundColor: '#e4effd', alignItems: 'center', justifyContent: 'center' }, initial: { color: color.greenDark, fontSize: 20, fontWeight: '800' }, name: { color: color.navy, fontSize: 18, fontWeight: '800' }, section: { color: color.muted, fontSize: 12, fontWeight: '800', marginBottom: 9 }, menu: { padding: 0, overflow: 'hidden', marginBottom: 22 }, row: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderBottomWidth: 1, borderBottomColor: color.border }, rowLabel: { color: color.navy, fontSize: 15, fontWeight: '700', flex: 1 }, signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 17, marginTop: 10 }, signOutText: { color: '#b91c1c', fontWeight: '800' }, backdrop: { flex: 1, backgroundColor: '#0009', justifyContent: 'flex-end' }, sheet: { backgroundColor: color.white, borderTopLeftRadius: 27, borderTopRightRadius: 27, padding: 24, alignItems: 'center', gap: 13 }, handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#d6ded9', marginBottom: 5 }, logoutIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' }, sheetTitle: { color: color.navy, fontSize: 22, fontWeight: '800' }, sheetText: { color: color.muted, textAlign: 'center', lineHeight: 22 }, account: { width: '100%', backgroundColor: '#edf4ff' } });
