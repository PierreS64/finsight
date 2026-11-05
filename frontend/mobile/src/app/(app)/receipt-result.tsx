import { useLocalSearchParams } from 'expo-router';
import TransactionEditor from '../../components/TransactionEditor';
import type { ReceiptRecognition } from '../../api';

export default function ReceiptResult() {
  const { result, uri, mimeType } = useLocalSearchParams<{ result?: string; uri?: string; mimeType?: string }>();
  let recognition: ReceiptRecognition | undefined;
  try { if (result) recognition = JSON.parse(result) as ReceiptRecognition; } catch { recognition = undefined; }
  return <TransactionEditor recognition={recognition} receiptUri={uri} receiptMimeType={mimeType} />;
}
