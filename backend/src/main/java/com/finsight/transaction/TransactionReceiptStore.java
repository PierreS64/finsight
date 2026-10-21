package com.finsight.transaction;

import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TransactionReceiptStore {
    private final JdbcTemplate jdbc;

    public TransactionReceiptStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean exists(UUID transactionId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT COUNT(*) > 0 FROM public.transaction_receipts WHERE transaction_id = ?", Boolean.class, transactionId));
    }

    public Optional<Receipt> find(UUID transactionId) {
        return jdbc.query("SELECT content_type, image_data FROM public.transaction_receipts WHERE transaction_id = ?",
                (rs, row) -> new Receipt(rs.getString("content_type"), rs.getBytes("image_data")), transactionId)
                .stream().findFirst();
    }

    public void replace(UUID transactionId, String contentType, byte[] bytes) {
        jdbc.update("DELETE FROM public.transaction_receipts WHERE transaction_id = ?", transactionId);
        jdbc.update("INSERT INTO public.transaction_receipts (transaction_id, content_type, image_data) VALUES (?, ?, ?)",
                transactionId, contentType, bytes);
    }

    public int delete(UUID transactionId) {
        return jdbc.update("DELETE FROM public.transaction_receipts WHERE transaction_id = ?", transactionId);
    }

    public record Receipt(String contentType, byte[] bytes) {}
}
