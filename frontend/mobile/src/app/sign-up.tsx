import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../supabase';
import { Brand, Card, Page, PrimaryButton, common } from '../components/Ui';
import { color } from '../theme';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    if (!supabase || busy) return;
    if (password !== confirmation) { setMessage('Hai mật khẩu chưa khớp.'); return; }
    setBusy(true); setMessage('');
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() } } });
    if (error) setMessage(error.message);
    else if (!data.session) router.replace({ pathname: '/verify-email', params: { email: email.trim() } });
    setBusy(false);
  }

  return <Page><View style={styles.top}><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={color.navy} /></Pressable><Brand /></View>
    <Text style={common.title}>Tạo tài khoản mới</Text><Text style={[common.subtitle, styles.subtitle]}>Khởi đầu hành trình tài chính rõ ràng cùng FinSight.</Text>
    <Card style={styles.formCard}><Text style={common.label}>Họ và tên</Text><TextInput style={common.input} value={name} onChangeText={setName} autoComplete="name" placeholder="Tên hiển thị của bạn" placeholderTextColor="#94a3b8" maxLength={80} />
      <Text style={[common.label, styles.labelGap]}>Email</Text><TextInput style={common.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="ban@example.com" placeholderTextColor="#94a3b8" />
      <Text style={[common.label, styles.labelGap]}>Mật khẩu</Text><TextInput style={common.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="Ít nhất 6 ký tự" placeholderTextColor="#94a3b8" />
      <Text style={[common.label, styles.labelGap]}>Xác nhận mật khẩu</Text><TextInput style={common.input} value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" placeholder="Nhập lại mật khẩu" placeholderTextColor="#94a3b8" />
      {confirmation.length > 0 && <Text style={password === confirmation ? common.message : common.error}>{password === confirmation ? 'Mật khẩu đã khớp.' : 'Hai mật khẩu chưa khớp.'}</Text>}
    </Card>
    <PrimaryButton icon="arrow-forward" onPress={submit} disabled={busy || !supabase || !name.trim() || !email.trim() || password.length < 6 || !confirmation}>{busy ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</PrimaryButton>
    {!supabase && <Text style={common.error}>Chưa cấu hình Supabase. Xem frontend/mobile/.env.example.</Text>}{!!message && <Text accessibilityRole="alert" style={common.error}>{message}</Text>}
    <Text style={styles.footnote}>Email có thể cần xác nhận trước khi bạn đăng nhập.</Text><Pressable accessibilityRole="button" onPress={() => router.replace('/sign-in')} style={styles.signIn}><Text style={styles.signInText}>Đã có tài khoản? <Text style={styles.link}>Đăng nhập ngay</Text></Text></Pressable>
  </Page>;
}

const styles = StyleSheet.create({ top: { flexDirection: 'row', alignItems: 'center', gap: 25, marginBottom: 35 }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.blueLight, alignItems: 'center', justifyContent: 'center' }, subtitle: { marginTop: 8, marginBottom: 25 }, formCard: { marginBottom: 22, padding: 20 }, labelGap: { marginTop: 20 }, footnote: { color: color.muted, fontSize: 11, textAlign: 'center', marginTop: 18 }, signIn: { alignSelf: 'center', marginTop: 28, padding: 10 }, signInText: { color: color.muted, fontSize: 14 }, link: { color: color.greenDark, fontWeight: '800' } });
