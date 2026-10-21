import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getProfile, saveProfile, type Profile } from '../../api';
import { Brand, Card, Page, PrimaryButton, common } from '../../components/Ui';
import { useSession } from '../../session';
import { color } from '../../theme';
import { supabase } from '../../../supabase';

export default function ProfileScreen() {
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState(String(session?.user.user_metadata?.display_name || ''));
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    getProfile(session, controller.signal).then((found) => { setProfile(found); if (found) setName(found.displayName || ''); setLoaded(true); }).catch((reason: unknown) => { if (!controller.signal.aborted) { setMessage(reason instanceof Error ? reason.message : 'Không tải được hồ sơ.'); setLoaded(true); } });
    return () => controller.abort();
  }, [session]);
  async function save() {
    if (!session || !name.trim() || busy) return;
    setBusy(true); setMessage('');
    try { const saved = await saveProfile(session, name.trim()); setProfile(saved); setMessage('Đã lưu hồ sơ.'); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không thể lưu hồ sơ.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    if (!supabase || busy) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(error.message);
    setBusy(false);
  }
  return <Page><Brand subtitle="CÁ NHÂN" /><Text style={[common.title, styles.title]}>Hồ sơ của bạn</Text><Text style={[common.subtitle, styles.subtitle]}>Tên hiển thị và thông tin tài khoản FinSight.</Text>
    <Card style={styles.profileCard}><View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase() || 'F'}</Text></View><Text style={styles.name}>{profile?.displayName || 'Hoàn tất hồ sơ'}</Text><Text style={common.helper}>{session?.user.email}</Text><View style={styles.divider} /><Text style={common.label}>Tên hiển thị</Text><TextInput style={common.input} value={name} onChangeText={setName} maxLength={80} placeholder="Tên của bạn" placeholderTextColor="#94a3b8" /><PrimaryButton onPress={save} disabled={busy || !name.trim()}>{busy ? 'Đang lưu...' : 'Lưu hồ sơ'}</PrimaryButton>{loaded && !profile && <Text style={common.helper}>Bạn chưa lưu hồ sơ. Hãy nhập tên để hoàn tất.</Text>}{!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}</Card>
    <Card style={styles.info}><View style={styles.infoRow}><Ionicons name="mail-outline" size={20} color={color.greenDark} /><View><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoValue}>{session?.user.email}</Text></View></View><View style={[styles.infoRow, styles.divider]}><Ionicons name="cash-outline" size={20} color={color.greenDark} /><View><Text style={styles.infoLabel}>Đơn vị tiền</Text><Text style={styles.infoValue}>{profile?.currencyCode || 'VND'}</Text></View></View></Card>
    <Pressable accessibilityRole="button" style={styles.signOut} onPress={signOut}><Ionicons name="log-out-outline" size={20} color="#b91c1c" /><Text style={styles.signOutText}>Đăng xuất</Text></Pressable><Text style={styles.footnote}>Dữ liệu được truy cập bằng phiên đăng nhập của bạn.</Text>
  </Page>;
}

const styles = StyleSheet.create({ title: { marginTop: 30 }, subtitle: { marginTop: 7, marginBottom: 25 }, profileCard: { alignItems: 'stretch' }, avatar: { width: 65, height: 65, borderRadius: 20, backgroundColor: color.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, avatarText: { color: color.greenDark, fontSize: 27, fontWeight: '800' }, name: { color: color.navy, fontWeight: '800', fontSize: 21, marginBottom: 3 }, divider: { borderTopWidth: 1, borderTopColor: color.border, marginTop: 22, paddingTop: 20 }, info: { marginTop: 16 }, infoRow: { flexDirection: 'row', alignItems: 'center', gap: 13 }, infoLabel: { color: color.muted, fontSize: 11 }, infoValue: { color: color.navy, fontSize: 14, fontWeight: '700', marginTop: 4 }, signOut: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', borderRadius: 13, padding: 16, marginTop: 25 }, signOutText: { color: '#b91c1c', fontSize: 14, fontWeight: '800' }, footnote: { textAlign: 'center', color: color.muted, fontSize: 11, marginTop: 20 } });
