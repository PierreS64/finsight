package com.finsight.auth;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_profiles", schema = "public")
public class UserProfile {
    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "display_name", length = 80)
    private String displayName;

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode = "VND";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserProfile() {}

    public UserProfile(UUID userId) {
        this.userId = userId;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getUserId() { return userId; }
    public String getDisplayName() { return displayName; }
    public String getCurrencyCode() { return currencyCode; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }
}
