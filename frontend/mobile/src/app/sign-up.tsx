import { useState } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../supabase';
import { Brand, Page, PrimaryButton, common } from '../components/Ui';
import { color } from '../theme';

const strong = (value: string) => value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^a-zA-Z0-9]/.test(value);

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit() {
    if (!supabase || busy || !strong(password) || password !== confirmation) return;
    setBusy(true); setMessage('');
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() }, emailRedirectTo: Linking.createURL('verify-email') } });
    if (error) setMessage(error.message);
    else if (!data.session) router.replace({ pathname: '/verify-email', params: { email: email.trim() } });
    setBusy(false);
  }
  return <Page style={styles.page}><View style={styles.top}><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={23} color={color.navy} /></Pressable><View style={styles.progress}><View style={styles.dot} /><View style={styles.activeDot} /><View style={styles.dot} /></View><View style={styles.back} /></View><View style={styles.brand}><Brand /></View><Text style={styles.title}>Tạo tài khoản mới</Text><Text style={styles.subtitle}>Bắt đầu quản lý tài chính thông minh ngay hôm nay</Text>
    <Text style={common.label}>Họ và tên</Text><View style={styles.field}><Ionicons name="person-outline" size={21} color={color.muted} /><TextInput style={styles.input} value={name} onChangeText={setName} maxLength={80} autoComplete="name" placeholder="Tên hiển thị của bạn" placeholderTextColor={color.muted} /></View>
    <Text style={[common.label, styles.gap]}>Email</Text><View style={styles.field}><Ionicons name="mail-outline" size={21} color={color.muted} /><TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="name@example.com" placeholderTextColor={color.muted} /></View>
    <Text style={[common.label, styles.gap]}>Mật khẩu</Text><View style={styles.field}><Ionicons name="lock-closed-outline" size={21} color={color.muted} /><TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry={!visible} autoComplete="new-password" placeholder="Mật khẩu mới" placeholderTextColor={color.muted} /><Pressable onPress={() => setVisible((value) => !value)}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color={color.muted} /></Pressable></View>
    <Text style={styles.passwordHint}>Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</Text><View style={styles.strength}><View style={[styles.strengthSegment, password.length >= 8 && styles.strengthActive]} /><View style={[styles.strengthSegment, /[a-z]/.test(password) && /[A-Z]/.test(password) && styles.strengthActive]} /><View style={[styles.strengthSegment, strong(password) && styles.strengthActive]} /></View>
    <Text style={[common.label, styles.gap]}>Xác nhận mật khẩu</Text><View style={styles.field}><Ionicons name="lock-closed-outline" size={21} color={color.muted} /><TextInput style={styles.input} value={confirmation} onChangeText={setConfirmation} secureTextEntry={!visible} autoComplete="new-password" placeholder="Nhập lại mật khẩu" placeholderTextColor={color.muted} />{confirmation.length > 0 && <Ionicons name={password === confirmation ? 'checkmark-circle' : 'close-circle-outline'} size={22} color={password === confirmation ? color.greenDark : '#b91c1c'} />}</View>
    <View style={styles.action}><PrimaryButton icon="arrow-forward" onPress={submit} disabled={busy || !supabase || !name.trim() || !email.trim() || !strong(password) || password !== confirmation}>{busy ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</PrimaryButton></View>{!!message && <Text accessibilityRole="alert" style={common.error}>{message}</Text>}
    <Pressable accessibilityRole="button" onPress={() => router.replace('/sign-in')} style={styles.signIn}><Text style={styles.signInText}>Đã có tài khoản? <Text style={styles.link}>Đăng nhập ›</Text></Text></Pressable>
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 8 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, back: { width: 39, height: 39, borderRadius: 20, backgroundColor: color.white, alignItems: 'center', justifyContent: 'center' }, progress: { flexDirection: 'row', alignItems: 'center', gap: 5 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#d6ded9' }, activeDot: { width: 25, height: 6, borderRadius: 4, backgroundColor: color.greenDark }, brand: { alignItems: 'center', marginBottom: 13 }, title: { color: color.navy, textAlign: 'center', fontSize: 28, fontWeight: '800' }, subtitle: { color: color.muted, textAlign: 'center', fontSize: 14, lineHeight: 21, marginTop: 9, marginBottom: 29 }, field: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 53, backgroundColor: color.white, borderWidth: 1, borderColor: color.border, borderRadius: 12, paddingHorizontal: 13 }, input: { flex: 1, fontSize: 15, color: color.navy }, gap: { marginTop: 20 }, passwordHint: { color: color.muted, fontSize: 11, marginTop: 9 }, strength: { flexDirection: 'row', gap: 5, marginTop: 8 }, strengthSegment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#d6ded9' }, strengthActive: { backgroundColor: color.greenDark }, action: { marginTop: 27 }, signIn: { alignItems: 'center', padding: 16, marginTop: 22, borderTopWidth: 1, borderColor: color.border }, signInText: { color: color.muted }, link: { color: color.greenDark, fontWeight: '800' } });
