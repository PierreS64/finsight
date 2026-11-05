package com.finsight.account;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AccountReconciliationStore {
    private final JdbcTemplate jdbc;
    public AccountReconciliationStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Reconciliation> list(UUID owner, UUID account) {
        return jdbc.query("SELECT * FROM public.account_reconciliations WHERE owner_user_id = ? AND account_id = ? "
                        + "ORDER BY recorded_at DESC, id DESC",
                (rs, row) -> map(rs), owner, account);
    }

    public Reconciliation create(UUID owner, UUID account, BigDecimal expected, BigDecimal observed, String note) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO public.account_reconciliations "
                        + "(id, owner_user_id, account_id, expected_balance, observed_balance, difference_amount, note) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?)",
                id, owner, account, expected, observed, observed.subtract(expected), note);
        return jdbc.query("SELECT * FROM public.account_reconciliations WHERE owner_user_id = ? AND id = ?",
                (rs, row) -> map(rs), owner, id).get(0);
    }

    public boolean delete(UUID owner, UUID account, UUID id) {
        return jdbc.update("DELETE FROM public.account_reconciliations WHERE owner_user_id = ? AND account_id = ? AND id = ?",
                owner, account, id) > 0;
    }

    private static Reconciliation map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Reconciliation((UUID) rs.getObject("id"), (UUID) rs.getObject("account_id"),
                rs.getBigDecimal("expected_balance"), rs.getBigDecimal("observed_balance"),
                rs.getBigDecimal("difference_amount"), rs.getString("note"), rs.getTimestamp("recorded_at").toInstant());
    }

    public record Reconciliation(UUID id, UUID accountId, BigDecimal expectedBalance,
                                 BigDecimal observedBalance, BigDecimal differenceAmount,
                                 String note, Instant recordedAt) {}
}
