package com.finsight.insight;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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
@RequestMapping("/api/v1/spending-explanation")
public class SpendingExplanationController {
    private final SpendingExplanationStore store;

    public SpendingExplanationController(SpendingExplanationStore store) { this.store = store; }

    @GetMapping
    @Transactional(readOnly = true)
    public Explanation get(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String month) {
        UUID owner = userId(jwt);
        YearMonth current = month == null ? YearMonth.now(ZoneId.of("Asia/Bangkok")) : parseMonth(month);
        YearMonth previous = current.minusMonths(1);
        Map<UUID, SpendingExplanationStore.CategoryExpense> now = store.expenses(owner, current.atDay(1), current.plusMonths(1).atDay(1));
        Map<UUID, SpendingExplanationStore.CategoryExpense> before = store.expenses(owner, previous.atDay(1), current.atDay(1));
        BigDecimal currentTotal = sum(now);
        BigDecimal previousTotal = sum(before);
        BigDecimal totalChange = currentTotal.subtract(previousTotal);
        HashSet<UUID> ids = new HashSet<>(now.keySet());
        ids.addAll(before.keySet());
        List<CategoryContribution> categories = new ArrayList<>();
        for (UUID id : ids) {
            var currentExpense = now.get(id);
            var previousExpense = before.get(id);
            String name = currentExpense != null ? currentExpense.categoryName() : previousExpense.categoryName();
            BigDecimal currentAmount = currentExpense == null ? BigDecimal.ZERO : currentExpense.amount();
            BigDecimal previousAmount = previousExpense == null ? BigDecimal.ZERO : previousExpense.amount();
            if (currentAmount.compareTo(previousAmount) == 0) continue;
            categories.add(new CategoryContribution(id, name, currentAmount.toPlainString(), previousAmount.toPlainString(),
                    currentAmount.subtract(previousAmount).toPlainString(), null));
        }
        categories.sort(Comparator.comparing((CategoryContribution item) -> new BigDecimal(item.changeAmount()).abs()).reversed()
                .thenComparing(CategoryContribution::categoryName).thenComparing(CategoryContribution::categoryId));
        if (totalChange.signum() != 0) {
            BigDecimal allocated = BigDecimal.ZERO;
            for (int i = 0; i < categories.size(); i++) {
                CategoryContribution item = categories.get(i);
                BigDecimal share = i == categories.size() - 1
                        ? new BigDecimal("100.0").subtract(allocated)
                        : new BigDecimal(item.changeAmount()).multiply(BigDecimal.valueOf(100))
                                .divide(totalChange, 1, RoundingMode.HALF_UP);
                allocated = allocated.add(share);
                categories.set(i, new CategoryContribution(item.categoryId(), item.categoryName(), item.currentAmount(),
                        item.previousAmount(), item.changeAmount(), share.toPlainString()));
            }
        }
        return new Explanation(current.toString(), previous.toString(), currentTotal.toPlainString(),
                previousTotal.toPlainString(), totalChange.toPlainString(), categories,
                "Chỉ tính giao dịch EXPENSE có số tiền dương; giao dịch INCOME (kể cả hoàn tiền ghi là thu nhập) và chuyển khoản không được tính. Tỷ lệ đóng góp có dấu so với chênh lệch ròng và có thể vượt 100% khi các danh mục bù trừ nhau.");
    }

    private static BigDecimal sum(Map<UUID, SpendingExplanationStore.CategoryExpense> values) {
        return values.values().stream().map(SpendingExplanationStore.CategoryExpense::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
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

    public record CategoryContribution(UUID categoryId, String categoryName, String currentAmount,
                                       String previousAmount, String changeAmount, String contributionPercent) {}
    public record Explanation(String month, String previousMonth, String currentTotal, String previousTotal,
                              String changeAmount, List<CategoryContribution> categories, String calculationRule) {}
}
