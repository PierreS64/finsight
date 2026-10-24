import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../../supabase';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../components/Ui';
import { parseRecoveryLink } from '../recoveryLink';
import { useSession } from '../session';
import { color } from '../theme';

export default function ResetPassword() {
  const { session } = useSession();
  const url = Linking.useLinkingURL();
  const handled = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!url) {
      handled.current = null;
      setReady(false);
      setChecking(false);
      setMessage('');
      return;
    }
    if (handled.current === url) return;
    handled.current = url;
    setReady(false);
    setChecking(false);
    const link = parseRecoveryLink(url);
    if (link.kind === 'missing') return;
    if (link.kind === 'invalid') { setMessage('Liên kết khôi phục không hợp lệ. Hãy yêu cầu email mới.'); return; }
    if (link.kind === 'error') { setMessage(link.message); return; }
    if (!supabase) { setMessage('Chưa cấu hình dịch vụ đăng nhập.'); return; }

    let active = true;
    setMessage('');
    setChecking(true);
    const verify = link.kind === 'tokens'
      ? supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
      : supabase.auth.exchangeCodeForSession(link.code);
    void verify.then(({ error }) => {
      if (!active) return;
      if (error) setMessage('Liên kết khôi phục đã hết hạn hoặc không hợp lệ. Hãy yêu cầu email mới.');
      else setReady(true);
    }).catch(() => {
      if (active) setMessage('Không thể kiểm tra liên kết khôi phục. Hãy thử lại bằng email mới.');
    }).finally(() => {
      if (active) setChecking(false);
    });
    return () => { active = false; };
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
      {!ready && !message && <Text style={common.helper}>{checking ? 'Đang kiểm tra liên kết khôi phục...' : 'Hãy mở liên kết khôi phục trong email để tiếp tục.'}</Text>}{!!message && <Text accessibilityRole="alert" style={common.error}>{message}</Text>}
    </Card><View style={styles.back}><SecondaryButton onPress={() => router.replace('/sign-in')}>Về đăng nhập</SecondaryButton></View>
  </Page>;
}
const styles = StyleSheet.create({ title: { marginTop: 38 }, subtitle: { marginTop: 10, marginBottom: 28 }, form: { gap: 13 }, back: { marginTop: 18 } });
