import { useCallback, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { color } from '../../theme';

export default function ReceiptCamera() {
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));

  function review(uri: string, mimeType: string) {
    router.push({ pathname: '/receipt-review', params: { uri, mimeType } });
  }

  async function capture() {
    if (!ready || busy || !camera.current) return;
    setBusy(true); setError('');
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) review(photo.uri, 'image/jpeg');
    } catch { setError('Không chụp được ảnh. Hãy thử lại hoặc chọn ảnh từ thư viện.'); }
    finally { setBusy(false); }
  }

  async function chooseImage() {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.85 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (!asset.mimeType || !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType) || (asset.fileSize && asset.fileSize > 5_000_000)) {
        setError('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP tối đa 5 MB.'); return;
      }
      review(asset.uri, asset.mimeType);
    } catch { setError('Không mở được thư viện ảnh.'); }
  }

  return <View style={styles.page}><StatusBar style="light" />
    {permission?.granted && focused ? <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" flash={flash ? 'on' : 'off'} onCameraReady={() => setReady(true)} onMountError={() => setError('Không mở được camera trên thiết bị này.')} /> : <View style={styles.permission}><Ionicons name="camera-outline" size={56} color={color.white} /><Text style={styles.permissionText}>Cần quyền camera để quét hóa đơn.</Text><Pressable onPress={requestPermission} style={styles.permissionButton}><Text style={styles.permissionButtonText}>Cho phép camera</Text></Pressable></View>}
    <View pointerEvents="box-none" style={styles.overlay}><View style={styles.top}><Pressable accessibilityRole="button" accessibilityLabel={flash ? 'Tắt đèn flash' : 'Bật đèn flash'} onPress={() => setFlash((value) => !value)} style={styles.round}><Ionicons name={flash ? 'flash' : 'flash-outline'} size={26} color={color.white} /></Pressable><View style={styles.brandPill}><Image source={require('../../../assets/full-logo.png')} style={styles.brand} resizeMode="contain" /></View><View style={styles.round}><Ionicons name="help-circle-outline" size={28} color={color.white} /></View></View>
      <View style={styles.frame}><View style={styles.gridV} /><View style={styles.gridH} /><Ionicons name="receipt-outline" size={58} color="#ffffff88" /></View>
      <Text style={styles.title}>Đặt hóa đơn vào giữa khung hình</Text><Text style={styles.tip}>Hóa đơn dài? Gập phần giữa để tên cửa hàng, ngày và tổng tiền cùng nằm trong khung.</Text>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <View style={styles.actions}><Pressable accessibilityRole="button" onPress={chooseImage} style={styles.sideAction}><View style={styles.sideIcon}><Ionicons name="images-outline" size={28} color={color.white} /></View><Text style={styles.actionLabel}>Thư viện</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Chụp ảnh hóa đơn" disabled={!ready || busy || !permission?.granted} onPress={capture} style={styles.capture}><View style={styles.captureInner}><Ionicons name="camera-outline" size={34} color="#006948" /></View></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/transaction-form')} style={styles.sideAction}><View style={styles.sideIcon}><Ionicons name="create-outline" size={28} color={color.white} /></View><Text style={styles.actionLabel}>Nhập tay</Text></Pressable></View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#171a1b' }, overlay: { flex: 1, paddingHorizontal: 22, paddingTop: 45, paddingBottom: 25, backgroundColor: '#00000055' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, round: { width: 47, height: 47, borderRadius: 24, backgroundColor: '#121212aa', borderWidth: 1, borderColor: '#ffffff55', alignItems: 'center', justifyContent: 'center' }, brandPill: { backgroundColor: '#121212bb', borderRadius: 28, paddingHorizontal: 12 }, brand: { width: 95, height: 46 },
  frame: { flex: 1, marginTop: 34, marginHorizontal: 22, borderWidth: 2, borderColor: '#059669', borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, gridV: { position: 'absolute', left: '33%', top: 0, bottom: 0, width: 1, backgroundColor: '#ffffff33' }, gridH: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: '#ffffff33' },
  title: { color: color.white, textAlign: 'center', fontSize: 19, fontWeight: '800', marginTop: 17 }, tip: { color: color.white, textAlign: 'center', fontSize: 12, lineHeight: 17, backgroundColor: '#121212bb', alignSelf: 'center', padding: 9, borderRadius: 9, marginTop: 10 }, error: { color: color.white, backgroundColor: '#b91c1c', padding: 8, marginTop: 9, borderRadius: 8, textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 25 }, sideAction: { alignItems: 'center', width: 77, gap: 5 }, sideIcon: { width: 52, height: 52, borderRadius: 27, backgroundColor: '#ffffff33', borderWidth: 1, borderColor: '#ffffff88', alignItems: 'center', justifyContent: 'center' }, actionLabel: { color: color.white, fontSize: 12, fontWeight: '700' }, capture: { width: 82, height: 82, borderRadius: 42, backgroundColor: '#006948', borderWidth: 4, borderColor: color.white, alignItems: 'center', justifyContent: 'center' }, captureInner: { width: 62, height: 62, borderRadius: 32, backgroundColor: color.white, alignItems: 'center', justifyContent: 'center' },
  permission: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 30 }, permissionText: { color: color.white, textAlign: 'center', marginTop: 15 }, permissionButton: { backgroundColor: '#006948', padding: 12, borderRadius: 10, marginTop: 20 }, permissionButtonText: { color: color.white, fontWeight: '700' },
});
