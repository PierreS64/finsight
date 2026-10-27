import { useState } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../../supabase';
import { useSession } from '../../session';
import { Card, Page, PrimaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

const rules = [
  { label: 'Ít nhất 8 ký tự', check: (value: string) => value.length >= 8 },
  { label: 'Chứa chữ hoa và chữ thường', check: (value: string) => /[a-z]/.test(value) && /[A-Z]/.test(value) },
  { label: 'Chứa ít nhất 1 chữ số', check: (value: string) => /\d/.test(value) },
  { label: 'Chứa ký tự đặc biệt', check: (value: string) => /[^a-zA-Z0-9]/.test(value) },
];

export default function ChangePassword() {
  const { session } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const valid = rules.every((rule) => rule.check(next)) && next === confirmation && next !== current;
  async function save() {
    if (!supabase || !session?.user.email || !current || !valid || busy) return;
    setBusy(true); setMessage('');
    try {
      const verified = await supabase.auth.signInWithPassword({ email: session.user.email, password: current });
      if (verified.error) { setMessage('Mật khẩu hiện tại không đúng.'); return; }
      const updated = await supabase.auth.updateUser({ password: next });
      if (updated.error) { setMessage(updated.error.message); return; }
      setCurrent(''); setNext(''); setConfirmation(''); setMessage('Đã cập nhật mật khẩu.');
    } finally { setBusy(false); }
  }
  async function recover() {
    if (!supabase || !session?.user.email || busy) return;
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, { redirectTo: Linking.createURL('reset-password') });
    setMessage(error?.message ?? 'Đã gửi liên kết đặt lại mật khẩu qua email.');
    setBusy(false);
  }
  return <Page style={styles.page}><View style={styles.header}><Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={color.navy} /></Pressable><Text style={styles.title}>Đổi mật khẩu</Text><View style={{ width: 25 }} /></View>
    <Card style={styles.notice}><Ionicons name="shield-outline" size={25} color={color.greenDark} /><Text style={[common.helper, { flex: 1 }]}>Bảo vệ tài khoản FinSight bằng mật khẩu có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</Text></Card>
    <View style={styles.labelRow}><Text style={common.label}>Mật khẩu hiện tại</Text><Pressable onPress={recover}><Text style={styles.link}>Quên mật khẩu?</Text></Pressable></View><TextInput style={styles.input} value={current} onChangeText={setCurrent} secureTextEntry={!visible} autoComplete="current-password" placeholder="Mật khẩu hiện tại" placeholderTextColor={color.muted} />
    <Text style={[common.label, styles.gap]}>Mật khẩu mới</Text><TextInput style={styles.input} value={next} onChangeText={setNext} secureTextEntry={!visible} autoComplete="new-password" placeholder="Mật khẩu mới" placeholderTextColor={color.muted} />
    <View style={styles.rules}>{rules.map((rule) => <View key={rule.label} style={styles.rule}><Ionicons name={rule.check(next) ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={rule.check(next) ? color.greenDark : color.muted} /><Text style={common.helper}>{rule.label}</Text></View>)}</View>
    <Text style={[common.label, styles.gap]}>Xác nhận mật khẩu mới</Text><TextInput style={styles.input} value={confirmation} onChangeText={setConfirmation} secureTextEntry={!visible} autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" placeholderTextColor={color.muted} /><Pressable onPress={() => setVisible((value) => !value)} style={styles.visibility}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={color.muted} /><Text style={styles.link}>{visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</Text></Pressable>
    {confirmation.length > 0 && <Text style={next === confirmation ? common.message : common.error}>{next === confirmation ? 'Mật khẩu trùng khớp' : 'Mật khẩu chưa trùng khớp'}</Text>}{!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}
    <View style={styles.action}><PrimaryButton onPress={save} disabled={busy || !current || !valid}>{busy ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</PrimaryButton></View>
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 8 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }, title: { color: color.navy, fontSize: 21, fontWeight: '800' }, notice: { flexDirection: 'row', gap: 12, backgroundColor: '#edf4ff', marginBottom: 28 }, labelRow: { flexDirection: 'row', justifyContent: 'space-between' }, link: { color: color.greenDark, fontWeight: '700', fontSize: 13 }, input: { height: 55, backgroundColor: color.white, borderWidth: 1, borderColor: color.border, borderRadius: 13, paddingHorizontal: 16, color: color.navy, fontSize: 15 }, gap: { marginTop: 25 }, rules: { marginTop: 14, gap: 8 }, rule: { flexDirection: 'row', alignItems: 'center', gap: 9 }, visibility: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-end', paddingTop: 12 }, action: { marginTop: 28, marginBottom: 22 } });
