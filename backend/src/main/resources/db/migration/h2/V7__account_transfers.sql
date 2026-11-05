CREATE TABLE account_transfers (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL,
    from_account_id UUID NOT NULL,
    to_account_id UUID NOT NULL,
    amount NUMERIC(19, 2) NOT NULL CHECK (amount > 0),
    occurred_on DATE NOT NULL,
    note VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_transfer_distinct_accounts CHECK (from_account_id <> to_account_id),
    CONSTRAINT fk_transfer_from_owner FOREIGN KEY (owner_user_id, from_account_id)
        REFERENCES financial_accounts(owner_user_id, id) ON DELETE RESTRICT,
    CONSTRAINT fk_transfer_to_owner FOREIGN KEY (owner_user_id, to_account_id)
        REFERENCES financial_accounts(owner_user_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_transfers_owner_date ON account_transfers(owner_user_id, occurred_on DESC, created_at DESC, id DESC);
CREATE INDEX idx_transfers_owner_from ON account_transfers(owner_user_id, from_account_id);
CREATE INDEX idx_transfers_owner_to ON account_transfers(owner_user_id, to_account_id);
