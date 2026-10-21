import { useState } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../supabase';
import { Brand, Page, PrimaryButton, SecondaryButton, common } from '../components/Ui';
import { color } from '../theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    if (!supabase || busy) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setMessage(error.message);
    else setPassword('');
    setBusy(false);
  }

  async function resetPassword() {
    if (!supabase || !email.trim() || busy) { setMessage('Nhập email trước khi đặt lại mật khẩu.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL('reset-password') });
    setMessage(error?.message ?? 'Nếu email đã đăng ký, bạn sẽ nhận hướng dẫn đặt lại mật khẩu.');
    setBusy(false);
  }

  return <Page><View style={styles.top}><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={23} color={color.navy} /></Pressable><Brand /></View>
    <Text style={styles.kicker}>ĐĂNG NHẬP TÀI KHOẢN</Text><Text style={common.title}>Chào mừng trở lại!</Text><Text style={[common.subtitle, styles.subtitle]}>Đăng nhập để tiếp tục quản lý tài chính của bạn.</Text>
    <Text style={common.label}>Email</Text><TextInput style={common.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="ban@example.com" placeholderTextColor="#94a3b8" />
    <Text style={[common.label, styles.fieldLabel]}>Mật khẩu</Text><TextInput style={common.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" placeholder="Nhập mật khẩu" placeholderTextColor="#94a3b8" />
    <Pressable accessibilityRole="button" onPress={resetPassword} style={styles.forgot}><Text style={styles.link}>Quên mật khẩu?</Text></Pressable>
    <PrimaryButton icon="arrow-forward" onPress={submit} disabled={busy || !email.trim() || !password || !supabase}>{busy ? 'Đang xử lý...' : 'Đăng nhập'}</PrimaryButton>
    {!supabase && <Text style={common.error}>Chưa cấu hình Supabase. Xem frontend/mobile/.env.example.</Text>}
    {!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}
    <View style={styles.divider}><View style={styles.line} /><Text style={styles.dividerText}>LẦN ĐẦU DÙNG FINSIGHT?</Text><View style={styles.line} /></View>
    <SecondaryButton onPress={() => router.push('/sign-up')}>Tạo tài khoản mới</SecondaryButton><Text style={styles.footnote}>FinSight không yêu cầu mật khẩu ngân hàng của bạn.</Text>
  </Page>;
}

const styles = StyleSheet.create({ top: { flexDirection: 'row', alignItems: 'center', gap: 23, marginBottom: 40 }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.blueLight, alignItems: 'center', justifyContent: 'center' }, kicker: { backgroundColor: color.blueLight, color: color.greenDark, alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, fontSize: 11, fontWeight: '800', marginBottom: 16 }, subtitle: { marginTop: 9, marginBottom: 32 }, fieldLabel: { marginTop: 22 }, forgot: { alignSelf: 'flex-end', marginTop: 14, marginBottom: 22 }, link: { color: color.greenDark, fontSize: 13, fontWeight: '700' }, divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 34, marginBottom: 10 }, line: { height: 1, flex: 1, backgroundColor: color.border }, dividerText: { fontSize: 10, color: color.muted, fontWeight: '800' }, footnote: { color: color.muted, fontSize: 11, textAlign: 'center', marginTop: 34 } });
