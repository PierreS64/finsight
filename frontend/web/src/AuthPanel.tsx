import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import "./AuthPanel.css";

type Profile = { userId: string; displayName: string | null; currencyCode: string };
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function AuthPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      setProfile(null);
      setProfileMissing(false);
      setSession(next);
    });
    client.auth.getSession().then(({ data, error }) => {
      if (error) setMessage(error.message);
      setSession(data.session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/profile`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 404) {
          setProfileMissing(true);
          return;
        }
        if (!response.ok) throw new Error(`API trả về ${response.status}`);
        const found = (await response.json()) as Profile;
        setProfile(found);
        setDisplayName(found.displayName ?? "");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Không thể tải hồ sơ.");
      });
    return () => controller.abort();
  }, [session]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (result.error) throw result.error;
      setPassword("");
      if (mode === "signup" && !result.data.session) setMessage("Đã gửi email xác nhận. Hãy xác nhận rồi đăng nhập.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Xác thực thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/v1/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      if (!response.ok) throw new Error(`Không lưu được hồ sơ (HTTP ${response.status}).`);
      setProfile((await response.json()) as Profile);
      setProfileMissing(false);
      setMessage("Đã lưu hồ sơ.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu hồ sơ.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    setMessage(error?.message ?? "Đã đăng xuất.");
  }

  return (
    <section className="account-section" id="account">
      <div className="account-intro">
        <p className="eyebrow">TÀI KHOẢN FINSIGHT</p>
        <h2>Bắt đầu với dữ liệu của chính bạn.</h2>
        <p>Đăng nhập để tạo hồ sơ cá nhân. Tài khoản tài chính và giao dịch sẽ được bổ sung trong các bước tiếp theo.</p>
      </div>
      <div className="account-panel">
        {!supabase ? (
          <p>Chưa cấu hình Supabase cho web. Xem <code>frontend/web/.env.example</code>.</p>
        ) : session ? (
          <>
            <div className="account-panel-head">
              <div><small>ĐÃ ĐĂNG NHẬP</small><h3>{session.user.email ?? "Tài khoản FinSight"}</h3></div>
              <button type="button" className="text-button" onClick={signOut} disabled={busy}>Đăng xuất</button>
            </div>
            <p className="account-helper">{profileMissing ? "Hãy hoàn tất hồ sơ của bạn." : profile ? `Hồ sơ của bạn · ${profile.currencyCode}` : "Đang tải hồ sơ..."}</p>
            <form onSubmit={saveProfile} className="account-form">
              <label htmlFor="display-name">Tên hiển thị</label>
              <input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={80} />
              <button type="submit" disabled={busy || !displayName.trim()}>Lưu hồ sơ</button>
            </form>
          </>
        ) : (
          <>
            <div className="account-tabs" role="group" aria-label="Chế độ tài khoản">
              <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setMessage(""); }}>Đăng nhập</button>
              <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setMessage(""); }}>Đăng ký</button>
            </div>
            <form onSubmit={submitAuth} className="account-form">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <label htmlFor="password">Mật khẩu</label>
              <input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
              <button type="submit" disabled={busy}>{busy ? "Đang xử lý..." : mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}</button>
            </form>
          </>
        )}
        {message && <p className="account-message" role="status">{message}</p>}
      </div>
    </section>
  );
}
