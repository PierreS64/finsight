package com.finsight.insight;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import com.finsight.budget.BudgetStore;
import com.finsight.dashboard.DashboardStore;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/financial-health")
public class FinancialHealthController {
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private final DashboardStore dashboard;
    private final BudgetStore budgets;

    public FinancialHealthController(DashboardStore dashboard, BudgetStore budgets) {
        this.dashboard = dashboard;
        this.budgets = budgets;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public HealthResponse get(@AuthenticationPrincipal Jwt jwt) {
        UUID owner = userId(jwt);
        YearMonth month = YearMonth.now(ZoneId.of("Asia/Bangkok"));
        var monthly = dashboard.month(owner, month.atDay(1), month.plusMonths(1).atDay(1));
        BigDecimal balance = dashboard.accounts(owner).openingBalance().add(dashboard.allTimeNet(owner));
        BigDecimal budget = budgets.totalLimit(owner, month.atDay(1)).orElse(null);
        return calculate(month, monthly.income(), monthly.expense(), balance, budget);
    }

    static HealthResponse calculate(YearMonth month, BigDecimal income, BigDecimal expense,
                                    BigDecimal balance, BigDecimal budget) {
        List<Component> parts = new ArrayList<>();
        if (income.signum() > 0) {
            BigDecimal savings = income.subtract(expense).divide(income, 6, RoundingMode.HALF_UP);
            BigDecimal fraction = clamp(savings.divide(new BigDecimal("0.20"), 6, RoundingMode.HALF_UP));
            parts.add(new Component("CASH_FLOW", "Dòng tiền", 40, fraction.multiply(BigDecimal.valueOf(40)).setScale(1, RoundingMode.HALF_UP).toPlainString(),
                    "Tỷ lệ (thu nhập − chi tiêu) / thu nhập; đạt 40 điểm từ mức tiết kiệm 20%."));
        } else parts.add(new Component("CASH_FLOW", "Dòng tiền", 40, null, "Cần có thu nhập trong tháng."));

        if (budget != null && budget.signum() > 0) {
            BigDecimal ratio = expense.divide(budget, 6, RoundingMode.HALF_UP);
            BigDecimal fraction = clamp(new BigDecimal("1.20").subtract(ratio)
                    .divide(new BigDecimal("0.40"), 6, RoundingMode.HALF_UP));
            parts.add(new Component("BUDGET", "Ngân sách", 30, fraction.multiply(BigDecimal.valueOf(30)).setScale(1, RoundingMode.HALF_UP).toPlainString(),
                    "Đạt 30 điểm khi dùng không quá 80% hạn mức; giảm tuyến tính về 0 tại 120%."));
        } else parts.add(new Component("BUDGET", "Ngân sách", 30, null, "Cần đặt ngân sách tổng cho tháng này."));

        if (expense.signum() > 0) {
            BigDecimal months = balance.max(BigDecimal.ZERO).divide(expense, 6, RoundingMode.HALF_UP);
            BigDecimal fraction = clamp(months.divide(BigDecimal.valueOf(3), 6, RoundingMode.HALF_UP));
            parts.add(new Component("LIQUIDITY", "Dự phòng", 30, fraction.multiply(BigDecimal.valueOf(30)).setScale(1, RoundingMode.HALF_UP).toPlainString(),
                    "Số dư hiện tại / chi tiêu tháng; đạt 30 điểm khi đủ 3 tháng ở mức chi hiện tại."));
        } else parts.add(new Component("LIQUIDITY", "Dự phòng", 30, null, "Cần có chi tiêu trong tháng để ước lượng dự phòng."));

        int availableWeight = parts.stream().filter(part -> part.points() != null).mapToInt(Component::weight).sum();
        BigDecimal earned = parts.stream().filter(part -> part.points() != null)
                .map(part -> new BigDecimal(part.points())).reduce(BigDecimal.ZERO, BigDecimal::add);
        String score = availableWeight == 0 ? null : earned.multiply(HUNDRED)
                .divide(BigDecimal.valueOf(availableWeight), 1, RoundingMode.HALF_UP).toPlainString();
        String status = availableWeight == 0 ? "INSUFFICIENT_DATA" : availableWeight < 100 ? "PARTIAL" : "COMPLETE";
        return new HealthResponse(month.toString(), score, availableWeight, status, parts,
                "Điểm tạm tính = điểm đạt / trọng số có dữ liệu × 100. Trọng số: dòng tiền 40, ngân sách 30, dự phòng 30. Chỉ dùng giao dịch thu/chi và số dư tài khoản; chuyển khoản không tạo thu/chi. Đây là chỉ số tham khảo, không phải đánh giá tín dụng.");
    }

    private static BigDecimal clamp(BigDecimal value) {
        return value.max(BigDecimal.ZERO).min(BigDecimal.ONE);
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public record Component(String key, String label, int weight, String points, String explanation) {}
    public record HealthResponse(String month, String score, int coveragePercent, String status,
                                 List<Component> components, String calculationRule) {}
}
