import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { getCategorySuggestion, type CategorySuggestion as Suggestion, type CategoryType } from '../api';
import { color } from '../theme';

export default function CategorySuggestion({ session, kind, merchantId, note, onApply }: {
  session: Session | null; kind: CategoryType; merchantId: string; note: string; onApply: (id: string) => void;
}) {
  const [result, setResult] = useState<{ key: string; suggestion: Suggestion | null } | null>(null);
  const key = JSON.stringify([session?.access_token, kind, merchantId, note]);
  const suggestion = result?.key === key ? result.suggestion : null;
  useEffect(() => {
    if (!session || (!merchantId && !note.trim())) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      getCategorySuggestion(session, kind, merchantId, note, controller.signal).then((found) => setResult({ key, suggestion: found }))
        .catch(() => { /* Suggestions are optional; manual entry remains available. */ });
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [session, kind, merchantId, note, key]);
  if (!suggestion) return null;
  return <View style={styles.box}><Text style={styles.title}>Gợi ý: {suggestion.categoryName}</Text><Text style={styles.detail}>Từ {suggestion.source === 'MERCHANT' ? 'nơi giao dịch' : 'ghi chú'} · {suggestion.supportingCount}/{suggestion.totalMatches} giao dịch tương tự · {suggestion.confidence === 'HIGH' ? 'độ tin cậy cao' : 'cần kiểm tra'}</Text><Pressable accessibilityRole="button" onPress={() => onApply(suggestion.categoryId)}><Text style={styles.action}>Dùng danh mục</Text></Pressable></View>;
}

const styles = StyleSheet.create({ box: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#80e5b4', backgroundColor: color.greenLight, gap: 6 }, title: { color: color.greenDark, fontWeight: '800' }, detail: { color: color.muted, fontSize: 12 }, action: { color: color.greenDark, fontWeight: '800', marginTop: 4 } });
