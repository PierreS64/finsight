import "./App.css";

const milestones = [
  ["01", "Nền tảng", "Web, Android và API bảo mật", "Đang triển khai"],
  ["02", "Dữ liệu cá nhân", "Đăng nhập, tài khoản ảo và giao dịch", "Sắp tới"],
  ["03", "Lập kế hoạch", "Ngân sách, mục tiêu và báo cáo", "Sắp tới"],
  [
    "04",
    "Thông tin chuyên sâu",
    "Xu hướng, dự báo và gợi ý chi tiêu",
    "Sắp tới",
  ],
];

function App() {
  return (
    <div className="page">
      <header className="topbar">
        <a className="brand" href="#top">
          <b>
            F<span>.</span>
          </b>{" "}
          FinSight
        </a>
        <span className="status">
          <i /> Đang xây dựng
        </span>
      </header>
      <main id="top">
        <section className="hero">
          <div className="copy">
            <p className="eyebrow">PERSONAL FINANCE INTELLIGENCE</p>
            <h1>
              Hiểu rõ tiền của bạn.
              <br />
              <em>Quyết định tự tin hơn.</em>
            </h1>
            <p className="intro">
              FinSight giúp bạn ghi chép, lập kế hoạch và nhìn thấy bức tranh
              tài chính cá nhân từ dữ liệu do chính bạn cung cấp.
            </p>
            <a className="action" href="#roadmap">
              Xem lộ trình <span>↗</span>
            </a>
            <p className="note">
              Bản khởi tạo · Chưa có dữ liệu tài chính hay kết nối ngân hàng
            </p>
          </div>
          <div className="visual" aria-hidden="true">
            <div className="halo" />
            <div className="card">
              <div className="card-head">
                <strong>F.</strong>
                <span>•••</span>
              </div>
              <div className="skeleton one" />
              <div className="skeleton two" />
              <div className="bars">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="skeleton three" />
            </div>
            <span className="chip chip-a">Theo dõi</span>
            <span className="chip chip-b">Lập kế hoạch</span>
          </div>
        </section>
        <section className="principles">
          <div>
            <small>01 / GHI NHẬN</small>
            <h2>
              Mọi khoản thu chi
              <br />
              trong một nơi
            </h2>
          </div>
          <div>
            <small>02 / HIỂU RÕ</small>
            <h2>
              Xu hướng dễ đọc,
              <br />
              con số đáng tin
            </h2>
          </div>
          <div>
            <small>03 / CHỦ ĐỘNG</small>
            <h2>
              Lập kế hoạch cho
              <br />
              điều quan trọng
            </h2>
          </div>
        </section>
        <section className="roadmap" id="roadmap">
          <div>
            <p className="eyebrow">LỘ TRÌNH SẢN PHẨM</p>
            <h2>
              Từng bước,
              <br />
              vững vàng.
            </h2>
            <p className="roadmap-intro">
              Chúng tôi đang xây dựng nền tảng trước khi mở các tính năng quản
              lý tài chính.
            </p>
          </div>
          <div className="list">
            {milestones.map(([number, title, detail, state]) => (
              <div className="milestone" key={number}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
                <small>{state}</small>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer>
        <span className="brand">
          <b>
            F<span>.</span>
          </b>{" "}
          FinSight
        </span>
        <p>
          Số dư trong ứng dụng sẽ do người dùng tự quản lý, không phải số dư
          ngân hàng theo thời gian thực.
        </p>
      </footer>
    </div>
  );
}
export default App;
