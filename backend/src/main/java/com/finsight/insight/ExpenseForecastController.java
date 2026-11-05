package com.finsight.insight;

import com.finsight.dashboard.DashboardStore;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/v1/expense-forecast")
public class ExpenseForecastController {
    private final DashboardStore dashboard;
    private final SpendingProfileStore daily;

    public ExpenseForecastController(DashboardStore dashboard, SpendingProfileStore daily) {
        this.dashboard = dashboard;
        this.daily = daily;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public Forecast get(@AuthenticationPrincipal Jwt jwt) {
        UUID owner = userId(jwt);
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Bangkok"));
        YearMonth month = YearMonth.from(today);
        BigDecimal spent = dashboard.month(owner, month.atDay(1), today.plusDays(1)).expense();
        int spendingDays = daily.dailyExpenses(owner, month.atDay(1), today.plusDays(1)).size();
        return calculate(today, spent, spendingDays);
    }

    static Forecast calculate(LocalDate today, BigDecimal spent, int spendingDays) {
        YearMonth month = YearMonth.from(today);
        int elapsed = today.getDayOfMonth();
        int remaining = month.lengthOfMonth() - elapsed;
        if (elapsed < 3 || spendingDays < 2 || spent.signum() == 0)
            return new Forecast(month.toString(), elapsed, remaining, spendingDays, spent.toPlainString(),
                    null, null, null, "INSUFFICIENT_DATA", rule());
        BigDecimal average = spent.divide(BigDecimal.valueOf(elapsed), 2, RoundingMode.HALF_UP);
        BigDecimal projected = spent.add(spent.multiply(BigDecimal.valueOf(remaining))
                .divide(BigDecimal.valueOf(elapsed), 2, RoundingMode.HALF_UP));
        String confidence = elapsed >= 14 && spendingDays >= 7 ? "HIGH"
                : elapsed >= 7 && spendingDays >= 3 ? "MEDIUM" : "LOW";
        return new Forecast(month.toString(), elapsed, remaining, spendingDays, spent.toPlainString(),
                average.toPlainString(), projected.toPlainString(), projected.subtract(spent).toPlainString(),
                confidence, rule());
    }

    private static String rule() {
        return "Dự báo = chi tiêu EXPENSE đã ghi + (chi tiêu đã ghi / số ngày đã qua) × số ngày còn lại trong tháng, làm tròn 2 chữ số thập phân. Cần ít nhất 3 ngày trong tháng và 2 ngày có chi tiêu; độ tin cậy LOW/MEDIUM/HIGH tùy số ngày đã qua (7/14) và số ngày có chi (3/7). Ngày không có giao dịch vẫn tính trong trung bình. Thu nhập và chuyển khoản không tính vào chi tiêu.";
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public record Forecast(String month, int elapsedDays, int remainingDays, int spendingDays, String spent,
                           String averageDaily, String projectedMonthEnd, String expectedAdditional,
                           String confidence, String calculationRule) {}
}
