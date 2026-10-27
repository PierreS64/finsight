import { useState } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../supabase';
import { Brand, Card, Page, PrimaryButton, common } from '../components/Ui';
import { color } from '../theme';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function send() {
    if (!supabase || !email.trim() || busy) return;
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL('reset-password') });
    setMessage(error?.message ?? 'Nếu email đã đăng ký, bạn sẽ nhận hướng dẫn đặt lại mật khẩu.');
    setBusy(false);
  }
  return <Page style={styles.page}><View style={styles.brand}><Brand /></View><View style={styles.hero}><View style={styles.icon}><Ionicons name="shield-checkmark-outline" size={42} color={color.greenDark} /></View><Text style={common.title}>Quên mật khẩu?</Text><Text style={styles.description}>Nhập email đã đăng ký để nhận liên kết khôi phục mật khẩu.</Text></View>
    <Text style={common.label}>Email xác nhận</Text><TextInput style={common.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="name@example.com" placeholderTextColor={color.muted} />
    <Card style={styles.notice}><Ionicons name="shield-outline" size={22} color={color.greenDark} /><Text style={[common.helper, { flex: 1 }]}>FinSight gửi liên kết khôi phục qua email. Không chia sẻ liên kết hoặc mã xác thực với người khác.</Text></Card>
    <PrimaryButton onPress={send} disabled={busy || !email.trim() || !supabase}>{busy ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}</PrimaryButton>{!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}
    <Pressable accessibilityRole="button" onPress={() => router.replace('/sign-in')} style={styles.back}><Text style={styles.backText}>Nhớ lại mật khẩu? <Text style={styles.link}>Đăng nhập ngay ›</Text></Text></Pressable>
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 65 }, brand: { alignItems: 'center' }, hero: { alignItems: 'center', marginTop: 35, marginBottom: 40 }, icon: { width: 95, height: 95, borderRadius: 48, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center', marginBottom: 25 }, description: { color: color.muted, fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 11 }, notice: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 22, marginBottom: 26, backgroundColor: '#edf4ff' }, back: { alignItems: 'center', paddingVertical: 20, marginTop: 38 }, backText: { color: color.muted }, link: { color: color.greenDark, fontWeight: '800' } });
