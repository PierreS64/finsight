import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "./supabase";
import AccountsPanel from "./AccountsPanel";

type Profile = { userId: string; displayName: string | null; currencyCode: string };
const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:8086";

export default function AuthPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      setProfile(null);
      setMissing(false);
      setSession(next);
    });
    client.auth.getSession().then(({ data, error }) => {
      if (error) setMessage(error.message);
      setSession(data.session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/profile`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: controller.signal,
    }).then(async (response) => {
      if (response.status === 404) {
        setMissing(true);
        return;
      }
      if (!response.ok) throw new Error(`API trả về HTTP ${response.status}`);
      const found = (await response.json()) as Profile;
      setProfile(found);
      setDisplayName(found.displayName ?? "");
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Không thể tải hồ sơ.");
    });
    return () => controller.abort();
  }, [session]);

  async function submitAuth() {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (result.error) throw result.error;
      setPassword("");
      if (mode === "signup" && !result.data.session) setMessage("Đã gửi email xác nhận. Hãy xác nhận rồi đăng nhập.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Xác thực thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    if (!session || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      if (!response.ok) throw new Error(`Không lưu được hồ sơ (HTTP ${response.status}).`);
      setProfile((await response.json()) as Profile);
      setMissing(false);
      setMessage("Đã lưu hồ sơ.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu hồ sơ.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase || busy) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    setMessage(error?.message ?? "Đã đăng xuất.");
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.kicker}>TÀI KHOẢN FINSIGHT</Text>
      <Text style={styles.title}>Bắt đầu với dữ liệu của chính bạn.</Text>
      {!supabase ? <Text style={styles.helper}>Chưa cấu hình Supabase. Xem frontend/mobile/.env.example.</Text> : session ? (
        <>
          <Text style={styles.helper}>Đã đăng nhập: {session.user.email}</Text>
          <Text style={styles.helper}>{missing ? "Hãy hoàn tất hồ sơ." : profile ? `Hồ sơ của bạn · ${profile.currencyCode}` : "Đang tải hồ sơ..."}</Text>
          <Text style={styles.label}>Tên hiển thị</Text>
          <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} maxLength={80} autoCapitalize="words" />
          <Pressable style={[styles.button, (busy || !displayName.trim()) && styles.disabled]} onPress={saveProfile} disabled={busy || !displayName.trim()}>
            <Text style={styles.buttonText}>Lưu hồ sơ</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={signOut} disabled={busy}><Text style={styles.secondaryText}>Đăng xuất</Text></Pressable>
          <AccountsPanel session={session} />
        </>
      ) : (
        <>
          <View style={styles.tabs}>
            <Pressable onPress={() => { setMode("signin"); setMessage(""); }}><Text style={[styles.tab, mode === "signin" && styles.selected]}>Đăng nhập</Text></Pressable>
            <Pressable onPress={() => { setMode("signup"); setMessage(""); }}><Text style={[styles.tab, mode === "signup" && styles.selected]}>Đăng ký</Text></Pressable>
          </View>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          <Pressable style={[styles.button, busy && styles.disabled]} onPress={submitAuth} disabled={busy}>
            <Text style={styles.buttonText}>{busy ? "Đang xử lý..." : mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}</Text>
          </Pressable>
        </>
      )}
      {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#E6F2E6", borderRadius: 24, padding: 24, marginTop: 34 },
  kicker: { color: "#0B8966", fontWeight: "800", fontSize: 11, letterSpacing: 2 },
  title: { color: "#173D32", fontSize: 23, fontWeight: "800", marginTop: 12, marginBottom: 17 },
  helper: { color: "#567366", fontSize: 14, lineHeight: 21, marginBottom: 12 },
  tabs: { flexDirection: "row", gap: 22, marginBottom: 17 },
  tab: { color: "#648478", fontSize: 15, fontWeight: "700", paddingBottom: 5 },
  selected: { color: "#0A6A55", borderBottomWidth: 2, borderBottomColor: "#0A6A55" },
  label: { color: "#173D32", fontSize: 13, fontWeight: "700", marginBottom: 7 },
  input: { backgroundColor: "#FFF", borderColor: "#BED9C9", borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 15, color: "#173D32" },
  button: { backgroundColor: "#0A6A55", borderRadius: 11, padding: 14, alignItems: "center", marginTop: 4 },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  secondary: { alignItems: "center", padding: 12, marginTop: 5 },
  secondaryText: { color: "#0A6A55", fontSize: 14, fontWeight: "700" },
  message: { color: "#173D32", fontSize: 13, lineHeight: 20, marginTop: 15 },
});
