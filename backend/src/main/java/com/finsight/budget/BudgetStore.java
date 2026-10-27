package com.finsight.budget;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class BudgetStore {
    private final JdbcTemplate jdbc;

    public BudgetStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<BigDecimal> totalLimit(UUID owner, LocalDate month) {
        return jdbc.query("SELECT limit_amount FROM public.monthly_budgets WHERE owner_user_id = ? AND budget_month = ?",
                (rs, row) -> rs.getBigDecimal(1), owner, month).stream().findFirst();
    }

    public List<CategoryLimit> categoryLimits(UUID owner, LocalDate month) {
        return jdbc.query("SELECT b.category_id, c.name, b.limit_amount FROM public.category_budgets b "
                        + "JOIN public.categories c ON c.id = b.category_id "
                        + "WHERE b.owner_user_id = ? AND b.budget_month = ? ORDER BY LOWER(c.name), b.category_id",
                (rs, row) -> new CategoryLimit(rs.getObject(1, UUID.class), rs.getString(2), rs.getBigDecimal(3)),
                owner, month);
    }

    public Map<UUID, BigDecimal> spentByCategory(UUID owner, LocalDate from, LocalDate until) {
        Map<UUID, BigDecimal> values = new HashMap<>();
        jdbc.query("SELECT category_id, SUM(amount) FROM public.financial_transactions "
                        + "WHERE owner_user_id = ? AND kind = 'EXPENSE' AND occurred_on >= ? AND occurred_on < ? "
                        + "GROUP BY category_id",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> {
                    values.put(rs.getObject(1, UUID.class), rs.getBigDecimal(2));
                }, owner, from, until);
        return values;
    }

    public void saveTotal(UUID owner, LocalDate month, BigDecimal limit) {
        if (jdbc.update("UPDATE public.monthly_budgets SET limit_amount = ? WHERE owner_user_id = ? AND budget_month = ?",
                limit, owner, month) == 0)
            jdbc.update("INSERT INTO public.monthly_budgets (owner_user_id, budget_month, limit_amount) VALUES (?, ?, ?)",
                    owner, month, limit);
    }

    public void saveCategory(UUID owner, LocalDate month, UUID categoryId, BigDecimal limit) {
        if (jdbc.update("UPDATE public.category_budgets SET limit_amount = ? WHERE owner_user_id = ? AND budget_month = ? AND category_id = ?",
                limit, owner, month, categoryId) == 0)
            jdbc.update("INSERT INTO public.category_budgets (owner_user_id, budget_month, category_id, limit_amount) VALUES (?, ?, ?, ?)",
                    owner, month, categoryId, limit);
    }

    public void deleteTotal(UUID owner, LocalDate month) {
        jdbc.update("DELETE FROM public.monthly_budgets WHERE owner_user_id = ? AND budget_month = ?", owner, month);
    }

    public void deleteCategory(UUID owner, LocalDate month, UUID categoryId) {
        jdbc.update("DELETE FROM public.category_budgets WHERE owner_user_id = ? AND budget_month = ? AND category_id = ?",
                owner, month, categoryId);
    }

    public record CategoryLimit(UUID categoryId, String categoryName, BigDecimal limit) {}
}
