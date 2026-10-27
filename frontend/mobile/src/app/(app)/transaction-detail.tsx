import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { deleteTransaction, downloadReceipt, getAccounts, getCategories, getTransactions, type Account, type Category, type Transaction } from '../../api';
import { useSession } from '../../session';
import { formatVnd } from '../../money';
import { Card, Page, PrimaryButton, SecondaryButton, common } from '../../components/Ui';
import { color } from '../../theme';

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useSession();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [receipt, setReceipt] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session || !id) return;
    let active = true;
    Promise.all([getTransactions(session), getAccounts(session), getCategories(session)]).then(async ([items, accounts, categories]) => {
      if (!active) return;
      const found = items.find((item) => item.id === id);
      if (!found) { setError('Không tìm thấy giao dịch này.'); return; }
      setTransaction(found); setAccount(accounts.find((item) => item.id === found.accountId) ?? null); setCategory(categories.find((item) => item.id === found.categoryId) ?? null);
      if (found.hasReceipt) {
        try { const uri = await downloadReceipt(session, found.id); if (active) setReceipt(uri); }
        catch { if (active) setError('Không tải được ảnh hóa đơn.'); }
      }
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Không tải được giao dịch.'); });
    return () => { active = false; };
  }, [session, id]);

  async function remove() {
    if (!session || !transaction || busy) return;
    setBusy(true); setError('');
    try { await deleteTransaction(session, transaction.id); setConfirm(false); router.replace('/transactions'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không xóa được giao dịch.'); }
    finally { setBusy(false); }
  }

  return <Page style={styles.page}><View style={styles.header}><Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={color.navy} /></Pressable><Text style={styles.title}>Chi tiết giao dịch</Text><View style={{ width: 24 }} /></View>
    {!transaction && !error && <Text style={common.helper}>Đang tải giao dịch...</Text>}{!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}
    {transaction && <><Card style={styles.hero}><Ionicons name={transaction.kind === 'EXPENSE' ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'} size={55} color={transaction.kind === 'EXPENSE' ? '#b91c1c' : color.greenDark} /><Text style={styles.category}>{category?.name || 'Danh mục'}</Text><Text style={common.helper}>{transaction.note || 'Không có ghi chú'}</Text><Text style={[styles.amount, transaction.kind === 'EXPENSE' && styles.expense]}>{transaction.kind === 'EXPENSE' ? '−' : '+'}{formatVnd(transaction.amount)}</Text><Text style={styles.complete}>✓ Hoàn tất</Text></Card>
      <Card style={styles.details}><View style={styles.line}><Text style={styles.label}>Tài khoản thanh toán</Text><Text style={styles.value}>{account?.name || 'Tài khoản'}</Text></View><View style={styles.line}><Text style={styles.label}>Thời gian</Text><Text style={styles.value}>{transaction.occurredOn}</Text></View><View style={styles.line}><Text style={styles.label}>Mã giao dịch</Text><Text style={styles.value}>{transaction.id}</Text></View>{!!transaction.note && <View style={styles.line}><Text style={styles.label}>Ghi chú</Text><Text style={styles.value}>{transaction.note}</Text></View>}</Card>
      {!!receipt && <Card style={styles.receipt}><Text style={styles.category}>Ảnh hóa đơn đính kèm</Text><Image source={{ uri: receipt }} style={styles.receiptImage} resizeMode="contain" /></Card>}
      <View style={styles.actions}><SecondaryButton onPress={() => setConfirm(true)}>Xóa giao dịch</SecondaryButton><PrimaryButton onPress={() => router.push({ pathname: '/transaction-form', params: { id: transaction.id } })}>Chỉnh sửa</PrimaryButton></View></>}
    <Modal transparent visible={confirm} animationType="slide" onRequestClose={() => setConfirm(false)}><View style={styles.backdrop}><View style={styles.sheet}><View style={styles.handle} /><Text style={styles.title}>Xóa giao dịch này?</Text><Text style={common.helper}>Giao dịch và ảnh hóa đơn đính kèm sẽ bị xóa.</Text><PrimaryButton onPress={remove} disabled={busy}>{busy ? 'Đang xóa...' : 'Xác nhận xóa'}</PrimaryButton><SecondaryButton onPress={() => setConfirm(false)}>Hủy</SecondaryButton></View></View></Modal>
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 7 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, title: { color: color.navy, fontSize: 20, fontWeight: '800' }, hero: { alignItems: 'center', gap: 9, marginBottom: 16, paddingVertical: 28 }, category: { color: color.navy, fontSize: 20, fontWeight: '800' }, amount: { color: color.greenDark, fontSize: 30, fontWeight: '800', marginVertical: 5 }, expense: { color: '#b91c1c' }, complete: { color: color.greenDark, backgroundColor: '#d1fae5', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, overflow: 'hidden' }, details: { marginBottom: 16 }, line: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: color.border, gap: 4 }, label: { color: color.muted, fontSize: 13 }, value: { color: color.navy, fontSize: 15, fontWeight: '700' }, receipt: { marginBottom: 16 }, receiptImage: { width: '100%', height: 260, marginTop: 15 }, actions: { marginBottom: 25 }, backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' }, sheet: { backgroundColor: color.white, padding: 24, borderTopLeftRadius: 26, borderTopRightRadius: 26, gap: 11 }, handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#d6ded9', alignSelf: 'center' } });
