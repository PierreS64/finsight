package com.finsight.insight;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.finsight.budget.BudgetStore;
import com.finsight.budget.BudgetAlertThreshold;
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
@RequestMapping("/api/v1/insights")
public class InsightController {
    private static final BigDecimal SPENDING_INCREASE_RATIO = new BigDecimal("1.20");
    private final DashboardStore dashboard;
    private final BudgetStore budgets;

    public InsightController(DashboardStore dashboard, BudgetStore budgets) {
        this.dashboard = dashboard;
        this.budgets = budgets;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public InsightResponse get(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String month) {
        UUID owner = userId(jwt);
        YearMonth period = month == null ? YearMonth.now(ZoneId.of("Asia/Bangkok")) : parseMonth(month);
        LocalDate start = period.atDay(1);
        LocalDate until = period.plusMonths(1).atDay(1);
        LocalDate previousStart = period.minusMonths(1).atDay(1);
        BigDecimal expense = dashboard.month(owner, start, until).expense();
        BigDecimal previousExpense = dashboard.month(owner, previousStart, start).expense();
        List<InsightCard> cards = new ArrayList<>();

        // A zero previous month is not a meaningful denominator for a percentage increase.
        if (previousExpense.signum() > 0 && expense.compareTo(previousExpense.multiply(SPENDING_INCREASE_RATIO)) >= 0) {
            BigDecimal increase = expense.subtract(previousExpense);
            cards.add(new InsightCard("SPENDING_INCREASE", "Chi tiêu tăng so với tháng trước",
                    "Chi tiêu tháng " + period + " là " + expense.toPlainString() + " VND, tăng "
                            + increase.toPlainString() + " VND so với " + previousExpense.toPlainString()
                            + " VND của " + period.minusMonths(1) + ". Ngưỡng thông báo: tăng từ 20%.",
                    "WARNING", period.toString(), expense.toPlainString(), previousExpense.toPlainString(), "20"));
        }

        budgets.totalLimit(owner, start).ifPresent(limit -> addBudgetCard(cards, period, null, expense, limit));
        List<BudgetStore.CategoryLimit> categoryLimits = budgets.categoryLimits(owner, start);
        if (!categoryLimits.isEmpty()) {
            Map<UUID, BigDecimal> spent = budgets.spentByCategory(owner, start, until);
            for (BudgetStore.CategoryLimit category : categoryLimits)
                addBudgetCard(cards, period, category.categoryName(),
                        spent.getOrDefault(category.categoryId(), BigDecimal.ZERO), category.limit());
        }
        return new InsightResponse(period.toString(), cards);
    }

    private static void addBudgetCard(List<InsightCard> cards, YearMonth period, String category,
                                      BigDecimal spent, BigDecimal limit) {
        int threshold = BudgetAlertThreshold.highest(spent, limit);
        if (threshold == 0) return;
        boolean exceeded = threshold == 100;
        String subject = category == null ? "Ngân sách tổng" : "Ngân sách " + category;
        cards.add(new InsightCard(exceeded ? "BUDGET_REACHED" : "BUDGET_NEAR_LIMIT",
                exceeded ? subject + " đã đạt hạn mức" : subject + " sắp đạt hạn mức",
                subject + " tháng " + period + " đã dùng " + spent.toPlainString() + " / "
                        + limit.toPlainString() + " VND. Đã đạt ngưỡng " + threshold + "%.",
                exceeded ? "CRITICAL" : "WARNING", period.toString(), spent.toPlainString(),
                limit.toPlainString(), Integer.toString(threshold)));
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

    public record InsightCard(String type, String title, String content, String severity, String period,
                              String currentAmount, String referenceAmount, String thresholdPercent) {}
    public record InsightResponse(String month, List<InsightCard> cards) {}
}
