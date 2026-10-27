package com.finsight.insight;

import com.finsight.budget.BudgetStore;
import com.finsight.dashboard.DashboardStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/what-if")
public class WhatIfController {
    private final DashboardStore dashboard;
    private final BudgetStore budgets;

    public WhatIfController(DashboardStore dashboard, BudgetStore budgets) {
        this.dashboard = dashboard;
        this.budgets = budgets;
    }

    @PostMapping
    @Transactional(readOnly = true)
    public Scenario simulate(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ScenarioRequest request) {
        UUID owner = userId(jwt);
        YearMonth month = parseMonth(request.month());
        BigDecimal adjustment = request.expenseAdjustment();
        var monthly = dashboard.month(owner, month.atDay(1), month.plusMonths(1).atDay(1));
        BigDecimal projectedExpense = monthly.expense().add(adjustment);
        if (projectedExpense.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Projected expense cannot be negative");
        }
        BigDecimal currentBalance = dashboard.accounts(owner).openingBalance().add(dashboard.allTimeNet(owner));
        BigDecimal projectedBalance = currentBalance.subtract(adjustment);
        BigDecimal savedLimit = budgets.totalLimit(owner, month.atDay(1)).orElse(null);
        BigDecimal assumedLimit = request.assumedBudgetLimit() == null ? savedLimit : request.assumedBudgetLimit();
        BigDecimal remaining = assumedLimit == null ? null : assumedLimit.subtract(projectedExpense);
        String usedPercent = assumedLimit == null ? null : projectedExpense.multiply(BigDecimal.valueOf(100))
                .divide(assumedLimit, 1, RoundingMode.HALF_UP).toPlainString();
        List<String> alerts = new ArrayList<>();
        if (projectedBalance.signum() < 0) alerts.add("NEGATIVE_BALANCE");
        if (remaining != null) {
            if (remaining.signum() < 0) alerts.add("OVER_BUDGET");
            else if (projectedExpense.multiply(BigDecimal.TEN).compareTo(assumedLimit.multiply(BigDecimal.valueOf(8))) >= 0)
                alerts.add("NEAR_BUDGET");
        }
        return new Scenario(month.toString(), monthly.expense().toPlainString(), adjustment.toPlainString(),
                projectedExpense.toPlainString(), currentBalance.toPlainString(), projectedBalance.toPlainString(),
                savedLimit == null ? null : savedLimit.toPlainString(),
                assumedLimit == null ? null : assumedLimit.toPlainString(),
                remaining == null ? null : remaining.toPlainString(), usedPercent, alerts,
                "Mô phỏng chỉ đọc dữ liệu: chi dự kiến = chi đã ghi + mức điều chỉnh; số dư dự kiến = số dư hiện tại - mức điều chỉnh; ngân sách còn lại = hạn mức giả định (hoặc đã lưu) - chi dự kiến. Không tạo hay sửa giao dịch, ngân sách.");
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

    public record ScenarioRequest(@NotBlank String month,
                                  @NotNull @Digits(integer = 17, fraction = 2) BigDecimal expenseAdjustment,
                                  @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal assumedBudgetLimit) {}

    public record Scenario(String month, String actualExpense, String expenseAdjustment, String projectedExpense,
                           String actualBalance, String projectedBalance, String savedBudgetLimit,
                           String assumedBudgetLimit, String projectedBudgetRemaining, String usedPercent,
                           List<String> alerts, String calculationRule) {}
}
