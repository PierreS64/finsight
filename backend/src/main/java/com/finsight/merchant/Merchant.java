package com.finsight.merchant;

import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "merchants", schema = "public")
public class Merchant {
    @Id
    private UUID id;
    @Column(name = "owner_user_id", nullable = false)
    private UUID ownerUserId;
    @Column(nullable = false, length = 100)
    private String name;

    protected Merchant() {}
    public UUID getId() { return id; }
    public UUID getOwnerUserId() { return ownerUserId; }
    public String getName() { return name; }
}
