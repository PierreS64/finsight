package com.finsight.dashboard;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.UUID;
import com.finsight.budget.BudgetStore;
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
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
    private final DashboardStore dashboard;
    private final BudgetStore budgets;

    public DashboardController(DashboardStore dashboard, BudgetStore budgets) {
        this.dashboard = dashboard;
        this.budgets = budgets;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public DashboardSummary get(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String month) {
        UUID owner = userId(jwt);
        YearMonth period = month == null ? YearMonth.now(ZoneId.of("Asia/Bangkok")) : parseMonth(month);
        DashboardStore.AccountTotals accounts = dashboard.accounts(owner);
        DashboardStore.MonthlyTotals monthly = dashboard.month(owner, period.atDay(1), period.plusMonths(1).atDay(1));
        BigDecimal balance = accounts.openingBalance().add(dashboard.allTimeNet(owner));
        BudgetStatus budget = budgets.totalLimit(owner, period.atDay(1)).map(limit ->
                new BudgetStatus(limit.toPlainString(), limit.subtract(monthly.expense()).toPlainString(),
                        monthly.expense().multiply(BigDecimal.valueOf(100)).divide(limit, 1, RoundingMode.HALF_UP).toPlainString()))
                .orElse(null);
        return new DashboardSummary(period.toString(), accounts.count(), monthly.transactionCount(),
                balance.toPlainString(), monthly.income().toPlainString(), monthly.expense().toPlainString(),
                monthly.income().subtract(monthly.expense()).toPlainString(), budget);
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

    public record BudgetStatus(String limitAmount, String remaining, String usedPercent) {}
    public record DashboardSummary(String month, long accountCount, long transactionCount, String totalBalance,
                                   String income, String expense, String netFlow, BudgetStatus budget) {}
}
