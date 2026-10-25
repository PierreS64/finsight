import { useLocalSearchParams } from 'expo-router';
import TransactionEditor from '../../components/TransactionEditor';

export default function TransactionForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <TransactionEditor transactionId={id} />;
}
