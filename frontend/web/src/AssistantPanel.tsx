import { useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { formatVnd } from "./money";
import "./AssistantPanel.css";

type Fact = { key: string; label: string; value: string; unit: string };
type Answer = { explanation: string; source: "AI_EXPLANATION" | "NO_DATA" | "VERIFIED_ONLY"; verifiedFacts: Fact[] };
type Exchange = { question: string; answer: Answer };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const prompts = ["Tình hình tài chính tháng này của tôi thế nào?", "Ngân sách tháng này còn lại bao nhiêu?", "Tôi có đang chi nhiều hơn thu không?"];

export default function AssistantPanel({ session }: { session: Session }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (busy || !text || text.length > 500) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`${apiBase}/api/v1/assistant/ask`, {
        method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({})) as { detail?: string };
        throw new Error(problem.detail || (response.status === 503 ? "AI chat chưa được cấu hình trên backend." : `Không nhận được câu trả lời (HTTP ${response.status}).`));
      }
      const answer = await response.json() as Answer;
      setHistory((current) => [...current.slice(-9), { question: text, answer }]); setQuestion("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không kết nối được trợ lý."); }
    finally { setBusy(false); }
  }

  return <><div className="page-heading"><p className="eyebrow">TRỢ LÝ FINSIGHT</p><h1>Hỏi về tài chính của bạn</h1><p>Trợ lý giải thích số liệu đã được FinSight tính; các con số xác minh hiển thị riêng bên dưới câu trả lời.</p></div>
    <div className="assistant-layout"><section className="surface-card assistant-chat"><div className="section-head"><div><p className="eyebrow">HỘI THOẠI</p><h2>Hỏi về tháng này</h2></div><span className="small-badge">Mỗi câu hỏi độc lập</span></div>
      {!history.length && <div className="empty-state compact"><span>✦</span><h3>Bắt đầu bằng một câu hỏi</h3><p>Ví dụ: “Chi tiêu tháng này của tôi thế nào?”</p></div>}
      <div className="assistant-history" aria-live="polite">{history.map((entry, index) => <article key={index}><p className="assistant-question">{entry.question}</p><div className="assistant-reply"><p>{entry.answer.explanation}</p><span>{entry.answer.source === "NO_DATA" ? "Chưa đủ dữ liệu" : entry.answer.source === "VERIFIED_ONLY" ? "Chỉ hiển thị dữ kiện đã xác minh" : "Giải thích bằng AI từ số liệu backend"}</span><div className="assistant-facts">{entry.answer.verifiedFacts.map((fact) => <div key={fact.key}><small>{fact.label}</small><strong>{fact.unit === "VND" ? formatVnd(fact.value) : `${fact.value} ${fact.unit}`}</strong></div>)}</div></div></article>)}</div>
      <form onSubmit={ask}><label htmlFor="assistant-question">Câu hỏi của bạn</label><textarea id="assistant-question" rows={3} maxLength={500} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Bạn muốn hiểu điều gì về tài chính tháng này?" /><button className="button-primary" disabled={busy || !question.trim()}>{busy ? "Đang giải thích..." : "Gửi câu hỏi"}</button></form>{error && <p className="inline-error" role="alert">{error}</p>}
    </section><aside className="surface-card assistant-guide"><p className="eyebrow">GỢI Ý</p><h2>Bạn có thể hỏi</h2><div className="assistant-prompts">{prompts.map((prompt) => <button key={prompt} className="button-outline" onClick={() => setQuestion(prompt)}>{prompt}</button>)}</div><p className="muted">Khi gửi, câu hỏi nguyên văn và số liệu tổng hợp tháng hiện tại được chuyển đến dịch vụ AI. Đừng nhập thông tin riêng vào câu hỏi. FinSight không tự đính kèm tên, email, ghi chú giao dịch hoặc thông tin ngân hàng. Hãy đối chiếu phần giải thích với các số liệu xác minh; hội thoại chỉ lưu tạm trên màn hình này.</p></aside></div>
  </>;
}
