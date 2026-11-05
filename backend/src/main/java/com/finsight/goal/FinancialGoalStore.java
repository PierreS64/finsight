package com.finsight.goal;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class FinancialGoalStore {
    private final JdbcTemplate jdbc;

    public FinancialGoalStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Goal> list(UUID owner) {
        return jdbc.query("SELECT * FROM public.financial_goals WHERE owner_user_id = ? ORDER BY created_at DESC, id DESC",
                (rs, row) -> map(rs), owner);
    }

    public Optional<Goal> find(UUID owner, UUID id) {
        return jdbc.query("SELECT * FROM public.financial_goals WHERE owner_user_id = ? AND id = ?",
                (rs, row) -> map(rs), owner, id).stream().findFirst();
    }

    public Goal create(UUID owner, String name, BigDecimal target, BigDecimal saved, LocalDate date, String note) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO public.financial_goals "
                        + "(id, owner_user_id, name, target_amount, saved_amount, target_date, note) VALUES (?, ?, ?, ?, ?, ?, ?)",
                id, owner, name, target, saved, date, note);
        return find(owner, id).orElseThrow();
    }

    public Optional<Goal> update(UUID owner, UUID id, String name, BigDecimal target, BigDecimal saved,
                                 LocalDate date, String note) {
        int count = jdbc.update("UPDATE public.financial_goals SET name = ?, target_amount = ?, saved_amount = ?, "
                        + "target_date = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE owner_user_id = ? AND id = ?",
                name, target, saved, date, note, owner, id);
        return count == 0 ? Optional.empty() : find(owner, id);
    }

    public boolean delete(UUID owner, UUID id) {
        return jdbc.update("DELETE FROM public.financial_goals WHERE owner_user_id = ? AND id = ?", owner, id) > 0;
    }

    private static Goal map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Goal((UUID) rs.getObject("id"), (UUID) rs.getObject("owner_user_id"), rs.getString("name"),
                rs.getBigDecimal("target_amount"), rs.getBigDecimal("saved_amount"),
                rs.getObject("target_date", LocalDate.class), rs.getString("note"),
                rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    }

    public record Goal(UUID id, UUID owner, String name, BigDecimal targetAmount, BigDecimal savedAmount,
                       LocalDate targetDate, String note, Instant createdAt, Instant updatedAt) {}
}
