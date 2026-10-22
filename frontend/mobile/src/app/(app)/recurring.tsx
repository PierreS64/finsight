import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAccounts, getCategories, getRecurringRules, processRecurringRule, saveRecurringRule,
  type Account, type Category, type CategoryType, type RecurringRule, type RecurringRuleInput } from '../../api';
import { Brand, Card, Page, PrimaryButton, SecondaryButton, common } from '../../components/Ui';
import SubscriptionSuggestionsCard from '../../components/SubscriptionSuggestionsCard';
import { formatVnd } from '../../money';
import { useSession } from '../../session';
import { color } from '../../theme';

const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
const validAmount = (value: string) => /^\d{1,17}(?:[.,]\d{1,2})?$/.test(value.trim()) && /[1-9]/.test(value);

export default function Recurring() {
  const { session } = useSession();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryType>('EXPENSE');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState<'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [nextDueOn, setNextDueOn] = useState(today);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useFocusEffect(useCallback(() => {
    if (!session) return;
    const controller = new AbortController();
    Promise.all([getRecurringRules(session, controller.signal), getAccounts(session, controller.signal), getCategories(session, controller.signal)])
      .then(([foundRules, foundAccounts, foundCategories]) => { setRules(foundRules); setAccounts(foundAccounts); setCategories(foundCategories); setLoading(false); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) { setMessage(reason instanceof Error ? reason.message : 'Không tải được lịch định kỳ.'); setLoading(false); } });
    return () => controller.abort();
  }, [session]));

  const availableCategories = categories.filter((item) => item.categoryType === kind);
  const selectedAccount = accounts.some((item) => item.id === accountId) ? accountId : accounts[0]?.id ?? '';
  const selectedCategory = availableCategories.some((item) => item.id === categoryId) ? categoryId : availableCategories[0]?.id ?? '';
  const accountName = (id: string) => accounts.find((item) => item.id === id)?.name ?? 'Tài khoản đã thay đổi';
  const categoryName = (id: string) => categories.find((item) => item.id === id)?.name ?? 'Danh mục đã thay đổi';

  function reset() { setEditing(null); setName(''); setKind('EXPENSE'); setAccountId(''); setCategoryId(''); setAmount(''); setCadence('MONTHLY'); setNextDueOn(today()); setNote(''); }
  function edit(rule: RecurringRule) { setEditing(rule.id); setName(rule.name); setKind(rule.kind); setAccountId(rule.accountId); setCategoryId(rule.categoryId); setAmount(rule.amount); setCadence(rule.cadence); setNextDueOn(rule.nextDueOn); setNote(rule.note ?? ''); }
  async function save() {
    if (!session || busy) return;
    if (!name.trim() || !selectedAccount || !selectedCategory || !validAmount(amount) || !/^\d{4}-\d{2}-\d{2}$/.test(nextDueOn)) {
      setMessage('Nhập đầy đủ thông tin, ngày YYYY-MM-DD và số tiền hợp lệ.'); return;
    }
    const input: RecurringRuleInput = { accountId: selectedAccount, categoryId: selectedCategory, name: name.trim(), kind,
      amount: amount.trim().replace(',', '.'), cadence, nextDueOn, active: editing ? rules.find((item) => item.id === editing)?.active ?? true : true, note: note.trim() || null };
    setBusy(true); setMessage('');
    try {
      const saved = await saveRecurringRule(session, input, editing ?? undefined);
      setRules((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      reset(); setMessage('Đã lưu lịch. Chưa có giao dịch nào được ghi tự động.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không lưu được lịch.'); }
    finally { setBusy(false); }
  }
  async function toggle(rule: RecurringRule) {
    if (!session || busy) return;
    setBusy(true); setMessage('');
    try {
      const saved = await saveRecurringRule(session, { accountId: rule.accountId, categoryId: rule.categoryId,
        name: rule.name, kind: rule.kind, amount: rule.amount, cadence: rule.cadence,
        nextDueOn: rule.nextDueOn, active: !rule.active, note: rule.note }, rule.id);
      setRules((current) => current.map((item) => item.id === saved.id ? saved : item));
      setMessage(saved.active ? 'Đã tiếp tục lịch.' : 'Đã tạm dừng lịch.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không cập nhật được lịch.'); }
    finally { setBusy(false); }
  }
  async function process(rule: RecurringRule) {
    if (!session || busy) return;
    setBusy(true); setMessage('');
    try {
      const result = await processRecurringRule(session, rule.id);
      setRules((current) => current.map((item) => item.id === rule.id ? { ...item, nextDueOn: result.nextDueOn } : item));
      setMessage(`Đã ghi ${result.createdTransactions} giao dịch đến hạn. Kỳ tiếp theo: ${result.nextDueOn}.`);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Không ghi nhận được kỳ đến hạn.'); }
    finally { setBusy(false); }
  }
  return <Page><Brand subtitle="GIAO DỊCH ĐỊNH KỲ" /><Text style={[common.title, styles.title]}>Lịch thu chi</Text>
    <Text style={common.subtitle}>Giao dịch thật chỉ được tạo khi bạn bấm “Ghi nhận đến hạn”. Một kỳ chỉ được ghi một lần.</Text>
    <SubscriptionSuggestionsCard />
    <Text style={styles.heading}>Các khoản đã lên lịch</Text>
    {loading && <Text style={common.helper}>Đang tải lịch...</Text>}
    {!loading && !rules.length && <Card><Text style={common.helper}>Chưa có khoản định kỳ.</Text></Card>}
    {rules.map((rule) => <Card key={rule.id} style={styles.rule}><View style={styles.line}><Text style={styles.name}>{rule.name}</Text><Text style={rule.active ? styles.active : styles.paused}>{rule.active ? 'Đang chạy' : 'Tạm dừng'}</Text></View>
      <Text style={styles.amount}>{formatVnd(rule.amount)} · {rule.kind === 'EXPENSE' ? 'Chi' : 'Thu'} · {rule.cadence === 'WEEKLY' ? 'Hàng tuần' : 'Hàng tháng'}</Text>
      <Text style={common.helper}>{accountName(rule.accountId)} · {categoryName(rule.categoryId)} · đến hạn {rule.nextDueOn}</Text>
      <View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => edit(rule)}><Text style={styles.link}>Sửa</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => toggle(rule)}><Text style={styles.link}>{rule.active ? 'Tạm dừng' : 'Tiếp tục'}</Text></Pressable></View>
      {rule.active && rule.nextDueOn <= today() && <PrimaryButton onPress={() => process(rule)} disabled={busy}>Ghi nhận đến hạn</PrimaryButton>}
    </Card>)}
    <Text style={styles.heading}>{editing ? 'Sửa lịch' : 'Tạo lịch mới'}</Text><Card style={styles.form}>
      <Text style={common.label}>Tên khoản</Text><TextInput style={common.input} value={name} onChangeText={setName} placeholder="Ví dụ: Internet" placeholderTextColor={color.muted} maxLength={100} />
      <Text style={common.label}>Loại</Text><View style={styles.chips}>{(['EXPENSE', 'INCOME'] as const).map((item) => <Pressable accessibilityRole="button" key={item} onPress={() => { setKind(item); setCategoryId(''); }} style={[styles.chip, kind === item && styles.chipActive]}><Text style={styles.chipText}>{item === 'EXPENSE' ? 'Chi tiêu' : 'Thu nhập'}</Text></Pressable>)}</View>
      <Text style={common.label}>Tài khoản</Text><View style={styles.chips}>{accounts.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => setAccountId(item.id)} style={[styles.chip, selectedAccount === item.id && styles.chipActive]}><Text style={styles.chipText}>{item.name}</Text></Pressable>)}</View>
      <Text style={common.label}>Danh mục</Text><View style={styles.chips}>{availableCategories.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => setCategoryId(item.id)} style={[styles.chip, selectedCategory === item.id && styles.chipActive]}><Text style={styles.chipText}>{item.name}</Text></Pressable>)}</View>
      <Text style={common.label}>Số tiền (VND)</Text><TextInput style={common.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="250000" placeholderTextColor={color.muted} />
      <Text style={common.label}>Chu kỳ</Text><View style={styles.chips}>{(['WEEKLY', 'MONTHLY'] as const).map((item) => <Pressable accessibilityRole="button" key={item} onPress={() => setCadence(item)} style={[styles.chip, cadence === item && styles.chipActive]}><Text style={styles.chipText}>{item === 'WEEKLY' ? 'Hàng tuần' : 'Hàng tháng'}</Text></Pressable>)}</View>
      <Text style={common.label}>Ngày đến hạn tiếp theo (YYYY-MM-DD)</Text><TextInput style={common.input} value={nextDueOn} onChangeText={setNextDueOn} placeholder="2026-10-21" placeholderTextColor={color.muted} />
      <Text style={common.label}>Ghi chú (tùy chọn)</Text><TextInput style={common.input} value={note} onChangeText={setNote} maxLength={500} placeholder="Ghi chú" placeholderTextColor={color.muted} />
      <PrimaryButton onPress={save} disabled={busy || !accounts.length || !availableCategories.length}>{editing ? 'Lưu thay đổi' : 'Tạo lịch'}</PrimaryButton>
      {editing && <SecondaryButton onPress={reset}>Hủy sửa</SecondaryButton>}
    </Card>{!!message && <Text accessibilityRole="alert" style={common.message}>{message}</Text>}
  </Page>;
}

const styles = StyleSheet.create({
  title: { marginTop: 26 }, heading: { color: color.navy, fontSize: 17, fontWeight: '800', marginTop: 24, marginBottom: 12 },
  rule: { gap: 10, marginBottom: 9 }, line: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  name: { color: color.navy, fontSize: 15, fontWeight: '800' }, amount: { color: color.navy, fontSize: 13, fontWeight: '700' },
  active: { color: color.greenDark, fontSize: 11, fontWeight: '800' }, paused: { color: color.muted, fontSize: 11, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 16 }, link: { color: color.greenDark, fontSize: 12, fontWeight: '800' },
  form: { gap: 11 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: color.border },
  chipActive: { backgroundColor: color.greenLight, borderColor: color.green }, chipText: { color: color.navy, fontSize: 11, fontWeight: '700' },
});
