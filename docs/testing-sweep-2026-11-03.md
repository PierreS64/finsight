# Quick Testing sweep — 2026-11-03

Scope: all 33 FNS issues returned by Jira JQL `project = FNS AND status = Testing ORDER BY key ASC` on 2026-11-03. This is a fast regression check, not full acceptance. No issue status was changed.

## Checks run

- Backend with JDK 17: `backend/mvnw.cmd -B -ntp verify` — BUILD SUCCESS; 79 tests, 0 failures, 0 errors, 2 skipped. The skipped tests require a live OpenAI key or a local Tesseract command in the Maven process.
- Local OCR: `TesseractReceiptOcrEngineTests` with installed Windows Tesseract and a generated synthetic receipt — 1 passed, 0 skipped.
- Web: `npm run lint` and `npm run build` — both passed.
- Mobile: `npx tsc --noEmit`, `npm run lint`, `npx expo-doctor` — all passed; Expo Doctor 18/18.
- Shared calendar and recovery-link scripts — 7/7 passed.
- Real Supabase-backed API smoke: health 200; unauthenticated protected account, session, suggestion, and assistant endpoints all 401. The authenticated branch was skipped because no smoke bearer token was supplied.
- GitHub draft PR #1 at head `1d3a445`: all six Backend/Web/Mobile push and PR checks passed.
- Signed-in Android SDK 35 emulator: persisted session, dashboard and account balance 100,000 VND, transfer's one-account guard, reconciliation screen showing 100,000 VND without writing a snapshot, and the analytics hub's empty-month chart rendered. Prior hands-on evidence in `docs/progress.md` is referenced below where relevant.
- Jenkins port 8085 was not listening. The old successful Jenkins build #2 remains evidence for its earlier commit only. Docker was not started for this sweep.

## Issue-by-issue result

“API pass” below means its relevant automated tests passed in this sweep. It does not prove a fully populated UI flow, production OAuth email delivery, a second owner's session, or a bank-specific document.

| Jira | Fast check and result | Remaining acceptance evidence |
| --- | --- | --- |
| [FNS-12](https://finsight-team.atlassian.net/browse/FNS-12) | GitHub CI 6/6; older Jenkins build #2 documented. | Re-run Jenkins pipeline and Docker image build at the current head when Docker is intentionally started. |
| [FNS-17](https://finsight-team.atlassian.net/browse/FNS-17) | Web lint/build passed; prior real Supabase sign-in worked. | Fresh web sign-in, refresh, sign-out, and invalid-password UX check. |
| [FNS-18](https://finsight-team.atlassian.net/browse/FNS-18) | Android session survived across test turns and dashboard loaded. | Fresh sign-out/sign-in and session recovery after app restart. |
| [FNS-19](https://finsight-team.atlassian.net/browse/FNS-19) | InsightControllerTests passed. | Populated insight cards on both clients. |
| [FNS-20](https://finsight-team.atlassian.net/browse/FNS-20) | SpendingExplanationControllerTests passed; Android tool entry rendered. | Explanation from varied real-looking synthetic spending history on device. |
| [FNS-21](https://finsight-team.atlassian.net/browse/FNS-21) | SpendingProfileControllerTests passed; Android tool entry rendered. | Populated profile and period comparison on device. |
| [FNS-24](https://finsight-team.atlassian.net/browse/FNS-24) | BudgetControllerTests passed; Android budget empty state rendered in earlier walkthrough. | Save/edit/delete a synthetic budget and verify thresholds on device. |
| [FNS-25](https://finsight-team.atlassian.net/browse/FNS-25) | DashboardControllerTests passed; Android dashboard loaded with fake cash 100,000 VND. | Populated income/expense dashboard after mixed transactions. |
| [FNS-26](https://finsight-team.atlassian.net/browse/FNS-26) | ChartControllerTests passed; Android monthly empty chart rendered. | Populated weekly/monthly chart values and category split. |
| [FNS-27](https://finsight-team.atlassian.net/browse/FNS-27) | SpendingTrendControllerTests passed; Android trends entry rendered. | Populated week/month trends on device. |
| [FNS-28](https://finsight-team.atlassian.net/browse/FNS-28) | FinancialTransactionControllerTests and receipt tests passed; prior Android synthetic transaction CRUD exercised. | Physical receipt attachment/camera flow. |
| [FNS-29](https://finsight-team.atlassian.net/browse/FNS-29) | Android history filtered QA transactions from September, October and November, then showed zero matches after deletion. | Search, sorting and pagination with enough rows to cover multiple pages. |
| [FNS-30](https://finsight-team.atlassian.net/browse/FNS-30) | RecurringRuleControllerTests passed; Android rule count remained zero after read-only suggestion check. | Create, edit, pause and explicitly process a due synthetic rule on device. |
| [FNS-31](https://finsight-team.atlassian.net/browse/FNS-31) | ReceiptOcrControllerTests, parser tests and local Tesseract synthetic-image test passed. | Physical Android camera capture and review/save on a receipt. |
| [FNS-32](https://finsight-team.atlassian.net/browse/FNS-32) | ExpenseForecastControllerTests passed. | Forecast with a populated partial month on device. |
| [FNS-33](https://finsight-team.atlassian.net/browse/FNS-33) | UpcomingExpenseControllerTests passed. | Upcoming due item and date boundaries on device. |
| [FNS-34](https://finsight-team.atlassian.net/browse/FNS-34) | SafeToSpendControllerTests passed; Android showed its no-budget state. | Positive safe-spend result with a synthetic budget and upcoming expense. |
| [FNS-35](https://finsight-team.atlassian.net/browse/FNS-35) | JWT/profile tests and recovery-link script passed. | Real password-recovery email/token flow, previously deferred by the owner. |
| [FNS-36](https://finsight-team.atlassian.net/browse/FNS-36) | CategoryControllerTests passed; Android real category picker and suggestion were exercised earlier. | Synthetic category create/edit/delete round trip on device. |
| [FNS-37](https://finsight-team.atlassian.net/browse/FNS-37) | BudgetControllerTests passed for alert thresholds. | 80%, 90%, 100% thresholds in a populated UI budget. |
| [FNS-38](https://finsight-team.atlassian.net/browse/FNS-38) | AccountTransferControllerTests passed; Android correctly required two accounts. | End-to-end transfer needs a second synthetic account. |
| [FNS-39](https://finsight-team.atlassian.net/browse/FNS-39) | FinancialGoalControllerTests passed. | Goal save/edit/progress flow on Android. |
| [FNS-40](https://finsight-team.atlassian.net/browse/FNS-40) | AccountReconciliationControllerTests passed; Android showed the 100,000 VND source balance and did not save a snapshot. | Save a synthetic discrepancy and verify account balance remains unchanged. |
| [FNS-41](https://finsight-team.atlassian.net/browse/FNS-41) | MerchantControllerTests passed; prior Android synthetic merchant attachment and cleanup succeeded. | History search by merchant and second-owner UI isolation. |
| [FNS-42](https://finsight-team.atlassian.net/browse/FNS-42) | Statement parser, preview/controller and finance-journey tests passed, including ISO-date XLSX. | Signed-in web/Android upload of the ISO-date workbook and broader bank layouts. |
| [FNS-43](https://finsight-team.atlassian.net/browse/FNS-43) | NetWorthControllerTests passed; prior Android asset/debt CRUD and cleanup verified 100,000 VND net worth. | Second-owner live UI isolation. |
| [FNS-44](https://finsight-team.atlassian.net/browse/FNS-44) | FinancialHealthControllerTests passed. | Populated score/explanation on both clients. |
| [FNS-45](https://finsight-team.atlassian.net/browse/FNS-45) | SubscriptionSuggestionControllerTests passed; prior Android three-period suggestion and cleanup succeeded. | Second-owner live UI isolation. |
| [FNS-46](https://finsight-team.atlassian.net/browse/FNS-46) | Assistant controller/client tests passed; prior signed-in web provider response checked. Live-provider test skipped this sweep. | Fresh provider call and real password/session boundary checks if required for final acceptance. |
| [FNS-47](https://finsight-team.atlassian.net/browse/FNS-47) | CategorySuggestionControllerTests passed; prior Android reviewable suggestion and cleanup succeeded. | Second-owner live UI isolation. |
| [FNS-51](https://finsight-team.atlassian.net/browse/FNS-51) | Android account and dashboard both refreshed to 100,000 VND after deleting QA transactions. | No further defect reproduced in this quick check. |
| [FNS-52](https://finsight-team.atlassian.net/browse/FNS-52) | Bangkok report-date boundary script passed on web and mobile. | No further defect reproduced in this quick check. |
| [FNS-53](https://finsight-team.atlassian.net/browse/FNS-53) | Recovery-link script passed for missing/unrelated links, valid token/code parsing, and link errors; prior Android missing-link UI check documented. | A complete email-link recovery still needs the owner's participation. |

All 33 remain in Jira Testing after this sweep. No failures were found in the checks run, but the remaining column is not cleared by a green build alone. No real financial information was entered. The pre-existing deletions under `frontend/web design` were left untouched.
