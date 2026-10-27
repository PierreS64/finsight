import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../supabase';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../components/Ui';
import { parseConfirmationLink } from '../confirmationLink';
import { color } from '../theme';

export default function VerifyEmail() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const url = Linking.useURL();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!url || handled.current === url) return;
    handled.current = url;
    const link = parseConfirmationLink(url);
    if (link.kind === 'missing' || link.kind === 'invalid') return;
    if (link.kind === 'error') { setMessage('Liên kết xác nhận không hợp lệ hoặc đã hết hạn. Hãy gửi lại email.'); return; }
    if (!supabase) { setMessage('Chưa cấu hình dịch vụ đăng nhập.'); return; }
    let active = true;
    setBusy(true);
    const verify = link.kind === 'tokens'
      ? supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken })
      : supabase.auth.exchangeCodeForSession(link.code);
    void verify.then(({ error }) => {
      if (active && error) setMessage('Liên kết xác nhận không hợp lệ hoặc đã hết hạn. Hãy gửi lại email.');
    }).catch(() => {
      if (active) setMessage('Không thể xác nhận email. Hãy thử lại bằng liên kết mới.');
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => { active = false; };
  }, [url]);

  async function resend() {
    if (!supabase || !email || busy) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: Linking.createURL('verify-email') } });
    setMessage(error?.message ?? 'Đã gửi lại email xác nhận.');
    setBusy(false);
  }
  return <Page style={styles.content}><Brand subtitle="XÁC NHẬN EMAIL" /><View style={styles.hero}><View style={styles.icon}><Ionicons name="mail-open-outline" size={50} color={color.greenDark} /></View><Text style={common.title}>Kiểm tra hộp thư của bạn</Text><Text style={[common.subtitle, styles.description]}>FinSight đã gửi liên kết xác nhận đến địa chỉ email của bạn. Hãy mở liên kết trên thiết bị này để xác nhận.</Text>{!!email && <Text style={styles.email}>{email}</Text>}</View><Card><Text style={styles.cardTitle}>Một bước nữa là xong</Text><Text style={common.helper}>Nếu chưa thấy thư, kiểm tra cả mục Spam hoặc Quảng cáo. Màn hình này không yêu cầu nhập mã sáu chữ số.</Text></Card><View style={styles.actions}><PrimaryButton icon="arrow-forward" onPress={() => router.replace('/sign-in')}>Đến trang đăng nhập</PrimaryButton>{!!email && <SecondaryButton onPress={resend}>{busy ? 'Đang gửi...' : 'Gửi lại email xác nhận'}</SecondaryButton>}</View>{!!busy && <Text style={common.helper}>Đang xác nhận liên kết email...</Text>}{!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}</Page>;
}
const styles = StyleSheet.create({ content: { paddingTop: 25 }, hero: { alignItems: 'center', marginTop: 85, marginBottom: 35 }, icon: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#e3f7ef', alignItems: 'center', justifyContent: 'center', marginBottom: 36 }, description: { textAlign: 'center', marginTop: 16 }, email: { color: color.navy, fontSize: 15, fontWeight: '700', backgroundColor: color.blueLight, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 22, marginTop: 18 }, cardTitle: { color: color.navy, fontWeight: '800', fontSize: 16, marginBottom: 8 }, actions: { marginTop: 25 } });
