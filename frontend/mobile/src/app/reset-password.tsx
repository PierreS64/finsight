import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../supabase';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../components/Ui';
import { useSession } from '../session';
import { color } from '../theme';

export default function ResetPassword() {
  const { session } = useSession();
  const url = Linking.useLinkingURL();
  const handled = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!url || !supabase || handled.current === url) return;
    handled.current = url;
    const incoming = new URL(url);
    const values = new URLSearchParams(incoming.hash.replace(/^#/, ''));
    const error = values.get('error_description') || incoming.searchParams.get('error_description');
    if (error) { setMessage(decodeURIComponent(error.replace(/\+/g, ' '))); return; }
    const access_token = values.get('access_token') || incoming.searchParams.get('access_token');
    const refresh_token = values.get('refresh_token') || incoming.searchParams.get('refresh_token');
    if (!access_token || !refresh_token) return;
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error: authError }) => {
      if (authError) setMessage('Liên kết khôi phục đã hết hạn hoặc không hợp lệ. Hãy yêu cầu email mới.');
      else setReady(true);
    });
  }, [url]);

  async function submit() {
    if (!supabase || !session || !ready || busy) return;
    if (password.length < 6 || password !== confirmation) { setMessage('Mật khẩu cần ít nhất 6 ký tự và hai lần nhập phải khớp.'); return; }
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.updateUser({ password });
    setPassword(''); setConfirmation(''); setBusy(false);
    if (error) setMessage(error.message);
    else router.replace('/dashboard');
  }

  return <Page><Brand subtitle="BẢO MẬT TÀI KHOẢN" /><Text style={[common.title, styles.title]}>Đặt mật khẩu mới</Text><Text style={[common.subtitle, styles.subtitle]}>Mở liên kết trong email để xác thực, rồi nhập mật khẩu mới.</Text>
    <Card style={styles.form}><Text style={common.label}>Mật khẩu mới</Text><TextInput style={common.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="Ít nhất 6 ký tự" placeholderTextColor={color.muted} />
      <Text style={common.label}>Nhập lại mật khẩu</Text><TextInput style={common.input} value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" placeholder="Nhập lại mật khẩu" placeholderTextColor={color.muted} />
      <PrimaryButton onPress={submit} disabled={!ready || !session || busy || password.length < 6 || password !== confirmation}>{busy ? 'Đang cập nhật...' : 'Lưu mật khẩu mới'}</PrimaryButton>
      {!ready && !message && <Text style={common.helper}>Đang kiểm tra liên kết khôi phục...</Text>}{!!message && <Text accessibilityRole="alert" style={common.error}>{message}</Text>}
    </Card><View style={styles.back}><SecondaryButton onPress={() => router.replace('/sign-in')}>Về đăng nhập</SecondaryButton></View>
  </Page>;
}
const styles = StyleSheet.create({ title: { marginTop: 38 }, subtitle: { marginTop: 10, marginBottom: 28 }, form: { gap: 13 }, back: { marginTop: 18 } });
