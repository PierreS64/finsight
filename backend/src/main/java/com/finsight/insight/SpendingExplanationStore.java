package com.finsight.insight;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SpendingExplanationStore {
    private final JdbcTemplate jdbc;

    public SpendingExplanationStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Map<UUID, CategoryExpense> expenses(UUID owner, LocalDate from, LocalDate until) {
        Map<UUID, CategoryExpense> result = new LinkedHashMap<>();
        jdbc.query("SELECT t.category_id, c.name, SUM(t.amount) "
                        + "FROM public.financial_transactions t JOIN public.categories c ON c.id = t.category_id "
                        + "WHERE t.owner_user_id = ? AND t.kind = 'EXPENSE' "
                        + "AND t.occurred_on >= ? AND t.occurred_on < ? "
                        + "GROUP BY t.category_id, c.name ORDER BY LOWER(c.name), t.category_id",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> {
                    UUID id = rs.getObject(1, UUID.class);
                    result.put(id, new CategoryExpense(id, rs.getString(2), rs.getBigDecimal(3)));
                }, owner, from, until);
        return result;
    }

    public record CategoryExpense(UUID categoryId, String categoryName, BigDecimal amount) {}
}
