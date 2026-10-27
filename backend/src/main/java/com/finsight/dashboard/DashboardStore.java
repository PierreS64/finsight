package com.finsight.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DashboardStore {
    private final JdbcTemplate jdbc;

    public DashboardStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public AccountTotals accounts(UUID owner) {
        return jdbc.queryForObject("SELECT COUNT(*), COALESCE(SUM(opening_balance), 0) "
                        + "FROM public.financial_accounts WHERE owner_user_id = ?",
                (rs, row) -> new AccountTotals(rs.getLong(1), rs.getBigDecimal(2)), owner);
    }

    public BigDecimal allTimeNet(UUID owner) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(CASE WHEN kind = 'INCOME' THEN amount ELSE -amount END), 0) "
                + "FROM public.financial_transactions WHERE owner_user_id = ?", BigDecimal.class, owner);
    }

    public MonthlyTotals month(UUID owner, LocalDate from, LocalDate until) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(CASE WHEN kind = 'INCOME' THEN amount ELSE 0 END), 0), "
                        + "COALESCE(SUM(CASE WHEN kind = 'EXPENSE' THEN amount ELSE 0 END), 0), COUNT(*) "
                        + "FROM public.financial_transactions WHERE owner_user_id = ? "
                        + "AND occurred_on >= ? AND occurred_on < ?",
                (rs, row) -> new MonthlyTotals(rs.getBigDecimal(1), rs.getBigDecimal(2), rs.getLong(3)),
                owner, from, until);
    }

    public record AccountTotals(long count, BigDecimal openingBalance) {}
    public record MonthlyTotals(BigDecimal income, BigDecimal expense, long transactionCount) {}
}
