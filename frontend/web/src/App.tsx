import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { initialRecoveryRedirect, supabase } from "./supabase";
import AuthPanel, { PasswordResetPanel, ProfilePanel } from "./AuthPanel";
import AccountsPanel, { type Account } from "./AccountsPanel";
import CategoriesPanel from "./CategoriesPanel";
import MerchantsPanel from "./MerchantsPanel";
import StatementImportPanel from "./StatementImportPanel";
import TransactionsPanel from "./TransactionsPanel";
import TransfersPanel from "./TransfersPanel";
import BudgetPanel from "./BudgetPanel";
import DashboardPanel from "./DashboardPanel";
import RecurringPanel from "./RecurringPanel";
import SubscriptionSuggestionsPanel from "./SubscriptionSuggestionsPanel";
import GoalPanel from "./GoalPanel";
import NetWorthPanel from "./NetWorthPanel";
import AssistantPanel from "./AssistantPanel";
import ReconciliationPanel from "./ReconciliationPanel";
import "./App.css";

type Page = "overview" | "accounts" | "net-worth" | "reconcile" | "transactions" | "statements" | "transfers" | "recurring" | "categories" | "merchants" | "budgets" | "goals" | "assistant" | "profile";
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export function Brand({ light = false }: { light?: boolean }) {
  return <span className={`brand ${light ? "brand-light" : ""}`}>
    <span className="brand-mark">F<span>.</span></span>
    <span>FinSight<small>Tài chính rõ ràng</small></span>
  </span>;
}

function Landing({ openAuth }: { openAuth: (mode: "signin" | "signup") => void }) {
  return <div className="landing">
    <header className="landing-header shell-width">
      <a href="#top" aria-label="FinSight, về đầu trang"><Brand /></a>
      <nav aria-label="Điều hướng trang chủ"><a href="#features">Tính năng</a><a href="#approach">Cách hoạt động</a></nav>
      <div className="landing-header-actions"><button className="button-quiet" onClick={() => openAuth("signin")}>Đăng nhập</button><button className="button-primary" onClick={() => openAuth("signup")}>Bắt đầu miễn phí <span aria-hidden="true">↗</span></button></div>
    </header>
    <main id="top">
      <section className="landing-hero shell-width">
        <span className="eyebrow pill"><span className="live-dot" /> Không gian tài chính của riêng bạn</span>
        <h1>Hiểu tài chính, làm chủ<br /><em>tương lai.</em></h1>
        <p>Ghi lại tài khoản do bạn tự quản lý, theo dõi dữ liệu rõ ràng và từng bước xây dựng kế hoạch tài chính cá nhân.</p>
        <div className="hero-actions"><button className="button-primary button-large" onClick={() => openAuth("signup")}>Bắt đầu với FinSight <span aria-hidden="true">→</span></button><button className="button-outline button-large" onClick={() => openAuth("signin")}>Tôi đã có tài khoản</button></div>
        <span className="landing-note">Bạn tự nhập và kiểm soát dữ liệu của mình · Không kết nối tài khoản ngân hàng</span>
        <div className="preview-window" aria-label="Minh họa giao diện FinSight, chưa phải dữ liệu tài chính thật">
          <div className="preview-top"><span className="preview-dots">● ● ●</span><Brand /><span className="preview-tag">BẢN XEM TRƯỚC</span></div>
          <div className="preview-body"><div className="preview-title"><span>Tổng quan tài chính</span><small>Thông tin sẽ xuất hiện khi bạn thêm dữ liệu</small></div>
            <div className="preview-metrics"><div><small>Tài khoản của bạn</small><strong>—</strong><span>Chưa có dữ liệu</span></div><div><small>Thu nhập</small><strong>—</strong><span>Đang phát triển</span></div><div><small>Chi tiêu</small><strong>—</strong><span>Đang phát triển</span></div></div>
            <div className="preview-lower"><div className="preview-blank"><span className="preview-line" /><span className="preview-line short" /><div className="preview-bars"><i /><i /><i /><i /><i /><i /><i /></div></div><div className="preview-aside"><span className="preview-circle">F.</span><strong>Dữ liệu của bạn, góc nhìn của bạn.</strong><p>Bắt đầu bằng tài khoản tài chính do chính bạn nhập.</p></div></div>
          </div>
        </div>
      </section>
      <section className="landing-band"><div className="shell-width"><span>01 <strong>Ghi nhận</strong> tài khoản cá nhân</span><span>02 <strong>Quan sát</strong> dòng tiền rõ ràng</span><span>03 <strong>Chủ động</strong> lập kế hoạch</span></div></section>
      <section className="feature-section shell-width" id="features"><p className="eyebrow">TÍNH NĂNG CỦA FINSIGHT</p><h2>Một nơi để bắt đầu quản lý tài chính</h2><p className="section-lead">Các phần đang hoạt động được phân biệt rõ với những tính năng trong lộ trình phát triển.</p><div className="feature-grid">
        <article><span className="feature-icon">▣</span><small>ĐÃ CÓ</small><h3>Tài khoản tài chính</h3><p>Tạo và xem tài khoản tiền mặt, ngân hàng hoặc ví điện tử do bạn tự nhập. Số dư đầu kỳ được lưu chính xác.</p></article>
        <article><span className="feature-icon blue">↗</span><small>ĐÃ CÓ</small><h3>Giao dịch & dòng tiền</h3><p>Ghi thu chi, phân loại, đính kèm hóa đơn và tìm lại giao dịch đã lưu.</p></article>
        <article><span className="feature-icon violet">◫</span><small>ĐÃ CÓ</small><h3>Ngân sách tháng</h3><p>Đặt hạn mức tổng và theo danh mục, xem số đã chi và phần còn lại.</p></article>
      </div></section>
      <section className="approach-section" id="approach"><div className="shell-width approach-card"><div><p className="eyebrow">BẮT ĐẦU TỪ ĐIỀU QUAN TRỌNG</p><h2>Tài chính rõ ràng bắt đầu từ dữ liệu đáng tin.</h2><p>FinSight chỉ hiển thị số liệu bạn đã lưu. Các biểu đồ và chỉ số chưa có dữ liệu sẽ được đánh dấu rõ ràng.</p></div><button className="button-primary" onClick={() => openAuth("signup")}>Tạo tài khoản <span aria-hidden="true">→</span></button></div></section>
    </main><footer className="landing-footer shell-width"><Brand /><p>FinSight không kết nối ngân hàng và không tự cập nhật số dư tài khoản.</p></footer>
  </div>;
}

function Workspace({ session, signOut, signOutError }: { session: Session; signOut: () => Promise<void>; signOutError: string }) {
  const [page, setPage] = useState<Page>("overview");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [accountsError, setAccountsError] = useState("");
  const [displayName, setDisplayName] = useState<string | null>((session.user.user_metadata?.display_name as string | undefined) ?? null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/accounts`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(`Không tải được tài khoản (HTTP ${response.status}).`); setAccounts((await response.json()) as Account[]); setAccountsLoaded(true); })
      .catch((error: unknown) => { if (!controller.signal.aborted) { setAccountsError(error instanceof Error ? error.message : "Không thể tải tài khoản."); setAccountsLoaded(true); } });
    return () => controller.abort();
  }, [session.access_token]);
  async function reloadAccounts() {
    try {
      const response = await fetch(`${apiBase}/api/v1/accounts`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) throw new Error(`Không tải được tài khoản (HTTP ${response.status}).`);
      setAccounts(await response.json() as Account[]); setAccountsError(""); setAccountsLoaded(true);
    } catch (error) { setAccountsError(error instanceof Error ? error.message : "Không thể tải tài khoản."); }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${apiBase}/api/v1/profile`, { headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal })
      .then(async (response) => { if (response.ok) { const profile = await response.json() as { displayName: string | null }; setDisplayName(profile.displayName); } })
      .catch(() => { /* The profile page reports errors when opened. */ });
    return () => controller.abort();
  }, [session.access_token]);
  const nav: { id: Page; label: string; symbol: string }[] = [
    { id: "overview", label: "Tổng quan", symbol: "◫" }, { id: "transactions", label: "Giao dịch", symbol: "▤" }, { id: "statements", label: "Nhập sao kê", symbol: "▧" }, { id: "merchants", label: "Nơi giao dịch", symbol: "▣" }, { id: "transfers", label: "Chuyển khoản", symbol: "↔" }, { id: "recurring", label: "Định kỳ", symbol: "↻" }, { id: "accounts", label: "Tài khoản", symbol: "▣" }, { id: "net-worth", label: "Tài sản ròng", symbol: "◈" }, { id: "reconcile", label: "Đối soát", symbol: "◎" }, { id: "budgets", label: "Ngân sách", symbol: "◩" }, { id: "goals", label: "Mục tiêu", symbol: "◎" }, { id: "assistant", label: "Trợ lý AI", symbol: "✦" }, { id: "profile", label: "Hồ sơ", symbol: "◉" },
  ];
  const title = nav.find((item) => item.id === page)?.label ?? "Danh mục";
  return <div className="workspace">
    <aside className="workspace-sidebar"><Brand /><p className="sidebar-caption">KHÔNG GIAN CỦA BẠN</p><nav aria-label="Điều hướng ứng dụng">{nav.map((item) => <button key={item.id} className={page === item.id ? "selected" : ""} onClick={() => setPage(item.id)}><span aria-hidden="true">{item.symbol}</span>{item.label}</button>)}</nav><div className="sidebar-bottom"><span className="sidebar-avatar">{(displayName || session.user.email || "F").slice(0, 1).toUpperCase()}</span><span><strong>{displayName || "Tài khoản FinSight"}</strong><small>{session.user.email}</small></span></div></aside>
    <div className="workspace-main"><header className="workspace-topbar"><div><span className="mobile-brand"><Brand /></span><small>FINSIGHT / {title.toUpperCase()}</small></div><div className="topbar-actions"><span className="data-badge"><span className="live-dot" /> Dữ liệu do bạn nhập</span><button className="button-quiet" onClick={signOut}>Đăng xuất</button></div></header>
      <main className="workspace-content">
        {signOutError && <p className="inline-error" role="alert">{signOutError}</p>}
        {page === "overview" && <DashboardPanel session={session} displayName={displayName} accounts={accounts} accountsLoaded={accountsLoaded} accountsError={accountsError} onNavigate={setPage} />}
        {page === "accounts" && <><div className="page-heading"><p className="eyebrow">TÀI KHOẢN CỦA BẠN</p><h1>Quản lý tài khoản</h1><p>Tài khoản trong FinSight là bản ghi do bạn tự tạo, không liên kết ngân hàng.</p><button className="button-outline" onClick={() => setPage("net-worth")}>Xem tài sản ròng →</button><button className="button-outline" onClick={() => setPage("reconcile")}>Đối soát số dư →</button></div><AccountsPanel session={session} accounts={accounts} onCreated={(account) => setAccounts((current) => [...current, account])} /></>}
        {page === "net-worth" && <NetWorthPanel session={session} />}
        {page === "assistant" && <AssistantPanel session={session} />}
        {page === "reconcile" && <><div className="page-heading"><p className="eyebrow">TÀI KHOẢN CỦA BẠN</p><h1>Đối soát số dư</h1><p>Ghi lại số dư bạn quan sát và so với số dư FinSight.</p></div><ReconciliationPanel session={session} accounts={accounts} /></>}
        {page === "transactions" && <><div className="page-heading"><p className="eyebrow">DÒNG TIỀN</p><h1>Giao dịch</h1><p>Ghi khoản thu, chi và xem lịch sử từ dữ liệu bạn tự nhập.</p><button className="button-outline" onClick={() => setPage("statements")}>Nhập sao kê CSV/Excel →</button><button className="button-outline" onClick={() => setPage("transfers")}>Chuyển khoản giữa tài khoản →</button><button className="button-outline" onClick={() => setPage("recurring")}>Giao dịch định kỳ →</button><button className="button-outline" onClick={() => setPage("merchants")}>Nơi giao dịch →</button></div><TransactionsPanel session={session} accounts={accounts} onChanged={() => { void reloadAccounts(); }} onCategories={() => setPage("categories")} onMerchants={() => setPage("merchants")} /></>}
        {page === "statements" && <><div className="page-heading"><p className="eyebrow">DÒNG TIỀN / SAO KÊ</p><h1>Nhập sao kê</h1><p>Xem trước và xác nhận từng dòng trước khi tạo giao dịch.</p></div><StatementImportPanel session={session} accounts={accounts} onCategories={() => setPage("categories")} /></>}
        {page === "transfers" && <><div className="page-heading"><p className="eyebrow">DÒNG TIỀN</p><h1>Chuyển khoản</h1><p>Di chuyển tiền giữa các tài khoản do bạn tự quản lý.</p></div><TransfersPanel session={session} accounts={accounts} onChanged={() => { void reloadAccounts(); }} /></>}
        {page === "recurring" && <><div className="page-heading"><p className="eyebrow">DÒNG TIỀN</p><h1>Giao dịch định kỳ</h1><p>Lên lịch khoản thu chi thường kỳ và tự chọn khi nào ghi nhận.</p></div><SubscriptionSuggestionsPanel session={session} /><RecurringPanel session={session} accounts={accounts} onChanged={() => { void reloadAccounts(); }} /></>}
        {page === "categories" && <><div className="page-heading"><p className="eyebrow">DÒNG TIỀN / DANH MỤC</p><h1>Danh mục thu chi</h1><p>Tổ chức các khoản thu nhập và chi tiêu theo cách bạn quen dùng.</p></div><CategoriesPanel session={session} /></>}
        {page === "merchants" && <><div className="page-heading"><p className="eyebrow">DÒNG TIỀN / NƠI GIAO DỊCH</p><h1>Nơi giao dịch</h1><p>Lưu cửa hàng và đơn vị thường gặp để gắn vào khoản thu chi.</p></div><MerchantsPanel session={session} /></>}
        {page === "budgets" && <><div className="page-heading"><p className="eyebrow">KẾ HOẠCH TÀI CHÍNH</p><h1>Ngân sách</h1><p>Đặt hạn mức tổng và theo danh mục cho từng tháng.</p><button className="button-outline" onClick={() => setPage("goals")}>Mục tiêu tiết kiệm →</button></div><BudgetPanel session={session} /></>}
        {page === "goals" && <><div className="page-heading"><p className="eyebrow">KẾ HOẠCH TÀI CHÍNH</p><h1>Mục tiêu tiết kiệm</h1><p>Theo dõi khoản tiền bạn dự định dành cho điều quan trọng.</p></div><GoalPanel session={session} /></>}
        {page === "profile" && <><div className="page-heading"><p className="eyebrow">CÀI ĐẶT CÁ NHÂN</p><h1>Hồ sơ của bạn</h1><p>Cập nhật tên hiển thị và kiểm tra thông tin tài khoản.</p></div><ProfilePanel session={session} onDisplayName={setDisplayName} /></>}
      </main><nav className="workspace-mobile-nav" aria-label="Điều hướng ứng dụng trên điện thoại">{nav.filter((item) => item.id !== "transfers" && item.id !== "recurring" && item.id !== "goals" && item.id !== "reconcile" && item.id !== "merchants" && item.id !== "statements").map((item) => <button key={item.id} className={page === item.id ? "selected" : ""} onClick={() => setPage(item.id)}><span aria-hidden="true">{item.symbol}</span>{item.label}</button>)}</nav>
    </div>
  </div>;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(() => window.location.hash === "#account" || window.location.hash === "#login" ? "signin" : window.location.hash === "#register" ? "signup" : null);
  const [recovering, setRecovering] = useState(() => initialRecoveryRedirect || sessionStorage.getItem("finsight-password-recovery") === "1");
  const [signOutError, setSignOutError] = useState("");
  useEffect(() => {
    const syncHash = () => setAuthMode(window.location.hash === "#account" || window.location.hash === "#login" ? "signin" : window.location.hash === "#register" ? "signup" : null);
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    let authEventSeen = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      authEventSeen = true;
      if (event === "PASSWORD_RECOVERY") { sessionStorage.setItem("finsight-password-recovery", "1"); setRecovering(true); }
      if (event === "SIGNED_OUT") { sessionStorage.removeItem("finsight-password-recovery"); setRecovering(false); }
      setSession(next); setLoading(false);
    });
    client.auth.getSession().then(({ data }) => { if (active && !authEventSeen) { setSession(data.session); setLoading(false); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  function openAuth(mode: "signin" | "signup") { setAuthMode(mode); window.location.hash = mode === "signin" ? "account" : "register"; window.scrollTo(0, 0); }
  function closeAuth() { setAuthMode(null); window.location.hash = "top"; window.scrollTo(0, 0); }
  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) { setSignOutError(error.message); return; }
    setSignOutError(""); setSession(null); setAuthMode("signin"); window.location.hash = "account";
  }
  if (loading) return <div className="loading-screen"><Brand /><p>Đang mở FinSight...</p></div>;
  if (recovering && session) return <PasswordResetPanel onFinished={() => setRecovering(false)} />;
  if (session) return <Workspace session={session} signOut={signOut} signOutError={signOutError} />;
  if (authMode) return <AuthPanel key={authMode} initialMode={authMode} close={closeAuth} />;
  return <Landing openAuth={openAuth} />;
}
