import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getAccounts, getCategories, getTransactions, type Account, type Category, type Transaction } from '../../api';
import { useSession } from '../../session';
import { formatVnd, sumBalances } from '../../money';
import { reportMonth } from '../../reportDate';
import { Card, Page, common } from '../../components/Ui';
import { color } from '../../theme';

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useSession();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!session || !id) return;
    const controller = new AbortController();
    Promise.all([getAccounts(session, controller.signal), getTransactions(session, controller.signal), getCategories(session, controller.signal)])
      .then(([accounts, items, categoryList]) => { setAccount(accounts.find((item) => item.id === id) ?? null); setTransactions(items.filter((item) => item.accountId === id)); setCategories(categoryList); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Không tải được tài khoản.'); });
    return () => controller.abort();
  }, [session, id]);
  const current = transactions.filter((item) => item.occurredOn.startsWith(reportMonth()));
  const income = sumBalances(current.filter((item) => item.kind === 'INCOME').map((item) => item.amount));
  const expense = sumBalances(current.filter((item) => item.kind === 'EXPENSE').map((item) => item.amount));
  return <Page style={styles.page}><View style={styles.header}><Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color={color.navy} /></Pressable><Text style={styles.title}>Chi tiết tài khoản</Text><View style={{ width: 25 }} /></View>
    {!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}{!account && !error && <Text style={common.helper}>Đang tải tài khoản...</Text>}
    {account && <><Card style={styles.hero}><View style={styles.accountHead}><View style={styles.accountIcon}><Ionicons name={account.accountType === 'CASH' ? 'cash-outline' : account.accountType === 'BANK' ? 'business-outline' : 'wallet-outline'} size={30} color={color.greenDark} /></View><Text style={styles.accountName}>{account.name}</Text></View><Text style={common.helper}>Số dư khả dụng</Text><Text style={styles.balance}>{formatVnd(account.currentBalance)}</Text><View style={styles.notice}><Ionicons name="information-circle-outline" size={20} color={color.greenDark} /><Text style={[common.helper, { flex: 1 }]}>Số dư tính từ số dư đầu kỳ và giao dịch đã lưu; không đồng bộ ngân hàng.</Text></View></Card>
      <Text style={styles.section}>Tác vụ nhanh</Text><View style={styles.quickRow}><Pressable onPress={() => router.push('/transfers')} style={styles.quick}><Ionicons name="swap-horizontal-outline" size={26} color={color.greenDark} /><Text style={styles.quickText}>Chuyển nội bộ</Text></Pressable><Pressable onPress={() => router.push('/reconcile')} style={styles.quick}><Ionicons name="reader-outline" size={26} color={color.blue} /><Text style={styles.quickText}>Đối soát số dư</Text></Pressable><Pressable onPress={() => router.push('/analytics')} style={styles.quick}><Ionicons name="bar-chart-outline" size={26} color="#825100" /><Text style={styles.quickText}>Xem báo cáo</Text></Pressable></View>
      <Card style={styles.monthCard}><Text style={styles.section}>Dòng tiền tháng {reportMonth().slice(5)}/{reportMonth().slice(0, 4)}</Text><View style={styles.totals}><View style={styles.total}><Text style={common.helper}>Tiền vào</Text><Text style={styles.income}>+{formatVnd(income)}</Text></View><View style={styles.total}><Text style={common.helper}>Tiền ra</Text><Text style={styles.expense}>−{formatVnd(expense)}</Text></View></View></Card>
      <View style={styles.sectionHead}><Text style={styles.section}>Lịch sử giao dịch tài khoản</Text><Pressable onPress={() => router.push('/transactions')}><Text style={styles.link}>Xem tất cả ›</Text></Pressable></View><Card style={styles.list}>{transactions.length ? transactions.slice(0, 5).map((item) => <Pressable key={item.id} onPress={() => router.push({ pathname: '/transaction-detail', params: { id: item.id } })} style={styles.row}><Ionicons name={item.kind === 'EXPENSE' ? 'arrow-up-outline' : 'arrow-down-outline'} size={24} color={item.kind === 'EXPENSE' ? '#b91c1c' : color.greenDark} /><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{item.note || categories.find((category) => category.id === item.categoryId)?.name || 'Giao dịch'}</Text><Text style={common.helper}>{item.occurredOn}</Text></View><Text style={[styles.rowAmount, item.kind === 'EXPENSE' && styles.expense]}>{item.kind === 'EXPENSE' ? '−' : '+'}{formatVnd(item.amount)}</Text></Pressable>) : <Text style={common.helper}>Chưa có giao dịch với tài khoản này.</Text>}</Card></>}
  </Page>;
}

const styles = StyleSheet.create({ page: { paddingTop: 7 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }, title: { color: color.navy, fontSize: 20, fontWeight: '800' }, hero: { marginBottom: 18 }, accountHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 }, accountIcon: { width: 53, height: 53, borderRadius: 14, backgroundColor: '#e4effd', alignItems: 'center', justifyContent: 'center' }, accountName: { color: color.navy, fontSize: 21, fontWeight: '800', flex: 1 }, balance: { color: color.greenDark, fontSize: 29, fontWeight: '800', marginTop: 5 }, notice: { flexDirection: 'row', gap: 9, alignItems: 'center', backgroundColor: '#edf4ff', padding: 12, borderRadius: 11, marginTop: 20 }, section: { color: color.navy, fontSize: 18, fontWeight: '800', marginBottom: 12 }, quickRow: { flexDirection: 'row', gap: 8, marginBottom: 20 }, quick: { flex: 1, alignItems: 'center', backgroundColor: color.white, borderWidth: 1, borderColor: color.border, borderRadius: 13, paddingVertical: 14, gap: 8 }, quickText: { color: color.navy, fontSize: 11, textAlign: 'center', fontWeight: '700' }, monthCard: { marginBottom: 20 }, totals: { flexDirection: 'row', gap: 10 }, total: { flex: 1, backgroundColor: '#edf4ff', borderRadius: 11, padding: 12 }, income: { color: color.greenDark, fontWeight: '800', marginTop: 6 }, expense: { color: '#b91c1c', fontWeight: '800', marginTop: 6 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, link: { color: color.greenDark, fontWeight: '700', fontSize: 12 }, list: { padding: 0, overflow: 'hidden', marginBottom: 20 }, row: { flexDirection: 'row', gap: 11, alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: color.border }, rowTitle: { color: color.navy, fontWeight: '800', fontSize: 13 }, rowAmount: { color: color.greenDark, fontWeight: '800', fontSize: 12 } });
