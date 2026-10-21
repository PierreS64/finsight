package com.finsight.transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "financial_transactions", schema = "public")
public class FinancialTransaction {
    public enum Kind { INCOME, EXPENSE }

    @Id
    private UUID id;
    @Column(name = "owner_user_id", nullable = false)
    private UUID ownerUserId;
    @Column(name = "account_id", nullable = false)
    private UUID accountId;
    @Column(name = "category_id", nullable = false)
    private UUID categoryId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 7)
    private Kind kind;
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;
    @Column(name = "occurred_on", nullable = false)
    private LocalDate occurredOn;
    @Column(length = 500)
    private String note;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected FinancialTransaction() {}

    public FinancialTransaction(UUID ownerUserId, UUID accountId, UUID categoryId, Kind kind,
                                BigDecimal amount, LocalDate occurredOn, String note) {
        this.id = UUID.randomUUID();
        this.ownerUserId = ownerUserId;
        update(accountId, categoryId, kind, amount, occurredOn, note);
    }

    public void update(UUID accountId, UUID categoryId, Kind kind, BigDecimal amount,
                       LocalDate occurredOn, String note) {
        this.accountId = accountId;
        this.categoryId = categoryId;
        this.kind = kind;
        this.amount = amount;
        this.occurredOn = occurredOn;
        this.note = note == null || note.isBlank() ? null : note.trim();
    }

    @PrePersist
    void onCreate() { createdAt = Instant.now(); updatedAt = createdAt; }
    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public UUID getId() { return id; }
    public UUID getOwnerUserId() { return ownerUserId; }
    public UUID getAccountId() { return accountId; }
    public UUID getCategoryId() { return categoryId; }
    public Kind getKind() { return kind; }
    public BigDecimal getAmount() { return amount; }
    public LocalDate getOccurredOn() { return occurredOn; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
