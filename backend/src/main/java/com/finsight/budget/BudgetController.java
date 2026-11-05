package com.finsight.budget;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.finsight.category.Category;
import com.finsight.category.CategoryRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/budgets")
public class BudgetController {
    private final BudgetStore budgets;
    private final CategoryRepository categories;

    public BudgetController(BudgetStore budgets, CategoryRepository categories) {
        this.budgets = budgets;
        this.categories = categories;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public BudgetSummary get(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String month) {
        YearMonth period = month == null ? YearMonth.now(ZoneId.of("Asia/Bangkok")) : parseMonth(month);
        return summary(userId(jwt), period);
    }

    @PutMapping("/total/{month}")
    @Transactional
    public BudgetSummary saveTotal(@AuthenticationPrincipal Jwt jwt, @PathVariable String month,
                                   @Valid @RequestBody BudgetRequest request) {
        UUID owner = userId(jwt);
        YearMonth period = parseMonth(month);
        budgets.saveTotal(owner, period.atDay(1), request.limitAmount());
        return summary(owner, period);
    }

    @DeleteMapping("/total/{month}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteTotal(@AuthenticationPrincipal Jwt jwt, @PathVariable String month) {
        budgets.deleteTotal(userId(jwt), parseMonth(month).atDay(1));
    }

    @PutMapping("/categories/{month}/{categoryId}")
    @Transactional
    public BudgetSummary saveCategory(@AuthenticationPrincipal Jwt jwt, @PathVariable String month,
                                      @PathVariable UUID categoryId, @Valid @RequestBody BudgetRequest request) {
        UUID owner = userId(jwt);
        Category category = categories.findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        if (category.getOwnerUserId() != null && !owner.equals(category.getOwnerUserId()))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found");
        if (category.getCategoryType() != Category.Type.EXPENSE)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Budget category must be an expense category");
        YearMonth period = parseMonth(month);
        budgets.saveCategory(owner, period.atDay(1), categoryId, request.limitAmount());
        return summary(owner, period);
    }

    @DeleteMapping("/categories/{month}/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void deleteCategory(@AuthenticationPrincipal Jwt jwt, @PathVariable String month,
                               @PathVariable UUID categoryId) {
        budgets.deleteCategory(userId(jwt), parseMonth(month).atDay(1), categoryId);
    }

    private BudgetSummary summary(UUID owner, YearMonth period) {
        LocalDate start = period.atDay(1);
        Map<UUID, BigDecimal> spent = budgets.spentByCategory(owner, start, period.plusMonths(1).atDay(1));
        BigDecimal totalSpent = spent.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BudgetLine total = budgets.totalLimit(owner, start).map(limit -> line(limit, totalSpent)).orElse(null);
        List<CategoryBudgetLine> categoryLines = budgets.categoryLimits(owner, start).stream().map(item ->
                new CategoryBudgetLine(item.categoryId(), item.categoryName(),
                        line(item.limit(), spent.getOrDefault(item.categoryId(), BigDecimal.ZERO)))).toList();
        return new BudgetSummary(period.toString(), totalSpent.toPlainString(), total, categoryLines);
    }

    private static BudgetLine line(BigDecimal limit, BigDecimal spent) {
        return new BudgetLine(limit.toPlainString(), spent.toPlainString(), limit.subtract(spent).toPlainString(),
                spent.multiply(BigDecimal.valueOf(100)).divide(limit, 1, RoundingMode.HALF_UP).toPlainString(),
                BudgetAlertThreshold.highest(spent, limit));
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

    public record BudgetRequest(@NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal limitAmount) {}
    public record BudgetLine(String limitAmount, String spent, String remaining, String usedPercent,
                             int alertThresholdPercent) {}
    public record CategoryBudgetLine(UUID categoryId, String categoryName, BudgetLine values) {}
    public record BudgetSummary(String month, String totalSpent, BudgetLine total, List<CategoryBudgetLine> categories) {}
}
