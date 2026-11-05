package com.finsight.category;

import java.time.Instant;
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
@Table(name = "categories", schema = "public")
public class Category {
    public enum Type { INCOME, EXPENSE }

    @Id
    private UUID id;

    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    @Column(nullable = false, length = 80)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "category_type", nullable = false, length = 10)
    private Type categoryType;

    @Column(nullable = false, length = 20)
    private String icon;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Category() {}

    public Category(UUID ownerUserId, String name, Type categoryType, String icon) {
        this.id = UUID.randomUUID();
        this.ownerUserId = ownerUserId;
        update(name, categoryType, icon);
    }

    public void update(String name, Type categoryType, String icon) {
        this.name = name;
        this.categoryType = categoryType;
        this.icon = icon;
    }

    @PrePersist
    void onCreate() { createdAt = Instant.now(); updatedAt = createdAt; }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public UUID getId() { return id; }
    public UUID getOwnerUserId() { return ownerUserId; }
    public String getName() { return name; }
    public Type getCategoryType() { return categoryType; }
    public String getIcon() { return icon; }
}
