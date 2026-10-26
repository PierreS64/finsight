import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AnalyticsExplanation from '../../../components/AnalyticsExplanation';
import { reportMonth } from '../../../reportDate';
import { Page, common } from '../../../components/Ui';
import AnalyticsTrends from '../../../components/AnalyticsTrends';
import AnalyticsHealth from '../../../components/AnalyticsHealth';
import SpendingProfileCard from '../../../components/SpendingProfileCard';
import WhatIfCard from '../../../components/WhatIfCard';
import ExpenseForecastCard from '../../../components/ExpenseForecastCard';
import SafeToSpendCard from '../../../components/SafeToSpendCard';
import { color } from '../../../theme';

const titles: Record<string, string> = { trends: 'Xu hướng thu chi', health: 'Nhận xét tài chính', explanation: 'Giải thích chi tiêu', profile: 'Hồ sơ hành vi chi tiêu', 'what-if': 'Mô phỏng What-If', forecast: 'Dự báo cuối tháng', safe: 'Chi tiêu an toàn' };

export default function AnalyticsTool() {
  const { tool } = useLocalSearchParams<{ tool?: string }>();
  return <Page style={styles.page}><View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={color.navy} /></Pressable><Text style={styles.title}>{titles[tool ?? ''] || 'Phân tích'}</Text><View style={{ width: 25 }} /></View>
    {tool === 'trends' && <AnalyticsTrends />}
    {tool === 'health' && <AnalyticsHealth />}
    {tool === 'explanation' && <AnalyticsExplanation />}
    {tool === 'profile' && <SpendingProfileCard month={reportMonth()} />}
    {tool === 'what-if' && <WhatIfCard month={reportMonth()} />}
    {tool === 'forecast' && <ExpenseForecastCard />}
    {tool === 'safe' && <SafeToSpendCard />}
    {!titles[tool ?? ''] && <Text style={common.error}>Không tìm thấy công cụ phân tích.</Text>}
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 8 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }, title: { color: color.navy, fontSize: 19, fontWeight: '800' } });
