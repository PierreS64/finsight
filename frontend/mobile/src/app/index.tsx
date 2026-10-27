import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../components/Ui';
import { color } from '../theme';
import { useSession } from '../session';

const benefits = [
  { icon: 'wallet-outline' as const, title: 'Tài khoản của bạn', detail: 'Tạo tài khoản và lưu số dư đầu kỳ do chính bạn nhập.', ready: true },
  { icon: 'swap-horizontal-outline' as const, title: 'Theo dõi dòng tiền', detail: 'Ghi thu chi, phân loại và xem báo cáo từ dữ liệu bạn nhập.', ready: true },
  { icon: 'analytics-outline' as const, title: 'Kế hoạch rõ ràng', detail: 'Đặt ngân sách tháng và theo dõi mục tiêu tiết kiệm.', ready: true },
];

export default function Welcome() {
  const { session } = useSession();
  if (session) return <Redirect href="/camera" />;
  return <Page><View style={styles.header}><Brand subtitle="TÀI CHÍNH RÕ RÀNG" /><View style={styles.badge}><View style={styles.dot} /><Text style={styles.badgeText}>ĐANG PHÁT TRIỂN</Text></View></View>
    <Text style={styles.title}>Hiểu tài chính,{"\n"}<Text style={styles.accent}>làm chủ tương lai.</Text></Text>
    <Text style={[common.subtitle, styles.subtitle]}>Bắt đầu từ dữ liệu do bạn tự quản lý. FinSight giúp mọi con số có một nơi rõ ràng để bắt đầu.</Text>
    <View style={styles.preview}><Card style={styles.previewTop}><View style={styles.previewIcon}><Ionicons name="wallet-outline" size={22} color={color.greenDark} /></View><View><Text style={styles.previewLabel}>Tài khoản của bạn</Text><Text style={styles.previewValue}>—</Text></View><Text style={styles.previewHint}>Chưa có dữ liệu</Text></Card><View style={styles.previewBottom}><Card style={styles.miniCard}><Ionicons name="bar-chart-outline" size={22} color={color.greenDark} /><Text style={styles.miniTitle}>Dòng tiền</Text><Text style={styles.miniHelper}>Theo dữ liệu bạn nhập</Text></Card><Card style={[styles.miniCard, styles.miniDark]}><Ionicons name="sparkles-outline" size={22} color="#6ee7b7" /><Text style={[styles.miniTitle, { color: color.white }]}>Góc nhìn</Text><Text style={[styles.miniHelper, { color: '#bbd1d4' }]}>Từ dữ liệu thật</Text></Card></View></View>
    <View style={styles.benefits}>{benefits.map((benefit) => <Card key={benefit.title} style={styles.benefit}><View style={styles.benefitIcon}><Ionicons name={benefit.icon} size={23} color={color.greenDark} /></View><View style={{ flex: 1 }}><Text style={styles.benefitTitle}>{benefit.title}</Text><Text style={styles.benefitDetail}>{benefit.detail}</Text></View><Text style={styles.ready}>{benefit.ready ? 'ĐÃ CÓ' : 'SẮP TỚI'}</Text></Card>)}</View>
    <PrimaryButton icon="arrow-forward" onPress={() => router.push('/sign-up')}>Bắt đầu ngay</PrimaryButton><SecondaryButton onPress={() => router.push('/sign-in')}>Đăng nhập tài khoản</SecondaryButton>
    <Text style={styles.footnote}>FinSight không kết nối tài khoản ngân hàng và không tự cập nhật số dư.</Text>
  </Page>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 34 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e7f1fd', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 20 },
  dot: { width: 7, height: 7, backgroundColor: color.green, borderRadius: 4 }, badgeText: { fontSize: 9, fontWeight: '800', color: color.greenDark },
  title: { fontSize: 36, lineHeight: 43, letterSpacing: -1.6, color: color.navy, fontWeight: '800' }, accent: { color: color.greenDark }, subtitle: { marginTop: 13, marginBottom: 25 },
  preview: { borderRadius: 21, backgroundColor: '#e7f0fb', padding: 16, marginBottom: 23 }, previewTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  previewIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: color.greenLight, alignItems: 'center', justifyContent: 'center' }, previewLabel: { color: color.muted, fontSize: 11, fontWeight: '700' }, previewValue: { color: color.navy, fontSize: 24, fontWeight: '800' }, previewHint: { marginLeft: 'auto', fontSize: 10, color: color.greenDark },
  previewBottom: { flexDirection: 'row', gap: 10 }, miniCard: { flex: 1, minHeight: 115, justifyContent: 'space-between' }, miniDark: { backgroundColor: color.darkCard, borderColor: color.darkCard }, miniTitle: { color: color.navy, fontSize: 14, fontWeight: '800' }, miniHelper: { color: color.muted, fontSize: 11 },
  benefits: { gap: 10, marginBottom: 22 }, benefit: { flexDirection: 'row', gap: 11, alignItems: 'center', padding: 14 }, benefitIcon: { width: 42, height: 42, backgroundColor: '#e5f7ee', borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, benefitTitle: { color: color.navy, fontWeight: '800', fontSize: 14, marginBottom: 3 }, benefitDetail: { color: color.muted, fontSize: 11, lineHeight: 16 }, ready: { color: color.greenDark, fontSize: 8, fontWeight: '800' },
  footnote: { textAlign: 'center', color: color.muted, fontSize: 11, lineHeight: 17, marginTop: 18, marginHorizontal: 18 },
});
