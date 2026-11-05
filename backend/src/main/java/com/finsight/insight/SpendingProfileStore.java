package com.finsight.insight;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SpendingProfileStore {
    private final JdbcTemplate jdbc;

    public SpendingProfileStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Map<LocalDate, BigDecimal> dailyExpenses(UUID owner, LocalDate from, LocalDate until) {
        Map<LocalDate, BigDecimal> result = new HashMap<>();
        jdbc.query("SELECT occurred_on, SUM(amount) FROM public.financial_transactions "
                        + "WHERE owner_user_id = ? AND kind = 'EXPENSE' AND occurred_on >= ? AND occurred_on < ? "
                        + "GROUP BY occurred_on",
                (org.springframework.jdbc.core.RowCallbackHandler) rs ->
                        result.put(rs.getDate(1).toLocalDate(), rs.getBigDecimal(2)), owner, from, until);
        return result;
    }
}
