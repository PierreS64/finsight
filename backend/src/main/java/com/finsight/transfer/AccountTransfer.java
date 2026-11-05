package com.finsight.transfer;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "account_transfers", schema = "public")
public class AccountTransfer {
    @Id
    private UUID id;
    @Column(name = "owner_user_id", nullable = false)
    private UUID ownerUserId;
    @Column(name = "from_account_id", nullable = false)
    private UUID fromAccountId;
    @Column(name = "to_account_id", nullable = false)
    private UUID toAccountId;
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;
    @Column(name = "occurred_on", nullable = false)
    private LocalDate occurredOn;
    @Column(length = 500)
    private String note;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AccountTransfer() {}

    public AccountTransfer(UUID ownerUserId, UUID fromAccountId, UUID toAccountId,
                           BigDecimal amount, LocalDate occurredOn, String note) {
        this.id = UUID.randomUUID();
        this.ownerUserId = ownerUserId;
        this.fromAccountId = fromAccountId;
        this.toAccountId = toAccountId;
        this.amount = amount;
        this.occurredOn = occurredOn;
        this.note = note == null || note.isBlank() ? null : note.trim();
    }

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public UUID getId() { return id; }
    public UUID getOwnerUserId() { return ownerUserId; }
    public UUID getFromAccountId() { return fromAccountId; }
    public UUID getToAccountId() { return toAccountId; }
    public BigDecimal getAmount() { return amount; }
    public LocalDate getOccurredOn() { return occurredOn; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
