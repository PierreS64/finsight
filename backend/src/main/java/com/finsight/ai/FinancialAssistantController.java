package com.finsight.ai;

import com.finsight.budget.BudgetStore;
import com.finsight.dashboard.DashboardStore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/assistant")
public class FinancialAssistantController {
    private final DashboardStore dashboard;
    private final BudgetStore budgets;
    private final ExplanationClient explanations;

    public FinancialAssistantController(DashboardStore dashboard, BudgetStore budgets,
                                        ExplanationClient explanations) {
        this.dashboard = dashboard;
        this.budgets = budgets;
        this.explanations = explanations;
    }

    @PostMapping("/ask")
    public Answer ask(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Question request) {
        UUID owner = userId(jwt);
        YearMonth month = YearMonth.now(ZoneId.of("Asia/Bangkok"));
        var accounts = dashboard.accounts(owner);
        var monthly = dashboard.month(owner, month.atDay(1), month.plusMonths(1).atDay(1));
        BigDecimal balance = accounts.openingBalance().add(dashboard.allTimeNet(owner));
        BigDecimal budget = budgets.totalLimit(owner, month.atDay(1)).orElse(null);
        List<Fact> facts = new ArrayList<>();
        facts.add(new Fact("month", "Tháng hiện tại", month.toString(), "YYYY-MM"));
        facts.add(new Fact("accountCount", "Số tài khoản", Long.toString(accounts.count()), "tài khoản"));
        facts.add(new Fact("transactionCount", "Số giao dịch thu/chi tháng", Long.toString(monthly.transactionCount()), "giao dịch"));
        facts.add(new Fact("balance", "Tổng số dư tài khoản hiện tại", balance.toPlainString(), "VND"));
        facts.add(new Fact("income", "Thu nhập tháng", monthly.income().toPlainString(), "VND"));
        facts.add(new Fact("expense", "Chi tiêu tháng", monthly.expense().toPlainString(), "VND"));
        facts.add(new Fact("netFlow", "Thu nhập trừ chi tiêu tháng",
                monthly.income().subtract(monthly.expense()).toPlainString(), "VND"));
        if (budget != null) {
            facts.add(new Fact("budgetLimit", "Ngân sách tổng tháng", budget.toPlainString(), "VND"));
            facts.add(new Fact("budgetRemaining", "Ngân sách tổng còn lại",
                    budget.subtract(monthly.expense()).toPlainString(), "VND"));
        }
        if (accounts.count() == 0 && monthly.transactionCount() == 0 && budget == null)
            return new Answer("FinSight chưa có đủ dữ liệu để giải thích. Hãy thêm tài khoản hoặc giao dịch trước.",
                    "NO_DATA", facts);
        var explanation = explanations.explain(request.question().trim(), List.copyOf(facts));
        return new Answer(explanation.text(), explanation.source(), facts);
    }

    private static UUID userId(Jwt jwt) {
        if (jwt == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bearer token required");
        try { return UUID.fromString(jwt.getSubject()); }
        catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token subject");
        }
    }

    public record Question(@NotBlank @Size(max = 500) String question) {}
    public record Fact(String key, String label, String value, String unit) {}
    public record Answer(String explanation, String source, List<Fact> verifiedFacts) {}
}
