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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
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

  return <div className={`auth-screen${sentEmail ? " auth-email-screen" : ""}`}><button className="auth-back" onClick={close}>← Về trang chủ</button><div className="auth-shell">
    <section className="auth-form-side"><div className="auth-brand"><img src="/finsight-logo.png" alt="FinSight" /></div>
      {sentEmail ? <div className="auth-confirm"><span className="confirm-icon material-symbols-outlined" aria-hidden="true">mark_email_read</span><h1>Kiểm tra hộp thư của bạn</h1><p>Chúng tôi đã gửi liên kết xác nhận đến <strong>{sentEmail}</strong>. Hãy mở email và làm theo hướng dẫn, sau đó đăng nhập.</p><button className="button-primary" onClick={() => { setSentEmail(""); setMode("signin"); }}>Đến trang đăng nhập →</button><button className="link-button" onClick={resendEmail} disabled={busy}>Gửi lại email xác nhận</button></div> : <><span className="eyebrow">{mode === "signin" ? "CHÀO MỪNG BẠN TRỞ LẠI" : "BẮT ĐẦU CÙNG FINSIGHT"}</span><h1>{mode === "signin" ? "Đăng nhập vào FinSight" : "Tạo tài khoản mới"}</h1><p className="auth-description">{mode === "signin" ? "Tiếp tục quản lý dữ liệu tài chính của chính bạn." : "Thiết lập không gian tài chính cá nhân của bạn trong vài bước."}</p>
        {!supabase && <p className="inline-error" role="alert">Chưa cấu hình Supabase cho web. Xem frontend/web/.env.example.</p>}
        <form className="auth-form" onSubmit={submit}>{mode === "signup" && <label>Họ và tên<div className="auth-input-wrap"><span className="material-symbols-outlined" aria-hidden="true">person</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={80} required placeholder="Tên hiển thị của bạn" /></div></label>}
          <label>Email đăng nhập <span className="required-mark">*</span><div className="auth-input-wrap"><span className="material-symbols-outlined" aria-hidden="true">alternate_email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="ban@example.com" /></div></label>
          <label>Mật khẩu <span className="required-mark">*</span><div className="auth-input-wrap"><span className="material-symbols-outlined" aria-hidden="true">lock</span><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} required placeholder="Nhập mật khẩu" /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}><span className="material-symbols-outlined" aria-hidden="true">{showPassword ? "visibility_off" : "visibility"}</span></button></div></label>
          {mode === "signup" && <label>Xác nhận mật khẩu <span className="required-mark">*</span><div className="auth-input-wrap"><span className="material-symbols-outlined" aria-hidden="true">lock</span><input type={showConfirmation ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required placeholder="Nhập lại mật khẩu" /><button type="button" className="password-toggle" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}><span className="material-symbols-outlined" aria-hidden="true">{showConfirmation ? "visibility_off" : "visibility"}</span></button></div></label>}
          {mode === "signin" && <button type="button" className="link-button forgot-button" onClick={resetPassword} disabled={busy}>Quên mật khẩu?</button>}
          <button className="button-primary auth-submit" type="submit" disabled={busy || !supabase}>{busy ? "Đang xử lý..." : mode === "signin" ? "Đăng nhập →" : "Tạo tài khoản →"}</button>
        </form><p className="auth-switch">{mode === "signin" ? "Chưa có tài khoản?" : "Đã có tài khoản?"} <button className="link-button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>{mode === "signin" ? "Đăng ký ngay" : "Đăng nhập"}</button></p></>}
      {message && <p className="auth-message" role="status">{message}</p>}
      <p className="auth-fineprint">FinSight không yêu cầu thông tin đăng nhập ngân hàng của bạn.</p>
    </section>
    <aside className="auth-story"><img className="auth-story-logo" src="/finsight-logo.png" alt="FinSight" /><div className="auth-story-copy"><h2>Nền tảng Quản trị Tài chính Cá nhân<br />Thông minh & Chủ động</h2><p>Sổ cái số thông minh giúp bạn kiểm soát dòng tiền, tối ưu chi tiêu và thiết lập kế hoạch tài chính an toàn, minh bạch theo cách của riêng bạn.</p><div className="auth-feature-list"><article><span className="material-symbols-outlined" aria-hidden="true">data_usage</span><div><strong>Quản trị ngân sách & Safe-to-Spend</strong><p>Thiết lập hạn mức chi tiêu linh hoạt, theo dõi số dư an toàn chỉ tiêu tức thời.</p></div></article><article><span className="material-symbols-outlined" aria-hidden="true">document_scanner</span><div><strong>Nhận diện hóa đơn thông minh OCR</strong><p>Gợi ý ngày và tổng tiền từ ảnh hóa đơn để bạn kiểm tra trước khi lưu.</p></div></article><article><span className="material-symbols-outlined" aria-hidden="true">shield</span><div><strong>Bảo mật & quyền riêng tư người dùng</strong><p>Dữ liệu tài chính chỉ hiển thị trong phiên đăng nhập của bạn.</p></div></article></div></div><span className="auth-story-dot" aria-hidden="true" /></aside>
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
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
  return <div className="auth-screen reset-screen"><header className="reset-header"><img src="/finsight-logo.png" alt="FinSight" /><span><span className="material-symbols-outlined" aria-hidden="true">verified_user</span> Bảo vệ tài khoản an toàn</span></header><section className="reset-card"><div className="reset-card-icon"><span className="material-symbols-outlined" aria-hidden="true">lock_reset</span></div><h1>Thiết lập mật khẩu mới</h1><p className="auth-description">Liên kết khôi phục đã xác thực phiên của bạn. Nhập mật khẩu mới để tiếp tục.</p><form className="auth-form" onSubmit={submit}><label>Mật khẩu mới <span className="required-mark">*</span><div className="auth-input-wrap"><span className="material-symbols-outlined" aria-hidden="true">lock</span><input type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="Nhập mật khẩu mới" /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}><span className="material-symbols-outlined" aria-hidden="true">{showPassword ? "visibility_off" : "visibility"}</span></button></div></label><div className="reset-password-help">Mật khẩu cần ít nhất 6 ký tự.</div><label>Xác nhận mật khẩu mới <span className="required-mark">*</span><div className="auth-input-wrap"><span className="material-symbols-outlined" aria-hidden="true">lock_clock</span><input type={showConfirmation ? "text" : "password"} autoComplete="new-password" minLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required placeholder="Nhập lại mật khẩu mới" /><button type="button" className="password-toggle" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}><span className="material-symbols-outlined" aria-hidden="true">{showConfirmation ? "visibility_off" : "visibility"}</span></button></div></label><button className="button-primary auth-submit" disabled={busy || password.length < 6 || password !== confirmation}>{busy ? "Đang cập nhật..." : "Cập nhật mật khẩu →"}</button></form>{message && <p className="inline-error" role="alert">{message}</p>}</section></div>;
}
