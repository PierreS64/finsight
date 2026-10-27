package com.finsight.insight;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.Map;
import java.util.UUID;
import com.finsight.dashboard.DashboardStore;
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
@RequestMapping("/api/v1/spending-profile")
public class SpendingProfileController {
    private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Bangkok");
    private static final BigDecimal TREND_THRESHOLD = new BigDecimal("10");
    private final DashboardStore dashboard;
    private final SpendingExplanationStore categories;
    private final SpendingProfileStore daily;

    public SpendingProfileController(DashboardStore dashboard, SpendingExplanationStore categories,
                                     SpendingProfileStore daily) {
        this.dashboard = dashboard;
        this.categories = categories;
        this.daily = daily;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public SpendingProfile get(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String month) {
        UUID owner = userId(jwt);
        LocalDate today = LocalDate.now(REPORT_ZONE);
        YearMonth period = month == null ? YearMonth.from(today) : parseMonth(month);
        int days = elapsedDays(period, today);
        LocalDate start = period.atDay(1);
        LocalDate until = days == 0 ? start : start.plusDays(days);
        var totals = days == 0 ? new DashboardStore.MonthlyTotals(BigDecimal.ZERO, BigDecimal.ZERO, 0)
                : dashboard.month(owner, start, until);
        BigDecimal income = totals.income();
        BigDecimal expense = totals.expense();
        String savingsRate = income.signum() == 0 ? null : percentage(income.subtract(expense), income);
        String averageDaily = days == 0 ? null : expense.divide(BigDecimal.valueOf(days), 2, RoundingMode.HALF_UP).toPlainString();
        Map<LocalDate, BigDecimal> dailyAmounts = days == 0 ? Map.of() : daily.dailyExpenses(owner, start, until);
        String stability = days < 7 || expense.signum() == 0 ? null : stabilityScore(dailyAmounts, start, days, expense);
        TopCategory top = days == 0 ? null : categories.expenses(owner, start, until).values().stream()
                .sorted(Comparator.comparing(SpendingExplanationStore.CategoryExpense::amount).reversed()
                        .thenComparing(SpendingExplanationStore.CategoryExpense::categoryName)
                        .thenComparing(SpendingExplanationStore.CategoryExpense::categoryId))
                .findFirst().map(item -> new TopCategory(item.categoryId(), item.categoryName(), item.amount().toPlainString()))
                .orElse(null);

        YearMonth previous = period.minusMonths(1);
        BigDecimal previousExpense = dashboard.month(owner, previous.atDay(1), start).expense();
        String trendPercent = null;
        String trend = "INSUFFICIENT_DATA";
        if (days > 0 && previousExpense.signum() > 0) {
            BigDecimal currentAverage = expense.divide(BigDecimal.valueOf(days), 8, RoundingMode.HALF_UP);
            BigDecimal previousAverage = previousExpense.divide(BigDecimal.valueOf(previous.lengthOfMonth()), 8, RoundingMode.HALF_UP);
            BigDecimal change = currentAverage.subtract(previousAverage).multiply(BigDecimal.valueOf(100))
                    .divide(previousAverage, 1, RoundingMode.HALF_UP);
            trendPercent = change.toPlainString();
            trend = change.compareTo(TREND_THRESHOLD) >= 0 ? "INCREASE"
                    : change.compareTo(TREND_THRESHOLD.negate()) <= 0 ? "DECREASE" : "STABLE";
        }
        return new SpendingProfile(period.toString(), days, income.toPlainString(), expense.toPlainString(),
                savingsRate, averageDaily, stability, top, trend, trendPercent, previous.toString(),
                "Tỷ lệ tiết kiệm = (thu nhập - chi tiêu) / thu nhập. Trung bình/ngày tính trên số ngày đã trôi qua trong tháng (tháng cũ: đủ ngày). Độ ổn định = 100 - min(100, hệ số biến thiên chi tiêu theo ngày × 100), gồm cả ngày không chi và chỉ hiện khi có ít nhất 7 ngày cùng chi tiêu dương. Xu hướng so trung bình/ngày với tháng trước; từ ±10% là tăng/giảm. Thu nhập, gồm khoản hoàn tiền ghi là thu nhập, và chuyển khoản không tính vào chi tiêu.");
    }

    private static int elapsedDays(YearMonth period, LocalDate today) {
        YearMonth current = YearMonth.from(today);
        if (period.isBefore(current)) return period.lengthOfMonth();
        if (period.isAfter(current)) return 0;
        return today.getDayOfMonth();
    }

    static String stabilityScore(Map<LocalDate, BigDecimal> daily, LocalDate start, int days, BigDecimal expense) {
        BigDecimal count = BigDecimal.valueOf(days);
        BigDecimal mean = expense.divide(count, 12, RoundingMode.HALF_UP);
        BigDecimal variance = BigDecimal.ZERO;
        for (int day = 0; day < days; day++) {
            BigDecimal amount = daily.getOrDefault(start.plusDays(day), BigDecimal.ZERO);
            BigDecimal deviation = amount.subtract(mean);
            variance = variance.add(deviation.multiply(deviation));
        }
        BigDecimal stddev = variance.divide(count, 12, RoundingMode.HALF_UP).sqrt(new MathContext(12, RoundingMode.HALF_UP));
        BigDecimal variability = stddev.multiply(BigDecimal.valueOf(100)).divide(mean, 1, RoundingMode.HALF_UP);
        return BigDecimal.valueOf(100).subtract(variability.min(BigDecimal.valueOf(100)))
                .setScale(1, RoundingMode.HALF_UP).toPlainString();
    }

    private static String percentage(BigDecimal numerator, BigDecimal denominator) {
        return numerator.multiply(BigDecimal.valueOf(100)).divide(denominator, 1, RoundingMode.HALF_UP).toPlainString();
    }

    private static YearMonth parseMonth(String month) {
        try { return YearMonth.parse(month); }
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

    public record TopCategory(UUID categoryId, String categoryName, String amount) {}
    public record SpendingProfile(String month, int elapsedDays, String income, String expense,
                                  String savingsRatePercent, String averageDailyExpense, String stabilityScore,
                                  TopCategory topExpenseCategory, String trend, String trendPercent,
                                  String previousMonth, String calculationRule) {}
}
