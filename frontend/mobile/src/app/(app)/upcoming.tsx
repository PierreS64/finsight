import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand, Page } from '../../components/Ui';
import PlanningTabs from '../../components/PlanningTabs';
import UpcomingExpensesCard from '../../components/UpcomingExpensesCard';
import { color } from '../../theme';

export default function Upcoming() {
  return <Page><View style={styles.header}><Brand /><Pressable accessibilityRole="button" onPress={() => router.push('/profile')}><Ionicons name="person-outline" size={23} color={color.navy} /></Pressable></View><PlanningTabs /><Text style={styles.title}>Khoản chi sắp tới</Text><UpcomingExpensesCard /></Page>;
}

const styles = StyleSheet.create({ header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, title: { color: color.navy, fontSize: 22, fontWeight: '800', marginBottom: 15 } });
