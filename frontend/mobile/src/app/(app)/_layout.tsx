import { Stack } from 'expo-router';
import { View } from 'react-native';
import BottomNav from '../../components/BottomNav';

export default function AppLayout() { return <View style={{ flex: 1 }}><Stack screenOptions={{ headerShown: false }}><Stack.Screen name="dashboard" /><Stack.Screen name="transactions" /><Stack.Screen name="statements" /><Stack.Screen name="transfers" /><Stack.Screen name="recurring" /><Stack.Screen name="categories" /><Stack.Screen name="merchants" /><Stack.Screen name="accounts" /><Stack.Screen name="reconcile" /><Stack.Screen name="budgets" /><Stack.Screen name="goals" /><Stack.Screen name="profile" /></Stack><BottomNav /></View>; }
