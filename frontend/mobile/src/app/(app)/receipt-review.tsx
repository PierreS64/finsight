import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { recognizeReceipt } from '../../api';
import { useSession } from '../../session';
import { Card, Page, PrimaryButton, SecondaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

export default function ReceiptReview() {
  const { uri, mimeType } = useLocalSearchParams<{ uri?: string; mimeType?: string }>();
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function scan() {
    if (!session || !uri || !mimeType || busy) return;
    setBusy(true); setError('');
    try {
      const result = await recognizeReceipt(session, uri, mimeType);
      if (!result.readable) { setError('Không đọc được hóa đơn. Hãy chụp lại hoặc nhập giao dịch thủ công.'); return; }
      router.push({ pathname: '/receipt-result', params: { uri, mimeType, result: JSON.stringify(result) } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không đọc được hóa đơn.'); }
    finally { setBusy(false); }
  }

  return <Page style={styles.page}><View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={color.navy} /></Pressable><Text style={styles.title}>Xem & chỉnh ảnh</Text><Ionicons name="help-circle-outline" size={24} color={color.navy} /></View>
    <View style={styles.quality}><Text style={styles.qualityText}>Ảnh hóa đơn đã chọn</Text><Text style={common.helper}>Kiểm tra độ rõ trước khi quét</Text></View>
    {uri ? <View style={styles.preview}><Image source={{ uri }} style={styles.image} resizeMode="contain" /><View pointerEvents="none" style={styles.cropFrame} /></View> : <Card><Text style={common.error}>Không có ảnh để quét.</Text></Card>}
    <Card style={styles.hint}><Ionicons name="information-circle-outline" size={22} color={color.blue} /><Text style={[common.helper, { flex: 1 }]}>Đảm bảo tên cửa hàng, ngày tháng và tổng tiền hiển thị rõ ràng để nhận diện chính xác.</Text></Card>
    {!!error && <Card style={styles.error}><Text accessibilityRole="alert" style={common.error}>{error}</Text><SecondaryButton onPress={() => router.push('/transaction-form')}>Nhập tay</SecondaryButton></Card>}
    {busy && <View style={styles.loading}><ActivityIndicator color={color.greenDark} /><Text style={common.helper}>Đang bóc tách dữ liệu hóa đơn...</Text></View>}
    <View style={styles.actions}><SecondaryButton onPress={() => router.replace('/camera')}>Chụp lại</SecondaryButton><PrimaryButton onPress={scan} disabled={busy || !uri || !session}>Quét hóa đơn bằng AI</PrimaryButton></View>
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 8 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, title: { fontSize: 19, fontWeight: '800', color: color.navy }, quality: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }, qualityText: { fontSize: 13, color: color.greenDark, fontWeight: '700' }, preview: { height: 420, backgroundColor: '#27313c', borderRadius: 20, padding: 13, overflow: 'hidden' }, image: { width: '100%', height: '100%' }, cropFrame: { ...StyleSheet.absoluteFillObject, margin: 18, borderWidth: 2, borderColor: '#059669', borderRadius: 13 }, hint: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#edf4ff', marginTop: 18 }, error: { marginTop: 15 }, loading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 }, actions: { marginTop: 20, marginBottom: 10 } });
