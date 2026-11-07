<p align="center">
  <img src="frontend/web/public/finsight-mark.svg" alt="FinSight" width="72" />
</p>

<h1 align="center">FinSight</h1>

<p align="center"><strong>Hiểu rõ dòng tiền. Chủ động với kế hoạch tài chính.</strong></p>

<p align="center">Theo dõi tài khoản, quản lý chi tiêu và nhìn thấy bức tranh tài chính của bạn<br />trong một không gian thống nhất trên web và Android.</p>

## Tổng quan

FinSight giúp bạn kết nối những ghi chép tài chính hằng ngày với kế hoạch dài hạn. Từ dữ liệu bạn tự quản lý, ứng dụng tính số dư, dòng tiền và tiến độ mục tiêu để bạn thấy điều gì đã xảy ra, khoản nào sắp đến và mức chi nào phù hợp với kế hoạch hiện tại.

## Trải nghiệm chính

- **Ghi nhận rõ ràng.** Quản lý tài khoản, chuyển khoản, giao dịch thu/chi, danh mục và nơi giao dịch; tìm lại dữ liệu qua lịch sử và bộ lọc. Nhập sao kê CSV/XLSX hoặc dùng OCR để lấy gợi ý từ hóa đơn trước khi xác nhận lưu.
- **Lập kế hoạch có cơ sở.** Theo dõi ngân sách tháng, mục tiêu tích lũy, giao dịch định kỳ, khoản chi sắp tới, đối soát số dư và tài sản ròng trên cùng dữ liệu tài chính.
- **Hiểu xu hướng, điều chỉnh kịp thời.** Dashboard, biểu đồ, dự báo chi tiêu, điểm sức khỏe tài chính, mức chi an toàn và mô phỏng *What-if* giúp bạn xem lại tháng hiện tại từ nhiều góc độ.

Số liệu được backend tính từ dữ liệu đã lưu; OCR và nhập sao kê đều có bước người dùng xem lại. Trợ lý AI là tính năng tùy chọn: lời giải thích được hiển thị cùng các số liệu đã xác minh, và phản hồi không qua kiểm tra an toàn được thay bằng thông báo chỉ dẫn xem các số liệu đó. FinSight không kết nối ngân hàng hoặc thu thập thông tin đăng nhập ngân hàng.

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

Sao chép các tệp mẫu để tạo cấu hình riêng trên máy:

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

Giữ mật khẩu database, API key và access token trong cấu hình local. Chỉ dùng publishable key cho các biến `VITE_` và `EXPO_PUBLIC_`; không đặt service role key trong ứng dụng client.

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

## Kiểm tra dự án

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

## Tài liệu thêm

- [Thiết lập Supabase, OCR, AI, Docker và Jenkins](docs/setup.md)
- [Quy ước API](docs/api-conventions.md)
- [Quy trình phát triển](docs/development-workflow.md)
- [Tiến độ và bằng chứng kiểm tra](docs/progress.md)
- [Các quyết định kiến trúc](docs/decisions/0001-initial-architecture.md)
