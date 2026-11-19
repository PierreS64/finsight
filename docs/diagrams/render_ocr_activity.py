"""Render the FinSight receipt OCR activity diagram as an A4 PDF."""

from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


OUT = Path(__file__).with_name("finsight-ocr-activity.pdf")
FONT = "C:/Windows/Fonts/arial.ttf"
BOLD = "C:/Windows/Fonts/arialbd.ttf"
pdfmetrics.registerFont(TTFont("Arial", FONT))
pdfmetrics.registerFont(TTFont("ArialBold", BOLD))

W, H = A4
INK = HexColor("#17263B")
MUTED = HexColor("#526275")
BLUE = HexColor("#EAF3F8")
GREEN = HexColor("#EAF6F1")
AMBER = HexColor("#FFF4E4")
RED = HexColor("#FCEEEE")
LINE = HexColor("#B8C6D3")

c = canvas.Canvas(str(OUT), pagesize=A4)
c.setTitle("FinSight - Sơ đồ hoạt động OCR hóa đơn")
c.setAuthor("FinSight")


def txt(x, y, value, size=8, bold=False, color=INK):
    c.setFillColor(color)
    c.setFont("ArialBold" if bold else "Arial", size)
    c.drawCentredString(x, y, value)


def box(x, y, width, lines, fill=HexColor("#FFFFFF"), height=27, font=7.8):
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.roundRect(x - width / 2, y - height / 2, width, height, 5, fill=1, stroke=1)
    step = 9
    first = y + (len(lines) - 1) * step / 2 - 2.7
    for index, line in enumerate(lines):
        txt(x, first - index * step, line, font)


def diamond(x, y, width, lines, fill=AMBER, height=28):
    p = c.beginPath()
    p.moveTo(x, y + height / 2)
    p.lineTo(x + width / 2, y)
    p.lineTo(x, y - height / 2)
    p.lineTo(x - width / 2, y)
    p.close()
    c.setFillColor(fill)
    c.setStrokeColor(LINE)
    c.drawPath(p, fill=1, stroke=1)
    first = y + (len(lines) - 1) * 8.4 / 2 - 2.8
    for index, line in enumerate(lines):
        txt(x, first - index * 8.4, line, 7.4, bold=True)


def path(points, label=None, label_xy=None, arrow=True, color=INK):
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(0.9)
    p = c.beginPath()
    p.moveTo(*points[0])
    for point in points[1:]:
        p.lineTo(*point)
    c.drawPath(p)
    if arrow:
        x1, y1 = points[-2]
        x2, y2 = points[-1]
        h = 4
        q = c.beginPath()
        q.moveTo(x2, y2)
        if abs(x2 - x1) >= abs(y2 - y1):
            s = 1 if x2 > x1 else -1
            q.lineTo(x2 - s * h, y2 + 2.3)
            q.lineTo(x2 - s * h, y2 - 2.3)
        else:
            s = 1 if y2 > y1 else -1
            q.lineTo(x2 + 2.3, y2 - s * h)
            q.lineTo(x2 - 2.3, y2 - s * h)
        q.close()
        c.drawPath(q, fill=1, stroke=0)
    if label:
        txt(label_xy[0], label_xy[1], label, 7.1, bold=True, color=MUTED)


# Heading, lane headers, and continuous lane boundaries.
txt(W / 2, 806, "SƠ ĐỒ HOẠT ĐỘNG - OCR HÓA ĐƠN", 13, bold=True)
txt(W / 2, 788, "FinSight | Web và Android", 8.5, color=MUTED)
lanes = [(25, 204, "Người dùng"), (204, 385, "Ứng dụng Web/Android"),
         (385, 570, "Backend và Tesseract")]
for left, right, title in lanes:
    c.setFillColor(BLUE)
    c.setStrokeColor(LINE)
    c.rect(left, 748, right - left, 27, fill=1, stroke=1)
    txt((left + right) / 2, 757, title, 8.3, bold=True)
for x in [25, 204, 385, 570]:
    c.setStrokeColor(LINE)
    c.line(x, 58, x, 748)

u, a, b = 114, 295, 477

# Main path. Each activity is placed inside the responsible swimlane.
c.setFillColor(INK)
c.circle(u, 732, 5, fill=1, stroke=0)
box(u, 705, 150, ["Chụp hoặc chọn ảnh hóa đơn"])
box(a, 670, 158, ["Gửi ảnh và access token"])
box(b, 635, 160, ["Xác thực token, xác định chủ", "Kiểm tra ≤ 5 MB và định dạng", "JPEG/PNG/WebP"], height=32)
diamond(b, 600, 132, ["Ảnh hợp lệ?"])
box(b, 565, 160, ["Kiểm tra ảnh trùng trong", "dữ liệu của người dùng"])
box(b, 530, 160, ["Gọi Tesseract đọc chữ"])
diamond(b, 495, 132, ["OCR sẵn sàng?"])
box(b, 460, 160, ["Phân tích tên cửa hàng,", "ngày và tổng tiền"])
diamond(b, 425, 132, ["Nhận diện được?"])
box(b, 390, 160, ["Trả gợi ý + cờ ảnh trùng", "CHƯA tạo giao dịch"], GREEN)
box(a, 355, 160, ["Điền biểu mẫu từ gợi ý", "hoặc nhập thủ công"], GREEN)
box(u, 320, 158, ["Kiểm tra và chỉnh sửa", "thông tin giao dịch"])
diamond(u, 285, 126, ["Ảnh trùng?"])
diamond(u, 250, 126, ["Xác nhận lưu", "ảnh trùng?"])
box(u, 215, 140, ["Hủy, không lưu"], RED)
box(a, 215, 160, ["Lưu giao dịch khi", "người dùng xác nhận"], GREEN)
box(a, 180, 160, ["Tải ảnh đính kèm", "cho giao dịch đã lưu"])
diamond(a, 145, 126, ["Tải ảnh thành công?"])
box(u, 103, 152, ["Hoàn tất: giao dịch", "và ảnh đã lưu"], GREEN)
box(a, 103, 166, ["Báo tải ảnh thất bại;", "cho bổ sung ảnh sau"], RED)

# Error/fallback notices share a manual-entry route in the app lane.
box(a, 600, 154, ["Báo ảnh không hợp lệ"], RED)
box(a, 495, 154, ["Báo OCR không sẵn sàng"], RED)
box(a, 425, 154, ["Báo không đọc được ảnh"], RED)

# Normal transitions, top to bottom.
path([(u, 727), (u, 719)])
path([(u, 691), (u, 687), (a, 687), (a, 684)])
path([(a, 656), (a, 652), (b, 652), (b, 651)])
path([(b, 619), (b, 614)])
path([(b, 586), (b, 579)], "Có", (496, 582))
path([(b, 551), (b, 544)])
path([(b, 516), (b, 509)])
path([(b, 481), (b, 474)], "Có", (496, 477))
path([(b, 446), (b, 439)])
path([(b, 411), (b, 404)], "Có", (496, 407))
path([(b, 376), (b, 372), (a, 372), (a, 369)])
path([(a, 341), (a, 337), (u, 337), (u, 334)])
path([(u, 306), (u, 299)])
path([(u, 271), (u, 264)], "Có", (132, 267))
path([(u + 63, 285), (a, 285), (a, 229)], "Không", (232, 292))
path([(u + 63, 250), (a - 80, 250), (a - 80, 237), (a, 237), (a, 229)], "Có", (187, 255))
path([(u, 236), (u, 229)], "Không", (136, 232))
path([(a, 201), (a, 194)])
path([(a, 166), (a, 159)])
path([(a - 63, 145), (u, 145), (u, 117)], "Có", (196, 152))
path([(a, 131), (a, 117)], "Không", (316, 123))

# Side branches. All error notices lead to manual entry, then user review.
for y in [600, 495, 425]:
    path([(b - 66, y), (a + 77, y)], "Không", (395, y + 8))
    path([(a - 77, y), (211, y), (211, 355)], arrow=False)
path([(211, 355), (a - 80, 355)])

# End states; the stopped duplicate branch is intentionally separate.
for x, y in [(u, 80), (a, 80), (u, 192)]:
    c.setFillColor(HexColor("#FFFFFF"))
    c.setStrokeColor(INK)
    c.circle(x, y, 5, fill=1, stroke=1)
    c.setFillColor(INK)
    c.circle(x, y, 3, fill=1, stroke=0)
path([(u, 89), (u, 85)])
path([(a, 89), (a, 85)])
path([(u, 201), (u, 197)])

txt(W / 2, 40, "OCR chỉ cung cấp gợi ý; giao dịch chỉ được tạo sau khi người dùng xác nhận.",
    7.7, color=MUTED)
c.showPage()
c.save()
print(OUT)
