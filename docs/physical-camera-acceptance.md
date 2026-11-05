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

## Result — 2026-11-05

- The owner connected an Android 14 phone by USB, signed in to the installed development build and photographed a synthetic receipt displayed on the computer. The real rear-camera image was clear. OCR suggested `FIN SIGHT SHOP`, 2026-11-05 and 1,000 VND. The owner changed the amount to 2,000 VND, selected the fake Tiền mặt account and Khác category, and explicitly saved one QA transaction. Its detail showed the edited amount and attached camera photo; the cash balance fell from 100,000 to 98,000 VND.
- A non-receipt camera image initially produced stray words but no total amount and opened the OCR result form. Commit `cfee0c1` requires a recognized total amount before marking OCR output readable. After restarting the real API, the same captured image showed the existing unreadable-receipt message and **Nhập tay** button on the phone. That button opened a blank manual form with Save disabled. No second transaction was created.
- The QA transaction and attached photo were deleted through Android after checking its exact QA note, amount, date, category and account. Transaction history returned to zero, monthly expense to zero and Tiền mặt to 100,000 VND. The Java 17 backend verification with local Tesseract ran 83 tests with no failures/errors and one optional live-provider skip. Jira FNS-28/FNS-31 and their parent Epics FNS-5/FNS-9 moved to Done.
