package com.finsight.insight;

import com.finsight.budget.BudgetStore;
import com.finsight.recurring.UpcomingExpenseController;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/safe-to-spend")
public class SafeToSpendController {
    private final BudgetStore budgets;
    private final UpcomingExpenseController upcoming;

    public SafeToSpendController(BudgetStore budgets, UpcomingExpenseController upcoming) {
        this.budgets = budgets;
        this.upcoming = upcoming;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public Result get(@AuthenticationPrincipal Jwt jwt) {
        UUID owner;
        try { owner = UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Bangkok"));
        YearMonth month = YearMonth.from(today);
        LocalDate end = month.atEndOfMonth();
        int days = remainingDays(today);
        BigDecimal spent = budgets.spentByCategory(owner, month.atDay(1), month.plusMonths(1).atDay(1))
                .values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal upcomingTotal = new BigDecimal(upcoming.list(jwt, today, end).total());
        BigDecimal limit = budgets.totalLimit(owner, month.atDay(1)).orElse(null);
        if (limit == null) return new Result(month.toString(), days, null, spent.toPlainString(), null,
                upcomingTotal.toPlainString(), null, null, "NO_BUDGET",
                "Cần ngân sách tổng tháng để tính. Khoản chi định kỳ chưa ghi nhận chỉ để tham khảo.");
        BigDecimal remaining = limit.subtract(spent);
        BigDecimal available = remaining.subtract(upcomingTotal);
        BigDecimal daily = available.max(BigDecimal.ZERO).divide(BigDecimal.valueOf(days), 2, RoundingMode.DOWN);
        String status = remaining.signum() <= 0 ? "BUDGET_EXHAUSTED"
                : available.signum() <= 0 ? "UPCOMING_EXCEEDS_BUDGET" : "AVAILABLE";
        return new Result(month.toString(), days, limit.toPlainString(), spent.toPlainString(),
                remaining.toPlainString(), upcomingTotal.toPlainString(), available.toPlainString(),
                daily.toPlainString(), status,
                "Tối đa mỗi ngày = max(0, ngân sách tổng - chi đã ghi - kỳ chi định kỳ chưa ghi nhận đến hết tháng) / số ngày còn lại, kể cả hôm nay; làm tròn xuống 2 chữ số thập phân.");
    }

    static int remainingDays(LocalDate today) {
        return (int) ChronoUnit.DAYS.between(today, YearMonth.from(today).atEndOfMonth()) + 1;
    }

    public record Result(String month, int remainingDays, String budgetLimit, String spent,
                         String budgetRemaining, String upcomingExpense, String availableAfterReservations,
                         String safePerDay, String status, String calculationRule) {}
}
