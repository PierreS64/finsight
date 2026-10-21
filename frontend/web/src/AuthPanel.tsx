import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import "./AuthPanel.css";

type Profile = { userId: string; displayName: string | null; currencyCode: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function AuthPanel({ initialMode, close }: { initialMode: "signin" | "signup"; close: () => void }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    if (mode === "signup" && password !== confirmPassword) { setMessage("Hai mật khẩu chưa khớp."); return; }
    setBusy(true);
    setMessage("");
    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() } } });
      if (result.error) throw result.error;
      setPassword("");
      setConfirmPassword("");
      if (mode === "signup" && !result.data.session) setSentEmail(email.trim());
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể xác thực tài khoản."); }
    finally { setBusy(false); }
  }

  async function resendEmail() {
    if (!supabase || !sentEmail || busy) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: sentEmail });
    setMessage(error?.message ?? "Đã gửi lại email xác nhận.");
    setBusy(false);
  }

  async function resetPassword() {
    if (!supabase || !email.trim() || busy) { setMessage("Nhập email trước khi yêu cầu đặt lại mật khẩu."); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/` });
    setMessage(error?.message ?? "Nếu email đã đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.");
    setBusy(false);
  }

  return <div className="auth-screen"><button className="auth-back" onClick={close}>← Về trang chủ</button><div className="auth-shell">
    <section className="auth-form-side"><div className="auth-brand"><span className="brand-mark">F<span>.</span></span><strong>FinSight</strong></div>
      {sentEmail ? <div className="auth-confirm"><span className="confirm-icon">✉</span><p className="eyebrow">XÁC NHẬN EMAIL</p><h1>Kiểm tra hộp thư của bạn</h1><p>Chúng tôi đã gửi liên kết xác nhận đến <strong>{sentEmail}</strong>. Hãy mở email và làm theo hướng dẫn, sau đó đăng nhập.</p><button className="button-primary" onClick={() => { setSentEmail(""); setMode("signin"); }}>Đến trang đăng nhập</button><button className="link-button" onClick={resendEmail} disabled={busy}>Gửi lại email xác nhận</button></div> : <><span className="eyebrow">{mode === "signin" ? "CHÀO MỪNG BẠN TRỞ LẠI" : "BẮT ĐẦU CÙNG FINSIGHT"}</span><h1>{mode === "signin" ? "Đăng nhập vào FinSight" : "Tạo tài khoản mới"}</h1><p className="auth-description">{mode === "signin" ? "Tiếp tục quản lý dữ liệu tài chính của chính bạn." : "Thiết lập không gian tài chính cá nhân của bạn trong vài bước."}</p>
        {!supabase && <p className="inline-error" role="alert">Chưa cấu hình Supabase cho web. Xem frontend/web/.env.example.</p>}
        <form className="auth-form" onSubmit={submit}>{mode === "signup" && <label>Họ và tên<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={80} required placeholder="Tên hiển thị của bạn" /></label>}
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="ban@example.com" /></label>
          <label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} required placeholder="Nhập mật khẩu" /></label>
          {mode === "signup" && <label>Xác nhận mật khẩu<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required placeholder="Nhập lại mật khẩu" /></label>}
          {mode === "signin" && <button type="button" className="link-button forgot-button" onClick={resetPassword} disabled={busy}>Quên mật khẩu?</button>}
          <button className="button-primary auth-submit" type="submit" disabled={busy || !supabase}>{busy ? "Đang xử lý..." : mode === "signin" ? "Đăng nhập →" : "Tạo tài khoản →"}</button>
        </form><p className="auth-switch">{mode === "signin" ? "Chưa có tài khoản?" : "Đã có tài khoản?"} <button className="link-button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>{mode === "signin" ? "Đăng ký ngay" : "Đăng nhập"}</button></p></>}
      {message && <p className="auth-message" role="status">{message}</p>}
      <p className="auth-fineprint">FinSight không yêu cầu thông tin đăng nhập ngân hàng của bạn.</p>
    </section>
    <aside className="auth-story"><span className="auth-story-pill"><span className="live-dot" /> Tài chính rõ ràng từ dữ liệu của bạn</span><div className="story-card"><span className="story-icon">F.</span><small>KHÔNG GIAN CÁ NHÂN</small><h2>Một góc nhìn đơn giản hơn về tiền của bạn.</h2><p>Tạo tài khoản tài chính, lưu số dư đầu kỳ và tiếp tục khi bạn sẵn sàng.</p><div className="story-line"><i /><i /><i /><i /><i /></div></div><p className="story-foot">FinSight · Hiểu tài chính, làm chủ tương lai</p></aside>
  </div></div>;
}

export function ProfilePanel({ session, onDisplayName }: { session: Session; onDisplayName: (value: string | null) => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false);
  const [displayName, setDisplayName] = useState((session.user.user_metadata?.display_name as string | undefined) ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/profile`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => { if (response.status === 404) { setMissing(true); return; } if (!response.ok) throw new Error(`Không tải được hồ sơ (HTTP ${response.status}).`); const found = (await response.json()) as Profile; setProfile(found); setDisplayName(found.displayName ?? ""); onDisplayName(found.displayName); })
      .catch((error: unknown) => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Không thể tải hồ sơ."); });
    return () => controller.abort();
  }, [session.access_token, onDisplayName]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !displayName.trim()) return;
    setBusy(true); setMessage("");
    try { const response = await fetch(`${apiBase}/api/v1/profile`, { method: "PUT", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ displayName: displayName.trim() }) }); if (!response.ok) throw new Error(`Không lưu được hồ sơ (HTTP ${response.status}).`); const saved = (await response.json()) as Profile; setProfile(saved); setMissing(false); onDisplayName(saved.displayName); setMessage("Đã lưu hồ sơ."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Không thể lưu hồ sơ."); }
    finally { setBusy(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    if (newPassword.length < 6 || newPassword !== confirmNewPassword) { setMessage("Mật khẩu cần ít nhất 6 ký tự và hai lần nhập phải khớp."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setNewPassword(""); setConfirmNewPassword("");
    setMessage(error?.message ?? "Đã đổi mật khẩu."); setBusy(false);
  }

  return <div className="profile-layout"><section className="surface-card profile-card"><div className="profile-avatar">{displayName.slice(0, 1).toUpperCase() || "F"}</div><div><p className="eyebrow">HỒ SƠ CÁ NHÂN</p><h2>{profile?.displayName || "Hoàn tất hồ sơ"}</h2><p className="muted">{session.user.email}</p></div><form className="profile-form" onSubmit={save}><label>Tên hiển thị<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} required placeholder="Tên của bạn" /></label><button className="button-primary" disabled={busy || !displayName.trim()}>{busy ? "Đang lưu..." : "Lưu hồ sơ"}</button></form>{missing && <p className="muted">Bạn chưa lưu hồ sơ. Hãy nhập tên để hoàn tất.</p>}{message && <p className="auth-message" role="status">{message}</p>}</section><aside className="surface-card profile-info"><h3>Thông tin tài khoản</h3><div><span>Email</span><strong>{session.user.email}</strong></div><div><span>Đơn vị tiền</span><strong>{profile?.currencyCode || "VND"}</strong></div><p>Thông tin tài chính chỉ được truy cập trong phiên đăng nhập của bạn.</p><form className="profile-form" onSubmit={changePassword}><h3>Đổi mật khẩu</h3><label>Mật khẩu mới<input type="password" autoComplete="new-password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label><label>Nhập lại mật khẩu mới<input type="password" autoComplete="new-password" minLength={6} value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} required /></label><button className="button-primary" disabled={busy || newPassword.length < 6 || newPassword !== confirmNewPassword}>Đổi mật khẩu</button></form></aside></div>;
}

export function PasswordResetPanel({ onFinished }: { onFinished: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    if (password.length < 6 || password !== confirmation) { setMessage("Mật khẩu cần ít nhất 6 ký tự và hai lần nhập phải khớp."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    setPassword(""); setConfirmation(""); setBusy(false);
    if (error) setMessage(error.message);
    else { sessionStorage.removeItem("finsight-password-recovery"); onFinished(); }
  }
  return <div className="auth-screen"><div className="auth-shell"><section className="auth-form-side"><div className="auth-brand"><span className="brand-mark">F<span>.</span></span><strong>FinSight</strong></div><p className="eyebrow">BẢO MẬT TÀI KHOẢN</p><h1>Đặt mật khẩu mới</h1><p className="auth-description">Liên kết khôi phục đã xác thực phiên của bạn. Nhập mật khẩu mới để tiếp tục.</p><form className="auth-form" onSubmit={submit}><label>Mật khẩu mới<input type="password" autoComplete="new-password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label>Nhập lại mật khẩu<input type="password" autoComplete="new-password" minLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label><button className="button-primary auth-submit" disabled={busy || password.length < 6 || password !== confirmation}>{busy ? "Đang cập nhật..." : "Lưu mật khẩu mới"}</button></form>{message && <p className="inline-error" role="alert">{message}</p>}</section><aside className="auth-story"><span className="auth-story-pill">FinSight</span><div className="story-card"><span className="story-icon">F.</span><h2>Tài khoản của bạn, dữ liệu của bạn.</h2><p>Mật khẩu do Supabase Auth xử lý; FinSight không lưu mật khẩu trong cơ sở dữ liệu ứng dụng.</p></div></aside></div></div>;
}
