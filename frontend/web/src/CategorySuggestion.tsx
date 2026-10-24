import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

type Suggestion = { categoryId: string; categoryName: string; source: "MERCHANT" | "NOTE"; confidence: "HIGH" | "MEDIUM"; supportingCount: number; totalMatches: number };

export default function CategorySuggestion({ session, kind, merchantId, note, onApply }: {
  session: Session; kind: "INCOME" | "EXPENSE"; merchantId: string; note: string; onApply: (id: string) => void;
}) {
  const [result, setResult] = useState<{ key: string; suggestion: Suggestion | null } | null>(null);
  const key = JSON.stringify([session.access_token, kind, merchantId, note]);
  const suggestion = result?.key === key ? result.suggestion : null;
  useEffect(() => {
    if (!merchantId && !note.trim()) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ kind });
      if (merchantId) params.set("merchantId", merchantId);
      if (note.trim()) params.set("note", note.trim());
      try {
        const response = await fetch(`${apiBase}/api/v1/categories/suggestion?${params}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
        });
        if (response.status === 204) { setResult({ key, suggestion: null }); return; }
        if (response.ok) setResult({ key, suggestion: await response.json() as Suggestion });
      } catch { /* Suggestion is optional; transaction entry stays available. */ }
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [session.access_token, kind, merchantId, note, key]);
  if (!suggestion) return null;
  return <div className="category-suggestion" role="status"><div><strong>Gợi ý: {suggestion.categoryName}</strong><small>Từ {suggestion.source === "MERCHANT" ? "nơi giao dịch" : "ghi chú"} · {suggestion.supportingCount}/{suggestion.totalMatches} giao dịch tương tự · {suggestion.confidence === "HIGH" ? "độ tin cậy cao" : "cần kiểm tra"}</small></div><button type="button" className="button-outline" onClick={() => onApply(suggestion.categoryId)}>Dùng danh mục</button></div>;
}
