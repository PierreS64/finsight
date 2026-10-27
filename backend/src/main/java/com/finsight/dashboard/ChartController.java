package com.finsight.dashboard;

import com.finsight.insight.SpendingExplanationStore;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
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
@RequestMapping("/api/v1/charts")
public class ChartController {
    private final DashboardStore dashboard;
    private final SpendingExplanationStore expenses;

    public ChartController(DashboardStore dashboard, SpendingExplanationStore expenses) {
        this.dashboard = dashboard;
        this.expenses = expenses;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public Charts get(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String month,
                      @RequestParam(defaultValue = "week") String granularity) {
        UUID owner = userId(jwt);
        YearMonth period = month == null ? YearMonth.now(ZoneId.of("Asia/Bangkok")) : parseMonth(month);
        if (!granularity.equals("week") && !granularity.equals("month"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Granularity must be week or month");
        LocalDate start = period.atDay(1);
        LocalDate end = period.plusMonths(1).atDay(1);
        var monthTotals = dashboard.month(owner, start, end);
        BigDecimal expenseTotal = monthTotals.expense();
        List<CategorySlice> categories = expenses.expenses(owner, start, end).values().stream()
                .sorted(Comparator.comparing(SpendingExplanationStore.CategoryExpense::amount).reversed()
                        .thenComparing(SpendingExplanationStore.CategoryExpense::categoryName)
                        .thenComparing(SpendingExplanationStore.CategoryExpense::categoryId))
                .map(item -> new CategorySlice(item.categoryId(), item.categoryName(), item.amount().toPlainString(),
                        expenseTotal.signum() == 0 ? "0.0" : item.amount().multiply(BigDecimal.valueOf(100))
                                .divide(expenseTotal, 1, RoundingMode.HALF_UP).toPlainString()))
                .toList();
        List<TimeBucket> buckets = new ArrayList<>();
        if (granularity.equals("week")) {
            LocalDate from = start;
            while (from.isBefore(end)) {
                LocalDate nextMonday = from.with(TemporalAdjusters.next(DayOfWeek.MONDAY));
                LocalDate until = nextMonday.isBefore(end) ? nextMonday : end;
                buckets.add(bucket(owner, from, until));
                from = until;
            }
        } else {
            for (int offset = 5; offset >= 0; offset--) {
                YearMonth item = period.minusMonths(offset);
                buckets.add(bucket(owner, item.atDay(1), item.plusMonths(1).atDay(1)));
            }
        }
        return new Charts(period.toString(), granularity, monthTotals.income().toPlainString(),
                expenseTotal.toPlainString(), categories, buckets,
                "Cơ cấu danh mục tính từ EXPENSE trong tháng đã chọn. Chế độ tuần chia tháng thành các khoảng thứ Hai–Chủ nhật và cắt ở ranh giới tháng; chế độ tháng hiển thị 6 tháng kết thúc tại tháng đã chọn. Thu/chi chỉ gồm giao dịch INCOME/EXPENSE, không gồm chuyển khoản.");
    }

    private TimeBucket bucket(UUID owner, LocalDate from, LocalDate until) {
        var totals = dashboard.month(owner, from, until);
        return new TimeBucket(from.toString(), until.minusDays(1).toString(), totals.income().toPlainString(),
                totals.expense().toPlainString());
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

    public record CategorySlice(UUID categoryId, String categoryName, String amount, String percent) {}
    public record TimeBucket(String from, String to, String income, String expense) {}
    public record Charts(String month, String granularity, String incomeTotal, String expenseTotal,
                         List<CategorySlice> categories, List<TimeBucket> buckets, String calculationRule) {}
}
