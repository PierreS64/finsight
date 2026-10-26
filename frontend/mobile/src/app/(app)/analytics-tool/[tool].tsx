import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getSpendingExplanation, type SpendingExplanation } from '../../../api';
import { useSession } from '../../../session';
import { reportMonth } from '../../../reportDate';
import { formatVnd } from '../../../money';
import { Card, Page, common } from '../../../components/Ui';
import AnalyticsTrends from '../../../components/AnalyticsTrends';
import AnalyticsHealth from '../../../components/AnalyticsHealth';
import SpendingProfileCard from '../../../components/SpendingProfileCard';
import WhatIfCard from '../../../components/WhatIfCard';
import ExpenseForecastCard from '../../../components/ExpenseForecastCard';
import SafeToSpendCard from '../../../components/SafeToSpendCard';
import { color } from '../../../theme';

const titles: Record<string, string> = { trends: 'Xu hướng thu chi', health: 'Nhận xét tài chính', explanation: 'Giải thích chi tiêu', profile: 'Hồ sơ hành vi chi tiêu', 'what-if': 'Mô phỏng What-If', forecast: 'Dự báo cuối tháng', safe: 'Chi tiêu an toàn' };

function Explanation() {
  const { session } = useSession();
  const [result, setResult] = useState<SpendingExplanation | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    getSpendingExplanation(session, reportMonth(), controller.signal).then(setResult)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được giải thích chi tiêu.'); });
    return () => controller.abort();
  }, [session]);
  return <Card style={styles.explanation}><Text style={common.helper}>So sánh tháng {result?.month ?? reportMonth()} với tháng trước</Text>{!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!result && !error && <Text style={common.helper}>Đang tải dữ liệu...</Text>}{result && <><View style={styles.totals}><View><Text style={common.helper}>Tháng trước</Text><Text style={styles.amount}>{formatVnd(result.previousTotal)}</Text></View><View><Text style={common.helper}>Tháng này</Text><Text style={styles.amount}>{formatVnd(result.currentTotal)}</Text></View></View><Text style={styles.change}>Chênh lệch {formatVnd(result.changeAmount)}</Text>{result.categories.map((item) => <View key={item.categoryId} style={styles.row}><Text style={styles.name}>{item.categoryName}</Text><Text style={styles.amount}>{formatVnd(item.changeAmount)}</Text><Text style={common.helper}>{formatVnd(item.previousAmount)} → {formatVnd(item.currentAmount)}</Text></View>)}{!result.categories.length && <Text style={common.helper}>Chưa có thay đổi theo danh mục.</Text>}<Text style={common.helper}>Chỉ tính khoản chi đã ghi. Chuyển khoản không tính vào chi tiêu.</Text></>}</Card>;
}

export default function AnalyticsTool() {
  const { tool } = useLocalSearchParams<{ tool?: string }>();
  return <Page style={styles.page}><View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={color.navy} /></Pressable><Text style={styles.title}>{titles[tool ?? ''] || 'Phân tích'}</Text><View style={{ width: 25 }} /></View>
    {tool === 'trends' && <AnalyticsTrends />}
    {tool === 'health' && <AnalyticsHealth />}
    {tool === 'explanation' && <Explanation />}
    {tool === 'profile' && <SpendingProfileCard month={reportMonth()} />}
    {tool === 'what-if' && <WhatIfCard month={reportMonth()} />}
    {tool === 'forecast' && <ExpenseForecastCard />}
    {tool === 'safe' && <SafeToSpendCard />}
    {!titles[tool ?? ''] && <Text style={common.error}>Không tìm thấy công cụ phân tích.</Text>}
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 8 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }, title: { color: color.navy, fontSize: 19, fontWeight: '800' }, explanation: { gap: 13 }, totals: { flexDirection: 'row', justifyContent: 'space-between' }, amount: { color: color.navy, fontSize: 15, fontWeight: '800' }, change: { color: color.greenDark, fontSize: 19, fontWeight: '800' }, row: { borderTopWidth: 1, borderColor: color.border, paddingTop: 12, gap: 5 }, name: { color: color.navy, fontWeight: '700' } });
