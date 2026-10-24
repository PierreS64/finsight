package com.finsight.insight;

import com.finsight.dashboard.DashboardStore;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/spending-trends")
public class SpendingTrendController {
    private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Bangkok");
    private final DashboardStore dashboard;

    public SpendingTrendController(DashboardStore dashboard) { this.dashboard = dashboard; }

    @GetMapping
    @Transactional(readOnly = true)
    public Trends get(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String month) {
        UUID owner = userId(jwt);
        LocalDate today = LocalDate.now(REPORT_ZONE);
        YearMonth selected = month == null ? YearMonth.from(today) : parseMonth(month);
        if (selected.isAfter(YearMonth.from(today)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Future months have no completed comparison");
        LocalDate anchor = selected.equals(YearMonth.from(today)) ? today : selected.atEndOfMonth();
        LocalDate weekFrom = anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekUntil = anchor.plusDays(1);
        LocalDate priorWeekFrom = weekFrom.minusWeeks(1);
        LocalDate priorWeekUntil = priorWeekFrom.plusDays(java.time.temporal.ChronoUnit.DAYS.between(weekFrom, weekUntil));
        YearMonth previousMonth = selected.minusMonths(1);
        LocalDate monthFrom = selected.atDay(1);
        LocalDate monthUntil = anchor.plusDays(1);
        LocalDate priorMonthFrom = previousMonth.atDay(1);
        LocalDate priorMonthUntil = selected.equals(YearMonth.from(today))
                ? previousMonth.atDay(Math.min(anchor.getDayOfMonth(), previousMonth.lengthOfMonth())).plusDays(1)
                : monthFrom;
        return new Trends(selected.toString(), compare(owner, weekFrom, weekUntil, priorWeekFrom, priorWeekUntil),
                compare(owner, monthFrom, monthUntil, priorMonthFrom, priorMonthUntil),
                "Chỉ tính EXPENSE của chủ tài khoản. Tuần bắt đầu thứ Hai; tuần cuối của tháng được cắt tại ngày cuối tháng. Tháng hiện tại tính đến hôm nay và so với cùng số ngày đầu của tháng trước (hoặc hết tháng trước nếu ngắn hơn); tháng cũ dùng đủ tháng. Chênh lệch = kỳ đang xem - kỳ trước; tỷ lệ = chênh lệch / kỳ trước. Tăng/giảm từ 10%, còn lại ổn định. Không có tỷ lệ nếu kỳ trước bằng 0. Thu nhập và chuyển khoản không tính vào chi tiêu.");
    }

    private Comparison compare(UUID owner, LocalDate from, LocalDate until, LocalDate beforeFrom, LocalDate beforeUntil) {
        BigDecimal current = dashboard.month(owner, from, until).expense();
        BigDecimal previous = dashboard.month(owner, beforeFrom, beforeUntil).expense();
        BigDecimal change = current.subtract(previous);
        String percent = previous.signum() == 0 ? null : change.multiply(BigDecimal.valueOf(100))
                .divide(previous, 1, RoundingMode.HALF_UP).toPlainString();
        String direction = previous.signum() == 0 ? "INSUFFICIENT_DATA"
                : change.multiply(BigDecimal.TEN).compareTo(previous) >= 0 ? "INCREASE"
                : change.multiply(BigDecimal.TEN).compareTo(previous.negate()) <= 0 ? "DECREASE" : "STABLE";
        return new Comparison(from, until.minusDays(1), beforeFrom, beforeUntil.minusDays(1),
                current.toPlainString(), previous.toPlainString(), change.toPlainString(), percent, direction);
    }

    private static YearMonth parseMonth(String value) {
        try { return YearMonth.parse(value); }
        catch (DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Month must have format YYYY-MM");
        }
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public record Comparison(LocalDate from, LocalDate to, LocalDate previousFrom, LocalDate previousTo,
                             String expense, String previousExpense, String changeAmount, String changePercent,
                             String direction) {}
    public record Trends(String month, Comparison week, Comparison monthComparison, String calculationRule) {}
}
