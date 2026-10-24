import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { askAssistant, type AssistantAnswer } from '../../api';
import { Brand, Card, Page, PrimaryButton, common } from '../../components/Ui';
import { formatVnd } from '../../money';
import { useSession } from '../../session';
import { color } from '../../theme';

type Exchange = { question: string; answer: AssistantAnswer };
const prompts = ['Tình hình tài chính tháng này thế nào?', 'Ngân sách tháng này còn lại bao nhiêu?', 'Tôi có đang chi nhiều hơn thu không?'];

export default function Assistant() {
  const { session } = useSession();
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function ask() {
    const text = question.trim();
    if (!session || busy || !text || text.length > 500) return;
    setBusy(true); setError('');
    try {
      const answer = await askAssistant(session, text);
      setHistory((current) => [...current.slice(-9), { question: text, answer }]); setQuestion('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không kết nối được trợ lý.'); }
    finally { setBusy(false); }
  }

  return <Page><Brand subtitle="TRỢ LÝ FINSIGHT" /><Text style={[common.title, styles.title]}>Hỏi về tài chính</Text>
    <Text style={common.subtitle}>Trợ lý giải thích các số liệu đã được FinSight tính. Các con số xác minh hiển thị riêng.</Text>
    <Card style={styles.guide}><Text style={styles.heading}>Bạn có thể hỏi</Text>{prompts.map((prompt) => <Pressable accessibilityRole="button" key={prompt} onPress={() => setQuestion(prompt)} style={styles.prompt}><Text style={styles.promptText}>{prompt}</Text></Pressable>)}<Text style={common.helper}>Khi gửi, câu hỏi nguyên văn và số liệu tổng hợp tháng hiện tại được chuyển đến dịch vụ AI. Đừng nhập thông tin riêng vào câu hỏi. FinSight không tự đính kèm tên, email, ghi chú giao dịch hoặc thông tin ngân hàng. Hãy đối chiếu phần giải thích với các số liệu xác minh; hội thoại chỉ lưu tạm trên màn hình.</Text></Card>
    {history.map((entry, index) => <Card key={index} style={styles.exchange}><Text style={styles.question}>{entry.question}</Text><Text style={styles.explanation}>{entry.answer.explanation}</Text><Text style={common.helper}>{entry.answer.source === 'NO_DATA' ? 'Chưa đủ dữ liệu' : entry.answer.source === 'VERIFIED_ONLY' ? 'Chỉ hiển thị dữ kiện đã xác minh' : 'Giải thích bằng AI từ số liệu backend'}</Text><View style={styles.facts}>{entry.answer.verifiedFacts.map((fact) => <View key={fact.key} style={styles.fact}><Text style={styles.factLabel}>{fact.label}</Text><Text style={styles.factValue}>{fact.unit === 'VND' ? formatVnd(fact.value) : `${fact.value} ${fact.unit}`}</Text></View>)}</View></Card>)}
    <Card style={styles.form}><Text style={common.label}>Câu hỏi của bạn</Text><TextInput style={[common.input, styles.input]} value={question} onChangeText={setQuestion} multiline maxLength={500} placeholder="Bạn muốn hiểu điều gì về tháng này?" placeholderTextColor={color.muted} /><PrimaryButton onPress={ask} disabled={busy || !question.trim()}>{busy ? 'Đang giải thích...' : 'Gửi câu hỏi'}</PrimaryButton>{!!error && <Text accessibilityRole="alert" style={common.error}>{error}</Text>}</Card>
  </Page>;
}

const styles = StyleSheet.create({ title: { marginTop: 26 }, guide: { gap: 10, marginTop: 18 }, heading: { color: color.navy, fontSize: 16, fontWeight: '800' }, prompt: { padding: 10, borderWidth: 1, borderColor: color.border, borderRadius: 10 }, promptText: { color: color.greenDark, fontWeight: '700' }, exchange: { gap: 11, marginTop: 15 }, question: { color: color.navy, fontWeight: '800' }, explanation: { color: color.navy, lineHeight: 21 }, facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, fact: { width: '48%', minWidth: 130, flexGrow: 1, backgroundColor: color.canvas, borderRadius: 10, padding: 10, gap: 4 }, factLabel: { color: color.muted, fontSize: 11 }, factValue: { color: color.navy, fontWeight: '800' }, form: { gap: 12, marginTop: 18 }, input: { minHeight: 80, textAlignVertical: 'top' } });
