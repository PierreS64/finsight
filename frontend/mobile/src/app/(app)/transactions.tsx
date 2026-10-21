import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Brand, Card, Page, PrimaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

export default function Transactions() {
  return <Page><Brand subtitle="GIAO DỊCH" /><Text style={[common.title, styles.title]}>Lịch sử giao dịch</Text><Text style={[common.subtitle, styles.subtitle]}>Theo dõi thu chi của bạn khi tính năng giao dịch được hoàn thiện.</Text>
    <View style={styles.summary}><Card style={styles.summaryCard}><Text style={styles.summaryLabel}>THU NHẬP</Text><Text style={styles.summaryValue}>—</Text><Text style={common.helper}>Chưa có dữ liệu</Text></Card><Card style={styles.summaryCard}><Text style={styles.summaryLabel}>CHI TIÊU</Text><Text style={styles.summaryValue}>—</Text><Text style={common.helper}>Chưa có dữ liệu</Text></Card></View>
    <Card style={styles.empty}><View style={styles.icon}><Ionicons name="receipt-outline" size={35} color={color.greenDark} /></View><Text style={styles.emptyTitle}>Giao dịch sẽ xuất hiện ở đây</Text><Text style={styles.emptyText}>Hiện FinSight chưa hỗ trợ ghi thu chi. Màn hình mẫu có các giao dịch minh họa; dữ liệu của bạn sẽ chỉ xuất hiện sau khi bạn tự thêm giao dịch trong phiên bản tiếp theo.</Text><PrimaryButton onPress={() => router.replace('/accounts')}>Xem tài khoản hiện có</PrimaryButton></Card>
  </Page>;
}
const styles = StyleSheet.create({ title: { marginTop: 32 }, subtitle: { marginTop: 7, marginBottom: 26 }, summary: { flexDirection: 'row', gap: 10, marginBottom: 20 }, summaryCard: { flex: 1 }, summaryLabel: { color: color.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, summaryValue: { color: color.navy, fontSize: 29, fontWeight: '800', marginVertical: 16 }, empty: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 25 }, icon: { backgroundColor: color.greenLight, width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }, emptyTitle: { color: color.navy, fontSize: 20, fontWeight: '800', textAlign: 'center' }, emptyText: { color: color.muted, fontSize: 13, textAlign: 'center', lineHeight: 21, marginTop: 12, marginBottom: 23 } });
