# FinSight — kiểm tra tiến độ ngày 10/11/2026

## Bằng chứng đã chuẩn bị

- [Repository public và lịch sử PR](https://github.com/PierreS64/finsight); `main` và `develop` đã cùng ở commit `4fee6a1` trước bản cập nhật tài liệu này.
- [GitHub Actions](https://github.com/PierreS64/finsight/actions/runs/42612364049): Backend, Web và Mobile đều thành công trên `4fee6a1`.
- [Jenkins `finsight-develop` build #6](http://127.0.0.1:8085/job/finsight-develop/6/): Windows agent, 84 backend tests (0 lỗi, 2 skip), web/mobile và Docker image thành công trên cùng commit. Jenkins chỉ mở được sau khi chủ động chạy Docker Desktop.
- [Jira FNS](https://finsight-team.atlassian.net/jira/software/projects/FNS/list): 53 issue đang Done, có phân công cho năm thành viên. `FNS Sprint 1` vẫn chưa bắt đầu; không trình bày như một sprint đã chạy.
- Supabase Auth/PostgreSQL: migration Flyway, xác thực JWT và dữ liệu theo chủ tài khoản. Chủ dự án đã thử nhận email khôi phục qua custom SMTP và đổi mật khẩu thành công. Không mở màn hình chứa database password, SMTP key hoặc API key khi chia sẻ màn hình.

## Kịch bản trình bày ngắn

1. **Kiến trúc và phân công (1 phút):** mở README và Jira, giới thiệu Spring Boot API, React web, Expo Android, Supabase Auth/PostgreSQL, Jenkins và vai trò từng thành viên.
2. **Quy trình triển khai (2 phút):** mở GitHub PR/commit history và GitHub Actions run ở trên. Nếu cần Jenkins trực tiếp, chạy `scripts/start-jenkins-local.ps1`, đợi `windows-finsight` Online, rồi mở build #6. Đây là build trên đúng commit của bản demo đã kiểm tra.
3. **Ứng dụng web (2–3 phút):** chạy API và web theo lệnh bên dưới; đăng nhập bằng tài khoản demo. Xem tài khoản, giao dịch, ngân sách và dashboard. Chỉ dùng dữ liệu giả; nếu chưa có giao dịch, các màn phân tích hiển thị trạng thái thiếu dữ liệu đúng thiết kế.
4. **Android nếu được hỏi (1–2 phút):** dùng development build đã cài trên điện thoại hoặc emulator. Trình bày đăng nhập, camera/crop/OCR với hóa đơn giả, bước xem lại trước khi lưu. Điện thoại thật cần kết nối USB và các lệnh reverse bên dưới.

## Khởi chạy demo trên máy này

Mở hai cửa sổ PowerShell riêng tại thư mục gốc repository:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-supabase-api.ps1
```

```powershell
Set-Location frontend/web
npm run dev -- --host 127.0.0.1 --port 5173
```

Kiểm tra `http://127.0.0.1:8086/actuator/health` trả `UP`, rồi mở `http://127.0.0.1:5173/`. Giữ web chạy nếu thử liên kết xác nhận/khôi phục qua email vì Supabase chuyển về `127.0.0.1:5173`.

Nếu dùng điện thoại đã cài development build, chạy API ở trên, nối USB và kiểm tra `adb devices` đã hiện `device`. Sau đó:

```powershell
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8086 tcp:8086
Set-Location frontend/mobile
npx expo start --dev-client --localhost --port 8081
```

Mở app FinSight đã cài trên điện thoại. Bản này cần Metro và API trên máy; chưa phải APK phát hành độc lập hoặc dịch vụ backend public. Nếu không có điện thoại/USB, trình bày bằng web và bằng chứng Android đã ghi trong `docs/physical-camera-acceptance.md`.

## Khi kết thúc

Dừng các terminal API/web/Metro. Nếu đã bật Jenkins, chạy `scripts/stop-jenkins-local.ps1`; kiểm tra container khác trước khi dừng Docker Desktop và WSL. Không để Docker tự bật cùng Windows. Các giới hạn còn lại để nói rõ khi được hỏi: bản Android chưa phát hành độc lập, Sprint 1 chưa chạy, và dependency Expo SDK 53 còn các cảnh báo đã phân tích ở `docs/decisions/0011-mobile-dependency-audit.md`.
