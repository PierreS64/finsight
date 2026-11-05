package com.finsight.transaction;

import java.util.Optional;
import java.util.UUID;
import java.util.Arrays;
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

    public Optional<UUID> findExactDuplicate(UUID owner, byte[] bytes) {
        return jdbc.query("SELECT r.transaction_id, r.image_data FROM public.transaction_receipts r "
                        + "JOIN public.financial_transactions t ON t.id = r.transaction_id WHERE t.owner_user_id = ?",
                (rs, row) -> new StoredImage((UUID) rs.getObject("transaction_id"), rs.getBytes("image_data")), owner)
                .stream().filter(image -> Arrays.equals(image.bytes(), bytes))
                .map(StoredImage::transactionId).findFirst();
    }

    public record Receipt(String contentType, byte[] bytes) {}
    private record StoredImage(UUID transactionId, byte[] bytes) {}
}
