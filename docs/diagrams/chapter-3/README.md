# FinSight — Chapter 3 UML diagrams

These nine diagrams correspond to Figures 3.1–3.9 in the Advanced Programming report draft. Each figure has an editable PlantUML source (`.puml`), a vector image (`.svg`) for Word, and a 220 DPI raster fallback (`.png`). Put the figure caption **below** the inserted image in Word; captions are intentionally outside the image.

| Figure | UML type | Source and image basename | Caption |
| --- | --- | --- | --- |
| 3.1 | Use Case | `hinh-3-1-use-case` | Sơ đồ UML Use Case tổng quát của FinSight |
| 3.2 | Component | `hinh-3-2-component` | Sơ đồ UML Component của hệ thống FinSight |
| 3.3 | Class | `hinh-3-3-class` | Sơ đồ UML Class của các thực thể tài chính cốt lõi |
| 3.4 | Activity | `hinh-3-4-ocr-activity` | Sơ đồ UML Activity của luồng quét hóa đơn và xác nhận giao dịch |
| 3.5 | Activity | `hinh-3-5-import-activity` | Sơ đồ UML Activity của quá trình xem trước và nhập sao kê |
| 3.6 | Sequence | `hinh-3-6-auth-sequence` | Sơ đồ UML Sequence của đăng nhập và đọc dữ liệu riêng |
| 3.7 | Sequence | `hinh-3-7-ocr-save-sequence` | Sơ đồ UML Sequence của quá trình quét hóa đơn và lưu giao dịch |
| 3.8 | Sequence | `hinh-3-8-transfer-sequence` | Sơ đồ UML Sequence của thao tác chuyển tiền nội bộ |
| 3.9 | Deployment | `hinh-3-9-deployment` | Sơ đồ UML Deployment của bản trình diễn FinSight trong mạng nội bộ |

Figure 3.1 keeps only the primary human actor so the associations remain readable at A4 size. Supabase Auth, OCR, and optional AI are external services shown in Figures 3.2, 3.6, 3.7, and 3.9. In section 3.2.1 of the report draft, replace the sentence that says the three supporting actors are shown at the system boundary with: “Các dịch vụ Supabase Auth, OCR và AI được thể hiện ở sơ đồ thành phần, trình tự và triển khai; sơ đồ Use Case tổng quát chỉ thể hiện tác nhân người dùng để giữ bố cục rõ ràng.”

Render with PlantUML 1.2026.10 or later:

```powershell
java -jar plantuml.jar --check-syntax .
java -jar plantuml.jar --format svg .
java -jar plantuml.jar --format png .
```

All diagrams were visually reviewed after rendering. The larger Component and Class figures are best inserted as SVG on a landscape A4 page or split across a dedicated page if needed. Keep the image proportions unchanged.
