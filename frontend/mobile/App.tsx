import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>F.</Text>
          </View>
          <Text style={styles.brand}>FinSight</Text>
        </View>
        <View style={styles.badge}>
          <View style={styles.dot} />
          <Text style={styles.badgeText}>ĐANG XÂY DỰNG</Text>
        </View>
        <Text style={styles.title}>
          Tài chính rõ ràng.{"\n"}
          <Text style={styles.accent}>Tương lai chủ động.</Text>
        </Text>
        <Text style={styles.subtitle}>
          Theo dõi thu chi, lập kế hoạch và hiểu thói quen tài chính của bạn
          trong một ứng dụng.
        </Text>
        <View style={styles.panel}>
          <Text style={styles.label}>BẢN KHỞI TẠO</Text>
          <Text style={styles.panelTitle}>Một nơi cho mọi kế hoạch.</Text>
          <Text style={styles.body}>
            Tính năng đăng nhập và quản lý dữ liệu cá nhân sẽ được bổ sung ở
            giai đoạn tiếp theo.
          </Text>
          <View style={styles.line} />
          <Text style={styles.footer}>
            Không kết nối trực tiếp với ngân hàng.
          </Text>
        </View>
        <Text style={styles.footnote}>
          Số dư trong FinSight sẽ do bạn tự cập nhật.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9F4" },
  content: {
    paddingHorizontal: 27,
    paddingTop: 34,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 76 },
  logo: {
    width: 40,
    height: 40,
    backgroundColor: "#0A6A55",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  logoText: { color: "#FFF", fontSize: 23, fontWeight: "800" },
  brand: {
    color: "#152D28",
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EAF4E7",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 30,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#6EB56A",
    marginRight: 8,
  },
  badgeText: {
    color: "#286951",
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "800",
  },
  title: {
    color: "#152D28",
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1.6,
    lineHeight: 49,
    marginTop: 26,
  },
  accent: { color: "#0C8B6A" },
  subtitle: { color: "#64776D", fontSize: 16, lineHeight: 25, marginTop: 20 },
  panel: {
    backgroundColor: "#E6F2E6",
    borderRadius: 24,
    padding: 27,
    marginTop: 48,
  },
  label: {
    color: "#0B8966",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 2,
  },
  panelTitle: {
    color: "#173D32",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 17,
  },
  body: { color: "#567366", fontSize: 14, lineHeight: 22, marginTop: 12 },
  line: { height: 1, backgroundColor: "#C8DEC9", marginVertical: 25 },
  footer: { color: "#4B705D", fontSize: 12, fontWeight: "600" },
  footnote: {
    color: "#8A9B8E",
    fontSize: 12,
    marginTop: 28,
    textAlign: "center",
  },
});
