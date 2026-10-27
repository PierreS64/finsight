import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../supabase';
import { Brand, Card, Page, PrimaryButton, common } from '../components/Ui';
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

  return <Page style={styles.page}><View style={styles.progress}><View style={styles.progressActive} /><View style={styles.progressDot} /><View style={styles.progressDot} /></View><View style={styles.brand}><Brand /></View><Text style={styles.title}>Đăng nhập</Text><Text style={styles.subtitle}>Chào mừng bạn quay trở lại với FinSight</Text>
    <Card style={styles.form}><Text style={common.label}>Email</Text><View style={styles.field}><Ionicons name="mail-outline" size={21} color={color.muted} /><TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="name@example.com" placeholderTextColor={color.muted} /></View>
      <Text style={[common.label, styles.fieldLabel]}>Mật khẩu</Text><View style={styles.field}><Ionicons name="lock-closed-outline" size={21} color={color.muted} /><TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" placeholder="Nhập mật khẩu" placeholderTextColor={color.muted} /></View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/forgot-password')} style={styles.forgot}><Text style={styles.link}>Quên mật khẩu?</Text></Pressable>
      <PrimaryButton icon="arrow-forward" onPress={submit} disabled={busy || !email.trim() || !password || !supabase}>{busy ? 'Đang xử lý...' : 'Đăng nhập'}</PrimaryButton>
      {!supabase && <Text style={common.error}>Chưa cấu hình Supabase. Xem frontend/mobile/.env.example.</Text>}{!!message && <Text accessibilityRole="alert" style={common.error}>{message}</Text>}
    </Card><Pressable accessibilityRole="button" onPress={() => router.push('/sign-up')} style={styles.signUp}><Text style={styles.signUpText}>Chưa có tài khoản? <Text style={styles.link}>Đăng ký ngay</Text></Text></Pressable>
    <Text style={styles.footnote}>FinSight không yêu cầu mật khẩu ngân hàng của bạn.</Text>
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 45 }, progress: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 5, marginBottom: 35 }, progressActive: { width: 25, height: 6, borderRadius: 4, backgroundColor: color.greenDark }, progressDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#cbd5d1' }, brand: { alignItems: 'center', marginBottom: 16 }, title: { color: color.navy, fontSize: 30, fontWeight: '800', textAlign: 'center' }, subtitle: { color: color.muted, fontSize: 15, textAlign: 'center', marginTop: 12, marginBottom: 29 }, form: { padding: 20 }, field: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: color.white, borderWidth: 1, borderColor: color.border, borderRadius: 13, minHeight: 53, paddingHorizontal: 14 }, input: { color: color.navy, flex: 1, fontSize: 15 }, fieldLabel: { marginTop: 20 }, forgot: { alignSelf: 'flex-end', marginTop: 19, marginBottom: 17 }, link: { color: color.greenDark, fontSize: 14, fontWeight: '800' }, signUp: { alignItems: 'center', marginTop: 27, padding: 8 }, signUpText: { color: color.muted, fontSize: 15 }, footnote: { color: color.muted, fontSize: 11, textAlign: 'center', marginTop: 15 } });
