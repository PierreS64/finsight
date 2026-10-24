import { useCallback, useEffect, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getAccounts, getCategories, importStatement, previewStatement, type Account, type Category, type StatementPreview } from '../../api';
import { useSession } from '../../session';
import { formatVnd } from '../../money';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

export default function Statements() {
  const { session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accountId, setAccountId] = useState('');
  const [preview, setPreview] = useState<StatementPreview | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [categoryByRow, setCategoryByRow] = useState<Record<number, string>>({});
  const [allowed, setAllowed] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    getAccounts(session, controller.signal)
      .then((foundAccounts) => { setAccounts(foundAccounts); setAccountId(foundAccounts[0]?.id ?? ''); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setMessage(reason instanceof Error ? reason.message : 'Không tải được tài khoản.'); });
    return () => controller.abort();
  }, [session]);

  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController();
    getCategories(session, controller.signal).then(setCategories)
      .catch((reason: unknown) => { if (!controller.signal.aborted) setMessage(reason instanceof Error ? reason.message : 'Không tải được danh mục.'); });
    return () => controller.abort();
  }, [session]));

  async function pick() {
    if (!session || !accountId || busy) return;
    setBusy(true); setMessage(''); setPreview(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const file = result.assets[0];
      if (!/\.(csv|xlsx)$/i.test(file.name) || (file.size ?? 0) > 2_000_000) throw new Error('Chỉ chọn CSV hoặc XLSX tối đa 2 MB.');
      const mimeType = file.name.toLowerCase().endsWith('.xlsx')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv';
      const found = await previewStatement(session, accountId, file.uri, mimeType);
      setPreview(found); setSelected(found.rows.filter((row) => !row.alreadyImported).map((row) => row.rowNumber));
      setCategoryByRow({}); setAllowed([]);
      setMessage(`Đã đọc ${found.rows.length} dòng. Chọn danh mục và kiểm tra trước khi lưu.`);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không đọc được sao kê.'); }
    finally { setBusy(false); }
  }

  async function commit() {
    if (!session || !preview || busy) return;
    const rows = preview.rows.filter((row) => selected.includes(row.rowNumber) && !row.alreadyImported);
    if (!rows.length) { setMessage('Hãy chọn ít nhất một dòng chưa nhập.'); return; }
    if (rows.some((row) => !categoryByRow[row.rowNumber])) { setMessage('Hãy chọn danh mục cho mọi dòng sẽ nhập.'); return; }
    if (rows.some((row) => row.possibleDuplicate && !allowed.includes(row.rowNumber))) {
      setMessage('Hãy xác nhận từng dòng có thể trùng trước khi nhập.'); return;
    }
    setBusy(true); setMessage('');
    try {
      const count = await importStatement(session, accountId, preview.sourceHash, rows.map((row) => ({
        rowNumber: row.rowNumber, categoryId: categoryByRow[row.rowNumber], kind: row.kind,
        amount: row.amount, occurredOn: row.occurredOn, description: row.description,
        allowPossibleDuplicate: allowed.includes(row.rowNumber),
      })));
      setPreview(null); setSelected([]); setMessage(`Đã nhập ${count} giao dịch. Số dư tài khoản sẽ được tính lại.`);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không nhập được sao kê.'); }
    finally { setBusy(false); }
  }

  function toggle(list: number[], value: number, set: (items: number[]) => void) {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  return <Page><View style={styles.header}><Brand subtitle="NHẬP SAO KÊ" /><Pressable accessibilityRole="button" onPress={() => router.back()}><Ionicons name="close-outline" size={27} color={color.navy} /></Pressable></View>
    <Text style={common.title}>Nhập sao kê</Text><Text style={[common.subtitle, styles.subtitle]}>Xem trước và xác nhận từng dòng trước khi tạo giao dịch.</Text>
    <Card><Text style={common.sectionTitle}>Tệp của bạn</Text><Text style={[common.helper, styles.help]}>CSV UTF-8 hoặc XLSX, tối đa 2 MB và 200 dòng. Hàng đầu tiên cần date, description, amount, type. Ngày YYYY-MM-DD hoặc DD/MM/YYYY; type là income hoặc expense.</Text><Text style={common.helper}>FinSight không kết nối hay lấy mật khẩu ngân hàng.</Text><Text style={[common.label, styles.label]}>Tài khoản nhận giao dịch</Text><View style={styles.chips}>{accounts.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => { setAccountId(item.id); setPreview(null); }} style={[styles.chip, accountId === item.id && styles.active]}><Text style={[styles.chipText, accountId === item.id && styles.activeText]}>{item.name}</Text></Pressable>)}</View><PrimaryButton onPress={pick} disabled={busy || !accountId}>{busy ? 'Đang đọc...' : 'Chọn tệp và xem trước'}</PrimaryButton><SecondaryButton onPress={() => router.push('/categories')}>Quản lý danh mục →</SecondaryButton></Card>
    {preview && <><Text style={[common.sectionTitle, styles.sectionTitle]}>Kiểm tra {preview.rows.length} dòng</Text><Text style={common.helper}>Chọn dòng và danh mục đúng loại. Dòng đã nhập từ cùng tệp không thể nhập lại.</Text>{preview.rows.map((row) => { const enabled = selected.includes(row.rowNumber); return <Card key={row.rowNumber} style={styles.rowCard}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: enabled, disabled: row.alreadyImported }} disabled={row.alreadyImported || busy} onPress={() => toggle(selected, row.rowNumber, setSelected)}><Text style={styles.rowTitle}>{enabled ? '☑' : '□'} Dòng {row.rowNumber}: {row.description}</Text></Pressable><Text style={common.helper}>{row.occurredOn} · {row.kind === 'INCOME' ? 'Thu' : 'Chi'} · {formatVnd(row.amount)}</Text>{row.alreadyImported ? <Text style={styles.warning}>Đã nhập từ tệp này</Text> : <><Text style={[common.label, styles.label]}>Danh mục</Text><View style={styles.chips}>{categories.filter((item) => item.categoryType === row.kind).map((item) => <Pressable key={item.id} accessibilityRole="button" disabled={!enabled || busy} onPress={() => setCategoryByRow((current) => ({ ...current, [row.rowNumber]: item.id }))} style={[styles.chip, categoryByRow[row.rowNumber] === item.id && styles.active]}><Text style={[styles.chipText, categoryByRow[row.rowNumber] === item.id && styles.activeText]}>{item.name}</Text></Pressable>)}</View>{row.possibleDuplicate && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: allowed.includes(row.rowNumber) }} disabled={!enabled || busy} onPress={() => toggle(allowed, row.rowNumber, setAllowed)}><Text style={styles.warning}>{allowed.includes(row.rowNumber) ? '☑' : '□'} Có giao dịch giống ngày, số tiền và mô tả; tôi đã kiểm tra</Text></Pressable>}</>}</Card>; })}<PrimaryButton onPress={commit} disabled={busy || !selected.length}>{busy ? 'Đang lưu...' : `Nhập ${selected.length} giao dịch`}</PrimaryButton><SecondaryButton onPress={() => setPreview(null)}>Hủy xem trước</SecondaryButton></>}
    {!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}
  </Page>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 29 },
  subtitle: { marginTop: 7, marginBottom: 23 }, help: { marginTop: 12, marginBottom: 8 },
  label: { marginTop: 20 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderColor: color.border, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: color.white },
  active: { backgroundColor: color.greenLight, borderColor: '#6ee7b7' }, chipText: { color: color.muted, fontSize: 13, fontWeight: '700' }, activeText: { color: color.greenDark },
  sectionTitle: { marginTop: 26, marginBottom: 9 }, rowCard: { marginTop: 11 }, rowTitle: { color: color.navy, fontWeight: '800', marginBottom: 8 },
  warning: { color: '#b45309', fontSize: 12, lineHeight: 18, marginTop: 11 },
});
