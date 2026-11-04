# Physical Android camera acceptance

This is the remaining owner-assisted check for Jira FNS-28 and FNS-31. The emulator has already verified gallery selection, image review, OCR suggestions, duplicate warning, manual-entry fallback, receipt attachment and transaction cleanup with synthetic data. Its virtual back camera produced a nearly black captured image twice, so it cannot settle physical capture.

## Prepare the development build

The computer running the API and Metro needs a USB-connected Android phone with USB debugging authorized. The phone must appear in `adb devices -l` before installing the existing ignored debug APK at `frontend/mobile/android/app/build/outputs/apk/debug/app-debug.apk`. The agent can run the following from the repository root after the phone is attached:

```powershell
adb install -r frontend/mobile/android/app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8086 tcp:8086
```

The root `.env` and `frontend/mobile/.env.local` remain local. Start the real API with `scripts/start-supabase-api.ps1` if it is not already listening on port 8086. Start Metro from `frontend/mobile` with `npx expo start --dev-client --localhost --port 8081`, then open the installed FinSight app. This development build uses `http://127.0.0.1:8086` for the API through USB reverse.

## Owner camera check

Use a clearly marked **fake** printed receipt, with a made-up seller, date and small amount; avoid personal or real financial information. Sign in on the phone, permit camera access, and open Camera.

1. Check that the live rear-camera preview shows the paper clearly. Press the center capture control. On **Xem & chỉnh ảnh**, check that the captured photo is visible and readable rather than black or empty. Try **Chụp lại** once to confirm return to Camera, then capture again.
2. Press **Quét hóa đơn bằng AI**. The review form should suggest seller, date and amount when the fake receipt is legible. Correct at least one field deliberately, choose an account and category, and check that nothing is saved before pressing **Xác nhận & Lưu**.
3. Save one synthetic expense. Reopen it in Transactions and confirm the edited values, attached receipt photo and expected account balance change. Exact-image duplicate detection was already checked with the same gallery file on the emulator; a second camera photo of the same paper has different image bytes and is not an equivalent duplicate test.
4. Capture an unreadable/non-receipt image and check that the app offers **Nhập tay** without creating a transaction. Do not save the fallback form.

Report which step passed or the exact on-screen error. Do not send a password, authentication link or real receipt. The synthetic transaction and photo can then be removed through the app, and FNS-28/FNS-31 can be closed with the observed evidence.
