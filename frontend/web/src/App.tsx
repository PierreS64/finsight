import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { initialRecoveryRedirect, supabase } from "./supabase";
import AuthPanel, { PasswordResetPanel, ProfilePanel } from "./AuthPanel";
import type { Account } from "./AccountsPanel";
import "./App.css";
import "./WebDesign.css";
import "./ShellDesign.css";
import "./FinanceWorkflow.css";
import "./PublicExperience.css";

const AccountsPanel = lazy(() => import("./AccountsPanel"));
const CategoriesPanel = lazy(() => import("./CategoriesPanel"));
const MerchantsPanel = lazy(() => import("./MerchantsPanel"));
const StatementImportPanel = lazy(() => import("./StatementImportPanel"));
const TransactionsPanel = lazy(() => import("./TransactionsPanel"));
const TransfersPanel = lazy(() => import("./TransfersPanel"));
const BudgetPanel = lazy(() => import("./BudgetPanel"));
const DashboardPanel = lazy(() => import("./DashboardPanel"));
const AnalyticsPanel = lazy(() => import("./AnalyticsPanel"));
const RecurringPanel = lazy(() => import("./RecurringPanel"));
const SubscriptionSuggestionsPanel = lazy(() => import("./SubscriptionSuggestionsPanel"));
const GoalPanel = lazy(() => import("./GoalPanel"));
const NetWorthPanel = lazy(() => import("./NetWorthPanel"));
const AssistantPanel = lazy(() => import("./AssistantPanel"));
const ReconciliationPanel = lazy(() => import("./ReconciliationPanel"));
const UpcomingExpensesPanel = lazy(() => import("./UpcomingExpensesPanel"));

type Page = "overview" | "accounts" | "net-worth" | "reconcile" | "transactions" | "receipts" | "analytics" | "statements" | "transfers" | "recurring" | "upcoming" | "categories" | "merchants" | "budgets" | "goals" | "assistant" | "profile";
const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export function Brand({ light = false }: { light?: boolean }) {
  return <span className={`brand ${light ? "brand-light" : ""}`}><img src="/finsight-logo.png" alt="FinSight" /></span>;
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
        <h1>Hiểu tài chính,<br />làm chủ <em>tương lai.</em></h1>
        <p>Ghi lại tài khoản do bạn tự quản lý, theo dõi dữ liệu rõ ràng và từng bước xây dựng kế hoạch tài chính cá nhân.</p>
        <div className="hero-actions"><button className="button-primary button-large" onClick={() => openAuth("signup")}>Bắt đầu với FinSight <span aria-hidden="true">→</span></button><button className="button-outline button-large" onClick={() => openAuth("signin")}>Tôi đã có tài khoản</button></div>
        <span className="landing-note">Bạn tự nhập và kiểm soát dữ liệu của mình · Không kết nối tài khoản ngân hàng</span>
        <div className="preview-window" role="img" aria-label="Minh họa giao diện FinSight với các chỉ số trống, chưa phải dữ liệu tài chính thật">
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  useEffect(() => { if (mobileMenuOpen && sidebarRef.current) sidebarRef.current.scrollTop = 0; }, [mobileMenuOpen]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileMenuOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);
  const [transactionView, setTransactionView] = useState<"list" | "form" | "ocr">("list");
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
  const navGroups: { label: string; items: { id: Page; label: string; icon: string }[] }[] = [
    { label: "Tổng quan", items: [{ id: "overview", label: "Tổng quan", icon: "dashboard" }] },
    { label: "Dòng tiền", items: [
      { id: "transactions", label: "Giao dịch", icon: "receipt_long" },
      { id: "receipts", label: "Quét hóa đơn", icon: "document_scanner" },
      { id: "statements", label: "Nhập sao kê", icon: "upload_file" },
      { id: "transfers", label: "Chuyển nội bộ", icon: "swap_horiz" },
      { id: "categories", label: "Danh mục", icon: "category" },
      { id: "merchants", label: "Nơi giao dịch", icon: "storefront" },
    ] },
    { label: "Tài khoản & tài sản", items: [
      { id: "accounts", label: "Tài khoản", icon: "account_balance_wallet" },
      { id: "net-worth", label: "Tài sản ròng", icon: "account_balance" },
      { id: "reconcile", label: "Đối soát số dư", icon: "fact_check" },
    ] },
    { label: "Kế hoạch", items: [
      { id: "budgets", label: "Ngân sách", icon: "donut_small" },
      { id: "goals", label: "Mục tiêu tiết kiệm", icon: "flag" },
      { id: "recurring", label: "Giao dịch định kỳ", icon: "event_repeat" },
      { id: "upcoming", label: "Khoản chi sắp tới", icon: "event_upcoming" },
    ] },
    { label: "Phân tích", items: [
      { id: "analytics", label: "Phân tích", icon: "monitoring" },
      { id: "assistant", label: "Trợ lý AI", icon: "auto_awesome" },
    ] },
    { label: "Cá nhân", items: [{ id: "profile", label: "Hồ sơ", icon: "person" }] },
  ];
  const mobileNav = [navGroups[0].items[0], navGroups[1].items[0], navGroups[2].items[0], navGroups[3].items[0]];
  const activeSection = navGroups.find((group) => group.items.some((item) => item.id === page))?.label ?? "FinSight";
  function navigate(next: Page) { setPage(next); setMobileMenuOpen(false); setProfileOpen(false); }
  const title = page === "transactions" ? (transactionView === "list" ? "Danh sách giao dịch" : transactionView === "ocr" ? "Quét hóa đơn" : "Thêm / sửa giao dịch") : ({ overview: "Tổng quan", transactions: "Danh sách giao dịch", receipts: "Hóa đơn & OCR", analytics: "Phân tích", accounts: "Danh sách tài khoản", "net-worth": "Tài sản ròng", reconcile: "Đối soát số dư", statements: "Nhập sao kê", transfers: "Chuyển nội bộ", recurring: "Giao dịch định kỳ", upcoming: "Khoản chi sắp tới", categories: "Quản lý danh mục", merchants: "Nơi giao dịch", budgets: "Tổng quan ngân sách", goals: "Mục tiêu tài chính", assistant: "Trợ lý AI", profile: "Hồ sơ cá nhân" } as Record<Page, string>)[page];
  return <div className={`workspace ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}><a className="workspace-skip-link" href="#workspace-main-content">Bỏ qua điều hướng</a>
    <aside ref={sidebarRef} className={`workspace-sidebar ${mobileMenuOpen ? "mobile-menu-open" : ""}`}><div className="sidebar-brand"><Brand /><button type="button" className="sidebar-collapse" aria-label={sidebarCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"} onClick={() => setSidebarCollapsed((value) => !value)}><span className="material-symbols-outlined" aria-hidden="true">{sidebarCollapsed ? "left_panel_open" : "left_panel_close"}</span></button><button type="button" className="sidebar-mobile-close" aria-label="Đóng điều hướng" onClick={() => setMobileMenuOpen(false)}><span className="material-symbols-outlined" aria-hidden="true">close</span></button></div><nav aria-label="Điều hướng ứng dụng">{navGroups.map((group) => <div className="sidebar-nav-group" key={group.label}><p className="sidebar-group-label nav-label">{group.label}</p>{group.items.map((item) => <button key={item.id} title={item.label} aria-current={page === item.id ? "page" : undefined} className={page === item.id ? "selected" : ""} onClick={() => navigate(item.id)}><span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span><span className="nav-label">{item.label}</span></button>)}</div>)}</nav></aside>
    <div className="workspace-main"><header className="workspace-topbar"><div className="workspace-breadcrumb"><button type="button" className="mobile-menu-trigger" aria-label="Mở điều hướng" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}><span className="material-symbols-outlined" aria-hidden="true">menu</span></button><span className="breadcrumb-parent">{activeSection}</span><span className="material-symbols-outlined breadcrumb-chevron" aria-hidden="true">chevron_right</span><strong>{title}</strong></div><div className="topbar-actions"><div className="profile-menu-wrap"><button className="topbar-profile" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} aria-label={`Tài khoản ${displayName || session.user.email || "FinSight"}`}><span className="sidebar-avatar">{(displayName || session.user.email || "F").slice(0, 2).toUpperCase()}</span><span>{displayName || "Tài khoản FinSight"}</span><span className="material-symbols-outlined" aria-hidden="true">expand_more</span></button>{profileOpen && <div className="profile-menu"><button onClick={() => navigate("profile")}>Hồ sơ cá nhân</button><button onClick={() => { setProfileOpen(false); void signOut(); }}>Đăng xuất</button></div>}</div></div></header>
      <main id="workspace-main-content" className="workspace-content" tabIndex={-1}><Suspense fallback={<div className="empty-state compact" role="status"><span>◌</span><h2>Đang mở màn hình...</h2></div>}>
        {signOutError && <p className="inline-error" role="alert">{signOutError}</p>}
        {(["budgets", "goals", "recurring", "upcoming"] as Page[]).includes(page) && <nav className="planning-tabs" aria-label="Kế hoạch tài chính"><button aria-current={page === "budgets" ? "page" : undefined} className={page === "budgets" ? "selected" : ""} onClick={() => setPage("budgets")}>Ngân sách</button><button aria-current={page === "goals" ? "page" : undefined} className={page === "goals" ? "selected" : ""} onClick={() => setPage("goals")}>Mục tiêu tiết kiệm</button><button aria-current={page === "recurring" ? "page" : undefined} className={page === "recurring" ? "selected" : ""} onClick={() => setPage("recurring")}>Giao dịch định kỳ</button><button aria-current={page === "upcoming" ? "page" : undefined} className={page === "upcoming" ? "selected" : ""} onClick={() => setPage("upcoming")}>Khoản chi sắp tới</button></nav>}
        {(["categories", "profile"] as Page[]).includes(page) && <nav className="planning-tabs" aria-label="Cài đặt và hồ sơ"><button aria-current={page === "categories" ? "page" : undefined} className={page === "categories" ? "selected" : ""} onClick={() => setPage("categories")}>Quản lý danh mục</button><button aria-current={page === "profile" ? "page" : undefined} className={page === "profile" ? "selected" : ""} onClick={() => setPage("profile")}>Hồ sơ cá nhân</button></nav>}
        {page === "overview" && <DashboardPanel session={session} accounts={accounts} accountsLoaded={accountsLoaded} accountsError={accountsError} onNavigate={setPage} />}
        {page === "accounts" && <><div className="page-heading"><p className="eyebrow">TÀI KHOẢN & TÀI SẢN</p><h1>Tài khoản của bạn</h1><p>Theo dõi số dư của những tài khoản do bạn tự quản lý.</p></div><AccountsPanel session={session} accounts={accounts} onCreated={(account) => setAccounts((current) => [...current, account])} onNavigate={setPage} /><div className="transaction-related-nav"><button className="link-button" onClick={() => setPage("net-worth")}>Tài sản ròng</button></div></>}
        {page === "net-worth" && <NetWorthPanel session={session} />}
        {page === "assistant" && <AssistantPanel session={session} />}
        {page === "reconcile" && <><div className="page-heading"><p className="eyebrow">TÀI KHOẢN CỦA BẠN</p><h1>Đối soát số dư</h1><p>Ghi lại số dư bạn quan sát và so với số dư FinSight.</p></div><ReconciliationPanel session={session} accounts={accounts} /></>}
        {page === "transactions" && <><TransactionsPanel session={session} accounts={accounts} onChanged={() => { void reloadAccounts(); }} onCategories={() => setPage("categories")} onMerchants={() => setPage("merchants")} onViewChange={setTransactionView} /><div className="transaction-related-nav"><button className="link-button" onClick={() => setPage("accounts")}>Tài khoản</button><button className="link-button" onClick={() => setPage("statements")}>Nhập sao kê</button><button className="link-button" onClick={() => setPage("transfers")}>Chuyển nội bộ</button><button className="link-button" onClick={() => setPage("recurring")}>Giao dịch định kỳ</button><button className="link-button" onClick={() => setPage("categories")}>Danh mục</button><button className="link-button" onClick={() => setPage("merchants")}>Nơi giao dịch</button></div></>}
        {page === "receipts" && <div className="receipts-workspace"><TransactionsPanel initialView="ocr" session={session} accounts={accounts} onChanged={() => { void reloadAccounts(); }} onCategories={() => setPage("categories")} onMerchants={() => setPage("merchants")} /></div>}
        {page === "analytics" && <><div className="page-heading"><p className="eyebrow">GÓC NHÌN TÀI CHÍNH</p><h1>Phân tích</h1><p>Xem dòng tiền, xu hướng và các chỉ số từ dữ liệu bạn đã ghi.</p></div><AnalyticsPanel session={session} onAssistant={() => setPage("assistant")} /></>}
        {page === "statements" && <><div className="page-heading"><p className="eyebrow">DÒNG TIỀN / SAO KÊ</p><h1>Nhập sao kê</h1><p>Xem trước và xác nhận từng dòng trước khi tạo giao dịch.</p></div><StatementImportPanel session={session} accounts={accounts} onChanged={() => { void reloadAccounts(); }} onCategories={() => setPage("categories")} /></>}
        {page === "transfers" && <><div className="page-heading"><p className="eyebrow">DÒNG TIỀN</p><h1>Chuyển khoản</h1><p>Di chuyển tiền giữa các tài khoản do bạn tự quản lý.</p></div><TransfersPanel session={session} accounts={accounts} onChanged={() => { void reloadAccounts(); }} /></>}
        {page === "recurring" && <><div className="page-heading"><p className="eyebrow">DÒNG TIỀN</p><h1>Giao dịch định kỳ</h1><p>Lên lịch khoản thu chi thường kỳ và tự chọn khi nào ghi nhận.</p></div><SubscriptionSuggestionsPanel session={session} /><RecurringPanel session={session} accounts={accounts} onChanged={() => { void reloadAccounts(); }} /></>}
        {page === "upcoming" && <><div className="page-heading"><p className="eyebrow">KẾ HOẠCH TÀI CHÍNH</p><h1>Khoản chi sắp tới</h1><p>Xem lịch các khoản chi định kỳ dự kiến trong khoảng bạn chọn.</p></div><UpcomingExpensesPanel session={session} /></>}
        {page === "categories" && <><div className="page-heading"><p className="eyebrow">DÒNG TIỀN / DANH MỤC</p><h1>Danh mục thu chi</h1><p>Tổ chức các khoản thu nhập và chi tiêu theo cách bạn quen dùng.</p></div><CategoriesPanel session={session} /></>}
        {page === "merchants" && <><div className="page-heading"><p className="eyebrow">DÒNG TIỀN / NƠI GIAO DỊCH</p><h1>Nơi giao dịch</h1><p>Lưu cửa hàng và đơn vị thường gặp để gắn vào khoản thu chi.</p></div><MerchantsPanel session={session} /></>}
        {page === "budgets" && <><div className="page-heading"><p className="eyebrow">KẾ HOẠCH TÀI CHÍNH</p><h1>Ngân sách</h1><p>Đặt hạn mức và theo dõi phần đã chi trong từng tháng.</p></div><BudgetPanel session={session} /></>}
        {page === "goals" && <><div className="page-heading"><p className="eyebrow">KẾ HOẠCH TÀI CHÍNH</p><h1>Mục tiêu tiết kiệm</h1><p>Theo dõi khoản tiền bạn dự định dành cho điều quan trọng.</p></div><GoalPanel session={session} /></>}
        {page === "profile" && <><div className="page-heading"><p className="eyebrow">CÀI ĐẶT CÁ NHÂN</p><h1>Hồ sơ của bạn</h1><p>Cập nhật tên hiển thị và kiểm tra thông tin tài khoản.</p></div><ProfilePanel session={session} onDisplayName={setDisplayName} /></>}
      </Suspense></main><nav className="workspace-mobile-nav" aria-label="Điều hướng nhanh trên điện thoại">{mobileNav.map((item) => <button key={item.id} aria-current={page === item.id ? "page" : undefined} className={page === item.id ? "selected" : ""} onClick={() => navigate(item.id)}><span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>{item.label}</button>)}<button type="button" aria-label="Mở tất cả mục" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)}><span className="material-symbols-outlined" aria-hidden="true">menu</span>Khác</button></nav>
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
    client.auth.getSession()
      .then(({ data }) => { if (active && !authEventSeen) { setSession(data.session); setLoading(false); } })
      .catch(() => { if (active && !authEventSeen) { setSession(null); setLoading(false); } });
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
