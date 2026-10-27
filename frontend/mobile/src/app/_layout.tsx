import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SessionProvider, useSession } from '../session';
import { color } from '../theme';

function RootNavigation() {
  const { session, loading } = useSession();
  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={color.green} /></View>;
  return <><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="reset-password" />
    <Stack.Protected guard={!session}><Stack.Screen name="sign-in" /><Stack.Screen name="sign-up" /><Stack.Screen name="verify-email" /><Stack.Screen name="forgot-password" /></Stack.Protected>
    <Stack.Protected guard={!!session}><Stack.Screen name="(app)" /></Stack.Protected>
  </Stack></>;
}

export default function RootLayout() { return <SessionProvider><RootNavigation /></SessionProvider>; }
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.canvas } });
