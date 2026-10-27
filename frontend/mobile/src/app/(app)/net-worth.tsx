import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { deleteNetWorthItem, getNetWorth, saveNetWorthItem, type NetWorth, type NetWorthItem } from '../../api';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../../components/Ui';
import { formatVnd } from '../../money';
import { useSession } from '../../session';
import { color } from '../../theme';

const validMoney = (value: string) => /^\d{1,17}(?:[.,]\d{1,2})?$/.test(value.trim());

export default function NetWorthScreen() {
  const { session } = useSession();
  const [data, setData] = useState<NetWorth | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<NetWorthItem['kind']>('ASSET');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController();
    getNetWorth(session, controller.signal).then((result) => { setData(result); setError(''); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được tài sản ròng.'); });
    return () => controller.abort();
  }, [session]));

  function reset() { setEditingId(null); setName(''); setKind('ASSET'); setAmount(''); setNote(''); }
  function edit(item: NetWorthItem) { setEditingId(item.id); setName(item.name); setKind(item.kind); setAmount(item.amount); setNote(item.note ?? ''); setMessage('Đang sửa khoản mục bên dưới.'); }

  async function refresh() {
    if (!session) return;
    setData(await getNetWorth(session)); setError('');
  }

  async function save() {
    if (!session || busy) return;
    if (!name.trim() || !validMoney(amount)) { setMessage('Nhập tên và số tiền không âm, tối đa hai chữ số thập phân.'); return; }
    setBusy(true); setMessage('');
    try {
      await saveNetWorthItem(session, { name: name.trim(), kind, amount: amount.replace(',', '.'), note: note.trim() || null }, editingId ?? undefined);
      await refresh(); reset(); setMessage('Đã cập nhật bản kê tài sản ròng.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không lưu được khoản mục.'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!session || busy) return;
    setBusy(true); setMessage('');
    try {
      await deleteNetWorthItem(session, id); await refresh(); if (editingId === id) reset(); setDeletingId(null); setMessage('Đã xóa khoản mục.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không xóa được khoản mục.'); }
    finally { setBusy(false); }
  }

  return <Page><Brand subtitle="BỨC TRANH TÀI CHÍNH" /><Text style={[common.title, styles.title]}>Tài sản ròng</Text>
    <Text style={common.subtitle}>Số dư tài khoản cộng tài sản tự nhập, trừ các khoản nợ. Không tự định giá tài sản.</Text>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {!data && !error && <Text style={common.helper}>Đang tải bản kê...</Text>}
    {data && <><Card style={styles.featured}><Text style={styles.featuredLabel}>TÀI SẢN RÒNG</Text><Text style={styles.net}>{formatVnd(data.netWorth)}</Text><Text style={styles.featuredHint}>Tổng tài sản trừ tổng nợ</Text></Card>
      <View style={styles.totals}><Card style={styles.total}><Text style={styles.metricLabel}>TÀI SẢN</Text><Text style={styles.asset}>{formatVnd(data.totalAssets)}</Text><Text style={common.helper}>Số dư dương {formatVnd(data.accountAssets)}</Text></Card><Card style={styles.total}><Text style={styles.metricLabel}>KHOẢN NỢ</Text><Text style={styles.liability}>{formatVnd(data.totalLiabilities)}</Text><Text style={common.helper}>Số dư âm {formatVnd(data.accountLiabilities)}</Text></Card></View>
      <Text style={styles.section}>Bản kê tài sản và nợ</Text><Text style={common.helper}>Mục tiêu tiết kiệm không cộng thêm để tránh tính hai lần.</Text>
      {data.accounts.length === 0 && data.items.length === 0 && <Card style={styles.item}><Text style={common.helper}>Chưa có khoản mục. Hãy thêm tài khoản hoặc tài sản, khoản nợ bên dưới.</Text></Card>}
      {data.accounts.map((account) => <Card key={account.id} style={styles.item}><View style={styles.row}><Text style={styles.itemName}>{account.name}</Text><Text style={styles.value}>{formatVnd(account.balance)}</Text></View><Text style={common.helper}>Số dư tài khoản · cập nhật theo giao dịch</Text></Card>)}
      {data.items.map((item) => <Card key={item.id} style={styles.item}><View style={styles.row}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.value}>{formatVnd(item.amount)}</Text></View><Text style={common.helper}>{item.kind === 'ASSET' ? 'Tài sản' : 'Khoản nợ'} · Giá trị do bạn tự nhập</Text>{!!item.note && <Text style={common.helper}>{item.note}</Text>}<View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => edit(item)}><Text style={styles.link}>Sửa</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeletingId(item.id)}><Text style={styles.delete}>Xóa</Text></Pressable></View>{deletingId === item.id && <View style={styles.confirm}><Text style={common.helper}>Xóa khoản mục này?</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => remove(item.id)}><Text style={styles.delete}>Xác nhận xóa</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setDeletingId(null)}><Text style={styles.link}>Hủy</Text></Pressable></View>}</Card>)}
      <Text style={styles.section}>{editingId ? 'Sửa khoản mục' : 'Thêm khoản mục'}</Text><Card style={styles.form}><Text style={common.label}>Tên</Text><TextInput style={common.input} value={name} onChangeText={setName} maxLength={100} placeholder="Ví dụ: Xe máy hoặc khoản vay" placeholderTextColor={color.muted} /><Text style={common.label}>Loại</Text><View style={styles.actions}><SecondaryButton onPress={() => setKind('ASSET')}>{kind === 'ASSET' ? '✓ Tài sản' : 'Tài sản'}</SecondaryButton><SecondaryButton onPress={() => setKind('LIABILITY')}>{kind === 'LIABILITY' ? '✓ Khoản nợ' : 'Khoản nợ'}</SecondaryButton></View><Text style={common.label}>Giá trị hiện tại (VND)</Text><TextInput style={common.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Ví dụ: 1000000" placeholderTextColor={color.muted} /><Text style={common.label}>Ghi chú (tùy chọn)</Text><TextInput style={[common.input, styles.note]} value={note} onChangeText={setNote} multiline maxLength={500} /><PrimaryButton onPress={save} disabled={busy || !name.trim() || !amount.trim()}>{busy ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm khoản mục'}</PrimaryButton>{editingId && <SecondaryButton onPress={reset}>Hủy chỉnh sửa</SecondaryButton>}</Card></>}
    {!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}
  </Page>;
}

const styles = StyleSheet.create({
  title: { marginTop: 28 }, featured: { marginTop: 20, gap: 7, backgroundColor: color.navy },
  featuredLabel: { fontSize: 11, fontWeight: '800', color: '#a7f3d0' }, featuredHint: { color: '#cbd5e1', fontSize: 12 },
  metricLabel: { fontSize: 11, fontWeight: '800', color: color.muted }, net: { fontSize: 27, fontWeight: '800', color: color.white },
  totals: { flexDirection: 'row', gap: 10, marginTop: 11 }, total: { flex: 1, gap: 7 },
  asset: { fontSize: 17, fontWeight: '800', color: color.greenDark }, liability: { fontSize: 17, fontWeight: '800', color: '#b91c1c' },
  section: { color: color.navy, fontSize: 18, fontWeight: '800', marginTop: 28, marginBottom: 10 },
  item: { marginTop: 12, gap: 9 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  itemName: { color: color.navy, fontWeight: '800', flex: 1 }, value: { color: color.navy, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 16, alignItems: 'center', flexWrap: 'wrap' }, link: { color: color.greenDark, fontWeight: '800' },
  delete: { color: '#b91c1c', fontWeight: '800' }, confirm: { padding: 11, borderRadius: 9, backgroundColor: '#fff7f7', gap: 8 },
  form: { gap: 11 }, note: { minHeight: 70, textAlignVertical: 'top' },
});
