# Android UI consistency review — 2026-11-05

Reviewed the running SDK 35 emulator at 1080 × 2400 against the ignored, local `frontend/mobile design` references, especially the Camera, receipt review and dashboard frames. The signed-in app used the existing synthetic Tiền mặt account. Screenshots were kept outside the public repository because some show account or profile data.

## Screens inspected

- Main navigation: Tổng quan, Giao dịch, Camera, Kế hoạch (Ngân sách, Mục tiêu, Định kỳ, Sắp tới), Phân tích.
- Receipt flow: Camera and Xem & chỉnh ảnh after a virtual-camera capture.
- Account and editing: Cá nhân & Cài đặt, Tài khoản, tài khoản form, giao dịch form, goal form, category form, budget form, profile edit and password change.
- Utilities: Nơi giao dịch, Tài sản ròng, chuyển khoản, đối soát, lịch sử đối soát and nhập sao kê.
- Analysis: xu hướng thu chi, nhận xét tài chính, giải thích chi tiêu, hồ sơ hành vi, mô phỏng What-If and dự báo cuối tháng.

The inspected loaded screens use the same light background, navy headings, green primary actions, card shapes and icon vocabulary as the local mobile design. Screens with no exact source frame continue using those existing shared patterns.

## Findings fixed

1. Camera: the supplied navy FinSight logo was hard to read on the dark camera overlay. It is now rendered white on the existing dark pill.
2. Receipt review and other light pages: white system status icons could persist after Camera. Shared `Page` now sets dark status icons; its bottom safe area also keeps form actions clear of the Android gesture bar.
3. Dashboard: the full account name wrapped the greeting emoji onto another line on this device. The greeting now uses the last two name parts when the full name is long, matching the one-line greeting pattern in the reference.

No new screen, component style or color was introduced. The nine unrelated local `frontend/web design/` deletions were left untouched.

## Verification and limits

- Inspected emulator captures after loading, including the three corrected screens. The category and goal forms were scrolled to check their lower actions.
- `npx tsc --noEmit` and `npm run lint` passed after the UI changes. The native Android SDK 35 build passed after the crop dependency was added.
- The emulator's virtual camera returns black imagery. A later real-phone check confirmed that the cropped review image matched the camera guide; receipt OCR accuracy remains a separate limitation, recorded in `docs/physical-camera-acceptance.md`. The authenticated emulator session was preserved, so signed-out authentication screens and ID-dependent detail states were not re-captured in this pass.
