# FinSight

FinSight là ứng dụng quản lý tài chính cá nhân trên web và Android. Người dùng tự ghi nhận tài khoản, giao dịch và kế hoạch chi tiêu; ứng dụng tổng hợp số liệu để theo dõi dòng tiền và hỗ trợ ra quyết định. FinSight **không kết nối ngân hàng và không thu thập thông tin đăng nhập ngân hàng**.

## Chức năng

- Tài khoản ảo, chuyển khoản nội bộ, đối soát số dư và tài sản ròng.
- Giao dịch thu/chi, danh mục, nơi giao dịch, tìm kiếm và lọc lịch sử.
- Nhập sao kê CSV/XLSX theo bước xem trước và xác nhận; ảnh hóa đơn và OCR chỉ gợi ý dữ liệu để người dùng kiểm tra trước khi lưu.
- Ngân sách tháng, mục tiêu tích lũy, giao dịch định kỳ và khoản chi sắp tới.
- Dashboard, biểu đồ, dự báo, điểm sức khỏe tài chính, mức chi an toàn và mô phỏng *What-if*.
- Trợ lý AI tùy chọn giải thích số liệu tổng hợp do backend tính; các số liệu đã xác minh luôn hiển thị riêng. Khi lời giải thích không qua kiểm tra an toàn, ứng dụng chỉ hiển thị các dữ kiện đã xác minh.

Quy tắc định kỳ được ghi nhận khi người dùng chủ động xác nhận, chưa có lịch chạy nền. Mục tiêu tích lũy không tự chuyển tiền; đối soát không tự sửa số dư.

## Công nghệ và cấu trúc

| Thư mục | Thành phần |
| --- | --- |
| `backend/` | Java 17, Spring Boot 3, Maven Wrapper, Flyway, PostgreSQL/Supabase |
| `frontend/web/` | React, TypeScript, Vite |
| `frontend/mobile/` | React Native, Expo SDK 53, TypeScript, Android SDK 35 |
| `scripts/` | Lệnh khởi động và kiểm tra môi trường local |
| `docs/` | Hướng dẫn chi tiết, API, quyết định kỹ thuật và tiến độ |

Supabase Auth cấp JWT; API xác thực JWT và giới hạn dữ liệu theo chủ tài khoản. Flyway quản lý schema. Giá trị tiền được xử lý chính xác ở backend; chuyển khoản nội bộ không tính vào thu/chi.

## Yêu cầu trước khi chạy

- JDK 17 cho API; Maven đã có Wrapper trong `backend/`.
- Node.js 22 hoặc mới hơn và npm cho web/mobile.
- Một dự án Supabase với Auth và PostgreSQL để dùng các chức năng có đăng nhập.
- Android Studio, Android SDK 35 và emulator/thiết bị Android nếu chạy app mobile.
- Tesseract OCR nếu muốn đọc hóa đơn ở máy local; Docker image đã cài gói OCR tiếng Anh và tiếng Việt.

Các lệnh dưới đây dùng **PowerShell trên Windows**. Mở từng tiến trình chạy lâu trong một cửa sổ terminal riêng.

## Chạy web với Supabase

### 1. Tạo cấu hình local

Sao chép các tệp mẫu; các tệp đích được Git bỏ qua:

```powershell
Copy-Item .env.example .env
Copy-Item frontend/web/.env.example frontend/web/.env.local
```

Điền vào `.env` ở gốc repository:

- `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`: thông tin **Session pooler** của Supabase PostgreSQL.
- `SUPABASE_ISSUER_URI`, `SUPABASE_JWKS_URI`: Auth issuer và JWKS của cùng dự án Supabase.
- `SUPABASE_PUBLISHABLE_KEY`: public/publishable key, không phải service role key.
- `OPENAI_API_KEY`: tùy chọn, chỉ lưu ở backend nếu bật trợ lý AI.

Điền vào `frontend/web/.env.local`:

- `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY`: URL và publishable key của **cùng** dự án.
- `VITE_API_BASE_URL=http://127.0.0.1:8086` khi chạy API bằng script dưới đây.

Không đưa mật khẩu database, API key, access token hoặc dữ liệu tài chính thật vào Git. Tuyệt đối không dùng service role key trong biến `VITE_` hay `EXPO_PUBLIC_`.

### 2. Cấu hình đường dẫn xác thực

Trong Supabase **Authentication → URL Configuration**, đặt Site URL và redirect URL cho web là `http://127.0.0.1:5173/`. Dùng cùng hostname này khi mở web; `localhost` và `127.0.0.1` là hai origin khác nhau. Nếu chạy trên host/port khác, cập nhật allowlist tương ứng. Xem [hướng dẫn setup](docs/setup.md) để cấu hình thêm liên kết xác nhận và khôi phục mật khẩu trên Android.

### 3. Khởi động API

Từ thư mục gốc repository:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-supabase-api.ps1
```

Script đọc `.env`, chọn profile `supabase` và chạy API trên cổng `8086`. Trên máy khác, sửa đường dẫn JDK 17 trong script cho phù hợp. Kiểm tra `http://127.0.0.1:8086/actuator/health`; trạng thái mong đợi là `UP`. Flyway sẽ áp dụng migration khi API khởi động; không bật Hibernate tạo/cập nhật schema trên dữ liệu thật.

### 4. Khởi động web

Trong terminal khác:

```powershell
Set-Location frontend/web
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Mở `http://127.0.0.1:5173/`, đăng ký hoặc đăng nhập bằng tài khoản Supabase của bạn. Nếu web báo chưa cấu hình Supabase, kiểm tra `frontend/web/.env.local`, tên biến `VITE_` và khởi động lại Vite. Nếu đăng nhập được nhưng gọi API thất bại, kiểm tra API trên cổng `8086`, `VITE_API_BASE_URL` và URL/JWKS của cùng dự án.

Có thể chạy kiểm tra API chỉ đọc trong terminal khác:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-supabase-api.ps1
```

Không đặt `FINSIGHT_SMOKE_BEARER_TOKEN` thì script chỉ kiểm tra health và các route được bảo vệ từ chối token thiếu hoặc sai.

## Chạy Android

Từ thư mục gốc, sao chép `frontend/mobile/.env.example` thành `frontend/mobile/.env.local`, điền URL và publishable key Supabase. Với Android emulator, giữ `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8086` để truy cập API trên máy host. Sau khi mở emulator Android SDK 35:

```powershell
Set-Location frontend/mobile
npm ci
npx expo-doctor
npm run android
```

`npm run android` tạo và cài development build. Liên kết email trên app đã cài dùng scheme `finsight://`; thêm `finsight://reset-password` và `finsight://verify-email` vào Supabase redirect allowlist. Xem [hướng dẫn setup](docs/setup.md) nếu dùng Expo Go hoặc thiết bị thật.

## Chạy API mẫu không cần Supabase

Profile `local` dùng H2 trong bộ nhớ. Nó phù hợp để kiểm tra health/API build, **không phải** thử nghiệm xác thực Supabase hoặc dữ liệu PostgreSQL thật.

```powershell
$env:JAVA_HOME = 'C:\duong-dan-den-jdk-17' # thay bằng đường dẫn JDK 17 thật
$env:SPRING_PROFILES_ACTIVE = 'local'
Set-Location backend
.\mvnw.cmd spring-boot:run
```

Health ở `http://127.0.0.1:8080/actuator/health`. Có thể chạy Docker Desktop và `docker compose up --build` từ thư mục gốc để khởi động cùng profile local trên cổng `8080`.

## Kiểm tra trước khi đóng góp

Chạy các nhóm lệnh sau từ thư mục gốc repository:

```powershell
Push-Location backend
.\mvnw.cmd -B -ntp verify
Pop-Location
```

```powershell
Push-Location frontend/web
npm ci
npm run lint
npm run build
Pop-Location
```

```powershell
Push-Location frontend/mobile
npm ci
npx tsc --noEmit
npm run lint
npx expo-doctor
Pop-Location
```

CI thực hiện các kiểm tra tương ứng trên PR vào `main`. Thư mục design tham chiếu, `.codex/`, `.impeccable/`, tệp `.env`, báo cáo cá nhân và sản phẩm build là dữ liệu local, không đưa lên Git. Chỉ commit trên nhánh tính năng; không push trực tiếp vào `main`.

## Tài liệu thêm

- [Thiết lập Supabase, OCR, AI, Docker và Jenkins](docs/setup.md)
- [Quy ước API](docs/api-conventions.md)
- [Quy trình phát triển](docs/development-workflow.md)
- [Tiến độ và bằng chứng kiểm tra](docs/progress.md)
- [Các quyết định kiến trúc](docs/decisions/0001-initial-architecture.md)
